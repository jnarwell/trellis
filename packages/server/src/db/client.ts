/**
 * Trellis Server - Tenant-Scoped Database Client
 *
 * Wraps pg PoolClient to automatically set tenant context for RLS.
 */

import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import type { TenantId } from '@trellis/kernel';

/**
 * A database client that has been scoped to a specific tenant.
 * The tenant context is set via `app.current_tenant_id` for RLS policies.
 */
export interface TenantScopedClient {
  /** Execute a query with parameters */
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>>;

  /** Release the client back to the pool */
  release(): void;

  /** The tenant ID this client is scoped to */
  readonly tenantId: TenantId;
}

/**
 * Set the tenant context on a database client for RLS.
 * Must be called before any queries that use RLS policies.
 */
export async function setTenantContext(
  client: PoolClient,
  tenantId: TenantId
): Promise<void> {
  await client.query('SET app.current_tenant_id = $1', [tenantId]);
}

/**
 * Clear the tenant context from a database client.
 * Call this before releasing a client back to the pool.
 */
export async function clearTenantContext(client: PoolClient): Promise<void> {
  await client.query('RESET app.current_tenant_id');
}

/**
 * Get a tenant-scoped database client from the pool.
 * The tenant context is automatically set for RLS policies.
 *
 * IMPORTANT: Always call release() when done, even if an error occurs.
 *
 * @example
 * ```typescript
 * const client = await getTenantScopedClient(pool, tenantId);
 * try {
 *   const result = await client.query('SELECT * FROM entities');
 *   // ... use result
 * } finally {
 *   client.release();
 * }
 * ```
 */
export async function getTenantScopedClient(
  pool: Pool,
  tenantId: TenantId
): Promise<TenantScopedClient> {
  const client = await pool.connect();

  try {
    await setTenantContext(client, tenantId);
  } catch (err) {
    client.release();
    throw err;
  }

  return {
    tenantId,
    query: <R extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: unknown[]
    ): Promise<QueryResult<R>> => client.query<R>(text, values),
    release: () => {
      // Clear tenant context before releasing
      // We use void to ignore the promise - if this fails, we still release
      void clearTenantContext(client).finally(() => {
        client.release();
      });
    },
  };
}

/**
 * Execute a function with a tenant-scoped client.
 * The client is automatically released after the function completes.
 *
 * @example
 * ```typescript
 * const result = await withTenantClient(pool, tenantId, async (client) => {
 *   return client.query('SELECT * FROM entities');
 * });
 * ```
 */
export async function withTenantClient<T>(
  pool: Pool,
  tenantId: TenantId,
  fn: (client: TenantScopedClient) => Promise<T>
): Promise<T> {
  const client = await getTenantScopedClient(pool, tenantId);
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/**
 * Execute a function within a transaction with a tenant-scoped client.
 * The transaction is automatically committed on success or rolled back on error.
 *
 * @example
 * ```typescript
 * const result = await withTenantTransaction(pool, tenantId, async (client) => {
 *   await client.query('INSERT INTO entities ...');
 *   await client.query('INSERT INTO events ...');
 *   return { success: true };
 * });
 * ```
 */
export async function withTenantTransaction<T>(
  pool: Pool,
  tenantId: TenantId,
  fn: (client: TenantScopedClient) => Promise<T>
): Promise<T> {
  const pgClient = await pool.connect();

  try {
    await setTenantContext(pgClient, tenantId);
    await pgClient.query('BEGIN');

    const client: TenantScopedClient = {
      tenantId,
      query: <R extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: unknown[]
      ): Promise<QueryResult<R>> => pgClient.query<R>(text, values),
      release: () => {
        // No-op in transaction context
      },
    };

    const result = await fn(client);
    await pgClient.query('COMMIT');
    return result;
  } catch (err) {
    await pgClient.query('ROLLBACK');
    throw err;
  } finally {
    await clearTenantContext(pgClient);
    pgClient.release();
  }
}
