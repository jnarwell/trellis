/**
 * queryEntities resolves inherited properties when resolve_inherited is set,
 * so list/query results are consistent with single-entity GET. The DB layer is
 * mocked (full path covered by the DB-gated e2e suite).
 */

import { vi, describe, it, expect } from 'vitest';

const PARENT_ID = 'aaaaaaaa-0000-7000-8000-000000000001';
const CHILD_ID = 'cccccccc-0000-7000-8000-000000000002';

const row = (id: string, properties: Record<string, unknown>) => ({
  id,
  tenant_id: '00000000-0000-7000-8000-0000000000aa',
  type_path: 'thing',
  properties,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  created_by: '00000000-0000-7000-8000-0000000000bb',
  version: 1,
});

const childRow = row(CHILD_ID, {
  color: { source: 'inherited', name: 'color', from_entity: PARENT_ID, computation_status: 'pending' },
});
const parentRow = row(PARENT_ID, {
  color: { source: 'literal', name: 'color', value: { type: 'text', value: 'red' } },
});

// Mock the query builder to a trivial SELECT and the client wrapper to a mock
// client that serves the page rows and the inheritance loader's lookups.
vi.mock('../../src/query/index.js', () => ({
  buildSelectQuery: () => ({
    selectSQL: 'SELECT * FROM entities /* page */',
    countSQL: undefined,
    params: [],
    sortPaths: [],
    countParamCount: 0,
  }),
  encodeCursor: () => 'cursor',
}));

vi.mock('../../src/db/client.js', () => ({
  withTenantClient: async (_pool: unknown, _tenant: unknown, cb: (c: unknown) => Promise<unknown>) => {
    const client = {
      query: async (sql: string) => {
        if (sql.includes('/* page */')) return { rows: [childRow] };
        // The inheritance loader's per-source lookup.
        if (sql.includes('WHERE tenant_id') && sql.includes('id =')) return { rows: [parentRow] };
        return { rows: [] };
      },
    };
    return cb(client);
  },
}));

import { QueryService } from '../../src/services/query-service.js';
import type { TenantId } from '@trellis/kernel';

describe('queryEntities resolve_inherited', () => {
  const tenantId = '00000000-0000-7000-8000-0000000000aa' as TenantId;

  it('leaves inherited properties unresolved by default', async () => {
    const svc = new QueryService({} as never);
    const result = await svc.queryEntities(tenantId);
    const color = result.data[0]!.properties['color' as keyof (typeof result.data)[0]['properties']] as {
      resolved_value?: unknown;
    };
    expect(color.resolved_value).toBeUndefined();
  });

  it('resolves inherited properties when requested', async () => {
    const svc = new QueryService({} as never);
    const result = await svc.queryEntities(tenantId, { resolveInherited: true });
    const color = result.data[0]!.properties['color' as keyof (typeof result.data)[0]['properties']] as {
      resolved_value?: { value?: unknown };
      computation_status?: string;
    };
    expect(color.computation_status).toBe('valid');
    expect(color.resolved_value).toEqual({ type: 'text', value: 'red' });
  });
});
