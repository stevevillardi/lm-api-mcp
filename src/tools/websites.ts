import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogicMonitorClient } from '../api/client.js';
import {
  listWebsitesSchema,
  getWebsiteSchema,
  createWebsiteSchema,
  updateWebsiteSchema,
  deleteWebsiteSchema
} from '../utils/validation.js';
import { batchProcessor } from '../utils/batchProcessor.js';
import { isBatchInput, normalizeToArray, extractBatchOptions } from '../utils/schemaHelpers.js';

export const websiteTools: Tool[] = [
  {
    name: 'lm_list_websites',
    description: 'List websites with optional filtering. Automatically paginates through all results if total exceeds requested size.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'LogicMonitor query syntax. Examples: "name:*prod*", "domain:*example.com*". Wildcards and special characters will be automatically quoted. Available operators: >: (greater than or equals), <: (less than or equals), > (greater than), < (less than), !: (does not equal), : (equals), ~ (includes), !~ (does not include).'
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
          description: 'Comma-separated list of fields to return (e.g., "id,name,domain"). Omit for curated fields or use "*" for all fields. Unless otherwise specified, you should default to using all fields.'
        }
      }
    }
  },
  {
    name: 'lm_get_website',
    description: 'Get detailed information about a website',
    inputSchema: {
      type: 'object',
      properties: {
        websiteId: {
          type: 'number',
          description: 'The ID of the website to retrieve'
        }
      },
      required: ['websiteId']
    }
  },
  {
    name: 'lm_create_website',
    description: 'Create new website(s). Supports both single and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        // Single mode properties
        name: {
          type: 'string',
          description: 'Name of the website'
        },
        domain: {
          type: 'string',
          description: 'Domain or URL to monitor (e.g., "www.example.com")'
        },
        type: {
          type: 'string',
          enum: ['webcheck', 'pingcheck'],
          description: 'Type of check to perform'
        },
        groupId: {
          type: 'number',
          description: 'Website group ID (1 = root)'
        },
        description: {
          type: 'string',
          description: 'Description of the website'
        },
        disableAlerting: {
          type: 'boolean',
          description: 'Disable alerting for this website'
        },
        stopMonitoring: {
          type: 'boolean',
          description: 'Stop monitoring this website'
        },
        useDefaultAlertSetting: {
          type: 'boolean',
          description: 'Use default alert settings'
        },
        useDefaultLocationSetting: {
          type: 'boolean',
          description: 'Use default location settings'
        },
        pollingInterval: {
          type: 'number',
          description: 'Polling interval in minutes'
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
          description: 'Custom properties for the website'
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              HTTPMethod: { type: 'string' },
              statusCode: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['url']
          },
          description: 'Steps for web checks'
        },
        // Batch mode properties
        websites: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              domain: { type: 'string' },
              type: { type: 'string', enum: ['webcheck', 'pingcheck'] },
              groupId: { type: 'number' },
              description: { type: 'string' },
              disableAlerting: { type: 'boolean' },
              stopMonitoring: { type: 'boolean' },
              useDefaultAlertSetting: { type: 'boolean' },
              useDefaultLocationSetting: { type: 'boolean' },
              pollingInterval: { type: 'number' },
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
              },
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    HTTPMethod: { type: 'string' },
                    statusCode: { type: 'string' },
                    description: { type: 'string' }
                  },
                  required: ['url']
                }
              }
            },
            required: ['name', 'domain', 'type', 'groupId']
          },
          description: 'Array of websites to create (batch mode)'
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
    name: 'lm_update_website',
    description: 'Update existing website(s). Supports both single and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        // Single mode properties
        websiteId: {
          type: 'number',
          description: 'The ID of the website to update'
        },
        name: {
          type: 'string',
          description: 'New name for the website'
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
        useDefaultAlertSetting: {
          type: 'boolean',
          description: 'Use default alert settings'
        },
        useDefaultLocationSetting: {
          type: 'boolean',
          description: 'Use default location settings'
        },
        pollingInterval: {
          type: 'number',
          description: 'Polling interval in minutes'
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
        websites: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              websiteId: { type: 'number' },
              name: { type: 'string' },
              description: { type: 'string' },
              disableAlerting: { type: 'boolean' },
              stopMonitoring: { type: 'boolean' },
              useDefaultAlertSetting: { type: 'boolean' },
              useDefaultLocationSetting: { type: 'boolean' },
              pollingInterval: { type: 'number' },
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
            required: ['websiteId']
          },
          description: 'Array of websites to update (batch mode)'
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
    name: 'lm_delete_website',
    description: 'Delete website(s). Supports both single and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        // Single mode properties
        websiteId: {
          type: 'number',
          description: 'The ID of the website to delete'
        },
        // Batch mode properties
        websites: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              websiteId: { type: 'number' }
            },
            required: ['websiteId']
          },
          description: 'Array of websites to delete (batch mode)'
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

