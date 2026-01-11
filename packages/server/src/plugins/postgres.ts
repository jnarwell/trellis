/**
 * Trellis Server - PostgreSQL Fastify Plugin
 *
 * Registers the PostgreSQL connection pool with Fastify.
 */

import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createPool, closePool, type Pool } from '../db/index.js';
import type { DatabaseConfig } from '../config/database.js';

declare module 'fastify' {
  interface FastifyInstance {
    pg: Pool;
  }
}

/**
 * PostgreSQL plugin options.
 */
export interface PostgresPluginOptions {
  /** Database configuration */
  readonly config: DatabaseConfig;
}

/**
 * PostgreSQL Fastify plugin.
 * Adds a `pg` property to the Fastify instance with the connection pool.
 */
const postgresPluginAsync: FastifyPluginAsync<PostgresPluginOptions> = async (
  fastify,
  options
) => {
  const pool = createPool(options.config);

  // Test the connection
  try {
    const client = await pool.connect();
    client.release();
    fastify.log.info('PostgreSQL connection pool created');
  } catch (err) {
    fastify.log.error({ err }, 'Failed to connect to PostgreSQL');
    throw err;
  }

  // Decorate the fastify instance with the pool
  fastify.decorate('pg', pool);

  // Close the pool when the server shuts down
  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing PostgreSQL connection pool');
    await closePool(pool);
  });
};

/**
 * PostgreSQL Fastify plugin.
 * Use fastify-plugin to ensure proper encapsulation.
 */
export const postgresPlugin = fp(postgresPluginAsync, {
  name: 'trellis-postgres',
  fastify: '5.x',
});
