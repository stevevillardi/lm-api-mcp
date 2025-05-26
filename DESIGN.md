# LogicMonitor MCP Server Design Document

## Overview
A remote Model Context Protocol (MCP) server that acts as a stateless bridge between MCP clients and the LogicMonitor API, providing comprehensive management of devices, device groups, websites, website groups, collectors, and alerts.

## Architecture

### Simplified Flow
```
┌─────────────────┐                    ┌──────────────────┐                 ┌─────────────────┐
│   MCP Client    │  HTTP/SSE +        │  MCP Server      │  HTTPS + Bearer │ LogicMonitor    │
│   (Claude,etc)  │  Bearer Token      │  (Stateful)      │  Token          │      API        │
└─────────────────┘ ──────────────────►└──────────────────┘ ───────────────►└─────────────────┘
```

### Transport Layer
The server uses `StreamableHTTPServerTransport` which provides:
- **HTTP POST**: For standard request/response operations
- **SSE (GET)**: For streaming responses and long-running operations
- **Session Management**: Stateful connections with session ID tracking
- **Single Endpoint**: `/mcp` handles all transport methods

### Client Configuration

#### Option 1: HTTP Headers (Recommended for Security)
```json
{
  "mcpServers": {
    "logicmonitor": {
      "url": "https://your-mcp-server.com/mcp",
      "transport": "http",
      "headers": {
        "X-LM-Account": "your_account",
        "X-LM-Bearer-Token": "your_bearer_token"
      }
    }
  }
}
```

#### Option 2: Environment Variables on Server
For production deployments, configure credentials as environment variables on the server:
```bash
LM_ACCOUNT=your_account
LM_BEARER_TOKEN=your_bearer_token
```

The transport will automatically use SSE for streaming when appropriate.

## Tech Stack
- **Language**: TypeScript/Node.js
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **HTTP Framework**: Express.js
- **HTTP Client**: Axios for LogicMonitor API calls
- **Validation**: Joi for input validation
- **Security**: Helmet for security headers
- **Process Manager**: PM2 for production
- **Rate Limiting**: Built-in rate limiter with exponential backoff
- **Batch Processing**: Concurrent request handler with partial failure support

## Core Functionality

### Device Management Tools

```typescript
interface DeviceTools {
  "lm_list_devices": {
    description: "List devices with optional filtering",
    inputSchema: {
      filter?: string;        // LM query syntax (e.g., "displayName:prod*")
      size?: number;          // Results per page (max: 1000)
      offset?: number;        // For pagination
      fields?: string;        // Comma-separated field list
    }
  },

  "lm_get_device": {
    description: "Get specific device details",
    inputSchema: {
      deviceId: number;       // Required
    }
  },

  "lm_create_device": {
    description: "Add one or more devices to monitoring",
    inputSchema: {
      // Single device mode
      displayName: string;    // Required
      name: string;           // Required (hostname or IP)
      hostGroupIds: number[]; // Required (at least one group)
      preferredCollectorId: number; // Required
      disableAlerting?: boolean;
      properties?: Array<{
        name: string;
        value: string;
      }>;
      
      // OR Batch mode
      devices: Array<Device>; // Array of device objects
      batchOptions?: {
        maxConcurrent?: number;    // 1-50, default: 5
        continueOnError?: boolean; // default: true
      };
    }
  },

  "lm_update_device": {
    description: "Update one or more existing devices",
    inputSchema: {
      // Single device mode
      deviceId: number;       // Required
      displayName?: string;
      hostGroupIds?: number[];
      disableAlerting?: boolean;
      customProperties?: Array<{
        name: string;
        value: string;
      }>;
      
      // OR Batch mode
      devices: Array<UpdateDevice>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  },

  "lm_delete_device": {
    description: "Remove one or more devices from monitoring",
    inputSchema: {
      // Single device mode
      deviceId: number;       // Required
      
      // OR Batch mode
      devices: Array<{ deviceId: number }>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  }
}
```

### Device Group Management Tools

```typescript
interface DeviceGroupTools {
  "lm_list_device_groups": {
    description: "List device groups",
    inputSchema: {
      filter?: string;
      parentId?: number;      // List only children of specific group
    }
  },

  "lm_get_device_group": {
    description: "Get device group details",
    inputSchema: {
      groupId: number;        // Required
    }
  },

  "lm_create_device_group": {
    description: "Create new device group(s)",
    inputSchema: {
      // Single group mode
      name: string;           // Required
      parentId: number;       // Required (1 = root)
      description?: string;
      appliesTo?: string;     // Dynamic group criteria
      properties?: Array<{
        name: string;
        value: string;
      }>;
      
      // OR Batch mode
      groups: Array<DeviceGroup>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  },

  "lm_update_device_group": {
    description: "Update device group(s)",
    inputSchema: {
      // Single group mode
      groupId: number;        // Required
      name?: string;
      description?: string;
      appliesTo?: string;
      customProperties?: Array<{
        name: string;
        value: string;
      }>;
      
      // OR Batch mode
      groups: Array<UpdateDeviceGroup>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  },

  "lm_delete_device_group": {
    description: "Delete device group(s)",
    inputSchema: {
      // Single group mode
      groupId: number;        // Required
      deleteChildren?: boolean;
      
      // OR Batch mode
      groups: Array<{ groupId: number, deleteChildren?: boolean }>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  }
}
```

