import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogicMonitorClient } from '../api/client.js';
import {
  listDeviceGroupsSchema,
  getDeviceGroupSchema,
  createDeviceGroupSchema,
  updateDeviceGroupSchema,
  deleteDeviceGroupSchema
} from '../utils/validation.js';

export const deviceGroupTools: Tool[] = [
  {
    name: 'lm_list_device_groups',
    description: 'List device groups with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'LogicMonitor query syntax. Examples: "name:*server*", "parentId:1". Wildcards and special characters will be automatically quoted.'
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of fields to return'
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
    description: 'Create a new device group',
    inputSchema: {
      type: 'object',
      properties: {
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
          description: 'Dynamic group query (e.g., "system.displayname =~ \"prod*\"")'
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
        }
      },
      required: ['name', 'parentId']
    }
  },
  {
    name: 'lm_update_device_group',
    description: 'Update an existing device group',
    inputSchema: {
      type: 'object',
      properties: {
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
        }
      },
      required: ['groupId']
    }
  },
  {
    name: 'lm_delete_device_group',
    description: 'Delete a device group',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'number',
          description: 'The ID of the device group to delete'
        },
        deleteChildren: {
          type: 'boolean',
          description: 'Whether to delete child groups'
        }
      },
      required: ['groupId']
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
      
      return {
        total: result.total || 0,
        groups: (result.items || []).map(group => ({
          id: group.id,
          name: group.name,
          fullPath: group.fullPath,
          parentId: group.parentId,
          description: group.description,
          numOfDevices: group.numOfDevices,
          numOfDirectDevices: group.numOfDirectDevices,
          alertStatus: group.alertStatus,
          appliesTo: group.appliesTo
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
        createdOn: new Date(group.createdOn * 1000).toISOString(),
        updatedOn: new Date(group.updatedOn * 1000).toISOString()
      };
    }

    case 'lm_create_device_group': {
      const validated = await createDeviceGroupSchema.validateAsync(args);
      const group = await client.createDeviceGroup({
        name: validated.name,
        parentId: validated.parentId,
        description: validated.description,
        appliesTo: validated.appliesTo,
        customProperties: validated.properties
      });
      return {
        success: true,
        group: {
          id: group.id,
          name: group.name,
          fullPath: group.fullPath,
          message: `Device group '${group.name}' created successfully`
        }
      };
    }

    case 'lm_update_device_group': {
      const validated = await updateDeviceGroupSchema.validateAsync(args);
      const { groupId, ...updates } = validated;
      const group = await client.updateDeviceGroup(groupId, updates);
      return {
        success: true,
        group: {
          id: group.id,
          name: group.name,
          fullPath: group.fullPath,
          message: `Device group '${group.name}' updated successfully`
        }
      };
    }

    case 'lm_delete_device_group': {
      const validated = await deleteDeviceGroupSchema.validateAsync(args);
      await client.deleteDeviceGroup(validated.groupId, {
        deleteChildren: validated.deleteChildren
      });
      return {
        success: true,
        message: `Device group ${validated.groupId} deleted successfully`
      };
    }

    default:
      throw new Error(`Unknown device group tool: ${toolName}`);
  }
}