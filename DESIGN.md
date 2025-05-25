# LogicMonitor MCP Server Design Document

## Overview
A remote Model Context Protocol (MCP) server that acts as a stateless bridge between MCP clients and the LogicMonitor API, focusing on device and device group management.

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
    description: "Add a new device to monitoring",
    inputSchema: {
      displayName: string;    // Required
      hostName: string;       // Required (IP or FQDN)
      hostGroupIds: number[]; // Required (at least one group)
      preferredCollectorId?: number;
      disableAlerting?: boolean;
      properties?: Array<{
        name: string;
        value: string;
      }>;
    }
  },

  "lm_update_device": {
    description: "Update existing device",
    inputSchema: {
      deviceId: number;       // Required
      displayName?: string;
      hostGroupIds?: number[];
      disableAlerting?: boolean;
      customProperties?: Array<{
        name: string;
        value: string;
      }>;
    }
  },

  "lm_delete_device": {
    description: "Remove device from monitoring",
    inputSchema: {
      deviceId: number;       // Required
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
    description: "Create new device group",
    inputSchema: {
      name: string;           // Required
      parentId: number;       // Required (1 = root)
      description?: string;
      appliesTo?: string;     // Dynamic group criteria
      properties?: Array<{
        name: string;
        value: string;
      }>;
    }
  },

  "lm_update_device_group": {
    description: "Update device group",
    inputSchema: {
      groupId: number;        // Required
      name?: string;
      description?: string;
      appliesTo?: string;
      customProperties?: Array<{
        name: string;
        value: string;
      }>;
    }
  },

  "lm_delete_device_group": {
    description: "Delete device group",
    inputSchema: {
      groupId: number;        // Required
      deleteChildren?: boolean;
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
│   │   └── deviceGroups.ts   # Device group handlers
│   ├── api/
│   │   └── client.ts         # LogicMonitor API client
│   ├── utils/
│   │   └── validation.ts     # Input validation schemas
│   └── types/
│       └── logicmonitor.ts   # TypeScript interfaces
├── tests/
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
    tools: [...deviceTools, ...deviceGroupTools]
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

## Future Expansion Points

When moving beyond POC, these areas can be enhanced without major refactoring:

1. **Additional Tools**: Alert management, dashboards, collectors
2. **Batch Operations**: Process multiple devices/groups efficiently  
3. **Streaming Responses**: For large data sets
4. **Webhook Support**: Real-time alert notifications
5. **Caching Layer**: Add Redis when performance requires it
6. **Multi-Region**: Deploy to multiple AWS regions

## Implementation Status

### Completed ✅
1. **Project Structure**: TypeScript with proper module organization
2. **Authentication**: HTTP header-based auth (X-LM-Account, X-LM-Bearer-Token)
3. **LogicMonitor API Client**: Full implementation with bearer token support
4. **Device Management**: All CRUD operations working
5. **Device Group Management**: All CRUD operations working
6. **MCP Protocol**: Full compliance with StreamableHTTPServerTransport
7. **Session Management**: Stateful connections with proper cleanup
8. **Input Validation**: Joi schemas for all tool inputs
9. **Error Handling**: Comprehensive error handling with proper logging
10. **Testing Suite**: Multiple test scripts for different scenarios
11. **Documentation**: Complete setup and usage guides

### Key Implementation Details

#### Authentication Flow
- Credentials passed via HTTP headers on each request
- Server creates new MCP server instance per session with credentials
- No credential storage on server side

#### API Response Handling
- List endpoints return `{total, items}` directly
- Single item endpoints return data wrapped in `{data: item}`
- hostGroupIds handled as comma-separated strings

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
1. **Additional Tools**: Alerts, collectors, dashboards, reports
2. **Batch Operations**: Multiple device/group operations
3. **Webhook Support**: Real-time alert notifications
4. **Caching**: Redis for frequently accessed data
5. **OAuth Support**: Alternative to bearer tokens
6. **Audit Trail**: Detailed operation logging