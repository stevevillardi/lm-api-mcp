# LogicMonitor MCP Server

A Model Context Protocol (MCP) server that provides secure access to LogicMonitor API functionality for device and device group management.

## Features

- Device management (list, get, create, update, delete)
- Device group management (list, get, create, update, delete)
- Bearer token authentication
- HTTP and Server-Sent Events (SSE) transport support
- Input validation and error handling
- Production-ready with PM2 support

## Prerequisites

- Node.js 18+ 
- LogicMonitor account with API access
- Bearer token from LogicMonitor portal

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lm-api-mcp.git
cd lm-api-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Configuration

1. Copy `.env.example` to `.env` for development:
```bash
cp .env.example .env
# Edit .env to add your test credentials (optional, for testing only)
```

2. Configure your MCP client with LogicMonitor credentials via headers:
```json
{
  "mcpServers": {
    "logicmonitor": {
      "url": "http://localhost:3001/mcp",
      "transport": "http",
      "headers": {
        "X-LM-Account": "your_account_name",
        "X-LM-Bearer-Token": "your_bearer_token"
      }
    }
  }
}
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
# Build first
npm run build

# Using Node.js
npm start

# Using PM2
pm2 start ecosystem.config.js --env production
```

### Stdio Mode (for local testing)
```bash
npm run build
node dist/index.js --stdio
```

## Available Tools

### Device Management

- `lm_list_devices` - List devices with filtering and pagination
- `lm_get_device` - Get specific device details
- `lm_create_device` - Add new device to monitoring
- `lm_update_device` - Update device configuration
- `lm_delete_device` - Remove device from monitoring

### Device Group Management

- `lm_list_device_groups` - List device groups
- `lm_get_device_group` - Get specific group details
- `lm_create_device_group` - Create new device group
- `lm_update_device_group` - Update group configuration
- `lm_delete_device_group` - Delete device group

## Testing

### Quick Test
```bash
# Set up test credentials
cp .env.example .env
# Edit .env and update TEST_LM_ACCOUNT and TEST_LM_BEARER_TOKEN

# Start the server
npm run dev

# In another terminal, run tests
npm run test:client
```

### Test Scripts Available
- `npm run test:client` - Full test suite with all tools
- `npm run test:headers` - Test with HTTP header authentication
- `npm run test:session` - Test session management

## Integration with AI Assistants

### Claude Desktop (HTTP Mode)

1. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "logicmonitor": {
      "url": "http://localhost:3001/mcp",
      "transport": "http",
      "headers": {
        "X-LM-Account": "your_account_name",
        "X-LM-Bearer-Token": "your_bearer_token"
      }
    }
  }
}
```

2. Start the HTTP server: `npm run dev`
3. Restart Claude Desktop

### Cursor (Stdio Mode)

1. Build the project: `npm run build`

2. Add to Cursor's MCP configuration:
```json
{
  "mcpServers": {
    "logicmonitor": {
      "command": "node",
      "args": ["dist/index.js", "--stdio"],
      "cwd": "/path/to/your/lm-api-mcp",
      "env": {
        "LM_ACCOUNT": "your_account_name",
        "LM_BEARER_TOKEN": "your_bearer_token"
      }
    }
  }
}
```

3. Restart Cursor

### Example Prompts for Both
- "List all devices in LogicMonitor"
- "Show me the device groups"
- "Create a new device group called 'Test Group' under root"
- "Get details for device with ID 123"

## Example Tool Usage

### List Devices
```json
{
  "tool": "lm_list_devices",
  "arguments": {
    "filter": "displayName:prod*",
    "size": 50,
    "offset": 0
  }
}
```

### Create Device
```json
{
  "tool": "lm_create_device",
  "arguments": {
    "displayName": "Production Server 1",
    "hostName": "192.168.1.100",
    "hostGroupIds": [1, 5],
    "properties": [
      {"name": "location", "value": "datacenter-1"}
    ]
  }
}
```

## Deployment on AWS EC2

1. Launch EC2 instance (t3.medium recommended)
2. Install Node.js and PM2:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

3. Clone and set up the application:
```bash
git clone https://github.com/yourusername/lm-api-mcp.git
cd lm-api-mcp
npm install
npm run build
```

4. Start with PM2:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

5. Configure security group to allow HTTPS (443) traffic

6. Set up reverse proxy with nginx or use ALB for SSL termination

## Security Considerations

- Never store credentials in the server
- Always use HTTPS in production
- Implement rate limiting at load balancer level
- Monitor API usage and set alerts
- Regularly rotate bearer tokens

## Troubleshooting

### Check server logs
```bash
# If using PM2
pm2 logs lm-mcp-server

# If running directly
# Check console output
```

### Test connectivity
```bash
curl http://localhost:3000/health
```

### Common Issues

1. **Authentication errors**: Verify bearer token is valid and not expired
2. **Connection timeouts**: Check network connectivity to LogicMonitor API
3. **Rate limiting**: Implement backoff strategy in your client

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT