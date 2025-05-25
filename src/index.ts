import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import winston from 'winston';
import { createServer } from './server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Set up logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: NODE_ENV === 'development' 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.json()
    })
  ]
});

async function startHttpServer() {
  const app = express();
  
  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false, // Required for SSE
  }));
  
  // Parse JSON bodies
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'logicmonitor-mcp', version: '1.0.0' });
  });

  // Store for active transports (for stateful mode)
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // Alternative endpoint for MCP clients that expect simpler initialization
  app.get('/mcp/sse', async (req, res) => {
    try {
      // Extract credentials from headers
      const lmAccount = req.headers['x-lm-account'] as string;
      const lmBearerToken = req.headers['x-lm-bearer-token'] as string;

      if (!lmAccount || !lmBearerToken) {
        res.status(400).json({ error: 'Missing credentials in headers' });
        return;
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Send ready message
      res.write('data: {"type":"ready","server":"logicmonitor-mcp"}\n\n');
      
      // Keep connection alive
      const heartbeat = setInterval(() => {
        res.write('data: {"type":"heartbeat"}\n\n');
      }, 30000);

      req.on('close', () => {
        clearInterval(heartbeat);
      });
    } catch (error) {
      logger.error('SSE endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Handle all MCP requests at /mcp endpoint
  app.all('/mcp', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string;
      let transport: StreamableHTTPServerTransport;

      // Extract credentials from headers first
      const lmAccount = req.headers['x-lm-account'] as string;
      const lmBearerToken = req.headers['x-lm-bearer-token'] as string;

      if (sessionId && transports.has(sessionId)) {
        // Reuse existing transport for this session
        transport = transports.get(sessionId)!;
      } else {
        // Create new transport
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            logger.info(`Session initialized: ${newSessionId}`);
            transports.set(newSessionId, transport);
          }
        });

        // Create server with credentials
        const mcpServer = await createServer({ 
          logger,
          credentials: {
            lm_account: lmAccount,
            lm_bearer_token: lmBearerToken
          }
        });
        await mcpServer.connect(transport);

        // Clean up on close
        transport.onclose = () => {
          const id = Array.from(transports.entries())
            .find(([_, t]) => t === transport)?.[0];
          if (id) {
            logger.info(`Session closed: ${id}`);
            transports.delete(id);
          }
        };
      }

      // Handle the request
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error('MCP request error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Error handling middleware
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Express error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  app.listen(PORT, () => {
    logger.info(`LogicMonitor MCP server running on port ${PORT}`);
    logger.info('Available endpoints:');
    logger.info(`  Health: http://localhost:${PORT}/health`);
    logger.info(`  MCP: http://localhost:${PORT}/mcp (supports both HTTP and SSE)`);
  });
}

async function startStdioServer() {
  // In stdio mode, only log errors to stderr to avoid interfering with JSON-RPC
  const stdioLogger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        stderrLevels: ['error'],
        format: winston.format.simple()
      })
    ]
  });
  
  // Get credentials from environment variables
  const lmAccount = process.env.LM_ACCOUNT;
  const lmBearerToken = process.env.LM_BEARER_TOKEN;
  
  if (!lmAccount || !lmBearerToken) {
    stdioLogger.error('Missing required environment variables: LM_ACCOUNT and/or LM_BEARER_TOKEN');
    process.exit(1);
  }
  
  const server = await createServer({ 
    logger: stdioLogger,
    credentials: {
      lm_account: lmAccount,
      lm_bearer_token: lmBearerToken
    }
  });
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
}

// Main entry point
async function main() {
  try {
    // Check if running with stdio transport (for local testing)
    if (process.argv.includes('--stdio')) {
      await startStdioServer();
    } else {
      await startHttpServer();
    }
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled Rejection, reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
main();