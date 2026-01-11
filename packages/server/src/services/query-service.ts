/**
 * Trellis Server - Query Service
 *
 * Executes entity queries against the database.
 */

import type { Pool } from 'pg';
import type {
  Entity,
  EntityId,
  TenantId,
  FilterGroup,
  SortSpec,
  QueryResult,
} from '@trellis/kernel';
import { withTenantClient } from '../db/client.js';
import { buildSelectQuery, encodeCursor, type Cursor } from '../query/index.js';
import { QUERY_DEFAULTS } from '../config/query.js';

/**
 * Query options for listing entities.
 */
export interface QueryEntitiesOptions {
  /** Entity type filter (supports "product.*" wildcard) */
  type?: string;

  /** Filter conditions */
  filter?: FilterGroup;

  /** Sort specifications */
  sort?: SortSpec[];

  /** Maximum results to return */
  limit?: number;

  /** Offset for offset-based pagination */
  offset?: number;

  /** Cursor for cursor-based pagination */
  cursor?: string;

  /** Whether to include total count (expensive for large tables) */
  includeTotal?: boolean;
}

/**
 * Database row for an entity.
 */
interface EntityRow {
  id: string;
  tenant_id: string;
  type_path: string;
  properties: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  version: number;
  deleted_at: Date | null;
}

/**
 * Transform a database row to an Entity.
 */
function rowToEntity(row: EntityRow): Entity {
  return {
    id: row.id as EntityId,
    tenant_id: row.tenant_id as TenantId,
    type: row.type_path as Entity['type'],
    properties: row.properties as Entity['properties'],
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    created_by: row.created_by as Entity['created_by'],
    version: row.version,
  };
}

/**
 * Query service for executing entity queries.
 */
export class QueryService {
  constructor(private readonly pool: Pool) {}

  /**
   * Query entities with filtering, sorting, and pagination.
   *
   * @param tenantId - Tenant to query within
   * @param options - Query options
   * @returns Query result with entities and pagination info
   */
  async queryEntities(
    tenantId: TenantId,
    options: QueryEntitiesOptions = {}
  ): Promise<QueryResult<Entity>> {
    const limit = Math.min(
      options.limit ?? QUERY_DEFAULTS.limit,
      QUERY_DEFAULTS.maxLimit
    );
    const offset = options.offset ?? 0;

    // Build the query options
    const queryOptions: Parameters<typeof buildSelectQuery>[0] = {
      tenantId,
      limit,
    };

    if (options.type) {
      queryOptions.type = options.type;
    }
    if (options.filter) {
      queryOptions.filter = options.filter;
    }
    if (options.sort) {
      queryOptions.sort = options.sort;
    }
    if (!options.cursor && offset > 0) {
      queryOptions.offset = offset;
    }
    if (options.cursor) {
      queryOptions.cursor = options.cursor;
    }
    if (options.includeTotal) {
      queryOptions.includeTotal = options.includeTotal;
    }

    const query = buildSelectQuery(queryOptions);

    return withTenantClient(this.pool, tenantId, async (client) => {
      // Execute count query if requested
      let totalCount: number | undefined;
      if (query.countSQL) {
        const countResult = await client.query<{ total: string }>(
          query.countSQL,
          query.params.slice(0, query.countParamCount)
        );
        totalCount = parseInt(countResult.rows[0]?.total ?? '0', 10);
      }

      // Execute main query
      const result = await client.query<EntityRow>(query.selectSQL, query.params);

      // Check if there are more results
      const hasMore = result.rows.length > limit;
      const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

      // Transform rows to entities
      const entities = rows.map(rowToEntity);

      // Build next cursor if there are more results
      let nextCursor: string | undefined;
      const lastRow = rows[rows.length - 1];
      if (hasMore && lastRow) {
        const cursor: Cursor = {
          sortValues: query.sortPaths.map((path) => {
            // For reserved columns, use direct access
            const reserved = ['id', 'type_path', 'created_at', 'updated_at', 'created_by', 'version'];
            const snakePath = path.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (reserved.includes(path) || reserved.includes(snakePath)) {
              const key = snakePath as keyof EntityRow;
              const value = lastRow[key];
              // Convert dates to ISO strings for JSON serialization
              if (value instanceof Date) {
                return value.toISOString();
              }
              return value;
            }
            // For property paths, extract from properties JSONB
            // This is simplified - full implementation would need to traverse the path
            return null;
          }),
          id: lastRow.id as EntityId,
        };
        nextCursor = encodeCursor(cursor);
      }

      // Build pagination object
      const paginationResult: {
        offset: number;
        limit: number;
        has_more: boolean;
        cursor?: string;
      } = {
        offset: options.cursor ? 0 : offset,
        limit,
        has_more: hasMore,
      };

      if (nextCursor) {
        paginationResult.cursor = nextCursor;
      }

      // Build result with proper optional handling
      const queryResult: {
        data: Entity[];
        total_count?: number;
        pagination: typeof paginationResult;
      } = {
        data: entities,
        pagination: paginationResult,
      };

      if (totalCount !== undefined) {
        queryResult.total_count = totalCount;
      }

      return queryResult as QueryResult<Entity>;
    });
  }

  /**
   * Get a single entity by ID.
   *
   * @param tenantId - Tenant to query within
   * @param entityId - Entity ID
   * @returns The entity or null if not found
   */
  async getEntity(
    tenantId: TenantId,
    entityId: EntityId
  ): Promise<Entity | null> {
    return withTenantClient(this.pool, tenantId, async (client) => {
      const result = await client.query<EntityRow>(
        `
        SELECT *
        FROM entities
        WHERE tenant_id = $1
          AND id = $2
          AND deleted_at IS NULL
        `,
        [tenantId, entityId]
      );

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return rowToEntity(row);
    });
  }
}
