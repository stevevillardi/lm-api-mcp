import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogicMonitorClient } from '../api/client.js';
import {
  listWebsiteGroupsSchema,
  getWebsiteGroupSchema,
  createWebsiteGroupSchema,
  updateWebsiteGroupSchema,
  deleteWebsiteGroupSchema
} from '../utils/validation.js';
import { batchProcessor } from '../utils/batchProcessor.js';
import { isBatchInput, normalizeToArray, extractBatchOptions } from '../utils/schemaHelpers.js';

export const websiteGroupTools: Tool[] = [
  {
    name: 'lm_list_website_groups',
    description: 'List website groups with optional filtering. Automatically paginates through all results if total exceeds requested size.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'LogicMonitor query syntax. Examples: "name:*prod*", "parentId:1". Wildcards and special characters will be automatically quoted. Available operators: >: (greater than or equals), <: (less than or equals), > (greater than), < (less than), !: (does not equal), : (equals), ~ (includes), !~ (does not include).'
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
        }
      }
    }
  },
  {
    name: 'lm_get_website_group',
    description: 'Get detailed information about a website group',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'number',
          description: 'The ID of the website group to retrieve'
        }
      },
      required: ['groupId']
    }
  },
  {
    name: 'lm_create_website_group',
    description: 'Create new website group(s). Supports both single and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        // Single mode properties
        name: {
          type: 'string',
          description: 'Name of the website group'
        },
        parentId: {
          type: 'number',
          description: 'Parent group ID (1 = root)'
        },
        description: {
          type: 'string',
          description: 'Description of the group'
        },
        disableAlerting: {
          type: 'boolean',
          description: 'Disable alerting for this group'
        },
        stopMonitoring: {
          type: 'boolean',
          description: 'Stop monitoring websites in this group'
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
              disableAlerting: { type: 'boolean' },
              stopMonitoring: { type: 'boolean' },
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
          description: 'Array of website groups to create (batch mode)'
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
    name: 'lm_update_website_group',
    description: 'Update existing website group(s). Supports both single and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        // Single mode properties
        groupId: {
          type: 'number',
          description: 'The ID of the website group to update'
        },
        name: {
          type: 'string',
          description: 'New name for the group'
        },
        description: {
          type: 'string',
          description: 'New description'
        },
        disableAlerting: {
          type: 'boolean',
          description: 'Disable alerting'
        },
        stopMonitoring: {
          type: 'boolean',
          description: 'Stop monitoring'
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
              disableAlerting: { type: 'boolean' },
              stopMonitoring: { type: 'boolean' },
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
            required: ['groupId']
          },
          description: 'Array of website groups to update (batch mode)'
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
    name: 'lm_delete_website_group',
    description: 'Delete website group(s). Supports both single and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        // Single mode properties
        groupId: {
          type: 'number',
          description: 'The ID of the website group to delete'
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
          description: 'Array of website groups to delete (batch mode)'
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

export async function handleWebsiteGroupTool(
  toolName: string,
  args: any,
  client: LogicMonitorClient
): Promise<any> {
  switch (toolName) {
    case 'lm_list_website_groups': {
      const validated = await listWebsiteGroupsSchema.validateAsync(args);
      const result = await client.listWebsiteGroups(validated);
      
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
          disableAlerting: group.disableAlerting,
          stopMonitoring: group.stopMonitoring,
          numOfWebsites: group.numOfWebsites,
          numOfDirectWebsites: group.numOfDirectWebsites,
          numOfDirectSubGroups: group.numOfDirectSubGroups,
          hasWebsitesDisabled: group.hasWebsitesDisabled,
          properties: group.properties
        }))
      };
    }

    case 'lm_get_website_group': {
      const validated = await getWebsiteGroupSchema.validateAsync(args);
      const group = await client.getWebsiteGroup(validated.groupId);
      return {
        id: group.id,
        name: group.name,
        fullPath: group.fullPath,
        parentId: group.parentId,
        description: group.description,
        disableAlerting: group.disableAlerting,
        stopMonitoring: group.stopMonitoring,
        numOfWebsites: group.numOfWebsites,
        numOfDirectWebsites: group.numOfDirectWebsites,
        numOfDirectSubGroups: group.numOfDirectSubGroups,
        hasWebsitesDisabled: group.hasWebsitesDisabled,
        testLocation: group.testLocation,
        properties: group.properties
      };
    }

    case 'lm_create_website_group': {
      const validated = await createWebsiteGroupSchema.validateAsync(args);
      
      // Check if this is a batch request
      const isBatch = isBatchInput(validated, 'groups');
      const groups = normalizeToArray(validated, 'groups');
      const batchOptions = extractBatchOptions(validated);
      
      // Process groups (single or batch)
      const result = await batchProcessor.processBatch(
        groups,
        async (group) => {
          const created = await client.createWebsiteGroup({
            name: group.name,
            parentId: group.parentId,
            description: group.description,
            disableAlerting: group.disableAlerting,
            stopMonitoring: group.stopMonitoring,
            properties: group.properties
          });
          return {
            id: created.id,
            name: created.name,
            fullPath: created.fullPath,
            message: `Website group '${created.name}' created successfully`
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
          throw new Error(singleResult.error || 'Failed to create website group');
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

    case 'lm_update_website_group': {
      const validated = await updateWebsiteGroupSchema.validateAsync(args);
      
      // Check if this is a batch request
      const isBatch = isBatchInput(validated, 'groups');
      const groups = normalizeToArray(validated, 'groups');
      const batchOptions = extractBatchOptions(validated);
      
      // Process groups (single or batch)
      const result = await batchProcessor.processBatch(
        groups,
        async (group) => {
          const { groupId, ...updates } = group;
          const updated = await client.updateWebsiteGroup(groupId, updates);
          return {
            id: updated.id,
            name: updated.name,
            fullPath: updated.fullPath,
            message: `Website group '${updated.name}' updated successfully`
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
          throw new Error(singleResult.error || 'Failed to update website group');
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

    case 'lm_delete_website_group': {
      const validated = await deleteWebsiteGroupSchema.validateAsync(args);
      
      // Check if this is a batch request
      const isBatch = isBatchInput(validated, 'groups');
      const groups = normalizeToArray(validated, 'groups');
      const batchOptions = extractBatchOptions(validated);
      
      // Process groups (single or batch)
      const result = await batchProcessor.processBatch(
        groups,
        async (group) => {
          await client.deleteWebsiteGroup(group.groupId, {
            deleteChildren: group.deleteChildren
          });
          return {
            groupId: group.groupId,
            message: `Website group ${group.groupId} deleted successfully`
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
          throw new Error(singleResult.error || 'Failed to delete website group');
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
      throw new Error(`Unknown website group tool: ${toolName}`);
  }
}