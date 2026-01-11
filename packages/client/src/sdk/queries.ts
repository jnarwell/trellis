/**
 * Trellis Client SDK - Query Builder
 *
 * Fluent API for building entity queries.
 */

import type {
  Entity,
  FilterOperator,
  FilterCondition,
  FilterGroup,
  SortSpec,
} from '@trellis/kernel';
import type { HttpClient } from './http.js';
import type { QueryResult, PaginationInfo, SortOption } from './types.js';

/**
 * API response format for queries.
 */
interface QueryResponse {
  readonly data: readonly Entity[];
  readonly total_count?: number;
  readonly pagination: {
    readonly offset: number;
    readonly limit: number;
    readonly has_more: boolean;
    readonly cursor?: string;
  };
}

/**
 * Query request body.
 */
interface QueryRequest {
  readonly type?: string;
  readonly filter?: FilterGroup;
  readonly sort?: readonly SortSpec[];
  readonly pagination?: {
    readonly limit?: number;
    readonly offset?: number;
    readonly cursor?: string;
  };
  readonly include_total?: boolean;
}

/**
 * Fluent query builder for entities.
 *
 * @example
 * ```typescript
 * const products = await client
 *   .query('product')
 *   .where('status', 'eq', 'active')
 *   .where('price', 'gt', 100)
 *   .orderBy('created_at', 'desc')
 *   .limit(50)
 *   .execute();
 * ```
 */
export class QueryBuilder {
  private readonly http: HttpClient;
  private readonly entityType: string | undefined;
  private conditions: FilterCondition[] = [];
  private groups: FilterGroup[] = [];
  private sortSpecs: SortSpec[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private cursorValue?: string;
  private includeTotalValue = false;

  constructor(http: HttpClient, entityType: string | undefined = undefined) {
    this.http = http;
    this.entityType = entityType;
  }

  /**
   * Add a filter condition.
   *
   * @example
   * ```typescript
   * query.where('name', 'contains', 'widget')
   * query.where('price', 'gte', 100)
   * query.where('status', 'in', ['active', 'pending'])
   * ```
   */
  where(path: string, operator: FilterOperator, value: unknown): this {
    this.conditions.push({ path, operator, value });
    return this;
  }

  /**
   * Add an AND group of conditions.
   *
   * @example
   * ```typescript
   * query.and(q => {
   *   q.where('status', 'eq', 'active')
   *   q.where('verified', 'eq', true)
   * })
   * ```
   */
  and(callback: (builder: QueryBuilder) => void): this {
    const subBuilder = new QueryBuilder(this.http, this.entityType);
    callback(subBuilder);
    const group = subBuilder.buildFilterGroup();
    if (group) {
      this.groups.push({ ...group, logic: 'and' });
    }
    return this;
  }

  /**
   * Add an OR group of conditions.
   *
   * @example
   * ```typescript
   * query.or(q => {
   *   q.where('status', 'eq', 'active')
   *   q.where('status', 'eq', 'pending')
   * })
   * ```
   */
  or(callback: (builder: QueryBuilder) => void): this {
    const subBuilder = new QueryBuilder(this.http, this.entityType);
    callback(subBuilder);
    const group = subBuilder.buildFilterGroup();
    if (group) {
      this.groups.push({ ...group, logic: 'or' });
    }
    return this;
  }

  /**
   * Add a sort specification.
   *
   * @example
   * ```typescript
   * query.orderBy('created_at', 'desc')
   * query.orderBy('name') // defaults to 'asc'
   * ```
   */
  orderBy(path: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.sortSpecs.push({ path, direction });
    return this;
  }

  /**
   * Add multiple sort specifications.
   */
  orderByMultiple(sorts: readonly SortOption[]): this {
    for (const sort of sorts) {
      const spec: SortSpec = {
        path: sort.path,
        direction: sort.direction ?? 'asc',
      };
      if (sort.nulls !== undefined) {
        (spec as { nulls: 'first' | 'last' }).nulls = sort.nulls;
      }
      this.sortSpecs.push(spec);
    }
    return this;
  }

  /**
   * Set the maximum number of results.
   */
  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  /**
   * Set the offset for pagination.
   */
  offset(n: number): this {
    this.offsetValue = n;
    return this;
  }

  /**
   * Set cursor for cursor-based pagination.
   */
  cursor(value: string): this {
    this.cursorValue = value;
    return this;
  }

  /**
   * Include total count in results (may be expensive).
   */
  includeTotal(): this {
    this.includeTotalValue = true;
    return this;
  }

  /**
   * Execute the query and return results.
   */
  async execute(): Promise<QueryResult<Entity>> {
    const request = this.buildRequest();
    const response = await this.http.post<QueryResponse>('/query', request);

    return {
      data: response.data,
      pagination: {
        offset: response.pagination.offset,
        limit: response.pagination.limit,
        hasMore: response.pagination.has_more,
        cursor: response.pagination.cursor,
        totalCount: response.total_count,
      },
    };
  }

  /**
   * Execute and return just the data array.
   */
  async toArray(): Promise<readonly Entity[]> {
    const result = await this.execute();
    return result.data;
  }

  /**
   * Execute and return the first result or null.
   */
  async first(): Promise<Entity | null> {
    this.limitValue = 1;
    const result = await this.execute();
    return result.data[0] ?? null;
  }

  /**
   * Execute and return the count.
   */
  async count(): Promise<number> {
    this.includeTotalValue = true;
    this.limitValue = 0;
    const result = await this.execute();
    return result.pagination.totalCount ?? 0;
  }

  /**
   * Build the query request object.
   */
  private buildRequest(): QueryRequest {
    const request: QueryRequest = {};

    if (this.entityType) {
      (request as { type: string }).type = this.entityType;
    }

    const filter = this.buildFilterGroup();
    if (filter) {
      (request as { filter: FilterGroup }).filter = filter;
    }

    if (this.sortSpecs.length > 0) {
      (request as { sort: readonly SortSpec[] }).sort = this.sortSpecs;
    }

    const pagination: {
      limit?: number;
      offset?: number;
      cursor?: string;
    } = {};
    if (this.limitValue !== undefined) pagination.limit = this.limitValue;
    if (this.offsetValue !== undefined) pagination.offset = this.offsetValue;
    if (this.cursorValue) pagination.cursor = this.cursorValue;

    if (Object.keys(pagination).length > 0) {
      (request as { pagination: typeof pagination }).pagination = pagination;
    }

    if (this.includeTotalValue) {
      (request as { include_total: boolean }).include_total = true;
    }

    return request;
  }

  /**
   * Build the filter group from conditions.
   */
  private buildFilterGroup(): FilterGroup | null {
    const allConditions: Array<FilterCondition | FilterGroup> = [
      ...this.conditions,
      ...this.groups,
    ];

    if (allConditions.length === 0) {
      return null;
    }

    return {
      logic: 'and',
      conditions: allConditions,
    };
  }
}

/**
 * Query API for executing queries.
 */
export class QueryApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new query builder.
   *
   * @param type - Optional entity type to filter by
   */
  query(type?: string): QueryBuilder {
    return new QueryBuilder(this.http, type);
  }

  /**
   * Execute a raw query request.
   */
  async execute(request: QueryRequest): Promise<QueryResult<Entity>> {
    const response = await this.http.post<QueryResponse>('/query', request);

    return {
      data: response.data,
      pagination: {
        offset: response.pagination.offset,
        limit: response.pagination.limit,
        hasMore: response.pagination.has_more,
        cursor: response.pagination.cursor,
        totalCount: response.total_count,
      },
    };
  }
}
