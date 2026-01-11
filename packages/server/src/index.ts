/**
 * @trellis/server
 *
 * Trellis API server built with Fastify.
 */

export const SERVER_VERSION = '0.0.1';

// Re-export configuration module
export * from './config/index.js';

// Re-export app factory
export { buildApp, type AppConfig } from './app.js';

// Re-export database utilities
export {
  createPool,
  closePool,
  type Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from './db/index.js';

export {
  getTenantScopedClient,
  withTenantClient,
  withTenantTransaction,
  setTenantContext,
  clearTenantContext,
  type TenantScopedClient,
} from './db/client.js';

// Re-export middleware
export * from './middleware/index.js';

// Re-export plugins
export { postgresPlugin, type PostgresPluginOptions } from './plugins/postgres.js';

// Re-export types
export type { AuthContext } from './types/fastify.js';

// Server startup (when run directly)
import { loadDatabaseConfig } from './config/database.js';
import { loadServerConfig } from './config/server.js';
import { buildApp } from './app.js';

/**
 * Start the server.
 */
async function start(): Promise<void> {
  const serverConfig = loadServerConfig();
  const databaseConfig = loadDatabaseConfig();

  const app = await buildApp({
    server: serverConfig,
    database: databaseConfig,
  });

  try {
    const address = await app.listen({
      host: serverConfig.host,
      port: serverConfig.port,
    });
    app.log.info(`Trellis server v${SERVER_VERSION} listening at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Only start if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  start();
}