export async function handleWebsiteTool(
  toolName: string,
  args: any,
  client: LogicMonitorClient
): Promise<any> {
  switch (toolName) {
    case 'lm_list_websites': {
      const validated = await listWebsitesSchema.validateAsync(args);
      const result = await client.listWebsites(validated);
      
      // Check if we have valid data
      if (!result) {
        return {
          total: 0,
          websites: [],
          error: 'No data returned from LogicMonitor API'
        };
      }
      
      // If fields were specified, return the raw data as LogicMonitor filtered it
      if (validated.fields) {
        return {
          total: result.total || 0,
          websites: result.items || []
        };
      }
      
      // Otherwise, return our curated default field set
      return {
        total: result.total || 0,
        websites: (result.items || []).map(website => ({
          id: website.id,
          name: website.name,
          domain: website.domain,
          type: website.type,
          groupId: website.groupId,
          status: website.status,
          description: website.description,
          disableAlerting: website.disableAlerting,
          stopMonitoring: website.stopMonitoring,
          overallAlertLevel: website.overallAlertLevel,
          pollingInterval: website.pollingInterval,
          useDefaultAlertSetting: website.useDefaultAlertSetting,
          useDefaultLocationSetting: website.useDefaultLocationSetting,
          isInternal: website.isInternal,
          lastUpdated: website.lastUpdated ? new Date(website.lastUpdated * 1000).toISOString() : undefined
        }))
      };
    }

    case 'lm_get_website': {
      const validated = await getWebsiteSchema.validateAsync(args);
      const website = await client.getWebsite(validated.websiteId);
      return {
        id: website.id,
        name: website.name,
        domain: website.domain,
        type: website.type,
        groupId: website.groupId,
        status: website.status,
        description: website.description,
        disableAlerting: website.disableAlerting,
        stopMonitoring: website.stopMonitoring,
        overallAlertLevel: website.overallAlertLevel,
        pollingInterval: website.pollingInterval,
        useDefaultAlertSetting: website.useDefaultAlertSetting,
        useDefaultLocationSetting: website.useDefaultLocationSetting,
        isInternal: website.isInternal,
        transition: website.transition,
        testLocation: website.testLocation,
        checkpoints: website.checkpoints,
        steps: website.steps,
        properties: website.properties,
        lastUpdated: website.lastUpdated ? new Date(website.lastUpdated * 1000).toISOString() : undefined
      };
    }

    case 'lm_create_website': {
      const validated = await createWebsiteSchema.validateAsync(args);
      
      // Check if this is a batch request
      const isBatch = isBatchInput(validated, 'websites');
      const websites = normalizeToArray(validated, 'websites');
      const batchOptions = extractBatchOptions(validated);
      
      // Process websites (single or batch)
      const result = await batchProcessor.processBatch(
        websites,
        async (website) => {
          const created = await client.createWebsite({
            name: website.name,
            domain: website.domain,
            type: website.type,
            groupId: website.groupId,
            description: website.description,
            disableAlerting: website.disableAlerting,
            stopMonitoring: website.stopMonitoring,
            useDefaultAlertSetting: website.useDefaultAlertSetting,
            useDefaultLocationSetting: website.useDefaultLocationSetting,
            pollingInterval: website.pollingInterval,
            properties: website.properties,
            steps: website.steps
          });
          return {
            id: created.id,
            name: created.name,
            domain: created.domain,
            message: `Website '${created.name}' created successfully`
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
          throw new Error(singleResult.error || 'Failed to create website');
        }
        return {
          success: true,
          website: singleResult.data
        };
      }
      
      // Return batch result
      return {
        success: result.success,
        summary: result.summary,
        websites: result.results.map(r => ({
          index: r.index,
          success: r.success,
          ...(r.success ? { website: r.data } : { error: r.error })
        }))
      };
    }

    case 'lm_update_website': {
      const validated = await updateWebsiteSchema.validateAsync(args);
      
      // Check if this is a batch request
      const isBatch = isBatchInput(validated, 'websites');
      const websites = normalizeToArray(validated, 'websites');
      const batchOptions = extractBatchOptions(validated);
      
      // Process websites (single or batch)
      const result = await batchProcessor.processBatch(
        websites,
        async (website) => {
          const { websiteId, ...updates } = website;
          const updated = await client.updateWebsite(websiteId, updates);
          return {
            id: updated.id,
            name: updated.name,
            domain: updated.domain,
            message: `Website '${updated.name}' updated successfully`
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
          throw new Error(singleResult.error || 'Failed to update website');
        }
        return {
          success: true,
          website: singleResult.data
        };
      }
      
      // Return batch result
      return {
        success: result.success,
        summary: result.summary,
        websites: result.results.map(r => ({
          index: r.index,
          success: r.success,
          ...(r.success ? { website: r.data } : { error: r.error })
        }))
      };
    }

    case 'lm_delete_website': {
      const validated = await deleteWebsiteSchema.validateAsync(args);
      
      // Check if this is a batch request
      const isBatch = isBatchInput(validated, 'websites');
      const websites = normalizeToArray(validated, 'websites');
      const batchOptions = extractBatchOptions(validated);
      
      // Process websites (single or batch)
      const result = await batchProcessor.processBatch(
        websites,
        async (website) => {
          await client.deleteWebsite(website.websiteId);
          return {
            websiteId: website.websiteId,
            message: `Website ${website.websiteId} deleted successfully`
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
          throw new Error(singleResult.error || 'Failed to delete website');
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
        websites: result.results.map(r => ({
          index: r.index,
          success: r.success,
          ...(r.success ? r.data : { error: r.error })
        }))
      };
    }

    default:
      throw new Error(`Unknown website tool: ${toolName}`);
  }
}