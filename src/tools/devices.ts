import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogicMonitorClient } from '../api/client.js';
import {
  listDevicesSchema,
  getDeviceSchema,
  createDeviceSchema,
  updateDeviceSchema,
  deleteDeviceSchema
} from '../utils/validation.js';
import { isBatchInput, normalizeToArray, extractBatchOptions } from '../utils/schemaHelpers.js';
import { batchProcessor } from '../utils/batchProcessor.js';

export const deviceTools: Tool[] = [
  {
    name: 'lm_list_devices',
    description: 'List devices with optional filtering. Automatically paginates through all results if total exceeds requested size.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'LogicMonitor query syntax. Examples: "name:*villa*", "hostStatus:alive", "displayName:prod*". Wildcards and special characters will be automatically quoted. Available operators: >: (greater than or equals), <: (less than or equals), > (greater than), < (less than), !: (does not equal), : (equals), ~ (includes), !~ (does not include).'
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
          description: 'Comma-separated list of fields to return (e.g., "id,displayName,hostStatus"). Omit or use "*" for all fields.'
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
    description: 'Add a new device or multiple devices to monitoring',
    inputSchema: {
      type: 'object',
      properties: {
        // Single device properties
        displayName: {
          type: 'string',
          description: 'Display name for the device (for single creation)'
        },
        name: {
          type: 'string',
          description: 'Hostname or IP address (for single creation)'
        },
        hostGroupIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of host group IDs (for single creation)'
        },
        preferredCollectorId: {
          type: 'number',
          description: 'Preferred collector ID (for single creation)'
        },
        disableAlerting: {
          type: 'boolean',
          description: 'Whether to disable alerting (for single creation)'
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
          description: 'Custom properties (for single creation)'
        },
        // Batch properties
        devices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              displayName: {
                type: 'string',
                description: 'Display name for the device'
              },
              name: {
                type: 'string',
                description: 'Hostname or IP address'
              },
              hostGroupIds: {
                type: 'array',
                items: { type: 'number' },
                description: 'Array of host group IDs'
              },
              preferredCollectorId: {
                type: 'number',
                description: 'Preferred collector ID'
              },
              disableAlerting: {
                type: 'boolean',
                description: 'Whether to disable alerting'
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
                description: 'Custom properties'
              }
            },
            required: ['displayName', 'name', 'hostGroupIds', 'preferredCollectorId']
          },
          description: 'Array of devices to create (for batch creation)'
        },
        batchOptions: {
          type: 'object',
          properties: {
            maxConcurrent: {
              type: 'number',
              description: 'Maximum concurrent requests (default: 5)',
              minimum: 1,
              maximum: 50
            },
            continueOnError: {
              type: 'boolean',
              description: 'Continue processing if some items fail (default: true)'
            }
          },
          description: 'Options for batch processing'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'lm_update_device',
    description: 'Update one or more existing device configurations',
    inputSchema: {
      type: 'object',
      properties: {
        // Single device properties
        deviceId: {
          type: 'number',
          description: 'The ID of the device to update (for single update)'
        },
        displayName: {
          type: 'string',
          description: 'New display name for the device (for single update)'
        },
        hostGroupIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'New array of host group IDs (for single update)'
        },
        disableAlerting: {
          type: 'boolean',
          description: 'Whether to disable alerting (for single update)'
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
          description: 'Custom properties to update (for single update)'
        },
        // Batch properties
        devices: {
          type: 'array',
          items: {
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
          },
          description: 'Array of devices to update (for batch update)'
        },
        batchOptions: {
          type: 'object',
          properties: {
            maxConcurrent: {
              type: 'number',
              description: 'Maximum concurrent requests (default: 5)',
              minimum: 1,
              maximum: 50
            },
            continueOnError: {
              type: 'boolean',
              description: 'Continue processing if some items fail (default: true)'
            }
          },
          description: 'Options for batch processing'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'lm_delete_device',
    description: 'Remove one or more devices from monitoring',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'number',
          description: 'The ID of the device to delete (for single deletion)'
        },
        devices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              deviceId: {
                type: 'number',
                description: 'The ID of the device to delete'
              }
            },
            required: ['deviceId']
          },
          description: 'Array of devices to delete (for batch deletion)'
        },
        batchOptions: {
          type: 'object',
          properties: {
            maxConcurrent: {
              type: 'number',
              description: 'Maximum concurrent requests (default: 5)',
              minimum: 1,
              maximum: 50
            },
            continueOnError: {
              type: 'boolean',
              description: 'Continue processing if some items fail (default: true)'
            }
          },
          description: 'Options for batch processing'
        }
      },
      additionalProperties: false
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
      
      // If fields were specified, return the raw data as LogicMonitor filtered it
      if (validated.fields) {
        return {
          total: result.total || 0,
          devices: result.items || []
        };
      }
      
      // Otherwise, return our curated default field set
      return {
        total: result.total || 0,
        devices: (result.items || []).map(device => ({
          id: device.id,
          displayName: device.displayName,
          name: device.name,
          hostGroupIds: device.hostGroupIds,
          preferredCollectorId: device.preferredCollectorId,
          customProperties: device.customProperties,
          hostStatus: device.hostStatus,
          alertStatus: device.alertStatus,
          alertStatusPriority: device.alertStatusPriority,
          disableAlerting: device.disableAlerting,
          enableNetflow: device.enableNetflow,
          createdOn: device.createdOn ? new Date(device.createdOn * 1000).toISOString() : undefined,
          updatedOn: device.updatedOn ? new Date(device.updatedOn * 1000).toISOString() : undefined,
          sdtStatus: device.sdtStatus,
          alertDisableStatus: device.alertDisableStatus
        }))
      };
    }

    case 'lm_get_device': {
      const validated = await getDeviceSchema.validateAsync(args);
      const device = await client.getDevice(validated.deviceId);
      return {
        id: device.id,
        displayName: device.displayName,
        name: device.name,
        hostGroupIds: device.hostGroupIds,
        preferredCollectorId: device.preferredCollectorId,
        customProperties: device.customProperties,
        hostStatus: device.hostStatus,
        alertStatus: device.alertStatus,
        alertStatusPriority: device.alertStatusPriority,
        disableAlerting: device.disableAlerting,
        enableNetflow: device.enableNetflow,
        createdOn: device.createdOn ? new Date(device.createdOn * 1000).toISOString() : undefined,
        updatedOn: device.updatedOn ? new Date(device.updatedOn * 1000).toISOString() : undefined,
        sdtStatus: device.sdtStatus,
        alertDisableStatus: device.alertDisableStatus
      };
    }

    case 'lm_create_device': {
      const validated = await createDeviceSchema.validateAsync(args);
      
      // Check if this is a batch request
      const isBatch = isBatchInput(validated, 'devices');
      const devices = normalizeToArray(validated, 'devices');
      const batchOptions = extractBatchOptions(validated);
      
      // Process devices (single or batch)
      const result = await batchProcessor.processBatch(
        devices,
        async (device) => {
          const created = await client.createDevice({
            displayName: device.displayName,
            name: device.name,
            hostGroupIds: device.hostGroupIds,
            preferredCollectorId: device.preferredCollectorId,
            disableAlerting: device.disableAlerting,
            customProperties: device.properties
          });
          return {
            id: created.id,
            displayName: created.displayName,
            name: created.name,
            message: `Device '${created.displayName}' created successfully`
          };
        },
        {
          maxConcurrent: batchOptions.maxConcurrent || 5,
          continueOnError: batchOptions.continueOnError ?? true,
          retryOnRateLimit: true
        }
      );
      
      // Return single result for single input, full batch result for batch input
      if (!isBatch) {
        const singleResult = result.results[0];
        if (!singleResult.success) {
          throw new Error(singleResult.error || 'Failed to create device');
        }
        return {
          success: true,
          device: singleResult.data
        };
      }
      
      // Return batch result
      return {
        success: result.success,
        summary: result.summary,
        devices: result.results.map(r => ({
          index: r.index,
          success: r.success,
          ...(r.success ? { device: r.data } : { error: r.error })
        }))
      };
    }

    case 'lm_update_device': {
      const validated = await updateDeviceSchema.validateAsync(args);
      
      // Check if this is a batch request
      const isBatch = isBatchInput(validated, 'devices');
      const devices = normalizeToArray(validated, 'devices');
      const batchOptions = extractBatchOptions(validated);
      
      // Process devices (single or batch)
      const result = await batchProcessor.processBatch(
        devices,
        async (device) => {
          const { deviceId, ...updates } = device;
          const updated = await client.updateDevice(deviceId, updates);
          return {
            id: updated.id,
            displayName: updated.displayName,
            message: `Device '${updated.displayName}' updated successfully`
          };
        },
        {
          maxConcurrent: batchOptions.maxConcurrent || 5,
          continueOnError: batchOptions.continueOnError ?? true,
          retryOnRateLimit: true
        }
      );
      
      // Return single result for single input, full batch result for batch input
      if (!isBatch) {
        const singleResult = result.results[0];
        if (!singleResult.success) {
          throw new Error(singleResult.error || 'Failed to update device');
        }
        return {
          success: true,
          device: singleResult.data
        };
      }
      
      // Return batch result
      return {
        success: result.success,
        summary: result.summary,
        devices: result.results.map(r => ({
          index: r.index,
          success: r.success,
          ...(r.success ? { device: r.data } : { error: r.error })
        }))
      };
    }

    case 'lm_delete_device': {
      const validated = await deleteDeviceSchema.validateAsync(args);
      
      // Check if this is a batch request
      const isBatch = isBatchInput(validated, 'devices');
      const devices = normalizeToArray(validated, 'devices');
      const batchOptions = extractBatchOptions(validated);
      
      // Process devices (single or batch)
      const result = await batchProcessor.processBatch(
        devices,
        async (device) => {
          await client.deleteDevice(device.deviceId);
          return {
            deviceId: device.deviceId,
            message: `Device ${device.deviceId} deleted successfully`
          };
        },
        {
          maxConcurrent: batchOptions.maxConcurrent || 5,
          continueOnError: batchOptions.continueOnError ?? true,
          retryOnRateLimit: true
        }
      );
      
      // Return single result for single input, full batch result for batch input
      if (!isBatch) {
        const singleResult = result.results[0];
        if (!singleResult.success) {
          throw new Error(singleResult.error || 'Failed to delete device');
        }
        return {
          success: true,
          ...singleResult.data
        };
      }
      
      // Return batch result
      return {
        success: result.success,
        summary: result.summary,
        devices: result.results.map(r => ({
          index: r.index,
          success: r.success,
          ...(r.success ? r.data : { error: r.error })
        }))
      };
    }

    default:
      throw new Error(`Unknown device tool: ${toolName}`);
  }
}