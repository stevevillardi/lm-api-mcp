# Changelog

## [1.0.0] - 2024-01-25

### Initial Release

#### Features
- **MCP Server Implementation**
  - Full Model Context Protocol compliance
  - StreamableHTTPServerTransport for HTTP/SSE support
  - Stateful session management
  - Single endpoint (`/mcp`) for all operations

- **Authentication**
  - HTTP header-based authentication
  - Secure credential passing (X-LM-Account, X-LM-Bearer-Token)
  - No server-side credential storage

- **Device Management Tools**
  - `lm_list_devices` - List devices with filtering and pagination
  - `lm_get_device` - Get specific device details
  - `lm_create_device` - Create new devices
  - `lm_update_device` - Update device configuration
  - `lm_delete_device` - Remove devices

- **Device Group Management Tools**
  - `lm_list_device_groups` - List device groups
  - `lm_get_device_group` - Get group details
  - `lm_create_device_group` - Create new groups
  - `lm_update_device_group` - Update group configuration
  - `lm_delete_device_group` - Delete groups

#### Technical Implementation
- TypeScript for type safety
- Joi for input validation
- Winston for structured logging
- Axios for HTTP client
- Comprehensive error handling
- PM2-ready configuration

#### Documentation
- Complete setup guide
- API documentation
- Testing guide
- Claude Desktop integration instructions
- Production deployment guidelines

#### Testing
- Multiple test clients for different scenarios
- Environment-based configuration
- Full protocol compliance testing