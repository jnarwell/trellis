/**
 * Pagination Tests
 *
 * Tests for offset and cursor-based pagination.
 */

import { describe, it, expect } from 'vitest';
import {
  encodeCursor,
  decodeCursor,
  cursorToSQL,
  buildPaginationSQL,
  type Cursor,
} from '../../src/query/pagination.js';
import type { EntityId } from '@trellis/kernel';

describe('encodeCursor / decodeCursor', () => {
  it('encodes and decodes cursor correctly', () => {
    const cursor: Cursor = {
      sortValues: ['2024-01-15T10:30:00Z', 'Widget'],
      id: '123e4567-e89b-12d3-a456-426614174000' as EntityId,
    };
    const encoded = encodeCursor(cursor);
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual(cursor);
  });

  it('produces URL-safe base64 string', () => {
    const cursor: Cursor = {
      sortValues: ['+/='],
      id: 'test-id' as EntityId,
    };
    const encoded = encodeCursor(cursor);
    // Base64url should not contain +, /, or =
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('handles empty sortValues', () => {
    const cursor: Cursor = {
      sortValues: [],
      id: 'test-id' as EntityId,
    };
    const encoded = encodeCursor(cursor);
    const decoded = decodeCursor(encoded);
    expect(decoded.sortValues).toEqual([]);
  });

  it('handles various value types in sortValues', () => {
    const cursor: Cursor = {
      sortValues: ['string', 123, true, null],
      id: 'test-id' as EntityId,
    };
    const encoded = encodeCursor(cursor);
    const decoded = decodeCursor(encoded);
    expect(decoded.sortValues).toEqual(['string', 123, true, null]);
  });

  it('throws on invalid cursor string', () => {
    expect(() => decodeCursor('not-valid-base64!!!')).toThrow('Invalid cursor');
  });

  it('throws on valid base64 but invalid structure', () => {
    const invalidJson = Buffer.from('{"invalid": "structure"}').toString('base64url');
    expect(() => decodeCursor(invalidJson)).toThrow('Invalid cursor');
  });

  it('throws on missing id', () => {
    const noId = Buffer.from('{"sortValues": []}').toString('base64url');
    expect(() => decodeCursor(noId)).toThrow('Invalid cursor');
  });

  it('throws on non-array sortValues', () => {
    const badSort = Buffer.from('{"sortValues": "not-array", "id": "test"}').toString(
      'base64url'
    );
    expect(() => decodeCursor(badSort)).toThrow('Invalid cursor');
  });
});

describe('cursorToSQL', () => {
  describe('descending sort', () => {
    it('generates < comparison for DESC sort', () => {
      const cursor: Cursor = {
        sortValues: ['2024-01-15'],
        id: 'test-id' as EntityId,
      };
      const result = cursorToSQL(cursor, ['created_at', 'id'], ['desc', 'desc'], 1);
      expect(result.sql).toBe('(created_at, id) < ($1, $2)');
      expect(result.params).toEqual(['2024-01-15', 'test-id']);
    });
  });

  describe('ascending sort', () => {
    it('generates > comparison for ASC sort', () => {
      const cursor: Cursor = {
        sortValues: ['Widget'],
        id: 'test-id' as EntityId,
      };
      const result = cursorToSQL(cursor, ['name', 'id'], ['asc', 'asc'], 1);
      expect(result.sql).toBe('(name, id) > ($1, $2)');
      expect(result.params).toEqual(['Widget', 'test-id']);
    });
  });

  describe('parameter offset', () => {
    it('uses correct parameter indices with offset', () => {
      const cursor: Cursor = {
        sortValues: ['value1'],
        id: 'test-id' as EntityId,
      };
      const result = cursorToSQL(cursor, ['col1', 'id'], ['desc', 'desc'], 5);
      expect(result.sql).toBe('(col1, id) < ($5, $6)');
    });
  });

  describe('multiple sort columns', () => {
    it('handles multiple columns correctly', () => {
      const cursor: Cursor = {
        sortValues: ['cat1', 100],
        id: 'test-id' as EntityId,
      };
      const result = cursorToSQL(
        cursor,
        ['category', 'price', 'id'],
        ['asc', 'desc', 'desc'],
        1
      );
      expect(result.sql).toBe('(category, price, id) > ($1, $2, $3)');
      expect(result.params).toEqual(['cat1', 100, 'test-id']);
    });
  });
});

describe('buildPaginationSQL', () => {
  const defaultColumns = ['created_at', 'id'];
  const defaultDirections: Array<'asc' | 'desc'> = ['desc', 'desc'];

  describe('offset-based pagination', () => {
    it('generates LIMIT clause without offset', () => {
      const result = buildPaginationSQL(
        50,
        undefined,
        undefined,
        defaultColumns,
        defaultDirections,
        1
      );
      expect(result.limitClause).toBe('LIMIT $1');
      expect(result.params).toEqual([51]); // +1 for hasMore detection
      expect(result.whereClause).toBeUndefined();
    });

    it('generates LIMIT and OFFSET clauses', () => {
      const result = buildPaginationSQL(
        50,
        100,
        undefined,
        defaultColumns,
        defaultDirections,
        1
      );
      expect(result.limitClause).toBe('LIMIT $1 OFFSET $2');
      expect(result.params).toEqual([51, 100]);
    });

    it('skips OFFSET when offset is 0', () => {
      const result = buildPaginationSQL(
        50,
        0,
        undefined,
        defaultColumns,
        defaultDirections,
        1
      );
      expect(result.limitClause).toBe('LIMIT $1');
      expect(result.params).toEqual([51]);
    });
  });

  describe('cursor-based pagination', () => {
    it('generates WHERE clause and LIMIT for cursor', () => {
      const cursor: Cursor = {
        sortValues: ['2024-01-15'],
        id: 'cursor-id' as EntityId,
      };
      const result = buildPaginationSQL(
        50,
        undefined,
        cursor,
        defaultColumns,
        defaultDirections,
        1
      );
      expect(result.whereClause).toBe('(created_at, id) < ($1, $2)');
      expect(result.limitClause).toBe('LIMIT $3');
      expect(result.params).toEqual(['2024-01-15', 'cursor-id', 51]);
    });

    it('ignores offset when cursor is provided', () => {
      const cursor: Cursor = {
        sortValues: ['2024-01-15'],
        id: 'cursor-id' as EntityId,
      };
      const result = buildPaginationSQL(
        50,
        100, // This should be ignored
        cursor,
        defaultColumns,
        defaultDirections,
        1
      );
      // OFFSET should not be in the clause
      expect(result.limitClause).not.toContain('OFFSET');
    });
  });

  describe('parameter offset', () => {
    it('uses correct parameter indices with offset', () => {
      const result = buildPaginationSQL(
        50,
        100,
        undefined,
        defaultColumns,
        defaultDirections,
        5
      );
      expect(result.limitClause).toBe('LIMIT $5 OFFSET $6');
    });

    it('uses correct parameter indices with cursor', () => {
      const cursor: Cursor = {
        sortValues: ['value'],
        id: 'id' as EntityId,
      };
      const result = buildPaginationSQL(
        50,
        undefined,
        cursor,
        defaultColumns,
        defaultDirections,
        3
      );
      expect(result.whereClause).toBe('(created_at, id) < ($3, $4)');
      expect(result.limitClause).toBe('LIMIT $5');
    });
  });

  describe('limit +1 for hasMore detection', () => {
    it('always adds 1 to limit for hasMore detection', () => {
      const result = buildPaginationSQL(
        25,
        undefined,
        undefined,
        defaultColumns,
        defaultDirections,
        1
      );
      expect(result.params).toContain(26); // 25 + 1
    });
  });
});
