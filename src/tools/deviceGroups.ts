import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogicMonitorClient } from '../api/client.js';
import {
  listDeviceGroupsSchema,
  getDeviceGroupSchema,
  createDeviceGroupSchema,
  updateDeviceGroupSchema,
  deleteDeviceGroupSchema
} from '../utils/validation.js';
import { batchProcessor } from '../utils/batchProcessor.js';
import { isBatchInput, normalizeToArray, extractBatchOptions } from '../utils/schemaHelpers.js';

export const deviceGroupTools: Tool[] = [
  {
    name: 'lm_list_device_groups',
    description: 'List device groups with optional filtering. Automatically paginates through all results if total exceeds requested size.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'LogicMonitor query syntax. Examples: "name:*server*", "parentId:1". Wildcards and special characters will be automatically quoted. Available operators: >: (greater than or equals), <: (less than or equals), > (greater than), < (less than), !: (does not equal), : (equals), ~ (includes), !~ (does not include).'
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
          description: 'Comma-separated list of fields to return (e.g., "id,name,fullPath"). Omit for curated fields or use "*" for all fields. Unless otherwise specified, you should default to using all fields.'
        },
        parentId: {
          type: 'number',
          description: 'List only children of specific group'
        }
      }
    }
  },
  {
    name: 'lm_get_device_group',
    description: 'Get detailed information about a device group',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'number',
          description: 'The ID of the device group to retrieve'
        }
      },
      required: ['groupId']
    }
  },
  {
    name: 'lm_create_device_group',
    description: 'Create new device group(s). Supports both single and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        // Single mode properties
        name: {
          type: 'string',
          description: 'Name of the device group'
        },
        parentId: {
          type: 'number',
          description: 'Parent group ID (1 = root)'
        },
        description: {
          type: 'string',
          description: 'Description of the group'
        },
        appliesTo: {
          type: 'string',
          description: 'Dynamic group query (e.g., "system.displayname =~ \\"prod*\\"")'
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
          description: 'Custom properties for the group'
        },
        // Batch mode properties
        groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              parentId: { type: 'number' },
              description: { type: 'string' },
              appliesTo: { type: 'string' },
              properties: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'string' }
                  },
                  required: ['name', 'value']
                }
              }
            },
            required: ['name', 'parentId']
          },
          description: 'Array of device groups to create (batch mode)'
        },
        batchOptions: {
          type: 'object',
          properties: {
            maxConcurrent: {
              type: 'number',
              description: 'Maximum concurrent operations (default: 5)',
              minimum: 1,
              maximum: 20
            },
            continueOnError: {
              type: 'boolean',
              description: 'Continue processing on errors (default: true)'
            }
          }
        }
      }
    }
  },
  {
    name: 'lm_update_device_group',
    description: 'Update existing device group(s). Supports both single and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        // Single mode properties
        groupId: {
          type: 'number',
          description: 'The ID of the device group to update'
        },
        name: {
          type: 'string',
          description: 'New name for the group'
        },
        description: {
          type: 'string',
          description: 'New description'
        },
        appliesTo: {
          type: 'string',
          description: 'New dynamic group query'
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
        },
        // Batch mode properties
        groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              groupId: { type: 'number' },
              name: { type: 'string' },
              description: { type: 'string' },
              appliesTo: { type: 'string' },
              customProperties: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'string' }
                  },
                  required: ['name', 'value']
                }
              }
            },
            required: ['groupId']
          },
          description: 'Array of device groups to update (batch mode)'
        },
        batchOptions: {
          type: 'object',
          properties: {
            maxConcurrent: {
              type: 'number',
              description: 'Maximum concurrent operations (default: 5)',
              minimum: 1,
              maximum: 20
            },
            continueOnError: {
              type: 'boolean',
              description: 'Continue processing on errors (default: true)'
            }
          }
        }
      }
    }
  },
  {
    name: 'lm_delete_device_group',
    description: 'Delete device group(s). Supports both single and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        // Single mode properties
        groupId: {
          type: 'number',
          description: 'The ID of the device group to delete'
        },
        deleteChildren: {
          type: 'boolean',
          description: 'Whether to delete child groups'
        },
        // Batch mode properties
        groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              groupId: { type: 'number' },
              deleteChildren: { type: 'boolean' }
            },
            required: ['groupId']
          },
          description: 'Array of device groups to delete (batch mode)'
        },
        batchOptions: {
          type: 'object',
          properties: {
            maxConcurrent: {
              type: 'number',
              description: 'Maximum concurrent operations (default: 5)',
              minimum: 1,
              maximum: 20
            },
            continueOnError: {
              type: 'boolean',
              description: 'Continue processing on errors (default: true)'
            }
          }
        }
      }
    }
  }
];

