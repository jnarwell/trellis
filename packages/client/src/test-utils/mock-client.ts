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

export interface MockClient {
  query: (type?: string) => QueryBuilder;
  getEntity: (id: string) => Promise<MockEntity | undefined>;
  createEntity: (type: string, properties: Record<string, unknown>) => Promise<MockEntity>;
  updateEntity: (id: string, properties: Record<string, unknown>) => Promise<MockEntity>;
  deleteEntity: (id: string) => Promise<void>;
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

export const mockClient: MockClient = {
  query: (type?: string) => {
    const filtered = type
      ? mockEntities.filter((e) => e.type === type)
      : mockEntities;
    return createQueryBuilder(filtered);
  },

  getEntity: async (id: string) => {
    return mockEntities.find((e) => e.id === id);
  },

  createEntity: async (type: string, properties: Record<string, unknown>) => {
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
    return newEntity;
  },

  updateEntity: async (id: string, properties: Record<string, unknown>) => {
    const entity = mockEntities.find((e) => e.id === id);
    if (!entity) {
      throw new Error(`Entity ${id} not found`);
    }
    return {
      ...entity,
      properties: {
        ...entity.properties,
        ...Object.fromEntries(
          Object.entries(properties).map(([k, v]) => [k, { value: v }])
        ),
      },
      version: entity.version + 1,
      updatedAt: new Date().toISOString(),
    };
  },

  deleteEntity: async (id: string) => {
    const index = mockEntities.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Entity ${id} not found`);
    }
  },
};
