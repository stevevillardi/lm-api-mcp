import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogicMonitorClient } from '../api/client.js';
import {
  listDevicesSchema,
  getDeviceSchema,
  createDeviceSchema,
  updateDeviceSchema,
  deleteDeviceSchema
} from '../utils/validation.js';

export const deviceTools: Tool[] = [
  {
    name: 'lm_list_devices',
    description: 'List devices with optional filtering and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'LogicMonitor query syntax. Examples: "name:*villa*", "hostStatus:alive", "displayName:prod*". Wildcards and special characters will be automatically quoted.'
        },
        size: {
          type: 'number',
          description: 'Results per page (max: 1000)',
          minimum: 1,
          maximum: 1000
        },
        offset: {
          type: 'number',
          description: 'Pagination offset',
          minimum: 0
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of fields to return'
        }
      }
    }
  },
  {
    name: 'lm_get_device',
    description: 'Get detailed information about a specific device',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'number',
          description: 'The ID of the device to retrieve'
        }
      },
      required: ['deviceId']
    }
  },
  {
    name: 'lm_create_device',
    description: 'Add a new device to monitoring',
    inputSchema: {
      type: 'object',
      properties: {
        displayName: {
          type: 'string',
          description: 'Display name for the device'
        },
        hostName: {
          type: 'string',
          description: 'Hostname or IP address of the device'
        },
        hostGroupIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of host group IDs the device belongs to',
          minItems: 1
        },
        preferredCollectorId: {
          type: 'number',
          description: 'ID of the preferred collector (required)'
        },
        disableAlerting: {
          type: 'boolean',
          description: 'Whether to disable alerting for this device'
        },
        properties: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'string' }
            },
            required: ['name', 'value']
          },
          description: 'Custom properties for the device'
        }
      },
      required: ['displayName', 'hostName', 'hostGroupIds', 'preferredCollectorId']
    }
  },
  {
    name: 'lm_update_device',
    description: 'Update an existing device configuration',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'number',
          description: 'The ID of the device to update'
        },
        displayName: {
          type: 'string',
          description: 'New display name for the device'
        },
        hostGroupIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'New array of host group IDs'
        },
        disableAlerting: {
          type: 'boolean',
          description: 'Whether to disable alerting'
        },
        customProperties: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'string' }
            },
            required: ['name', 'value']
          },
          description: 'Custom properties to update'
        }
      },
      required: ['deviceId']
    }
  },
  {
    name: 'lm_delete_device',
    description: 'Remove a device from monitoring',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'number',
          description: 'The ID of the device to delete'
        }
      },
      required: ['deviceId']
    }
  }
];

export async function handleDeviceTool(
  toolName: string,
  args: any,
  client: LogicMonitorClient
): Promise<any> {
  switch (toolName) {
    case 'lm_list_devices': {
      const validated = await listDevicesSchema.validateAsync(args);
      const result = await client.listDevices(validated);
      
      // Check if we have valid data
      if (!result) {
        return {
          total: 0,
          devices: [],
          error: 'No data returned from LogicMonitor API'
        };
      }
      
      return {
        total: result.total || 0,
        devices: (result.items || []).map(device => ({
          id: device.id,
          displayName: device.displayName,
          hostName: device.hostName,
          hostStatus: device.hostStatus,
          alertStatus: device.alertStatus,
          disableAlerting: device.disableAlerting
        }))
      };
    }

    case 'lm_get_device': {
      const validated = await getDeviceSchema.validateAsync(args);
      const device = await client.getDevice(validated.deviceId);
      return {
        id: device.id,
        displayName: device.displayName,
        hostName: device.hostName,
        hostGroupIds: device.hostGroupIds,
        hostStatus: device.hostStatus,
        alertStatus: device.alertStatus,
        disableAlerting: device.disableAlerting,
        customProperties: device.customProperties,
        createdOn: new Date(device.createdOn * 1000).toISOString(),
        updatedOn: new Date(device.updatedOn * 1000).toISOString()
      };
    }

    case 'lm_create_device': {
      const validated = await createDeviceSchema.validateAsync(args);
      const device = await client.createDevice({
        displayName: validated.displayName,
        hostName: validated.hostName,
        hostGroupIds: validated.hostGroupIds,
        preferredCollectorId: validated.preferredCollectorId,
        disableAlerting: validated.disableAlerting,
        customProperties: validated.properties
      });
      return {
        success: true,
        device: {
          id: device.id,
          displayName: device.displayName,
          hostName: device.hostName,
          message: `Device '${device.displayName}' created successfully`
        }
      };
    }

    case 'lm_update_device': {
      const validated = await updateDeviceSchema.validateAsync(args);
      const { deviceId, ...updates } = validated;
      const device = await client.updateDevice(deviceId, updates);
      return {
        success: true,
        device: {
          id: device.id,
          displayName: device.displayName,
          message: `Device '${device.displayName}' updated successfully`
        }
      };
    }

    case 'lm_delete_device': {
      const validated = await deleteDeviceSchema.validateAsync(args);
      await client.deleteDevice(validated.deviceId);
      return {
        success: true,
        message: `Device ${validated.deviceId} deleted successfully`
      };
    }

    default:
      throw new Error(`Unknown device tool: ${toolName}`);
  }
}