export async function handleDeviceGroupTool(
  toolName: string,
  args: any,
  client: LogicMonitorClient
): Promise<any> {
  switch (toolName) {
    case 'lm_list_device_groups': {
      const validated = await listDeviceGroupsSchema.validateAsync(args);
      const result = await client.listDeviceGroups(validated);
      
      // Check if we have valid data
      if (!result) {
        return {
          total: 0,
          groups: [],
          error: 'No data returned from LogicMonitor API'
        };
      }
      
      // If fields were specified, return the raw data as LogicMonitor filtered it
      if (validated.fields) {
        return {
          total: result.total || 0,
          groups: result.items || []
        };
      }
      
      // Otherwise, return our curated default field set
      return {
        total: result.total || 0,
        groups: (result.items || []).map(group => ({
          id: group.id,
          name: group.name,
          fullPath: group.fullPath,
          parentId: group.parentId,
          description: group.description,
          appliesTo: group.appliesTo,
          disableAlerting: group.disableAlerting,
          customProperties: group.customProperties,
          numOfDevices: group.numOfDevices,
          numOfDirectDevices: group.numOfDirectDevices,
          numOfSubGroups: group.numOfSubGroups,
          alertStatus: group.alertStatus,
          createdOn: group.createdOn ? new Date(group.createdOn * 1000).toISOString() : undefined,
          updatedOn: group.updatedOn ? new Date(group.updatedOn * 1000).toISOString() : undefined
        }))
      };
    }

    case 'lm_get_device_group': {
      const validated = await getDeviceGroupSchema.validateAsync(args);
      const group = await client.getDeviceGroup(validated.groupId);
      return {
        id: group.id,
        name: group.name,
        fullPath: group.fullPath,
        parentId: group.parentId,
        description: group.description,
        appliesTo: group.appliesTo,
        disableAlerting: group.disableAlerting,
        customProperties: group.customProperties,
        numOfDevices: group.numOfDevices,
        numOfDirectDevices: group.numOfDirectDevices,
        numOfSubGroups: group.numOfSubGroups,
        alertStatus: group.alertStatus,
        createdOn: group.createdOn ? new Date(group.createdOn * 1000).toISOString() : undefined,
        updatedOn: group.updatedOn ? new Date(group.updatedOn * 1000).toISOString() : undefined
      };
    }

    case 'lm_create_device_group': {
      const validated = await createDeviceGroupSchema.validateAsync(args);

      const isBatch = isBatchInput(validated, 'groups');
      const groups = normalizeToArray(validated, 'groups');
      const batchOptions = extractBatchOptions(validated);
      
      const result = await batchProcessor.processBatch(
        groups,
        async (group) => {
          const created = await client.createDeviceGroup({
            name: group.name,
            parentId: group.parentId,
            description: group.description,
            appliesTo: group.appliesTo,
            customProperties: group.properties
          });
          return {
            id: created.id,
            name: created.name,
            fullPath: created.fullPath
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
          throw new Error(singleResult.error || 'Failed to create device group');
        }
        return {
          success: true,
          group: singleResult.data
        };
      }
      
      // Return batch result
      return {
        success: result.success,
        summary: result.summary,
        groups: result.results.map(r => ({
          index: r.index,
          success: r.success,
          ...(r.success ? { group: r.data } : { error: r.error })
        }))
      };
    }

    case 'lm_update_device_group': {
      const validated = await updateDeviceGroupSchema.validateAsync(args);

      const isBatch = isBatchInput(validated, 'groups');
      const groups = normalizeToArray(validated, 'groups');
      const batchOptions = extractBatchOptions(validated);
      
      const result = await batchProcessor.processBatch(
        groups,
        async (group) => {
          const { groupId, ...updates } = group;
          const updated = await client.updateDeviceGroup(groupId, updates);
          return {
            id: updated.id,
            name: updated.name,
            fullPath: updated.fullPath
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
          throw new Error(singleResult.error || 'Failed to update device group');
        }
        return {
          success: true,
          group: singleResult.data
        };
      }
      
      // Return batch result
      return {
        success: result.success,
        summary: result.summary,
        groups: result.results.map(r => ({
          index: r.index,
          success: r.success,
          ...(r.success ? { group: r.data } : { error: r.error })
        }))
      };
    }

    case 'lm_delete_device_group': {
      const validated = await deleteDeviceGroupSchema.validateAsync(args);

      const isBatch = isBatchInput(validated, 'groups');
      const groups = normalizeToArray(validated, 'groups');
      const batchOptions = extractBatchOptions(validated);
      
      const result = await batchProcessor.processBatch(
        groups,
        async (group) => {
          await client.deleteDeviceGroup(group.groupId, {
            deleteChildren: group.deleteChildren
          });
          return {
            groupId: group.groupId
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
          throw new Error(singleResult.error || 'Failed to delete device group');
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
        groups: result.results.map(r => ({
          index: r.index,
          success: r.success,
          ...(r.success ? r.data : { error: r.error })
        }))
      };
    }

    default:
      throw new Error(`Unknown device group tool: ${toolName}`);
  }
}