# LogicMonitor MCP Server

A Model Context Protocol (MCP) server that provides secure access to the LogicMonitor API, enabling AI assistants to manage monitoring infrastructure through natural language commands.

## Features

- **Comprehensive Resource Management**: Devices, device groups, websites, website groups, collectors, and alerts
- **Batch Operations**: Process multiple items efficiently with rate limiting and error handling
- **Secure Authentication**: Credentials passed per-request, never stored
- **Flexible Deployment**: Supports both stdio (local) and HTTP (remote) transports
- **Natural Language Interface**: Designed for AI assistants like Claude

## Installation

### Option 1: Install from npm (Recommended)

```bash
npm install -g logicmonitor-mcp
```

### Option 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/lm-api-mcp.git
cd lm-api-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Optional: Link globally
npm link
```

## Configuration

### Prerequisites

You'll need:
1. A LogicMonitor account
2. A Bearer API token (Settings → Users → API Tokens)

### STDIO Mode (Recommended for Local Use)

STDIO mode is best for local AI assistants like Claude Desktop. Add to your MCP settings:

```json
{
  "mcpServers": {
    "logicmonitor": {
      "command": "logicmonitor-mcp",
      "env": {
        "LM_ACCOUNT": "your-account-name",
        "LM_BEARER_TOKEN": "your-bearer-token"
      }
    }
  }
}
```

If installed from source, use the full path:

```json
{
  "mcpServers": {
    "logicmonitor": {
      "command": "node",
      "args": ["/path/to/lm-api-mcp/dist/index.js", "--stdio"],
      "env": {
        "LM_ACCOUNT": "your-account-name",
        "LM_BEARER_TOKEN": "your-bearer-token"
      }
    }
  }
}
```

### HTTP Mode (For Remote Access)

HTTP mode allows remote access and is suitable for shared deployments:

1. **Start the server:**
```bash
# With environment variables
LM_ACCOUNT=your-account PORT=3000 logicmonitor-mcp

# Or use a .env file
echo "PORT=3000" > .env
logicmonitor-mcp
```

2. **Configure your MCP client:**

Option A - Pass credentials via headers (more secure):
```json
{
  "mcpServers": {
    "logicmonitor": {
      "url": "http://localhost:3000/mcp",
      "transport": "http",
      "headers": {
        "X-LM-Account": "your-account-name",
        "X-LM-Bearer-Token": "your-bearer-token"
      }
    }
  }
}
```

Option B - Server-side credentials (for trusted environments):
```bash
# Start server with credentials
LM_ACCOUNT=your-account LM_BEARER_TOKEN=your-token logicmonitor-mcp
```

Then connect without credentials in headers:
```json
{
  "mcpServers": {
    "logicmonitor": {
      "url": "http://localhost:3000/mcp",
      "transport": "http"
    }
  }
}
```

## Available Tools

### Device Management
- `lm_list_devices` - List devices with filtering
- `lm_get_device` - Get device details
- `lm_create_device` - Add device(s) to monitoring
- `lm_update_device` - Update device(s) configuration
- `lm_delete_device` - Remove device(s) from monitoring

### Device Group Management
- `lm_list_device_groups` - List device groups
- `lm_get_device_group` - Get group details
- `lm_create_device_group` - Create device group(s)
- `lm_update_device_group` - Update group(s)
- `lm_delete_device_group` - Delete group(s)

### Website Monitoring
- `lm_list_websites` - List monitored websites
- `lm_get_website` - Get website details
- `lm_create_website` - Add website(s) to monitoring
- `lm_update_website` - Update website(s)
- `lm_delete_website` - Remove website(s)

### Website Group Management
- `lm_list_website_groups` - List website groups
- `lm_get_website_group` - Get group details
- `lm_create_website_group` - Create website group(s)
- `lm_update_website_group` - Update group(s)
- `lm_delete_website_group` - Delete group(s)

### Alert Management
- `lm_list_alerts` - List alerts with filtering
- `lm_get_alert` - Get alert details
- `lm_ack_alert` - Acknowledge an alert
- `lm_add_alert_note` - Add note to alert
- `lm_escalate_alert` - Escalate alert

### Collector Management
- `lm_list_collectors` - List collectors

## Usage Examples

Once configured, you can use natural language with your AI assistant:

### Simple Operations
```
"Add server web-01.example.com (192.168.1.10) to monitoring in group 5 using collector 1"

