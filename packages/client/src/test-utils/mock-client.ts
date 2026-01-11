/**
 * Mock Trellis Client for Storybook and Tests
 *
 * Provides a mock implementation of the Trellis client API
 * for use in stories and unit tests.
 */

export interface MockEntity {
  id: string;
  type: string;
  properties: Record<string, { value: unknown }>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const mockEntities: MockEntity[] = [
  {
    id: '01924f8a-1234-7000-8000-000000000001',
    type: 'product',
    properties: {
      name: { value: 'Widget Pro' },
      sku: { value: 'WGT-001' },
      price: { value: 29.99 },
      status: { value: 'active' },
    },
    version: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '01924f8a-1234-7000-8000-000000000002',
    type: 'product',
    properties: {
      name: { value: 'Gadget X' },
      sku: { value: 'GDG-002' },
      price: { value: 49.99 },
      status: { value: 'active' },
    },
    version: 1,
    createdAt: '2024-01-16T11:00:00Z',
    updatedAt: '2024-01-16T11:00:00Z',
  },
  {
    id: '01924f8a-1234-7000-8000-000000000003',
    type: 'product',
    properties: {
      name: { value: 'Component Z' },
      sku: { value: 'CMP-003' },
      price: { value: 14.99 },
      status: { value: 'draft' },
    },
    version: 2,
    createdAt: '2024-01-17T09:30:00Z',
    updatedAt: '2024-01-18T14:20:00Z',
  },
];

export interface QueryBuilder {
  where: (condition: unknown) => QueryBuilder;
  orderBy: (field: string, direction?: 'asc' | 'desc') => QueryBuilder;
  limit: (n: number) => QueryBuilder;
  offset: (n: number) => QueryBuilder;
  execute: () => Promise<{ items: MockEntity[]; total: number }>;
}

export interface MockAuthState {
  readonly isAuthenticated: boolean;
  readonly tenantId: string | null;
  readonly actorId: string | null;
  readonly expiresAt: number | null;
}

export type MockConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'reconnecting';

export interface MockClient {
  query: (type?: string) => QueryBuilder;
  getEntity: (id: string) => Promise<MockEntity | undefined>;
  createEntity: (type: string, properties: Record<string, unknown>) => Promise<MockEntity>;
  updateEntity: (id: string, properties: Record<string, unknown>) => Promise<MockEntity>;
  deleteEntity: (id: string) => Promise<void>;
  getAuthState: () => MockAuthState;
  getConnectionState: () => MockConnectionState;
}

function createQueryBuilder(entities: MockEntity[]): QueryBuilder {
  let filtered = [...entities];

  const builder: QueryBuilder = {
    where: () => builder,
    orderBy: () => builder,
    limit: (n: number) => {
      filtered = filtered.slice(0, n);
      return builder;
    },
    offset: (n: number) => {
      filtered = filtered.slice(n);
      return builder;
    },
    execute: async () => ({
      items: filtered,
      total: entities.length,
    }),
  };

  return builder;
}

export interface MockClientOptions {
  /** Initial entities by ID (Record<id, entity>) */
  entities?: Record<string, MockEntity>;
  /** Query results by type (Record<type, entities[]>) */
  queryResults?: Record<string, MockEntity[]>;
  /** Simulate loading state */
  loading?: boolean;
}

/**
 * Mock Trellis Client class for Storybook and Tests.
 *
 * Provides a mock implementation that can be instantiated with options.
 */
export class MockTrellisClient implements MockClient {
  private entitiesById: Map<string, MockEntity>;
  private queryResultsByType: Map<string, MockEntity[]>;
  private loading: boolean;

  constructor(options?: MockClientOptions) {
    // Handle entities as Record<id, entity>
    if (options?.entities && typeof options.entities === 'object') {
      this.entitiesById = new Map(Object.entries(options.entities));
    } else {
      this.entitiesById = new Map(mockEntities.map((e) => [e.id, e]));
    }

    // Handle query results by type
    if (options?.queryResults) {
      this.queryResultsByType = new Map(Object.entries(options.queryResults));
    } else {
      this.queryResultsByType = new Map();
    }

    this.loading = options?.loading ?? false;
  }

  private get entities(): MockEntity[] {
    return Array.from(this.entitiesById.values());
  }

  query(type?: string): QueryBuilder {
    // If we have specific query results for this type, use them
    if (type && this.queryResultsByType.has(type)) {
      return createQueryBuilder(this.queryResultsByType.get(type)!);
    }
    // Otherwise filter from all entities
    const filtered = type
      ? this.entities.filter((e) => e.type === type)
      : this.entities;
    return createQueryBuilder(filtered);
  }

  async getEntity(id: string): Promise<MockEntity | undefined> {
    return this.entitiesById.get(id);
  }

  async createEntity(type: string, properties: Record<string, unknown>): Promise<MockEntity> {
    const newEntity: MockEntity = {
      id: `01924f8a-${Date.now().toString(16)}-7000-8000-${Math.random().toString(16).slice(2, 14)}`,
      type,
      properties: Object.fromEntries(
        Object.entries(properties).map(([k, v]) => [k, { value: v }])
      ),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.entitiesById.set(newEntity.id, newEntity);
    return newEntity;
  }

  async updateEntity(id: string, properties: Record<string, unknown>): Promise<MockEntity> {
    const entity = this.entitiesById.get(id);
    if (!entity) {
      throw new Error(`Entity ${id} not found`);
    }
    const updated: MockEntity = {
      id: entity.id,
      type: entity.type,
      properties: {
        ...entity.properties,
        ...Object.fromEntries(
          Object.entries(properties).map(([k, v]) => [k, { value: v }])
        ),
      },
      version: entity.version + 1,
      createdAt: entity.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.entitiesById.set(id, updated);
    return updated;
  }

  async deleteEntity(id: string): Promise<void> {
    if (!this.entitiesById.has(id)) {
      throw new Error(`Entity ${id} not found`);
    }
    this.entitiesById.delete(id);
  }

  getAuthState(): MockAuthState {
    return {
      isAuthenticated: true,
      tenantId: 'demo-tenant',
      actorId: 'demo-user',
      expiresAt: Date.now() + 3600000, // 1 hour from now
    };
  }

  getConnectionState(): MockConnectionState {
    return this.loading ? 'connecting' : 'connected';
  }
}

/** Singleton instance for backwards compatibility */
export const mockClient: MockClient = new MockTrellisClient();
