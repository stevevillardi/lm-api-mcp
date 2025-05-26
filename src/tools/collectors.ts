import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogicMonitorClient } from '../api/client.js';
import { listCollectorsSchema } from '../utils/validation.js';

export const collectorTools: Tool[] = [
  {
    name: 'lm_list_collectors',
    description: 'List LogicMonitor collectors with optional filtering. Automatically paginates through all results if total exceeds requested size.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'LogicMonitor query syntax. Examples: "isDown:false", "hostname:*prod*", "platform:linux". Wildcards and special characters will be automatically quoted. Available operators: >: (greater than or equals), <: (less than or equals), > (greater than), < (less than), !: (does not equal), : (equals), ~ (includes), !~ (does not include).'
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
          description: 'Comma-separated list of fields to return (e.g., "id,description,platform"). Omit or use "*" for all fields.'
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
      
      // If fields were specified (and not "*"), return the raw data as LogicMonitor filtered it
      if (validated.fields && validated.fields !== '*') {
        return {
          total: result.total || 0,
          collectors: result.items || []
        };
      }
      
      // Otherwise, return our curated default field set
      return {
        total: result.total || 0,
        collectors: (result.items || []).map(collector => ({
          id: collector.id,
          description: collector.description,
          hostname: collector.hostname,
          status: collector.status,
          platform: collector.platform,
          uptime: collector.uptime,
          numberOfInstances: collector.numberOfInstances,
          numberOfSDTs: collector.numberOfSDTs,
          isDown: collector.isDown,
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