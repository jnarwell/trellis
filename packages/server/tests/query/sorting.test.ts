/**
 * Sort Translation Tests
 *
 * Tests for translating SortSpec to SQL ORDER BY clauses.
 */

import { describe, it, expect } from 'vitest';
import {
  sortSpecToSQL,
  sortToSQL,
  getSortColumns,
  getSortDirections,
} from '../../src/query/sorting.js';
import type { SortSpec } from '@trellis/kernel';

describe('sortSpecToSQL', () => {
  describe('reserved columns', () => {
    it('uses id column directly', () => {
      const spec: SortSpec = { path: 'id', direction: 'asc' };
      expect(sortSpecToSQL(spec)).toBe('id ASC');
    });

    it('uses created_at column directly', () => {
      const spec: SortSpec = { path: 'created_at', direction: 'desc' };
      expect(sortSpecToSQL(spec)).toBe('created_at DESC');
    });

    it('uses updated_at column directly', () => {
      const spec: SortSpec = { path: 'updated_at', direction: 'asc' };
      expect(sortSpecToSQL(spec)).toBe('updated_at ASC');
    });

    it('uses type_path column directly', () => {
      const spec: SortSpec = { path: 'type_path', direction: 'desc' };
      expect(sortSpecToSQL(spec)).toBe('type_path DESC');
    });

    it('uses version column directly', () => {
      const spec: SortSpec = { path: 'version', direction: 'asc' };
      expect(sortSpecToSQL(spec)).toBe('version ASC');
    });
  });

  describe('property columns', () => {
    it('translates property path to JSONB accessor', () => {
      const spec: SortSpec = { path: 'name', direction: 'asc' };
      expect(sortSpecToSQL(spec)).toBe("properties->'name'->'value'->>'value' ASC");
    });

    it('handles nested property path', () => {
      const spec: SortSpec = { path: 'metadata.category', direction: 'desc' };
      expect(sortSpecToSQL(spec)).toBe(
        "properties->'metadata'->'value'->'category'->>'value' DESC"
      );
    });
  });

  describe('direction handling', () => {
    it('handles ASC direction', () => {
      const spec: SortSpec = { path: 'name', direction: 'asc' };
      expect(sortSpecToSQL(spec)).toContain('ASC');
    });

    it('handles DESC direction', () => {
      const spec: SortSpec = { path: 'name', direction: 'desc' };
      expect(sortSpecToSQL(spec)).toContain('DESC');
    });
  });

  describe('nulls handling', () => {
    it('adds NULLS FIRST when specified', () => {
      const spec: SortSpec = { path: 'name', direction: 'asc', nulls: 'first' };
      expect(sortSpecToSQL(spec)).toBe(
        "properties->'name'->'value'->>'value' ASC NULLS FIRST"
      );
    });

    it('adds NULLS LAST when specified', () => {
      const spec: SortSpec = { path: 'price', direction: 'desc', nulls: 'last' };
      expect(sortSpecToSQL(spec)).toBe(
        "properties->'price'->'value'->>'value' DESC NULLS LAST"
      );
    });

    it('omits NULLS when not specified', () => {
      const spec: SortSpec = { path: 'name', direction: 'asc' };
      expect(sortSpecToSQL(spec)).not.toContain('NULLS');
    });
  });

  describe('error handling', () => {
    it('throws on invalid property path', () => {
      const spec: SortSpec = { path: 'invalid-path', direction: 'asc' };
      expect(() => sortSpecToSQL(spec)).toThrow('Invalid sort path');
    });
  });
});

describe('sortToSQL', () => {
  describe('default sorting', () => {
    it('returns default sort when specs are empty', () => {
      expect(sortToSQL([])).toBe('created_at DESC, id DESC');
    });
  });

  describe('single column sorting', () => {
    it('adds id as tiebreaker', () => {
      const specs: SortSpec[] = [{ path: 'name', direction: 'asc' }];
      expect(sortToSQL(specs)).toBe(
        "properties->'name'->'value'->>'value' ASC, id DESC"
      );
    });

    it('does not duplicate id if already present', () => {
      const specs: SortSpec[] = [{ path: 'id', direction: 'asc' }];
      expect(sortToSQL(specs)).toBe('id ASC');
    });
  });

  describe('multi-column sorting', () => {
    it('combines multiple sort specs', () => {
      const specs: SortSpec[] = [
        { path: 'category', direction: 'asc' },
        { path: 'price', direction: 'desc' },
      ];
      expect(sortToSQL(specs)).toBe(
        "properties->'category'->'value'->>'value' ASC, properties->'price'->'value'->>'value' DESC, id DESC"
      );
    });

    it('handles mix of reserved and property columns', () => {
      const specs: SortSpec[] = [
        { path: 'created_at', direction: 'desc' },
        { path: 'name', direction: 'asc' },
      ];
      expect(sortToSQL(specs)).toBe(
        "created_at DESC, properties->'name'->'value'->>'value' ASC, id DESC"
      );
    });
  });
});

describe('getSortColumns', () => {
  describe('default columns', () => {
    it('returns created_at and id for empty specs', () => {
      expect(getSortColumns([])).toEqual(['created_at', 'id']);
    });
  });

  describe('reserved columns', () => {
    it('preserves reserved column names', () => {
      const specs: SortSpec[] = [
        { path: 'created_at', direction: 'desc' },
        { path: 'type_path', direction: 'asc' },
      ];
      expect(getSortColumns(specs)).toEqual(['created_at', 'type_path', 'id']);
    });
  });

  describe('property columns', () => {
    it('translates property paths to JSONB accessors', () => {
      const specs: SortSpec[] = [{ path: 'name', direction: 'asc' }];
      expect(getSortColumns(specs)).toEqual([
        "properties->'name'->'value'->>'value'",
        'id',
      ]);
    });
  });

  describe('id handling', () => {
    it('adds id if not present', () => {
      const specs: SortSpec[] = [{ path: 'name', direction: 'asc' }];
      expect(getSortColumns(specs)).toContain('id');
    });

    it('does not duplicate id', () => {
      const specs: SortSpec[] = [{ path: 'id', direction: 'asc' }];
      const columns = getSortColumns(specs);
      expect(columns.filter((c) => c === 'id')).toHaveLength(1);
    });
  });
});

describe('getSortDirections', () => {
  describe('default directions', () => {
    it('returns desc, desc for empty specs', () => {
      expect(getSortDirections([])).toEqual(['desc', 'desc']);
    });
  });

  describe('single column', () => {
    it('adds desc direction for id', () => {
      const specs: SortSpec[] = [{ path: 'name', direction: 'asc' }];
      expect(getSortDirections(specs)).toEqual(['asc', 'desc']);
    });
  });

  describe('multiple columns', () => {
    it('preserves all directions and adds id direction', () => {
      const specs: SortSpec[] = [
        { path: 'category', direction: 'asc' },
        { path: 'price', direction: 'desc' },
      ];
      expect(getSortDirections(specs)).toEqual(['asc', 'desc', 'desc']);
    });
  });

  describe('with id column', () => {
    it('does not add extra direction for id', () => {
      const specs: SortSpec[] = [{ path: 'id', direction: 'asc' }];
      expect(getSortDirections(specs)).toEqual(['asc']);
    });
  });
});
