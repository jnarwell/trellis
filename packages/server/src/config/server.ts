/**
 * Trellis Server - Server Configuration
 *
 * Configuration types and loader for Fastify server.
 */

/**
 * Server configuration.
 */
export interface ServerConfig {
  /** Host to bind to */
  readonly host: string;

  /** Port to bind to */
  readonly port: number;

  /** Environment (development, production, test) */
  readonly env: 'development' | 'production' | 'test';

  /** Log level */
  readonly logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  /** Whether to trust proxy headers */
  readonly trustProxy: boolean;
}

/**
 * Load server configuration from environment variables.
 */
export function loadServerConfig(): ServerConfig {
  const envValue = process.env['NODE_ENV'] ?? 'development';
  const env = (['development', 'production', 'test'].includes(envValue)
    ? envValue
    : 'development') as ServerConfig['env'];

  const logLevelValue = process.env['LOG_LEVEL'] ?? 'info';
  const logLevel = (['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(logLevelValue)
    ? logLevelValue
    : 'info') as ServerConfig['logLevel'];

  return {
    host: process.env['SERVER_HOST'] ?? '0.0.0.0',
    port: parseInt(process.env['SERVER_PORT'] ?? '3000', 10),
    env,
    logLevel,
    trustProxy: process.env['TRUST_PROXY'] === 'true',
  };
}
