/**
 * Filter Translation Tests
 *
 * Tests for translating FilterCondition and FilterGroup to SQL.
 */

import { describe, it, expect } from 'vitest';
import { filterConditionToSQL, filterGroupToSQL } from '../../src/query/filters.js';
import type { FilterCondition, FilterGroup } from '@trellis/kernel';

describe('filterConditionToSQL', () => {
  describe('equality operators', () => {
    it('translates eq operator', () => {
      const condition: FilterCondition = {
        path: 'name',
        operator: 'eq',
        value: 'Widget',
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("properties->'name'->'value'->>'value' = $1");
      expect(result.params).toEqual(['Widget']);
    });

    it('translates neq operator', () => {
      const condition: FilterCondition = {
        path: 'status',
        operator: 'neq',
        value: 'archived',
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("properties->'status'->'value'->>'value' != $1");
      expect(result.params).toEqual(['archived']);
    });
  });

  describe('comparison operators', () => {
    it('translates gt operator with numeric value', () => {
      const condition: FilterCondition = {
        path: 'price',
        operator: 'gt',
        value: 100,
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("(properties->'price'->'value'->>'value')::numeric > $1");
      expect(result.params).toEqual([100]);
    });

    it('translates gte operator', () => {
      const condition: FilterCondition = {
        path: 'quantity',
        operator: 'gte',
        value: 10,
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("(properties->'quantity'->'value'->>'value')::numeric >= $1");
      expect(result.params).toEqual([10]);
    });

    it('translates lt operator', () => {
      const condition: FilterCondition = {
        path: 'rating',
        operator: 'lt',
        value: 3.5,
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("(properties->'rating'->'value'->>'value')::numeric < $1");
      expect(result.params).toEqual([3.5]);
    });

    it('translates lte operator', () => {
      const condition: FilterCondition = {
        path: 'age',
        operator: 'lte',
        value: 65,
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("(properties->'age'->'value'->>'value')::numeric <= $1");
      expect(result.params).toEqual([65]);
    });
  });

  describe('array operators', () => {
    it('translates in operator', () => {
      const condition: FilterCondition = {
        path: 'status',
        operator: 'in',
        value: ['active', 'pending', 'review'],
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("properties->'status'->'value'->'value' = ANY($1)");
      expect(result.params).toEqual([['active', 'pending', 'review']]);
    });

    it('translates nin operator', () => {
      const condition: FilterCondition = {
        path: 'category',
        operator: 'nin',
        value: ['deprecated', 'archived'],
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("properties->'category'->'value'->'value' != ALL($1)");
      expect(result.params).toEqual([['deprecated', 'archived']]);
    });

    it('throws for in operator with non-array value', () => {
      const condition: FilterCondition = {
        path: 'status',
        operator: 'in',
        value: 'active',
      };
      expect(() => filterConditionToSQL(condition, 1)).toThrow(
        'IN operator requires an array value'
      );
    });

    it('throws for nin operator with non-array value', () => {
      const condition: FilterCondition = {
        path: 'status',
        operator: 'nin',
        value: 'archived',
      };
      expect(() => filterConditionToSQL(condition, 1)).toThrow(
        'NIN operator requires an array value'
      );
    });
  });

  describe('text operators', () => {
    it('translates contains operator', () => {
      const condition: FilterCondition = {
        path: 'description',
        operator: 'contains',
        value: 'widget',
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("properties->'description'->'value'->>'value' ILIKE $1");
      expect(result.params).toEqual(['%widget%']);
    });

    it('translates starts operator', () => {
      const condition: FilterCondition = {
        path: 'name',
        operator: 'starts',
        value: 'Pro',
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("properties->'name'->'value'->>'value' ILIKE $1");
      expect(result.params).toEqual(['Pro%']);
    });

    it('translates ends operator', () => {
      const condition: FilterCondition = {
        path: 'sku',
        operator: 'ends',
        value: '-XL',
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("properties->'sku'->'value'->>'value' ILIKE $1");
      expect(result.params).toEqual(['%-XL']);
    });

    it('translates regex operator', () => {
      const condition: FilterCondition = {
        path: 'code',
        operator: 'regex',
        value: '^[A-Z]{3}-[0-9]{4}$',
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("properties->'code'->'value'->>'value' ~ $1");
      expect(result.params).toEqual(['^[A-Z]{3}-[0-9]{4}$']);
    });
  });

  describe('special operators', () => {
    it('translates exists operator', () => {
      const condition: FilterCondition = {
        path: 'metadata',
        operator: 'exists',
        value: true,
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("properties ? 'metadata'");
      expect(result.params).toEqual([]);
    });

    it('translates type_is operator', () => {
      const condition: FilterCondition = {
        path: 'type',
        operator: 'type_is',
        value: 'product',
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe("type_path <@ $1::ltree");
      expect(result.params).toEqual(['product']);
    });
  });

  describe('parameter offset', () => {
    it('uses provided parameter offset', () => {
      const condition: FilterCondition = {
        path: 'name',
        operator: 'eq',
        value: 'Test',
      };
      const result = filterConditionToSQL(condition, 5);
      expect(result.sql).toBe("properties->'name'->'value'->>'value' = $5");
      expect(result.params).toEqual(['Test']);
    });
  });

  describe('nested property paths', () => {
    it('handles nested path in filter', () => {
      const condition: FilterCondition = {
        path: 'metadata.category',
        operator: 'eq',
        value: 'electronics',
      };
      const result = filterConditionToSQL(condition, 1);
      expect(result.sql).toBe(
        "properties->'metadata'->'value'->'category'->>'value' = $1"
      );
      expect(result.params).toEqual(['electronics']);
    });
  });
});

describe('filterGroupToSQL', () => {
  describe('AND groups', () => {
    it('combines conditions with AND', () => {
      const group: FilterGroup = {
        logic: 'and',
        conditions: [
          { path: 'status', operator: 'eq', value: 'active' },
          { path: 'price', operator: 'gt', value: 100 },
        ],
      };
      const result = filterGroupToSQL(group, 1);
      expect(result.sql).toBe(
        "properties->'status'->'value'->>'value' = $1 AND (properties->'price'->'value'->>'value')::numeric > $2"
      );
      expect(result.params).toEqual(['active', 100]);
    });
  });

  describe('OR groups', () => {
    it('combines conditions with OR', () => {
      const group: FilterGroup = {
        logic: 'or',
        conditions: [
          { path: 'category', operator: 'eq', value: 'electronics' },
          { path: 'category', operator: 'eq', value: 'computers' },
        ],
      };
      const result = filterGroupToSQL(group, 1);
      expect(result.sql).toBe(
        "properties->'category'->'value'->>'value' = $1 OR properties->'category'->'value'->>'value' = $2"
      );
      expect(result.params).toEqual(['electronics', 'computers']);
    });
  });

  describe('nested groups', () => {
    it('handles nested groups with parentheses', () => {
      const group: FilterGroup = {
        logic: 'and',
        conditions: [
          { path: 'status', operator: 'eq', value: 'active' },
          {
            logic: 'or',
            conditions: [
              { path: 'category', operator: 'eq', value: 'electronics' },
              { path: 'category', operator: 'eq', value: 'computers' },
            ],
          },
        ],
      };
      const result = filterGroupToSQL(group, 1);
      expect(result.sql).toBe(
        "properties->'status'->'value'->>'value' = $1 AND (properties->'category'->'value'->>'value' = $2 OR properties->'category'->'value'->>'value' = $3)"
      );
      expect(result.params).toEqual(['active', 'electronics', 'computers']);
    });
  });

  describe('empty groups', () => {
    it('returns TRUE for empty group', () => {
      const group: FilterGroup = {
        logic: 'and',
        conditions: [],
      };
      const result = filterGroupToSQL(group, 1);
      expect(result.sql).toBe('TRUE');
      expect(result.params).toEqual([]);
    });
  });

  describe('single condition', () => {
    it('handles group with single condition', () => {
      const group: FilterGroup = {
        logic: 'and',
        conditions: [{ path: 'name', operator: 'eq', value: 'test' }],
      };
      const result = filterGroupToSQL(group, 1);
      expect(result.sql).toBe("properties->'name'->'value'->>'value' = $1");
      expect(result.params).toEqual(['test']);
    });
  });

  describe('complex nested structure', () => {
    it('handles deeply nested conditions', () => {
      const group: FilterGroup = {
        logic: 'and',
        conditions: [
          { path: 'active', operator: 'eq', value: true },
          {
            logic: 'or',
            conditions: [
              {
                logic: 'and',
                conditions: [
                  { path: 'price', operator: 'gte', value: 100 },
                  { path: 'price', operator: 'lte', value: 500 },
                ],
              },
              { path: 'featured', operator: 'eq', value: true },
            ],
          },
        ],
      };
      const result = filterGroupToSQL(group, 1);
      expect(result.params).toEqual([true, 100, 500, true]);
      expect(result.sql).toContain(' AND ');
      expect(result.sql).toContain(' OR ');
    });
  });
});
