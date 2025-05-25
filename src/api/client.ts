import axios, { AxiosInstance, AxiosError } from 'axios';
import winston from 'winston';
import { 
  LMDevice, 
  LMDeviceGroup, 
  LMCollector,
  LMPaginatedResponse, 
  LMErrorResponse 
} from '../types/logicmonitor.js';
import { formatLogicMonitorFilter } from '../utils/filters.js';

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
      response => response,
      this.handleError.bind(this)
    );
  }

  private handleError(error: AxiosError<LMErrorResponse>) {
    if (error.response) {
      const { status, data } = error.response;
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
      filter: params?.filter ? formatLogicMonitorFilter(params.filter) : undefined
    };
    
    this.logger.debug('Device list request', { 
      originalFilter: params?.filter,
      formattedFilter: formattedParams.filter,
      params: formattedParams 
    });
    
    const response = await this.axiosInstance.get<LMPaginatedResponse<LMDevice>>('/device/devices', {
      params: formattedParams
    });
    return response.data;
  }

  async getDevice(deviceId: number): Promise<LMDevice> {
    const response = await this.axiosInstance.get<{ data: LMDevice }>(`/device/devices/${deviceId}`);
    return response.data.data;
  }

  async createDevice(device: {
    displayName: string;
    hostName: string;
    hostGroupIds: number[];
    preferredCollectorId: number;
    disableAlerting?: boolean;
    customProperties?: Array<{ name: string; value: string }>;
  }): Promise<LMDevice> {
    // Convert hostGroupIds array to comma-separated string and map hostName to name
    const payload = {
      name: device.hostName,  // LogicMonitor API expects 'name' field
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
    return response.data.data;
  }

  async deleteDevice(deviceId: number): Promise<void> {
    await this.axiosInstance.delete(`/device/devices/${deviceId}`);
  }

  // Device Group Management Methods
  async listDeviceGroups(params?: {
    filter?: string;
    fields?: string;
    parentId?: number;
  }): Promise<LMPaginatedResponse<LMDeviceGroup>> {
    // Format the filter for LogicMonitor API
    const formattedParams = {
      ...params,
      filter: params?.filter ? formatLogicMonitorFilter(params.filter) : undefined
    };
    
    this.logger.debug('Device groups list request', { 
      originalFilter: params?.filter,
      formattedFilter: formattedParams.filter,
      params: formattedParams 
    });
    
    const response = await this.axiosInstance.get<LMPaginatedResponse<LMDeviceGroup>>(
      '/device/groups',
      { params: formattedParams }
    );
    return response.data;
  }

  async getDeviceGroup(groupId: number): Promise<LMDeviceGroup> {
    const response = await this.axiosInstance.get<{ data: LMDeviceGroup }>(
      `/device/groups/${groupId}`
    );
    return response.data.data;
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
    return response.data.data;
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
    return response.data.data;
  }

  async deleteDeviceGroup(groupId: number, params?: {
    deleteChildren?: boolean;
  }): Promise<void> {
    await this.axiosInstance.delete(`/device/groups/${groupId}`, { params });
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
      filter: params?.filter ? formatLogicMonitorFilter(params.filter) : undefined
    };
    
    this.logger.debug('Collectors list request', { 
      originalFilter: params?.filter,
      formattedFilter: formattedParams.filter,
      params: formattedParams 
    });
    
    const response = await this.axiosInstance.get<LMPaginatedResponse<LMCollector>>(
      '/setting/collector/collectors',
      { params: formattedParams }
    );
    return response.data;
  }
}