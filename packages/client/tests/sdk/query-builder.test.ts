/**
 * Tests for QueryBuilder fluent API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryBuilder } from '../../src/sdk/queries.js';
import type { HttpClient } from '../../src/sdk/http.js';

describe('QueryBuilder', () => {
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = {
      post: vi.fn().mockResolvedValue({
        data: [],
        pagination: { offset: 0, limit: 50, has_more: false },
      }),
    } as unknown as HttpClient;
  });

  describe('construction', () => {
    it('should create a builder without type', () => {
      const builder = new QueryBuilder(mockHttp);
      expect(builder).toBeDefined();
    });

    it('should create a builder with type', () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      expect(builder).toBeDefined();
    });
  });

  describe('where()', () => {
    it('should add equality filter', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder.where('status', 'eq', 'active').execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        filter: {
          logic: 'and',
          conditions: [{ path: 'status', operator: 'eq', value: 'active' }],
        },
      });
    });

    it('should add multiple filters', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder
        .where('status', 'eq', 'active')
        .where('price', 'gt', 100)
        .execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        filter: {
          logic: 'and',
          conditions: [
            { path: 'status', operator: 'eq', value: 'active' },
            { path: 'price', operator: 'gt', value: 100 },
          ],
        },
      });
    });

    it('should support all filter operators', async () => {
      const operators = [
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
        'in', 'nin', 'contains', 'starts', 'ends',
        'regex', 'exists', 'type_is',
      ] as const;

      for (const op of operators) {
        const builder = new QueryBuilder(mockHttp, 'product');
        await builder.where('field', op, 'value').execute();

        expect(mockHttp.post).toHaveBeenCalledWith('/query', expect.objectContaining({
          filter: expect.objectContaining({
            conditions: expect.arrayContaining([
              expect.objectContaining({ operator: op }),
            ]),
          }),
        }));
      }
    });
  });

  describe('and()', () => {
    it('should create AND group', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder
        .and((q) => {
          q.where('status', 'eq', 'active');
          q.where('verified', 'eq', true);
        })
        .execute();

      const call = (mockHttp.post as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].filter.conditions[0].logic).toBe('and');
    });
  });

  describe('or()', () => {
    it('should create OR group', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder
        .or((q) => {
          q.where('status', 'eq', 'active');
          q.where('status', 'eq', 'pending');
        })
        .execute();

      const call = (mockHttp.post as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].filter.conditions[0].logic).toBe('or');
    });
  });

  describe('orderBy()', () => {
    it('should add sort specification', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder.orderBy('name').execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        sort: [{ path: 'name', direction: 'asc' }],
      });
    });

    it('should add descending sort', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder.orderBy('created_at', 'desc').execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        sort: [{ path: 'created_at', direction: 'desc' }],
      });
    });

    it('should support multiple sorts', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder
        .orderBy('name')
        .orderBy('created_at', 'desc')
        .execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        sort: [
          { path: 'name', direction: 'asc' },
          { path: 'created_at', direction: 'desc' },
        ],
      });
    });
  });

  describe('pagination', () => {
    it('should set limit', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder.limit(20).execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        pagination: { limit: 20 },
      });
    });

    it('should set offset', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder.offset(100).execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        pagination: { offset: 100 },
      });
    });

    it('should set cursor', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder.cursor('abc123').execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        pagination: { cursor: 'abc123' },
      });
    });

    it('should combine pagination options', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder.limit(50).offset(100).execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        pagination: { limit: 50, offset: 100 },
      });
    });
  });

  describe('includeTotal()', () => {
    it('should include total count', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder.includeTotal().execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        include_total: true,
      });
    });
  });

  describe('execute()', () => {
    it('should return query result', async () => {
      (mockHttp.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ id: '1' }, { id: '2' }],
        pagination: { offset: 0, limit: 50, has_more: false },
        total_count: 2,
      });

      const builder = new QueryBuilder(mockHttp, 'product');
      const result = await builder.execute();

      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.totalCount).toBe(2);
    });
  });

  describe('toArray()', () => {
    it('should return just the data array', async () => {
      (mockHttp.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ id: '1' }, { id: '2' }],
        pagination: { offset: 0, limit: 50, has_more: false },
      });

      const builder = new QueryBuilder(mockHttp, 'product');
      const result = await builder.toArray();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: '1' });
    });
  });

  describe('first()', () => {
    it('should return first result', async () => {
      (mockHttp.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ id: '1' }],
        pagination: { offset: 0, limit: 1, has_more: true },
      });

      const builder = new QueryBuilder(mockHttp, 'product');
      const result = await builder.first();

      expect(result).toEqual({ id: '1' });
    });

    it('should return null if no results', async () => {
      (mockHttp.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [],
        pagination: { offset: 0, limit: 1, has_more: false },
      });

      const builder = new QueryBuilder(mockHttp, 'product');
      const result = await builder.first();

      expect(result).toBeNull();
    });
  });

  describe('count()', () => {
    it('should return count', async () => {
      (mockHttp.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [],
        pagination: { offset: 0, limit: 0, has_more: false },
        total_count: 42,
      });

      const builder = new QueryBuilder(mockHttp, 'product');
      const count = await builder.count();

      expect(count).toBe(42);
    });
  });

  describe('chaining', () => {
    it('should support full fluent chain', async () => {
      const builder = new QueryBuilder(mockHttp, 'product');
      await builder
        .where('status', 'eq', 'active')
        .where('price', 'gte', 50)
        .orderBy('name')
        .orderBy('created_at', 'desc')
        .limit(20)
        .offset(40)
        .includeTotal()
        .execute();

      expect(mockHttp.post).toHaveBeenCalledWith('/query', {
        type: 'product',
        filter: {
          logic: 'and',
          conditions: [
            { path: 'status', operator: 'eq', value: 'active' },
            { path: 'price', operator: 'gte', value: 50 },
          ],
        },
        sort: [
          { path: 'name', direction: 'asc' },
          { path: 'created_at', direction: 'desc' },
        ],
        pagination: { limit: 20, offset: 40 },
        include_total: true,
      });
    });
  });
});
