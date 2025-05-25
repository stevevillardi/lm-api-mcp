import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogicMonitorClient } from '../api/client.js';
import { listCollectorsSchema } from '../utils/validation.js';

export const collectorTools: Tool[] = [
  {
    name: 'lm_list_collectors',
    description: 'List LogicMonitor collectors with optional filtering and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'LogicMonitor query syntax. Examples: "status:alive", "hostname:*prod*", "platform:linux". Wildcards and special characters will be automatically quoted.'
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
  }
];

export async function handleCollectorTool(
  toolName: string,
  args: any,
  client: LogicMonitorClient
): Promise<any> {
  switch (toolName) {
    case 'lm_list_collectors': {
      const validated = await listCollectorsSchema.validateAsync(args);
      const result = await client.listCollectors(validated);
      
      // Check if we have valid data
      if (!result) {
        return {
          total: 0,
          collectors: [],
          error: 'No data returned from LogicMonitor API'
        };
      }
      
      return {
        total: result.total || 0,
        collectors: (result.items || []).map(collector => ({
          id: collector.id,
          description: collector.description,
          hostname: collector.hostname,
          status: collector.status,
          platform: collector.platform,
          version: collector.version,
          collectorGroupName: collector.collectorGroupName,
          numberOfHosts: collector.numberOfHosts,
          inSDT: collector.inSDT
        }))
      };
    }

    default:
      throw new Error(`Unknown collector tool: ${toolName}`);
  }
}