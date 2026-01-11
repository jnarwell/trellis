/**
 * Query API Schema Tests
 *
 * Tests for query API request validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  queryRequestSchema,
  filterConditionSchema,
  filterGroupSchema,
  sortSpecSchema,
  paginationSchema,
} from '../../src/routes/query/schemas.js';

describe('filterConditionSchema', () => {
  it('accepts valid filter condition', () => {
    const input = {
      path: 'name',
      operator: 'eq',
      value: 'Widget',
    };
    const result = filterConditionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts all valid operators', () => {
    const operators = [
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'in',
      'nin',
      'contains',
      'starts',
      'ends',
      'regex',
      'exists',
      'type_is',
    ];
    for (const operator of operators) {
      const input = { path: 'field', operator, value: 'test' };
      const result = filterConditionSchema.safeParse(input);
      expect(result.success, `operator ${operator} should be valid`).toBe(true);
    }
  });

  it('rejects invalid operator', () => {
    const input = {
      path: 'name',
      operator: 'invalid',
      value: 'Widget',
    };
    const result = filterConditionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects empty path', () => {
    const input = {
      path: '',
      operator: 'eq',
      value: 'test',
    };
    const result = filterConditionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts array value for in operator', () => {
    const input = {
      path: 'status',
      operator: 'in',
      value: ['active', 'pending'],
    };
    const result = filterConditionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts numeric value', () => {
    const input = {
      path: 'price',
      operator: 'gt',
      value: 100,
    };
    const result = filterConditionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts boolean value', () => {
    const input = {
      path: 'active',
      operator: 'eq',
      value: true,
    };
    const result = filterConditionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('filterGroupSchema', () => {
  it('accepts AND group', () => {
    const input = {
      logic: 'and',
      conditions: [
        { path: 'status', operator: 'eq', value: 'active' },
        { path: 'price', operator: 'gt', value: 100 },
      ],
    };
    const result = filterGroupSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts OR group', () => {
    const input = {
      logic: 'or',
      conditions: [
        { path: 'category', operator: 'eq', value: 'A' },
        { path: 'category', operator: 'eq', value: 'B' },
      ],
    };
    const result = filterGroupSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts nested groups', () => {
    const input = {
      logic: 'and',
      conditions: [
        { path: 'active', operator: 'eq', value: true },
        {
          logic: 'or',
          conditions: [
            { path: 'type', operator: 'eq', value: 'A' },
            { path: 'type', operator: 'eq', value: 'B' },
          ],
        },
      ],
    };
    const result = filterGroupSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts empty conditions array', () => {
    const input = {
      logic: 'and',
      conditions: [],
    };
    const result = filterGroupSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid logic operator', () => {
    const input = {
      logic: 'xor',
      conditions: [],
    };
    const result = filterGroupSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('sortSpecSchema', () => {
  it('accepts valid sort spec with asc', () => {
    const input = { path: 'name', direction: 'asc' };
    const result = sortSpecSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts valid sort spec with desc', () => {
    const input = { path: 'created_at', direction: 'desc' };
    const result = sortSpecSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts sort spec with nulls first', () => {
    const input = { path: 'name', direction: 'asc', nulls: 'first' };
    const result = sortSpecSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts sort spec with nulls last', () => {
    const input = { path: 'price', direction: 'desc', nulls: 'last' };
    const result = sortSpecSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid direction', () => {
    const input = { path: 'name', direction: 'up' };
    const result = sortSpecSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects empty path', () => {
    const input = { path: '', direction: 'asc' };
    const result = sortSpecSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid nulls value', () => {
    const input = { path: 'name', direction: 'asc', nulls: 'middle' };
    const result = sortSpecSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('accepts valid pagination with limit', () => {
    const input = { limit: 50 };
    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it('provides default limit', () => {
    const input = {};
    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50); // Default from QUERY_DEFAULTS
    }
  });

  it('accepts pagination with offset', () => {
    const input = { limit: 50, offset: 100 };
    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset).toBe(100);
    }
  });

  it('accepts pagination with cursor', () => {
    const input = { limit: 50, cursor: 'some-cursor-string' };
    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBe('some-cursor-string');
    }
  });

  it('rejects limit below 1', () => {
    const input = { limit: 0 };
    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects limit above maximum', () => {
    const input = { limit: 2000 };
    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects negative offset', () => {
    const input = { limit: 50, offset: -1 };
    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('queryRequestSchema', () => {
  it('accepts empty request', () => {
    const input = {};
    const result = queryRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts request with type', () => {
    const input = { type: 'product' };
    const result = queryRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts request with type wildcard', () => {
    const input = { type: 'product.*' };
    const result = queryRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts request with filter', () => {
    const input = {
      filter: {
        logic: 'and',
        conditions: [{ path: 'status', operator: 'eq', value: 'active' }],
      },
    };
    const result = queryRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts request with sort', () => {
    const input = {
      sort: [
        { path: 'created_at', direction: 'desc' },
        { path: 'name', direction: 'asc' },
      ],
    };
    const result = queryRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts request with pagination', () => {
    const input = {
      pagination: { limit: 25, offset: 50 },
    };
    const result = queryRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts request with include_total', () => {
    const input = { include_total: true };
    const result = queryRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('defaults include_total to false', () => {
    const input = {};
    const result = queryRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_total).toBe(false);
    }
  });

  it('accepts full request with all options', () => {
    const input = {
      type: 'product',
      filter: {
        logic: 'and',
        conditions: [
          { path: 'status', operator: 'eq', value: 'active' },
          { path: 'price', operator: 'gt', value: 100 },
        ],
      },
      sort: [{ path: 'created_at', direction: 'desc' }],
      pagination: { limit: 50, offset: 0 },
      include_total: true,
    };
    const result = queryRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});
