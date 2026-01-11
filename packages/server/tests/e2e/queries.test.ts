/**
 * Trellis E2E Tests - Queries
 *
 * Tests for entity querying with filtering, sorting, and pagination.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  TestHarness,
  TestClient,
  fixtures,
  properties,
  generateProducts,
  assertOk,
  assertBadRequest,
  assertQueryCount,
  assertQueryIncludesEntity,
  assertQueryExcludesEntity,
  assertQuerySorted,
  assertQueryTotal,
  assertQueryHasCursor,
  type EntityResponse,
  type QueryResponse,
} from '../harness/index.js';
import type { KernelError, Entity } from '@trellis/kernel';

describe('Queries', () => {
  let harness: TestHarness;
  let client: TestClient;

  // Pre-created entities for query tests
  const products: Entity[] = [];

  beforeAll(async () => {
    harness = new TestHarness();
    await harness.setup();
  });

  beforeEach(async () => {
    await harness.reset();
    client = harness.client();
    products.length = 0;

    // Create test products with varying properties
    const productFixtures = [
      fixtures.product({ name: 'Alpha Widget', sku: 'ALPHA', price: 100, active: true }),
      fixtures.product({ name: 'Beta Widget', sku: 'BETA', price: 200, active: true }),
      fixtures.product({ name: 'Gamma Widget', sku: 'GAMMA', price: 150, active: false }),
      fixtures.product({ name: 'Delta Widget', sku: 'DELTA', price: 50, active: true }),
      fixtures.product({ name: 'Epsilon Widget', sku: 'EPSILON', price: 300, active: false }),
    ];

    for (const fixture of productFixtures) {
      const response = await client.post<EntityResponse>('/entities', fixture);
      expect(response.status).toBe(201);
      products.push(response.body.entity);
    }
  });

  afterAll(async () => {
    await harness.teardown();
  });

  // ===========================================================================
  // BASIC QUERIES
  // ===========================================================================

  describe('POST /query - Basic Queries', () => {
    it('should query all entities', async () => {
      const response = await client.post<QueryResponse>('/query', {});

      assertOk(response);
      expect(response.body.entities.length).toBeGreaterThanOrEqual(5);
    });

    it('should query entities by type', async () => {
      const query = fixtures.query({ type: 'product' });

      const response = await client.post<QueryResponse>('/query', query);

      assertQueryCount(response, 5);
      response.body.entities.forEach((e) => {
        expect(e.type).toBe('product');
      });
    });

    it('should query entities with type hierarchy wildcard', async () => {
      // Create a sub-type entity
      const subTypeResponse = await client.post<EntityResponse>('/entities', {
        type: 'product.variant',
        properties: { name: properties.text('Variant Product') },
      });
      expect(subTypeResponse.status).toBe(201);

      const query = fixtures.query({ type: 'product.*' });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      // Should include all products AND the variant
      expect(response.body.entities.length).toBeGreaterThanOrEqual(5);
    });

    it('should include total count when requested', async () => {
      const query = fixtures.query({
        type: 'product',
        include_total: true,
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      assertQueryTotal(response, 5);
    });
  });

  // ===========================================================================
  // FILTERING
  // ===========================================================================

  describe('Filtering', () => {
    it('should filter by equality (eq)', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(fixtures.filter('properties.sku.value.value', 'eq', 'ALPHA')),
      });

      const response = await client.post<QueryResponse>('/query', query);

      const entities = assertQueryCount(response, 1);
      assertQueryIncludesEntity(response, products[0]!.id);
    });

    it('should filter by inequality (neq)', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(fixtures.filter('properties.sku.value.value', 'neq', 'ALPHA')),
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      assertQueryExcludesEntity(response, products[0]!.id);
      expect(response.body.entities.length).toBe(4);
    });

    it('should filter by greater than (gt)', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(fixtures.filter('properties.price.value.value', 'gt', 150)),
      });

      const response = await client.post<QueryResponse>('/query', query);

      const entities = assertQueryCount(response, 2);
      // Beta (200) and Epsilon (300) should match
      entities.forEach((e) => {
        const priceProp = e.properties['price' as keyof typeof e.properties];
        const price = (priceProp?.value as { value: number })?.value;
        expect(price).toBeGreaterThan(150);
      });
    });

    it('should filter by greater than or equal (gte)', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(fixtures.filter('properties.price.value.value', 'gte', 150)),
      });

      const response = await client.post<QueryResponse>('/query', query);

      const entities = assertQueryCount(response, 3);
      // Gamma (150), Beta (200), Epsilon (300) should match
    });

    it('should filter by less than (lt)', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(fixtures.filter('properties.price.value.value', 'lt', 150)),
      });

      const response = await client.post<QueryResponse>('/query', query);

      const entities = assertQueryCount(response, 2);
      // Alpha (100) and Delta (50) should match
    });

    it('should filter by less than or equal (lte)', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(fixtures.filter('properties.price.value.value', 'lte', 150)),
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      expect(response.body.entities.length).toBe(3);
    });

    it('should filter by set membership (in)', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(
          fixtures.filter('properties.sku.value.value', 'in', ['ALPHA', 'BETA', 'DELTA'])
        ),
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertQueryCount(response, 3);
    });

    it('should filter by text contains', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(fixtures.filter('properties.name.value.value', 'contains', 'Widget')),
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertQueryCount(response, 5); // All products have "Widget" in name
    });

    it('should filter by boolean value', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(fixtures.filter('properties.active.value.value', 'eq', true)),
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertQueryCount(response, 3); // Alpha, Beta, Delta are active
    });

    it('should combine filters with AND logic', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(
          fixtures.filter('properties.active.value.value', 'eq', true),
          fixtures.filter('properties.price.value.value', 'gte', 100)
        ),
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertQueryCount(response, 2); // Alpha (100, active) and Beta (200, active)
    });

    it('should combine filters with OR logic', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.or(
          fixtures.filter('properties.sku.value.value', 'eq', 'ALPHA'),
          fixtures.filter('properties.sku.value.value', 'eq', 'EPSILON')
        ),
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertQueryCount(response, 2);
    });
  });

  // ===========================================================================
  // SORTING
  // ===========================================================================

  describe('Sorting', () => {
    it('should sort by property ascending', async () => {
      const query = fixtures.query({
        type: 'product',
        sort: [fixtures.sort('properties.price.value.value', 'asc')],
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      assertQuerySorted(response, 'properties.price', 'asc');
    });

    it('should sort by property descending', async () => {
      const query = fixtures.query({
        type: 'product',
        sort: [fixtures.sort('properties.price.value.value', 'desc')],
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      assertQuerySorted(response, 'properties.price', 'desc');
    });

    it('should sort by text property', async () => {
      const query = fixtures.query({
        type: 'product',
        sort: [fixtures.sort('properties.name.value.value', 'asc')],
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      // Should be Alpha, Beta, Delta, Epsilon, Gamma (alphabetical)
      assertQuerySorted(response, 'properties.name', 'asc');
    });

    it('should sort by multiple fields', async () => {
      // First sort by active (true first), then by price ascending
      const query = fixtures.query({
        type: 'product',
        sort: [
          fixtures.sort('properties.active.value.value', 'desc'),
          fixtures.sort('properties.price.value.value', 'asc'),
        ],
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      // Active products first, then inactive, sorted by price within each group
    });

    it('should sort by created_at', async () => {
      const query = fixtures.query({
        type: 'product',
        sort: [fixtures.sort('created_at', 'desc')],
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      // Most recently created first
      assertQuerySorted(response, 'created_at', 'desc');
    });
  });

  // ===========================================================================
  // PAGINATION
  // ===========================================================================

  describe('Pagination', () => {
    it('should limit results', async () => {
      const query = fixtures.query({
        type: 'product',
        pagination: { limit: 2 },
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertQueryCount(response, 2);
    });

    it('should offset results', async () => {
      // First, get all products sorted
      const allQuery = fixtures.query({
        type: 'product',
        sort: [fixtures.sort('properties.sku.value.value', 'asc')],
      });
      const allResponse = await client.post<QueryResponse>('/query', allQuery);
      const allEntities = assertOk(allResponse).entities;

      // Now get with offset
      const offsetQuery = fixtures.query({
        type: 'product',
        sort: [fixtures.sort('properties.sku.value.value', 'asc')],
        pagination: { offset: 2, limit: 2 },
      });
      const offsetResponse = await client.post<QueryResponse>('/query', offsetQuery);
      const offsetEntities = assertQueryCount(offsetResponse, 2);

      // Should be the 3rd and 4th entities
      expect(offsetEntities[0]!.id).toBe(allEntities[2]!.id);
      expect(offsetEntities[1]!.id).toBe(allEntities[3]!.id);
    });

    it('should paginate through all results', async () => {
      const seenIds = new Set<string>();
      let offset = 0;
      const limit = 2;

      // Paginate through all 5 products
      while (seenIds.size < 5) {
        const query = fixtures.query({
          type: 'product',
          sort: [fixtures.sort('properties.sku.value.value', 'asc')],
          pagination: { offset, limit },
        });

        const response = await client.post<QueryResponse>('/query', query);
        assertOk(response);

        for (const entity of response.body.entities) {
          expect(seenIds.has(entity.id)).toBe(false); // No duplicates
          seenIds.add(entity.id);
        }

        if (response.body.entities.length < limit) break;
        offset += limit;
      }

      expect(seenIds.size).toBe(5);
    });

    it('should include total count with pagination', async () => {
      const query = fixtures.query({
        type: 'product',
        pagination: { limit: 2 },
        include_total: true,
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      assertQueryCount(response, 2);
      assertQueryTotal(response, 5); // Total is 5, returned 2
    });
  });

  // ===========================================================================
  // COMPLEX QUERIES
  // ===========================================================================

  describe('Complex Queries', () => {
    it('should combine filter, sort, and pagination', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(fixtures.filter('properties.active.value.value', 'eq', true)),
        sort: [fixtures.sort('properties.price.value.value', 'asc')],
        pagination: { limit: 2 },
        include_total: true,
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      assertQueryCount(response, 2);
      assertQueryTotal(response, 3); // 3 active products total
      assertQuerySorted(response, 'properties.price', 'asc');
    });

    it('should handle empty results gracefully', async () => {
      const query = fixtures.query({
        type: 'product',
        filter: fixtures.and(fixtures.filter('properties.sku.value.value', 'eq', 'NONEXISTENT')),
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      assertQueryCount(response, 0);
    });

    it('should handle large pagination offset', async () => {
      const query = fixtures.query({
        type: 'product',
        pagination: { offset: 1000, limit: 10 },
      });

      const response = await client.post<QueryResponse>('/query', query);

      assertOk(response);
      assertQueryCount(response, 0);
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe('Error Handling', () => {
    it('should reject invalid filter operator', async () => {
      const query = {
        type: 'product',
        filter: {
          logic: 'and',
          conditions: [
            { path: 'properties.price.value.value', operator: 'invalid_op', value: 100 },
          ],
        },
      };

      const response = await client.post<KernelError>('/query', query);

      assertBadRequest(response, 'VALIDATION_ERROR');
    });

    it('should reject invalid sort direction', async () => {
      const query = {
        type: 'product',
        sort: [{ path: 'properties.price.value.value', direction: 'invalid' }],
      };

      const response = await client.post<KernelError>('/query', query);

      assertBadRequest(response, 'VALIDATION_ERROR');
    });

    it('should reject negative pagination offset', async () => {
      const query = {
        type: 'product',
        pagination: { offset: -1 },
      };

      const response = await client.post<KernelError>('/query', query);

      assertBadRequest(response, 'VALIDATION_ERROR');
    });

    it('should reject pagination limit of zero', async () => {
      const query = {
        type: 'product',
        pagination: { limit: 0 },
      };

      const response = await client.post<KernelError>('/query', query);

      assertBadRequest(response, 'VALIDATION_ERROR');
    });
  });
});