### Website Management Tools

```typescript
interface WebsiteTools {
  "lm_list_websites": {
    description: "List websites with optional filtering",
    inputSchema: {
      filter?: string;
      size?: number;
      offset?: number;
      fields?: string;
    }
  },

  "lm_get_website": {
    description: "Get specific website details",
    inputSchema: {
      websiteId: number;      // Required
    }
  },

  "lm_create_website": {
    description: "Create one or more websites",
    inputSchema: {
      // Single website mode
      name: string;           // Required
      domain: string;         // Required
      type: "webcheck" | "pingcheck"; // Required
      groupId: number;        // Required
      description?: string;
      disableAlerting?: boolean;
      stopMonitoring?: boolean;
      useDefaultAlertSetting?: boolean;
      useDefaultLocationSetting?: boolean;
      pollingInterval?: number;
      properties?: Array<{
        name: string;
        value: string;
      }>;
      steps?: Array<{
        url: string;
        HTTPMethod?: string;
        statusCode?: string;
        description?: string;
      }>;
      
      // OR Batch mode
      websites: Array<Website>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  },

  "lm_update_website": {
    description: "Update one or more websites",
    inputSchema: {
      // Single website mode
      websiteId: number;      // Required
      name?: string;
      description?: string;
      disableAlerting?: boolean;
      stopMonitoring?: boolean;
      useDefaultAlertSetting?: boolean;
      useDefaultLocationSetting?: boolean;
      pollingInterval?: number;
      properties?: Array<{
        name: string;
        value: string;
      }>;
      
      // OR Batch mode
      websites: Array<UpdateWebsite>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  },

  "lm_delete_website": {
    description: "Delete one or more websites",
    inputSchema: {
      // Single website mode
      websiteId: number;      // Required
      
      // OR Batch mode
      websites: Array<{ websiteId: number }>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  }
}
```

### Website Group Management Tools

```typescript
interface WebsiteGroupTools {
  "lm_list_website_groups": {
    description: "List website groups",
    inputSchema: {
      filter?: string;
      size?: number;
      offset?: number;
      fields?: string;
    }
  },

  "lm_get_website_group": {
    description: "Get website group details",
    inputSchema: {
      groupId: number;        // Required
    }
  },

  "lm_create_website_group": {
    description: "Create website group(s)",
    inputSchema: {
      // Single group mode
      name: string;           // Required
      parentId: number;       // Required (1 = root)
      description?: string;
      disableAlerting?: boolean;
      stopMonitoring?: boolean;
      properties?: Array<{
        name: string;
        value: string;
      }>;
      
      // OR Batch mode
      groups: Array<WebsiteGroup>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  },

  "lm_update_website_group": {
    description: "Update website group(s)",
    inputSchema: {
      // Single group mode
      groupId: number;        // Required
      name?: string;
      description?: string;
      disableAlerting?: boolean;
      stopMonitoring?: boolean;
      properties?: Array<{
        name: string;
        value: string;
      }>;
      
      // OR Batch mode
      groups: Array<UpdateWebsiteGroup>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  },

  "lm_delete_website_group": {
    description: "Delete website group(s)",
    inputSchema: {
      // Single group mode
      groupId: number;        // Required
      deleteChildren?: boolean;
      
      // OR Batch mode
      groups: Array<{ groupId: number, deleteChildren?: boolean }>;
      batchOptions?: {
        maxConcurrent?: number;
        continueOnError?: boolean;
      };
    }
  }
}
```

### Alert Management Tools

```typescript
interface AlertTools {
  "lm_list_alerts": {
    description: "List alerts with optional filtering",
    inputSchema: {
      filter?: string;        // LM query syntax
      fields?: string;
      size?: number;
      offset?: number;
      sort?: string;
      needMessage?: boolean;
      customColumns?: string;
    }
  },

  "lm_get_alert": {
    description: "Get specific alert details",
    inputSchema: {
      alertId: string;        // Required
    }
  },

  "lm_ack_alert": {
    description: "Acknowledge an alert",
    inputSchema: {
      alertId: string;        // Required
      ackComment: string;     // Required
    }
  },

  "lm_add_alert_note": {
    description: "Add a note to an alert",
    inputSchema: {
      alertId: string;        // Required
      ackComment: string;     // Required
    }
  },

  "lm_escalate_alert": {
    description: "Escalate an alert to the next level",
    inputSchema: {
      alertId: string;        // Required
    }
  }
}
```

