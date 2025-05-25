export interface LMDevice {
  id: number;
  displayName: string;
  hostName: string;
  name: string;
  hostGroupIds: string;  // Actually a comma-separated string like "16,4,3"
  preferredCollectorId?: number;
  preferredCollectorGroupId?: number;
  disableAlerting: boolean;
  enableNetflow: boolean;
  customProperties: Array<{
    name: string;
    value: string;
  }>;
  systemProperties: Array<{
    name: string;
    value: string;
  }>;
  autoProperties: Array<{
    name: string;
    value: string;
  }>;
  inheritedProperties: Array<{
    name: string;
    value: string;
  }>;
  createdOn: number;
  updatedOn: number;
  hostStatus: string;
  alertStatus: string;
  alertStatusPriority: number;
  alertDisableStatus: string;
  sdtStatus: string;
}

export interface LMDeviceGroup {
  id: number;
  name: string;
  description: string;
  parentId: number;
  fullPath: string;
  appliesTo?: string;
  disableAlerting: boolean;
  defaultCollectorId?: number;
  defaultCollectorGroupId?: number;
  customProperties: Array<{
    name: string;
    value: string;
  }>;
  systemProperties: Array<{
    name: string;
    value: string;
  }>;
  inheritedProperties: Array<{
    name: string;
    value: string;
  }>;
  createdOn: number;
  updatedOn: number;
  numOfDirectDevices: number;
  numOfDirectSubGroups: number;
  numOfDevices: number;
  numOfSubGroups: number;
  alertStatus: string;
  sdtStatus: string;
}

export interface LMPaginatedResponse<T> {
  total: number;
  searchId?: string;
  items: T[];
}

export interface LMCollector {
  id: number;
  description: string;
  hostname: string;
  status: string;
  platform: string;
  version: string;
  build: string;
  arch: string;
  collectorGroupId: number;
  collectorGroupName: string;
  escalatingChainId: number;
  enableFailBack: boolean;
  enableFailOverOnCollectorDevice: boolean;
  resendIval: number;
  suppressAlertClear: boolean;
  userPermission: string;
  createdOn: number;
  updatedOn: number;
  needAutoCreateCollectorDevice: boolean;
  collectorDeviceId: number;
  numberOfHosts: number;
  inSDT: boolean;
  lastSentNotificationOn: number;
  hasFailOverDevice: boolean;
  onetimeUpgradeInfo: string;
  watchdogUpdatedOn: number;
  watchdogProcessUpdatedOn: number;
  customProperties: Array<{
    name: string;
    value: string;
  }>;
}

export interface LMErrorResponse {
  status: number;
  errmsg: string;
}