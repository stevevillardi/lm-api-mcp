# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot-reload using tsx
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm run lint` - Run ESLint on TypeScript files

### Testing
- `npm test` - Run Jest test suite
- `npm run test:client` - Test MCP client connection
- `npm run test:headers` - Test HTTP header authentication
- `npm run test:session` - Test session management
- `npm run test:filters` - Test filter utilities

## Architecture

This is a Model Context Protocol (MCP) server that provides secure access to the LogicMonitor API. Key architectural decisions:

1. **Stateless Authentication**: Credentials are passed via HTTP headers (X-LM-Account, X-LM-Bearer-Token) on each request - never stored
2. **Transport Layer**: Uses StreamableHTTPServerTransport supporting both HTTP POST and Server-Sent Events (SSE)
3. **Session Management**: UUID-based sessions with automatic cleanup on disconnect
4. **Tool Organization**: Each LogicMonitor resource type (devices, deviceGroups, collectors) has its own handler in src/tools/

## Key Files

- `src/server.ts` - Main server implementation with transport and session handling
- `src/api/client.ts` - LogicMonitor API client with request signing
- `src/tools/` - Individual tool handlers for each resource type
- `src/utils/validation.ts` - Joi schemas for input validation
- `src/types/logicmonitor.ts` - TypeScript interfaces for API responses

## LogicMonitor API Integration

The server implements LogicMonitor's LMv1 authentication which requires:
- Computing HMAC-SHA256 signatures for each request
- Precise timestamp handling
- Proper canonicalization of request data

When modifying API interactions, ensure compliance with LogicMonitor's authentication requirements.

## Batch Operations

All device CRUD operations support both single and batch modes:
- Single: `{ displayName: "Server1", ... }`
- Batch: `{ devices: [{ displayName: "Server1", ... }, ...], batchOptions: { maxConcurrent: 5 } }`

The batch processor handles:
- Rate limiting with automatic retry
- Partial failure scenarios
- Configurable concurrency
- Detailed per-item results

See `examples/batch-operations.md` for usage examples.