### Collector Management Tools

```typescript
interface CollectorTools {
  "lm_list_collectors": {
    description: "List collectors with optional filtering",
    inputSchema: {
      filter?: string;
      size?: number;
      offset?: number;
      fields?: string;
    }
  }
}
```

## Implementation Structure

### Project Layout
```
lm-api-mcp/
├── src/
│   ├── index.ts              # Server entry point
│   ├── server.ts             # MCP server setup
│   ├── tools/
│   │   ├── devices.ts        # Device management handlers
│   │   ├── deviceGroups.ts   # Device group handlers
│   │   ├── websites.ts       # Website management handlers
│   │   ├── websiteGroups.ts  # Website group handlers
│   │   ├── alerts.ts         # Alert management handlers
│   │   └── collectors.ts     # Collector handlers
│   ├── api/
│   │   └── client.ts         # LogicMonitor API client
│   ├── utils/
│   │   ├── validation.ts     # Input validation schemas
│   │   ├── filters.ts        # LogicMonitor filter formatting
│   │   ├── rateLimiter.ts    # Rate limit detection and retry
│   │   ├── batchProcessor.ts # Batch operation handler
│   │   └── schemaHelpers.ts  # Schema generation utilities
│   └── types/
│       └── logicmonitor.ts   # TypeScript interfaces
├── tests/
├── examples/
│   └── batch-operations.md   # Batch usage examples
├── package.json
├── tsconfig.json
└── README.md
```

### Key Implementation Files

#### LogicMonitor API Client
```typescript
// src/api/client.ts
export class LogicMonitorClient {
  constructor(
    private account: string,
    private bearerToken: string
  ) {}

  async request<T>(method: string, path: string, data?: any): Promise<T> {
    const url = `https://${this.account}.logicmonitor.com/santaba/rest${path}`;
    
    const response = await axios({
      method,
      url,
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
        'X-Version': '3'
      },
      data
    });

    return response.data;
  }
}
```

#### MCP Server Setup
```typescript
// src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

export async function createServer(config: ServerConfig = {}) {
  const server = new Server({
    name: "logicmonitor-mcp",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Register all tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...deviceTools, 
      ...deviceGroupTools, 
      ...websiteTools, 
      ...websiteGroupTools, 
      ...alertTools, 
      ...collectorTools
    ]
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    // Extract credentials from request context
    const context = (request as any).context || {};
    const { lm_account, lm_bearer_token } = context.config || {};
    
    if (!lm_account || !lm_bearer_token) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'LogicMonitor credentials not provided'
      );
    }

    const client = new LogicMonitorClient(lm_account, lm_bearer_token);
    
    // Route to appropriate handler
    return handleToolCall(name, args, client);
  });

  return server;
}
```

#### HTTP Server Implementation
```typescript
// src/index.ts
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

async function startHttpServer() {
  const app = express();
  
  // Store for active transports (stateful mode)
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // Handle all MCP requests at /mcp endpoint
  app.all('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      // Reuse existing transport for this session
      transport = transports.get(sessionId)!;
    } else {
      // Create new transport with session management
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports.set(newSessionId, transport);
        }
      });

      // Create and connect server
      const mcpServer = await createServer({ logger });
      await mcpServer.connect(transport);

      // Clean up on close
      transport.onclose = () => {
        const id = Array.from(transports.entries())
          .find(([_, t]) => t === transport)?.[0];
        if (id) {
          transports.delete(id);
        }
      };
    }

    // Handle the request (GET for SSE, POST for messages)
    await transport.handleRequest(req, res, req.body);
  });
}
```

## Security Considerations

### Best Practices (POC → Production Ready)
1. **No Credential Storage**: Server never stores LogicMonitor credentials - they're passed per request
2. **HTTPS Only**: TLS for all communications in production
3. **Input Validation**: Joi schemas validate all tool inputs
4. **Error Handling**: Sanitized errors that never expose credentials or internal details
5. **Rate Limiting**: Respect LogicMonitor's API rate limits
6. **Audit Logging**: Winston logging for all operations (credentials excluded)
7. **Session Security**: UUID-based session IDs with proper cleanup on disconnect

### Environment Configuration
```bash
# .env file (for development only)
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

## AWS Deployment (EC2)

