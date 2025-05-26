import axios, { AxiosInstance, AxiosError, AxiosHeaders } from 'axios';
import winston from 'winston';
import { 
  LMDevice, 
  LMDeviceGroup, 
  LMCollector,
  LMAlert,
  LMWebsite,
  LMWebsiteGroup,
  LMPaginatedResponse,
  LMAlertPaginatedResponse,
  LMErrorResponse 
} from '../types/logicmonitor.js';
import { formatLogicMonitorFilter } from '../utils/filters.js';
import { rateLimiter } from '../utils/rateLimiter.js';

export class LogicMonitorClient {
  private axiosInstance: AxiosInstance;
  private logger: winston.Logger;

  constructor(
    account: string,
    bearerToken: string,
    logger?: winston.Logger
  ) {
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()]
    });

    this.axiosInstance = axios.create({
      baseURL: `https://${account}.logicmonitor.com/santaba/rest`,
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        'X-Version': '3'
      },
      timeout: 30000
    });

    this.axiosInstance.interceptors.response.use(
      response => {
        // Extract and store rate limit information
        const rateLimitInfo = rateLimiter.extractRateLimitInfo(response.headers as AxiosHeaders);
        if (rateLimitInfo) {
          rateLimiter.updateRateLimitInfo('api-request', rateLimitInfo);
          this.logger.debug('Rate limit info updated', rateLimitInfo);
        }
        return response;
      },
      this.handleError.bind(this)
    );
  }

  private handleError(error: AxiosError<LMErrorResponse>) {
    if (error.response) {
      const { status, data } = error.response;
      
      // Extract rate limit info from error response
      const rateLimitInfo = rateLimiter.extractRateLimitInfo(error.response.headers as AxiosHeaders);
      if (rateLimitInfo) {
        rateLimiter.updateRateLimitInfo('api-request', rateLimitInfo);
        this.logger.debug('Rate limit info from error response', rateLimitInfo);
      }
      
      // Check if this is a rate limit error
      if (status === 429) {
        this.logger.warn('Rate limit exceeded', { 
          path: error.config?.url,
          rateLimitInfo 
        });
        // Re-throw the error to let the rate limiter handle retry
        throw error;
      }
      
      this.logger.error('LogicMonitor API error', { 
        status, 
        message: data.errmsg || 'Unknown error',
        path: error.config?.url 
      });
      
      throw new Error(`LogicMonitor API error: ${data.errmsg || 'Unknown error'} (${status})`);
    } else if (error.request) {
      this.logger.error('Network error', { message: error.message });
      throw new Error(`Network error: ${error.message}`);
    } else {
      this.logger.error('Request error', { message: error.message });
      throw new Error(`Request error: ${error.message}`);
    }
  }

  /**
   * Generic pagination helper that automatically fetches all pages
   * @param endpoint - The API endpoint to paginate
   * @param params - Request parameters including optional size/offset
   * @returns Combined results from all pages
   */
  private async paginateAll<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<LMPaginatedResponse<T>> {
    const size = params?.size || 1000; // Default to max size for efficiency
    let offset = params?.offset || 0;
    let allItems: T[] = [];
    let totalCount = 0;
    let hasMore = true;

    this.logger.debug(`Starting pagination for ${endpoint}`, { 
      initialSize: size, 
      initialOffset: offset,
      params 
    });

    while (hasMore) {
      try {
        // Make the request with current pagination params
        const response = await this.axiosInstance.get<LMPaginatedResponse<T>>(endpoint, {
          params: { ...params, size, offset }
        });

        const data = response.data;
        if (!data || typeof data.total !== 'number') {
          this.logger.warn('Invalid pagination response structure', { endpoint, data });
          break;
        }

        // On first iteration, capture the total count
        if (offset === (params?.offset || 0)) {
          totalCount = data.total;
        }

        // Add items from this page
        const items = data.items || [];
        allItems = allItems.concat(items);

        this.logger.debug(`Fetched page for ${endpoint}`, {
          offset,
          requestedSize: size,
          returnedSize: items.length,
          totalSoFar: allItems.length,
          total: totalCount
        });

        // Check if we have more pages
        // Use actual returned item count, not requested size, in case API has lower limits
        if (items.length === 0 || allItems.length >= totalCount) {
          hasMore = false;
        } else {
          // Calculate next offset based on actual items returned
          offset += items.length;
        }
      } catch (error) {
        this.logger.error(`Pagination failed for ${endpoint}`, { 
          offset, 
          error: error instanceof Error ? error.message : error 
        });
        throw error;
      }
    }

    this.logger.info(`Pagination complete for ${endpoint}`, {
      totalPages: Math.ceil(allItems.length / size),
      totalItems: allItems.length,
      expectedTotal: totalCount
    });

    return {
      total: totalCount,
      items: allItems
    };
  }

  // Device Management Methods
  async listDevices(params?: {
    filter?: string;
    size?: number;
    offset?: number;
    fields?: string;
  }): Promise<LMPaginatedResponse<LMDevice>> {
    // Format the filter for LogicMonitor API
    const formattedParams = {
      ...params,
      filter: params?.filter ? formatLogicMonitorFilter(params.filter) : undefined,
      // Omit fields parameter if it's "*" (which means all fields)
      fields: params?.fields === '*' ? undefined : params?.fields
    };
    
    this.logger.debug('Device list request', { 
      originalFilter: params?.filter,
      formattedFilter: formattedParams.filter,
      params: formattedParams 
    });
    
    // Use pagination helper to automatically fetch all pages
    return this.paginateAll<LMDevice>('/device/devices', formattedParams);
  }

  async getDevice(deviceId: number): Promise<LMDevice> {
    try {
      const response = await this.axiosInstance.get(`/device/devices/${deviceId}`);
      this.logger.debug('Get device response', { 
        deviceId,
        hasData: !!response.data,
        hasNestedData: !!(response.data?.data),
        keys: response.data ? Object.keys(response.data) : []
      });
      
      // LogicMonitor API might return the device directly or wrapped in a data property
      const device = response.data.data || response.data;
      
      if (!device || typeof device.id === 'undefined') {
        throw new Error(`Invalid device response structure for device ${deviceId}`);
      }
      
      return device;
    } catch (error) {
      this.logger.error('Failed to get device', { 
        deviceId,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  async createDevice(device: {
    displayName: string;
    name: string;
    hostGroupIds: number[];
    preferredCollectorId: number;
    disableAlerting?: boolean;
    customProperties?: Array<{ name: string; value: string }>;
  }): Promise<LMDevice> {
    // Convert hostGroupIds array to comma-separated string
    const payload = {
      name: device.name,  // LogicMonitor API expects 'name' field
      displayName: device.displayName,
      hostGroupIds: device.hostGroupIds.join(','),
      preferredCollectorId: device.preferredCollectorId,
      disableAlerting: device.disableAlerting ?? false,
      customProperties: device.customProperties || []
    };
    
    this.logger.debug('Creating device', { payload });
    
    try {
      const response = await this.axiosInstance.post<LMDevice>('/device/devices', payload);
      this.logger.debug('Device created successfully', { deviceId: response.data.id });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create device', { 
        payload, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  async updateDevice(deviceId: number, updates: Partial<{
    displayName: string;
    hostGroupIds: number[];
    disableAlerting: boolean;
    customProperties: Array<{ name: string; value: string }>;
  }>): Promise<LMDevice> {
    // Convert hostGroupIds array to comma-separated string if present
    const payload = { ...updates };
    if (updates.hostGroupIds) {
      payload.hostGroupIds = updates.hostGroupIds.join(',') as any;
    }
    const response = await this.axiosInstance.patch<{ data: LMDevice }>(
      `/device/devices/${deviceId}`,
      payload
    );

    // LogicMonitor API might return the device directly or wrapped in a data property
    const device = response.data.data || response.data;

    if (!device || typeof device.id === 'undefined') {
      throw new Error(`Invalid device response structure for device ${deviceId}`);
    }

    return device;
  }

  async deleteDevice(deviceId: number): Promise<void> {
    await this.axiosInstance.delete(`/device/devices/${deviceId}`);
  }

  // Device Group Management Methods
  async listDeviceGroups(params?: {
    filter?: string;
    size?: number;
    offset?: number;
    fields?: string;
    parentId?: number;
  }): Promise<LMPaginatedResponse<LMDeviceGroup>> {
    // Format the filter for LogicMonitor API
    const formattedParams = {
      ...params,
      filter: params?.filter ? formatLogicMonitorFilter(params.filter) : undefined,
      // Omit fields parameter if it's "*" (which means all fields)
      fields: params?.fields === '*' ? undefined : params?.fields
    };
    
    this.logger.debug('Device groups list request', { 
      originalFilter: params?.filter,
      formattedFilter: formattedParams.filter,
      params: formattedParams 
    });
    
    // Use pagination helper to automatically fetch all pages
    return this.paginateAll<LMDeviceGroup>('/device/groups', formattedParams);
  }

  async getDeviceGroup(groupId: number): Promise<LMDeviceGroup> {
    try {
      const response = await this.axiosInstance.get(`/device/groups/${groupId}`);
      this.logger.debug('Get device group response', { 
        groupId,
        hasData: !!response.data,
        hasNestedData: !!(response.data?.data),
        keys: response.data ? Object.keys(response.data) : []
      });
      
      // LogicMonitor API might return the group directly or wrapped in a data property
      const group = response.data.data || response.data;
      
      if (!group || typeof group.id === 'undefined') {
        throw new Error(`Invalid device group response structure for group ${groupId}`);
      }
      
      return group;
    } catch (error) {
      this.logger.error('Failed to get device group', { 
        groupId,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  async createDeviceGroup(group: {
    name: string;
    parentId: number;
    description?: string;
    appliesTo?: string;
    customProperties?: Array<{ name: string; value: string }>;
  }): Promise<LMDeviceGroup> {
    const response = await this.axiosInstance.post<{ data: LMDeviceGroup }>(
      '/device/groups',
      group
    );

    // LogicMonitor API might return the device directly or wrapped in a data property
    const deviceGroup = response.data.data || response.data;

    if (!deviceGroup || typeof deviceGroup.id === 'undefined') {
      throw new Error(`Invalid device group response structure for group ${group.name}`);
    }

    return deviceGroup;
  }

  async updateDeviceGroup(groupId: number, updates: Partial<{
    name: string;
    description: string;
    appliesTo: string;
    customProperties: Array<{ name: string; value: string }>;
  }>): Promise<LMDeviceGroup> {
    const response = await this.axiosInstance.patch<{ data: LMDeviceGroup }>(
      `/device/groups/${groupId}`,
      updates
    );

    // LogicMonitor API might return the device directly or wrapped in a data property
    const deviceGroup = response.data.data || response.data;

    if (!deviceGroup || typeof deviceGroup.id === 'undefined') {
      throw new Error(`Invalid device group response structure for group ${groupId}`);
    }

    return deviceGroup;
  }

  async deleteDeviceGroup(groupId: number, params?: {
    deleteChildren?: boolean;
  }): Promise<void> {
    await this.axiosInstance.delete(`/device/groups/${groupId}`, { params });
  }

  // Website Management Methods
  async listWebsites(params?: {
    filter?: string;
    size?: number;
    offset?: number;
    fields?: string;
  }): Promise<LMPaginatedResponse<LMWebsite>> {
    // Format the filter for LogicMonitor API
    const formattedParams = {
      ...params,
      filter: params?.filter ? formatLogicMonitorFilter(params.filter) : undefined,
      // Omit fields parameter if it's "*" (which means all fields)
      fields: params?.fields === '*' ? undefined : params?.fields
    };
    
    // Use pagination helper to automatically fetch all pages
    return this.paginateAll<LMWebsite>('/website/websites', formattedParams);
  }

  async getWebsite(websiteId: number): Promise<LMWebsite> {
    const response = await this.axiosInstance.get<{ data: LMWebsite }>(
      `/website/websites/${websiteId}`
    );
    
    // LogicMonitor API typically wraps single objects in a data property
    const website = response.data.data || response.data;
    
    if (!website || typeof website.id === 'undefined') {
      throw new Error(`Invalid website response structure for website ${websiteId}`);
    }
    
    return website;
  }

  async createWebsite(websiteData: {
    name: string;
    domain: string;
    type: 'webcheck' | 'pingcheck';
    groupId: number;
    description?: string;
    disableAlerting?: boolean;
    stopMonitoring?: boolean;
    useDefaultAlertSetting?: boolean;
    useDefaultLocationSetting?: boolean;
    pollingInterval?: number;
    properties?: Array<{ name: string; value: string }>;
    steps?: Array<{
      url: string;
      HTTPMethod?: string;
      statusCode?: string;
      description?: string;
    }>;
  }): Promise<LMWebsite> {
    const response = await this.axiosInstance.post<{ data: LMWebsite }>(
      '/website/websites',
      websiteData
    );
    
    // LogicMonitor API might return the website directly or wrapped in a data property
    const website = response.data.data || response.data;

    if (!website || typeof website.id === 'undefined') {
      throw new Error(`Invalid website response structure for website ${websiteData.name}`);
    }

    return website;
  }

  async updateWebsite(websiteId: number, updates: {
    name?: string;
    description?: string;
    disableAlerting?: boolean;
    stopMonitoring?: boolean;
    useDefaultAlertSetting?: boolean;
    useDefaultLocationSetting?: boolean;
    pollingInterval?: number;
    properties?: Array<{ name: string; value: string }>;
  }): Promise<LMWebsite> {
    const response = await this.axiosInstance.patch<{ data: LMWebsite }>(
      `/website/websites/${websiteId}`,
      updates
    );

    // LogicMonitor API might return the website directly or wrapped in a data property
    const website = response.data.data || response.data;

    if (!website || typeof website.id === 'undefined') {
      throw new Error(`Invalid website response structure for website ${websiteId}`);
    }

    return website;
  }

  async deleteWebsite(websiteId: number): Promise<void> {
    await this.axiosInstance.delete(`/website/websites/${websiteId}`);
  }

  // Website Group Management Methods
  async listWebsiteGroups(params?: {
    filter?: string;
    size?: number;
    offset?: number;
    fields?: string;
  }): Promise<LMPaginatedResponse<LMWebsiteGroup>> {
    // Format the filter for LogicMonitor API
    const formattedParams = {
      ...params,
      filter: params?.filter ? formatLogicMonitorFilter(params.filter) : undefined,
      // Omit fields parameter if it's "*" (which means all fields)
      fields: params?.fields === '*' ? undefined : params?.fields
    };
    
    // Use pagination helper to automatically fetch all pages
    return this.paginateAll<LMWebsiteGroup>('/website/groups', formattedParams);
  }

  async getWebsiteGroup(groupId: number): Promise<LMWebsiteGroup> {
    const response = await this.axiosInstance.get<{ data: LMWebsiteGroup }>(
      `/website/groups/${groupId}`
    );
    
    // LogicMonitor API typically wraps single objects in a data property
    const group = response.data.data || response.data;
    
    if (!group || typeof group.id === 'undefined') {
      throw new Error(`Invalid website group response structure for group ${groupId}`);
    }
    
    return group;
  }

  async createWebsiteGroup(groupData: {
    name: string;
    parentId: number;
    description?: string;
    disableAlerting?: boolean;
    stopMonitoring?: boolean;
    properties?: Array<{ name: string; value: string }>;
  }): Promise<LMWebsiteGroup> {
    const response = await this.axiosInstance.post<{ data: LMWebsiteGroup }>(
      '/website/groups',
      groupData
    );

    // LogicMonitor API might return the website group directly or wrapped in a data property
    const websiteGroup = response.data.data || response.data;

    if (!websiteGroup || typeof websiteGroup.id === 'undefined') {
      throw new Error(`Invalid website group response structure for group ${groupData.name}`);
    }

    return websiteGroup;
  }

  async updateWebsiteGroup(groupId: number, updates: {
    name?: string;
    description?: string;
    disableAlerting?: boolean;
    stopMonitoring?: boolean;
    properties?: Array<{ name: string; value: string }>;
  }): Promise<LMWebsiteGroup> {
    const response = await this.axiosInstance.patch<{ data: LMWebsiteGroup }>(
      `/website/groups/${groupId}`,
      updates
    );

    // LogicMonitor API might return the website group directly or wrapped in a data property
    const websiteGroup = response.data.data || response.data;

    if (!websiteGroup || typeof websiteGroup.id === 'undefined') {
      throw new Error(`Invalid website group response structure for group ${groupId}`);
    }

    return websiteGroup;
  }

  async deleteWebsiteGroup(groupId: number, params?: {
    deleteChildren?: boolean;
  }): Promise<void> {
    await this.axiosInstance.delete(`/website/groups/${groupId}`, { params });
  }

  // Collector Management Methods
  async listCollectors(params?: {
    filter?: string;
    size?: number;
    offset?: number;
    fields?: string;
  }): Promise<LMPaginatedResponse<LMCollector>> {
    // Format the filter for LogicMonitor API
    const formattedParams = {
      ...params,
      filter: params?.filter ? formatLogicMonitorFilter(params.filter) : undefined,
      // Omit fields parameter if it's "*" (which means all fields)
      fields: params?.fields === '*' ? undefined : params?.fields
    };
    
    this.logger.debug('Collectors list request', { 
      originalFilter: params?.filter,
      formattedFilter: formattedParams.filter,
      params: formattedParams 
    });
    
    // Use pagination helper to automatically fetch all pages
    return this.paginateAll<LMCollector>('/setting/collector/collectors', formattedParams);
  }

  // Alert methods
  async listAlerts(params?: {
    filter?: string;
    fields?: string;
    size?: number;
    offset?: number;
    sort?: string;
    needMessage?: boolean;
    customColumns?: string;
  }): Promise<LMAlertPaginatedResponse> {
    const formattedParams = {
      ...params,
      filter: params?.filter ? formatLogicMonitorFilter(params.filter) : undefined,
      // Omit fields parameter if it's "*" (which means all fields)
      fields: params?.fields === '*' ? undefined : params?.fields
    };

    // Alert pagination is special - negative totals indicate "at least" that many results
    // We need custom pagination logic for alerts
    const response = await this.axiosInstance.get('/alert/alerts', { params: formattedParams });
    const firstPage = response.data as LMAlertPaginatedResponse;
    
    // If total is positive and we have all results, return as-is
    if (firstPage.total >= 0 && firstPage.items.length >= firstPage.total) {
      return firstPage;
    }
    
    // If total is negative, we have "at least" Math.abs(total) results
    // Continue paginating until we get all results
    const absoluteTotal = Math.abs(firstPage.total);
    const allItems = [...firstPage.items];
    let currentOffset = formattedParams.offset || 0;
    const pageSize = formattedParams.size || 50;
    
    // For negative totals, keep fetching until we get less than a full page
    if (firstPage.total < 0) {
      while (allItems.length === pageSize + currentOffset) {
        currentOffset += pageSize;
        try {
          const nextResponse = await this.axiosInstance.get('/alert/alerts', {
            params: { ...formattedParams, offset: currentOffset }
          });
          const nextPage = nextResponse.data as LMAlertPaginatedResponse;
          
          if (nextPage.items.length === 0) {
            break;
          }
          
          allItems.push(...nextPage.items);
          this.logger.debug(`Alert pagination: fetched ${allItems.length} total alerts (at least ${absoluteTotal})`);
          
          // If we got less than a full page, we're done
          if (nextPage.items.length < pageSize) {
            break;
          }
        } catch (error) {
          this.logger.error('Error during alert pagination', error);
          break;
        }
      }
    } else if (allItems.length < firstPage.total) {
      // Positive total but need more pages
      while (allItems.length < firstPage.total) {
        currentOffset += firstPage.items.length;
        try {
          const nextResponse = await this.axiosInstance.get('/alert/alerts', {
            params: { ...formattedParams, offset: currentOffset }
          });
          const nextPage = nextResponse.data as LMAlertPaginatedResponse;
          
          if (nextPage.items.length === 0) {
            break;
          }
          
          allItems.push(...nextPage.items);
          this.logger.debug(`Alert pagination: fetched ${allItems.length}/${firstPage.total} alerts`);
        } catch (error) {
          this.logger.error('Error during alert pagination', error);
          break;
        }
      }
    }
    
    return {
      ...firstPage,
      total: allItems.length, // Return actual count for negative totals
      items: allItems
    };
  }

  async getAlert(alertId: string): Promise<LMAlert> {
    try {
      const response = await this.axiosInstance.get(`/alert/alerts/${alertId}`);
      this.logger.debug('Get alert response', { 
        alertId,
        hasData: !!response.data,
        hasNestedData: !!(response.data?.data),
        keys: response.data ? Object.keys(response.data) : []
      });
      
      // LogicMonitor API might return the alert directly or wrapped in a data property
      const alert = response.data.data || response.data;
      
      if (!alert || typeof alert.id === 'undefined') {
        throw new Error(`Invalid alert response structure for alert ${alertId}`);
      }
      
      return alert;
    } catch (error) {
      this.logger.error('Error getting alert', { alertId, error });
      throw error;
    }
  }

  async ackAlert(alertId: string, ackComment: string): Promise<void> {
    await this.axiosInstance.post(`/alert/alerts/${alertId}/ack`, { ackComment });
  }

  async addAlertNote(alertId: string, ackComment: string): Promise<void> {
    await this.axiosInstance.post(`/alert/alerts/${alertId}/note`, { ackComment });
  }

  async escalateAlert(alertId: string): Promise<void> {
    await this.axiosInstance.post(`/alert/alerts/${alertId}/escalate`);
  }
}