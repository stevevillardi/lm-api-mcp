# Testing Guide for LogicMonitor MCP Server

## Quick Start

1. **Setup credentials**:
   ```bash
   cp .env.example .env
   # Edit .env and update TEST_LM_ACCOUNT and TEST_LM_BEARER_TOKEN
   ```

2. **Start the server**:
   ```bash
   npm run dev
   ```

3. **Run tests**:
   ```bash
   npm run test:headers
   ```

## Available Test Scripts

### `npm run test:headers` (Recommended)
Tests the full MCP protocol with HTTP header authentication:
- Initializes MCP session
- Lists available tools
- Tests device operations
- Tests device group operations

### `npm run test:session`
Tests different connection modes:
- Direct POST requests
- stdio mode fallback

### `npm run test:client`
Legacy test client (may need updates)

## Testing with Different Clients

### Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "logicmonitor": {
      "url": "http://localhost:3001/mcp",
      "transport": "http",
      "headers": {
        "X-LM-Account": "your_account",
        "X-LM-Bearer-Token": "your_bearer_token"
      }
    }
  }
}
```

### MCP Inspector
```bash
npm install -g @modelcontextprotocol/inspector

# Create config.json with headers
cat > mcp-config.json << EOF
{
  "mcpServers": {
    "logicmonitor": {
      "url": "http://localhost:3001/mcp",
      "transport": "http", 
      "headers": {
        "X-LM-Account": "your_account",
        "X-LM-Bearer-Token": "your_bearer_token"
      }
    }
  }
}
EOF

mcp-inspector mcp-config.json
```

### cURL Examples

#### Initialize Session
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "X-LM-Account: your_account" \
  -H "X-LM-Bearer-Token: your_token" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "0.1.0",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-test",
        "version": "1.0.0"
      }
    },
    "id": 1
  }'
```

#### List Tools
```bash
# Use the session ID from the initialize response
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "X-LM-Account: your_account" \
  -H "X-LM-Bearer-Token: your_token" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

## Troubleshooting

### Common Issues

1. **"Server not initialized" error**
   - Ensure you include `clientInfo` in the initialize request
   - Check that Accept header includes both `application/json` and `text/event-stream`

2. **Authentication errors**
   - Verify your bearer token is valid and not expired
   - Check that headers are correctly named: `X-LM-Account` and `X-LM-Bearer-Token`

3. **Connection refused**
   - Ensure server is running on the correct port (default: 3001)
   - Check `.env` file for PORT configuration

### Debug Mode
Enable detailed logging:
```bash
export LOG_LEVEL=debug
npm run dev
```

## Production Testing

For production deployment:

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Test with PM2**:
   ```bash
   pm2 start ecosystem.config.js
   pm2 logs lm-mcp-server
   ```

3. **Test with HTTPS**:
   Update test URLs to use HTTPS and proper domain:
   ```javascript
   const serverUrl = 'https://your-domain.com/mcp';
   ```

## Security Notes

- Never commit `.env` files with real credentials
- Use environment variables in production
- Consider using AWS Secrets Manager or similar for credential storage
- Always use HTTPS in production