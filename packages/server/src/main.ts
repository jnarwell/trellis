/**
 * Trellis CLI - Main Entry Point
 *
 * Wires up the CLI with database, block registry, and server startup.
 */

import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { createBlockRegistry, InMemoryBlockRegistry, asBlockType } from '@trellis/kernel';
import type { BlockSpec, BlockCategory, BlockType } from '@trellis/kernel';
import { runCli, type CliConfig } from './cli/index.js';
import { loadDatabaseConfig } from './config/database.js';
import { loadServerConfig } from './config/server.js';
import { buildApp } from './app.js';
import type { ProductLoaderDb } from './loader/product-loader.js';

// =============================================================================
// DATABASE ADAPTER
// =============================================================================

/**
 * Create a ProductLoaderDb adapter from a pg Pool.
 */
function createDbAdapter(pool: Pool): ProductLoaderDb {
  return {
    async $transaction<T>(fn: (tx: ProductLoaderDbTx) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const tx = createTxAdapter(client);
        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    tenants: createTableAdapter(pool, 'tenants'),
    actors: createTableAdapter(pool, 'actors'),
  };
}

interface ProductLoaderDbTx {
  type_schemas: DbTable;
  entities: DbTable;
  relationships: DbTable;
}

interface DbTable {
  findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
}

function createTxAdapter(client: PoolClient): ProductLoaderDbTx {
  return {
    type_schemas: createClientTableAdapter(client, 'type_schemas'),
    entities: createClientTableAdapter(client, 'entities'),
    relationships: createClientTableAdapter(client, 'relationships'),
  };
}

function createTableAdapter(pool: Pool, tableName: string): DbTable {
  return {
    async findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null> {
      const entries = Object.entries(args.where);
      const whereClauses = entries.map((_, i) => `${entries[i][0]} = $${i + 1}`);
      const values = entries.map(([, v]) => v);

      const query = `SELECT id FROM ${tableName} WHERE ${whereClauses.join(' AND ')} LIMIT 1`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) return null;
      return { id: result.rows[0].id };
    },

    async create(args: { data: Record<string, unknown> }): Promise<{ id: string }> {
      const entries = Object.entries(args.data);
      const columns = entries.map(([k]) => k);
      const placeholders = entries.map((_, i) => `$${i + 1}`);
      const values = entries.map(([, v]) => {
        // Handle JSONB serialization
        if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
          return JSON.stringify(v);
        }
        return v;
      });

      const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
      const result = await pool.query(query, values);
      return { id: result.rows[0].id };
    },

    async update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }> {
      const entries = Object.entries(args.data);
      const setClauses = entries.map((_, i) => `${entries[i][0]} = $${i + 1}`);
      const values = entries.map(([, v]) => {
        if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
          return JSON.stringify(v);
        }
        return v;
      });
      values.push(args.where.id);

      const query = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING id`;
      const result = await pool.query(query, values);
      return { id: result.rows[0].id };
    },
  };
}

function createClientTableAdapter(client: PoolClient, tableName: string): DbTable {
  return {
    async findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null> {
      const entries = Object.entries(args.where);
      const whereClauses = entries.map((_, i) => `${entries[i][0]} = $${i + 1}`);
      const values = entries.map(([, v]) => v);

      const query = `SELECT id FROM ${tableName} WHERE ${whereClauses.join(' AND ')} LIMIT 1`;
      const result = await client.query(query, values);

      if (result.rows.length === 0) return null;
      return { id: result.rows[0].id };
    },

    async create(args: { data: Record<string, unknown> }): Promise<{ id: string }> {
      const entries = Object.entries(args.data);
      const columns = entries.map(([k]) => k);
      const placeholders = entries.map((_, i) => `$${i + 1}`);
      const values = entries.map(([, v]) => {
        if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
          return JSON.stringify(v);
        }
        return v;
      });

      const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
      const result = await client.query(query, values);
      return { id: result.rows[0].id };
    },

    async update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }> {
      const entries = Object.entries(args.data);
      const setClauses = entries.map((_, i) => `${entries[i][0]} = $${i + 1}`);
      const values = entries.map(([, v]) => {
        if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
          return JSON.stringify(v);
        }
        return v;
      });
      values.push(args.where.id);

      const query = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING id`;
      const result = await client.query(query, values);
      return { id: result.rows[0].id };
    },
  };
}

// =============================================================================
// BLOCK REGISTRY SETUP
// =============================================================================

/**
 * Create a block registry with default Trellis blocks.
 */
function setupBlockRegistry(): InMemoryBlockRegistry {
  const registry = createBlockRegistry();

  // Register standard Trellis blocks
  const defaultBlocks: Array<{
    type: string;
    name: string;
    category: BlockCategory;
    description: string;
  }> = [
    { type: 'trellis.data-table', name: 'Data Table', category: 'layout', description: 'Table for displaying entity data' },
    { type: 'trellis.page-layout', name: 'Page Layout', category: 'layout', description: 'Page container with header and content' },
    { type: 'trellis.page-header', name: 'Page Header', category: 'layout', description: 'Page title and actions' },
    { type: 'trellis.property-editor', name: 'Property Editor', category: 'form', description: 'Edit entity properties' },
    { type: 'trellis.dashboard-widget', name: 'Dashboard Widget', category: 'display', description: 'Dashboard metric widget' },
    { type: 'trellis.card', name: 'Card', category: 'layout', description: 'Card container' },
    { type: 'trellis.button', name: 'Button', category: 'action', description: 'Action button' },
    { type: 'trellis.detail', name: 'Detail', category: 'display', description: 'Entity detail view' },
    { type: 'trellis.form', name: 'Form', category: 'form', description: 'Entity form' },
    { type: 'trellis.kanban', name: 'Kanban', category: 'layout', description: 'Kanban board' },
  ];

  for (const block of defaultBlocks) {
    const spec: BlockSpec = {
      type: asBlockType(block.type),
      name: block.name,
      category: block.category,
      description: block.description,
      props: [],
      slots: [],
      events: [],
    };
    registry.registerBlock(spec);
  }

  return registry;
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const databaseConfig = loadDatabaseConfig();
  const serverConfig = loadServerConfig();

  // Create database pool
  const pool = new Pool({ connectionString: databaseConfig.url });

  // Create block registry
  const blockRegistry = setupBlockRegistry();

  // CLI configuration
  const cliConfig: CliConfig = {
    version: '0.1.0',
    name: 'trellis',

    getDb: async () => createDbAdapter(pool),
    getBlockRegistry: () => blockRegistry,

    startServer: async (options) => {
      const app = await buildApp({
        server: {
          ...serverConfig,
          port: options.port,
          host: options.host,
        },
        database: databaseConfig,
      });

      await app.listen({ port: options.port, host: options.host });
      console.log(`\nServer running at http://${options.host}:${options.port}`);

      // Keep the process running
      await new Promise(() => {}); // Never resolves
    },
  };

  try {
    await runCli(cliConfig);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