"List all devices in the Production group"

"Disable alerting on device ID 1234"
```

### Batch Operations
```
"Add these servers to monitoring:
- web-01 (10.0.1.1) in group 5
- web-02 (10.0.1.2) in group 5
- db-01 (10.0.2.1) in group 10
All should use collector 1"

"Update all devices matching 'test-*' to disable alerting"
```

### Complex Workflows
```
"Create a device group structure:
- Production
  - Web Servers
  - Database Servers
- Staging
  - Web Servers
  - Database Servers"

"Set up monitoring for www.example.com with 5-minute intervals and create a multi-step check for the login flow"
```

See [examples/prompt-examples.md](examples/prompt-examples.md) for more comprehensive examples.

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start the server
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

Example `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'lm-mcp',
    script: 'logicmonitor-mcp',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t logicmonitor-mcp .
docker run -p 3000:3000 -e LM_ACCOUNT=your-account logicmonitor-mcp
```

### Security Considerations

1. **Use HTTPS in production** - Deploy behind a reverse proxy with SSL
2. **Restrict access** - Use firewall rules or API gateway
3. **Rotate tokens regularly** - Update bearer tokens periodically
4. **Monitor access logs** - Track usage and detect anomalies
5. **Use environment variables** - Never commit credentials

## Development

### Running from Source

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

### Testing Tools

```bash
# Test HTTP connection
npm run test:client

# Test with credentials
npm run test:headers

# Test specific operations
npm run test:devices
npm run test:websites
```

## Troubleshooting

### Common Issues

**"LogicMonitor credentials not provided"**
- Ensure `LM_ACCOUNT` and `LM_BEARER_TOKEN` are set correctly
- For HTTP mode, check headers are being sent

**"Rate limit exceeded"**
- The server automatically retries with backoff
- Reduce `maxConcurrent` in batch operations

**"Connection refused"**
- Check the server is running on the correct port
- Verify firewall rules allow the connection

**"Invalid token"**
- Verify your bearer token is active in LogicMonitor
- Check the account name matches your LogicMonitor URL

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug logicmonitor-mcp
```

## Architecture

- **Transport Layer**: Supports both STDIO and HTTP/SSE
- **Session Management**: Stateful connections with cleanup
- **Rate Limiting**: Automatic retry with exponential backoff
- **Batch Processing**: Concurrent operations with partial failure handling
- **Input Validation**: Joi schemas ensure data integrity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Support

- Issues: [GitHub Issues](https://github.com/yourusername/lm-api-mcp/issues)
- Documentation: [Full Documentation](https://github.com/yourusername/lm-api-mcp/wiki)
- Examples: [examples/](examples/)

## Packaging for Distribution

### NPM Package Setup

Create a `bin` field in package.json:
```json
{
  "name": "logicmonitor-mcp",
  "version": "1.0.0",
  "description": "MCP server for LogicMonitor API",
  "main": "dist/index.js",
  "bin": {
    "logicmonitor-mcp": "./dist/index.js"
  },
  "scripts": {
    "prepublishOnly": "npm run build"
  }
}
```

Add shebang to `src/index.ts`:
```typescript
#!/usr/bin/env node
```

### Publishing

```bash
# Login to npm
npm login

# Publish
npm publish
```

### Alternative Distribution Methods

1. **GitHub Releases**: Create releases with pre-built binaries
2. **Docker Hub**: Publish container images
3. **Homebrew**: Create a formula for macOS users
4. **Snap/Flatpak**: For Linux distribution