### Simple Deployment
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start with PM2
pm2 start ecosystem.config.js
```

### PM2 Configuration
```javascript
module.exports = {
  apps: [{
    name: 'lm-mcp',
    script: './dist/index.js',
    instances: 1,  // Start with 1, scale as needed
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

## Batch Operations

### Overview
The server supports efficient batch processing for all CRUD operations with:
- **Backward Compatibility**: Single operations work unchanged
- **Rate Limit Handling**: Automatic retry with exponential backoff
- **Partial Failure Support**: Continue processing on errors
- **Configurable Concurrency**: Control parallel request limits

### Batch Request Format
```typescript
// Single operation (backward compatible)
await client.callTool('lm_create_device', {
  displayName: 'Server 1',
  hostName: 'server1.example.com',
  hostGroupIds: [1],
  preferredCollectorId: 1
});

// Batch operation
await client.callTool('lm_create_device', {
  devices: [
    { displayName: 'Server 1', ... },
    { displayName: 'Server 2', ... },
    { displayName: 'Server 3', ... }
  ],
  batchOptions: {
    maxConcurrent: 5,
    continueOnError: true
  }
});
```

### Batch Response Format
```typescript
// For devices
{
  success: boolean,           // false if any failed
  summary: {
    total: number,
    succeeded: number,
    failed: number
  },
  devices: Array<{
    index: number,
    success: boolean,
    device?: DeviceResult,    // if success
    error?: string           // if failed
  }>
}

// For device groups, websites, website groups
// Same structure but with appropriate resource name
// (groups, websites, etc.)
```

### Rate Limiting
The server automatically handles LogicMonitor's rate limits:
- Detects `X-Rate-Limit-*` headers
- Implements exponential backoff with jitter
- Retries failed requests up to 3 times
- Preemptively slows down when approaching limits

## Future Expansion Points

When moving beyond POC, these areas can be enhanced without major refactoring:

1. **Additional Tools**: Alert management, dashboards, reports
2. **Streaming Responses**: For large data sets
3. **Webhook Support**: Real-time alert notifications
4. **Caching Layer**: Add Redis when performance requires it
5. **Multi-Region**: Deploy to multiple AWS regions
6. **Advanced Batch Features**: Progress callbacks, custom retry policies

## Implementation Status

### Completed ✅
1. **Project Structure**: TypeScript with proper module organization
2. **Authentication**: HTTP header-based auth (X-LM-Account, X-LM-Bearer-Token)
3. **LogicMonitor API Client**: Full implementation with bearer token support
4. **Device Management**: All CRUD operations with batch support
5. **Device Group Management**: All CRUD operations with batch support
6. **Website Management**: All CRUD operations with batch support
7. **Website Group Management**: All CRUD operations with batch support
8. **Alert Management**: List, get, acknowledge, note, and escalate operations
9. **Collector Management**: List operation
10. **MCP Protocol**: Full compliance with StreamableHTTPServerTransport
11. **Session Management**: Stateful connections with proper cleanup
12. **Input Validation**: Joi schemas for all tool inputs
13. **Error Handling**: Comprehensive error handling with proper logging
14. **Testing Suite**: Multiple test scripts for different scenarios
15. **Documentation**: Complete setup and usage guides
16. **Batch Operations**: Full support for bulk create/update/delete with rate limiting
17. **Rate Limit Handling**: Automatic detection and retry with exponential backoff
18. **Standardized Code Pattern**: All handlers follow consistent implementation pattern

### Key Implementation Details

#### Authentication Flow
- Credentials passed via HTTP headers on each request
- Server creates new MCP server instance per session with credentials
- No credential storage on server side

#### API Response Handling
- List endpoints return `{total, items}` directly
- Single item endpoints return data wrapped in `{data: item}`
- hostGroupIds handled as arrays of numbers
- All batch operations use consistent handler pattern with batchProcessor
- Properties field naming: CREATE operations use `properties`, UPDATE operations use `customProperties` for devices/deviceGroups

#### Transport Configuration
- Single `/mcp` endpoint handles all requests
- Automatic SSE upgrade for streaming responses
- Session ID management via `mcp-session-id` header

### Production Ready Checklist
- [x] Secure credential handling
- [x] Input validation
- [x] Error handling
- [x] Logging
- [x] Session management
- [ ] Rate limiting (implement at LB level)
- [ ] SSL/TLS (configure in deployment)
- [ ] Monitoring setup
- [ ] Automated deployment

### Future Enhancements
1. **Additional Tools**: Dashboards, reports, SDT (scheduled downtime)
2. **Extended Alert Operations**: Batch acknowledge, clear alerts
3. **Webhook Support**: Real-time alert notifications
4. **Caching**: Redis for frequently accessed data
5. **OAuth Support**: Alternative to bearer tokens
6. **Audit Trail**: Detailed operation logging
7. **Batch Import/Export**: CSV/JSON bulk operations
8. **Scheduled Operations**: Deferred batch processing
9. **Collector Management**: Create, update, delete operations
10. **Advanced Filtering**: Support for complex query builders