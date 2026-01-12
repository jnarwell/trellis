/**
 * Trellis Server - Fastify App Factory
 *
 * Creates and configures a Fastify server instance.
 */

import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import type { DatabaseConfig } from './config/database.js';
import type { ServerConfig } from './config/server.js';
import { postgresPlugin } from './plugins/postgres.js';
import { registerRequestIdMiddleware } from './middleware/request-id.js';
import { registerAuthMiddleware } from './middleware/auth.js';
import { registerTenantMiddleware } from './middleware/tenant.js';
import { registerErrorHandler } from './middleware/error-handler.js';
import { entityRoutes } from './routes/entities/index.js';
import { relationshipRoutes } from './routes/relationships/index.js';
import { queryRoutes } from './routes/query/index.js';
import { registerAuthRoutes } from './routes/auth/index.js';

/**
 * Application configuration.
 */
export interface AppConfig {
  /** Server configuration */
  readonly server: ServerConfig;

  /** Database configuration */
  readonly database: DatabaseConfig;
}

/**
 * Build Fastify options based on server config.
 */
function buildFastifyOptions(serverConfig: ServerConfig): FastifyServerOptions {
  const options: FastifyServerOptions = {
    trustProxy: serverConfig.trustProxy,
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  };

  // Configure logger based on environment
  if (serverConfig.env === 'development') {
    options.logger = {
      level: serverConfig.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    };
  } else {
    options.logger = {
      level: serverConfig.logLevel,
    };
  }

  return options;
}

/**
 * Build and configure a Fastify application.
 */
export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  // Create Fastify instance
  const options = buildFastifyOptions(config.server);
  const app = Fastify(options);

  // Register plugins
  await app.register(postgresPlugin, { config: config.database });

  // Register CORS - allow dev server origin
  // Use 'onRequest' hook to handle preflight before route matching
  await app.register(cors, {
    origin: config.server.env === 'development' ? true : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Actor-Id', 'X-Request-Id'],
    credentials: true,
    hook: 'onRequest',
  });

  // Register middleware (order matters!)
  // 1. Request ID - first, before anything logs
  registerRequestIdMiddleware(app);

  // 2. Auth - extract auth context from headers
  registerAuthMiddleware(app);

  // 3. Tenant - log tenant context (actual RLS set per-query)
  registerTenantMiddleware(app);

  // Register error handler
  registerErrorHandler(app);

  // Register routes
  registerAuthRoutes(app);  // Auth routes first (public paths)
  await app.register(entityRoutes);
  await app.register(relationshipRoutes);
  await app.register(queryRoutes);

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Readiness check endpoint (includes database)
  app.get('/ready', async (request) => {
    try {
      const client = await app.pg.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: { database: 'ok' },
      };
    } catch (err) {
      request.log.error({ err }, 'Readiness check failed');
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: { database: 'failed' },
      };
    }
  });

  return app;
}
