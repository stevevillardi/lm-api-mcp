import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  TextContent,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';
import { LogicMonitorClient } from './api/client.js';
import { deviceTools, handleDeviceTool } from './tools/devices.js';
import { deviceGroupTools, handleDeviceGroupTool } from './tools/deviceGroups.js';
import { collectorTools, handleCollectorTool } from './tools/collectors.js';
import { alertTools, listAlerts, getAlert, ackAlert, addAlertNote, escalateAlert } from './tools/alerts.js';
import { websiteTools, handleWebsiteTool } from './tools/websites.js';
import { websiteGroupTools, handleWebsiteGroupTool } from './tools/websiteGroups.js';

export interface ServerConfig {
  name?: string;
  version?: string;
  logger?: winston.Logger;
  credentials?: {
    lm_account?: string;
    lm_bearer_token?: string;
  };
}

export async function createServer(config: ServerConfig = {}) {
  const logger = config.logger || winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

  const server = new Server({
    name: config.name || 'logicmonitor-api-mcp',
    version: config.version || '1.0.0'
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Store credentials on server instance
  (server as any).credentials = config.credentials || {};

  // Register all tools
  const allTools = [...deviceTools, ...deviceGroupTools, ...collectorTools, ...alertTools, ...websiteTools, ...websiteGroupTools];
  
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    logger.info('Tool call received', { tool: name, args });

    try {
      // Get credentials from server instance
      const { lm_account, lm_bearer_token } = (server as any).credentials || {};
      
      if (!lm_account || !lm_bearer_token) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'LogicMonitor credentials not provided. Please configure lm_account and lm_bearer_token.'
        );
      }

      // Create client instance with credentials
      const client = new LogicMonitorClient(lm_account, lm_bearer_token, logger);

      // Route to appropriate handler
      let result: any;
      
      if (name.startsWith('lm_') && name.includes('device_group')) {
        result = await handleDeviceGroupTool(name, args, client);
      } else if (name.startsWith('lm_') && name.includes('website_group')) {
        result = await handleWebsiteGroupTool(name, args, client);
      } else if (name.startsWith('lm_') && name.includes('collector')) {
        result = await handleCollectorTool(name, args, client);
      } else if (name.startsWith('lm_') && name.includes('alert')) {
        result = await handleAlertTool(name, args, client);
      } else if (name.startsWith('lm_') && name.includes('website')) {
        result = await handleWebsiteTool(name, args, client);
      } else if (name.startsWith('lm_') && name.includes('device')) {
        result = await handleDeviceTool(name, args, client);
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }

      logger.info('Tool call successful', { tool: name });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      logger.error('Tool call failed', { 
        tool: name, 
        error: error instanceof Error ? error.message : String(error) 
      });

      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    }
  });

  // Alert tool handler function
  async function handleAlertTool(name: string, args: any, client: LogicMonitorClient): Promise<any> {
    switch (name) {
      case 'lm_list_alerts':
        return listAlerts(client, args);
      case 'lm_get_alert':
        return getAlert(client, args);
      case 'lm_ack_alert':
        return ackAlert(client, args);
      case 'lm_add_alert_note':
        return addAlertNote(client, args);
      case 'lm_escalate_alert':
        return escalateAlert(client, args);
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown alert tool: ${name}`
        );
    }
  }

  return server;
}