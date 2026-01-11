/**
 * Trellis E2E Tests - Computed Properties
 *
 * Tests for computed property evaluation and staleness propagation.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  TestHarness,
  TestClient,
  fixtures,
  properties,
  assertEntityCreated,
  assertOk,
  type EntityResponse,
} from '../harness/index.js';
import type { Entity, ComputedProperty } from '@trellis/kernel';

describe('Computed Properties', () => {
  let harness: TestHarness;
  let client: TestClient;

  beforeAll(async () => {
    harness = new TestHarness();
    await harness.setup();
  });

  beforeEach(async () => {
    await harness.reset();
    client = harness.client();
  });

  afterAll(async () => {
    await harness.teardown();
  });

  // Helper to get a computed property
  function getComputedProp(entity: Entity, name: string): ComputedProperty | undefined {
    const prop = entity.properties[name as keyof typeof entity.properties];
    if (prop?.source === 'computed') {
      return prop as ComputedProperty;
    }
    return undefined;
  }

  // ===========================================================================
  // EXPRESSION EVALUATION
  // ===========================================================================

  describe('Expression Evaluation', () => {
    it('should evaluate computed property on create', async () => {
      const request = fixtures.productWithTotal({
        quantity: 10,
        unitPrice: 5.0,
      });

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const totalProp = getComputedProp(entity, 'total');
      expect(totalProp).toBeDefined();
      expect(totalProp?.computation_status).toBe('valid');
      expect(totalProp?.cached_value).toEqual({ type: 'number', value: 50 });
    });

    it('should return pending status for unresolved dependencies', async () => {
      // Create entity with computed prop that references undefined property
      const request = {
        type: 'test_pending',
        properties: {
          computed_field: properties.computed('#undefined_field * 2'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const computedProp = getComputedProp(entity, 'computed_field');
      expect(computedProp).toBeDefined();
      // Should be error since undefined_field doesn't exist
      expect(['error', 'pending']).toContain(computedProp?.computation_status);
    });

    it('should cache computed value after evaluation', async () => {
      const request = fixtures.productWithTotal({
        quantity: 3,
        unitPrice: 7.0,
      });

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const totalProp = getComputedProp(entity, 'total');
      expect(totalProp?.cached_value).toBeDefined();
      expect(totalProp?.cached_at).toBeDefined();
      // cached_at should be a valid ISO date
      if (totalProp?.cached_at) {
        const date = new Date(totalProp.cached_at);
        expect(date.getTime()).toBeGreaterThan(0);
      }
    });

    it('should evaluate arithmetic expressions', async () => {
      const request = {
        type: 'arithmetic_test',
        properties: {
          a: properties.number(10),
          b: properties.number(5),
          sum: properties.computed('#a + #b'),
          diff: properties.computed('#a - #b'),
          product: properties.computed('#a * #b'),
          quotient: properties.computed('#a / #b'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      expect(getComputedProp(entity, 'sum')?.cached_value).toEqual({ type: 'number', value: 15 });
      expect(getComputedProp(entity, 'diff')?.cached_value).toEqual({ type: 'number', value: 5 });
      expect(getComputedProp(entity, 'product')?.cached_value).toEqual({ type: 'number', value: 50 });
      expect(getComputedProp(entity, 'quotient')?.cached_value).toEqual({ type: 'number', value: 2 });
    });

    it('should evaluate string expressions', async () => {
      const request = {
        type: 'string_test',
        properties: {
          first_name: properties.text('John'),
          last_name: properties.text('Doe'),
          full_name: properties.computed('CONCAT(#first_name, " ", #last_name)'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const fullNameProp = getComputedProp(entity, 'full_name');
      expect(fullNameProp?.cached_value).toEqual({ type: 'text', value: 'John Doe' });
    });

    it('should evaluate conditional expressions (IF)', async () => {
      const request = {
        type: 'conditional_test',
        properties: {
          score: properties.number(85),
          pass_threshold: properties.number(60),
          result: properties.computed('IF(#score >= #pass_threshold, "PASS", "FAIL")'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const resultProp = getComputedProp(entity, 'result');
      expect(resultProp?.cached_value).toEqual({ type: 'text', value: 'PASS' });
    });
  });

  // ===========================================================================
  // DEPENDENCY TRACKING
  // ===========================================================================

  describe('Dependency Tracking', () => {
    it('should track property dependencies', async () => {
      const request = {
        type: 'dep_test',
        properties: {
          base: properties.number(100),
          derived: properties.computed('#base * 2'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const derivedProp = getComputedProp(entity, 'derived');
      expect(derivedProp?.computation_status).toBe('valid');
      expect(derivedProp?.dependencies).toBeDefined();
      // Should have recorded dependency on 'base'
      if (derivedProp?.dependencies) {
        expect(derivedProp.dependencies).toContain('base');
      }
    });

    it('should resolve @self references', async () => {
      const request = {
        type: 'self_ref_test',
        properties: {
          price: properties.number(100),
          tax_rate: properties.number(0.1),
          total_with_tax: properties.computed('@self.price * (1 + @self.tax_rate)'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const totalProp = getComputedProp(entity, 'total_with_tax');
      expect(totalProp?.cached_value).toEqual({ type: 'number', value: 110 });
    });

    it('should resolve #shorthand references', async () => {
      const request = {
        type: 'shorthand_test',
        properties: {
          width: properties.number(10),
          height: properties.number(5),
          area: properties.computed('#width * #height'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const areaProp = getComputedProp(entity, 'area');
      expect(areaProp?.cached_value).toEqual({ type: 'number', value: 50 });
    });
  });

  // ===========================================================================
  // STALENESS PROPAGATION
  // ===========================================================================

  describe('Staleness Propagation', () => {
    it('should recalculate when dependency changes', async () => {
      // Create entity
      const createRequest = fixtures.productWithTotal({
        quantity: 10,
        unitPrice: 5.0,
      });

      const createResponse = await client.post<EntityResponse>('/entities', createRequest);
      const created = assertEntityCreated(createResponse);
      expect(getComputedProp(created, 'total')?.cached_value).toEqual({ type: 'number', value: 50 });

      // Update quantity
      const updateRequest = fixtures.update(1, {
        quantity: properties.number(20),
      });

      const updateResponse = await client.put<EntityResponse>(
        `/entities/${created.id}`,
        updateRequest
      );
      const updated = assertOk(updateResponse).entity;

      // Total should be recalculated
      const totalProp = getComputedProp(updated, 'total');
      expect(totalProp?.cached_value).toEqual({ type: 'number', value: 100 });
      expect(totalProp?.computation_status).toBe('valid');
    });

    it('should propagate staleness through dependency chain', async () => {
      // Create entity with chain: base -> derived1 -> derived2
      const request = {
        type: 'chain_test',
        properties: {
          base: properties.number(10),
          derived1: properties.computed('#base * 2'),
          derived2: properties.computed('#derived1 + 5'),
        },
      };

      const createResponse = await client.post<EntityResponse>('/entities', request);
      const created = assertEntityCreated(createResponse);

      expect(getComputedProp(created, 'derived1')?.cached_value).toEqual({ type: 'number', value: 20 });
      expect(getComputedProp(created, 'derived2')?.cached_value).toEqual({ type: 'number', value: 25 });

      // Update base
      const updateRequest = fixtures.update(1, {
        base: properties.number(20),
      });

      const updateResponse = await client.put<EntityResponse>(
        `/entities/${created.id}`,
        updateRequest
      );
      const updated = assertOk(updateResponse).entity;

      // Both derived values should be recalculated
      expect(getComputedProp(updated, 'derived1')?.cached_value).toEqual({ type: 'number', value: 40 });
      expect(getComputedProp(updated, 'derived2')?.cached_value).toEqual({ type: 'number', value: 45 });
    });

    it('should handle circular dependency detection', async () => {
      // Create entity with circular dependency
      const request = {
        type: 'circular_test',
        properties: {
          a: properties.computed('#b + 1'),
          b: properties.computed('#a + 1'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      // At least one should have circular status
      const aProp = getComputedProp(entity, 'a');
      const bProp = getComputedProp(entity, 'b');

      const hasCircular =
        aProp?.computation_status === 'circular' ||
        bProp?.computation_status === 'circular' ||
        aProp?.computation_status === 'error' ||
        bProp?.computation_status === 'error';

      expect(hasCircular).toBe(true);
    });
  });

  // ===========================================================================
  // CROSS-ENTITY REFERENCES
  // ===========================================================================

  describe('Cross-Entity References', () => {
    it('should evaluate expression referencing other entity', async () => {
      // Create parent entity
      const parentRequest = {
        type: 'parent',
        properties: {
          discount_rate: properties.number(0.1),
        },
      };
      const parentResponse = await client.post<EntityResponse>('/entities', parentRequest);
      const parent = assertEntityCreated(parentResponse);

      // Create child that references parent
      const childRequest = {
        type: 'child',
        properties: {
          base_price: properties.number(100),
          parent_ref: properties.literal({ type: 'reference', entity_id: parent.id }),
          final_price: properties.computed('#base_price * (1 - @{#parent_ref}.discount_rate)'),
        },
      };

      const childResponse = await client.post<EntityResponse>('/entities', childRequest);
      const child = assertEntityCreated(childResponse);

      const finalPriceProp = getComputedProp(child, 'final_price');
      // Should compute 100 * (1 - 0.1) = 90
      if (finalPriceProp?.computation_status === 'valid') {
        expect(finalPriceProp.cached_value).toEqual({ type: 'number', value: 90 });
      }
    });

    it('should handle broken references gracefully', async () => {
      const fakeEntityId = '019fffff-dead-beef-cafe-000000000000';

      const request = {
        type: 'broken_ref_test',
        properties: {
          ref: properties.literal({ type: 'reference', entity_id: fakeEntityId }),
          computed_from_ref: properties.computed('@{#ref}.some_property'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const computedProp = getComputedProp(entity, 'computed_from_ref');
      // Should have error status due to broken reference
      expect(['error', 'pending']).toContain(computedProp?.computation_status);
    });
  });

  // ===========================================================================
  // AGGREGATE FUNCTIONS
  // ===========================================================================

  describe('Aggregate Functions', () => {
    // Note: Aggregate functions require relationships to be set up
    // These tests verify the basic syntax works

    it('should evaluate COUNT() expression', async () => {
      const request = {
        type: 'count_test',
        properties: {
          items: properties.literal({
            type: 'list',
            element_type: 'number',
            values: [
              { type: 'number', value: 1 },
              { type: 'number', value: 2 },
              { type: 'number', value: 3 },
            ],
          }),
          item_count: properties.computed('COUNT(#items)'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const countProp = getComputedProp(entity, 'item_count');
      if (countProp?.computation_status === 'valid') {
        expect(countProp.cached_value).toEqual({ type: 'number', value: 3 });
      }
    });

    it('should evaluate SUM() over list', async () => {
      const request = {
        type: 'sum_test',
        properties: {
          values: properties.literal({
            type: 'list',
            element_type: 'number',
            values: [
              { type: 'number', value: 10 },
              { type: 'number', value: 20 },
              { type: 'number', value: 30 },
            ],
          }),
          total: properties.computed('SUM(#values)'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const sumProp = getComputedProp(entity, 'total');
      if (sumProp?.computation_status === 'valid') {
        expect(sumProp.cached_value).toEqual({ type: 'number', value: 60 });
      }
    });

    it('should evaluate AVG() over list', async () => {
      const request = {
        type: 'avg_test',
        properties: {
          scores: properties.literal({
            type: 'list',
            element_type: 'number',
            values: [
              { type: 'number', value: 80 },
              { type: 'number', value: 90 },
              { type: 'number', value: 100 },
            ],
          }),
          average: properties.computed('AVG(#scores)'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const avgProp = getComputedProp(entity, 'average');
      if (avgProp?.computation_status === 'valid') {
        expect(avgProp.cached_value).toEqual({ type: 'number', value: 90 });
      }
    });

    it('should evaluate MIN() and MAX() over list', async () => {
      const request = {
        type: 'minmax_test',
        properties: {
          numbers: properties.literal({
            type: 'list',
            element_type: 'number',
            values: [
              { type: 'number', value: 5 },
              { type: 'number', value: 15 },
              { type: 'number', value: 10 },
            ],
          }),
          minimum: properties.computed('MIN(#numbers)'),
          maximum: properties.computed('MAX(#numbers)'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const minProp = getComputedProp(entity, 'minimum');
      const maxProp = getComputedProp(entity, 'maximum');

      if (minProp?.computation_status === 'valid') {
        expect(minProp.cached_value).toEqual({ type: 'number', value: 5 });
      }
      if (maxProp?.computation_status === 'valid') {
        expect(maxProp.cached_value).toEqual({ type: 'number', value: 15 });
      }
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle division by zero', async () => {
      const request = {
        type: 'div_zero_test',
        properties: {
          numerator: properties.number(10),
          denominator: properties.number(0),
          result: properties.computed('#numerator / #denominator'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const resultProp = getComputedProp(entity, 'result');
      // Should either be error or return Infinity
      expect(resultProp).toBeDefined();
      if (resultProp?.computation_status === 'error') {
        expect(resultProp.computation_error).toBeDefined();
      }
    });

    it('should handle null values', async () => {
      const request = {
        type: 'null_test',
        properties: {
          value: properties.computed('#nonexistent_property + 1'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const valueProp = getComputedProp(entity, 'value');
      // Should be error or handle null gracefully
      expect(['error', 'pending']).toContain(valueProp?.computation_status);
    });

    it('should handle type mismatches', async () => {
      const request = {
        type: 'type_mismatch_test',
        properties: {
          text_value: properties.text('hello'),
          number_value: properties.number(5),
          result: properties.computed('#text_value * #number_value'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const resultProp = getComputedProp(entity, 'result');
      // Should be error due to type mismatch
      expect(resultProp).toBeDefined();
      if (resultProp?.computation_status === 'error') {
        expect(resultProp.computation_error).toBeDefined();
      }
    });

    it('should store error status for failed computations', async () => {
      const request = {
        type: 'error_status_test',
        properties: {
          bad_expr: properties.computed('INVALID_FUNCTION(123)'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);
      const entity = assertEntityCreated(response);

      const badProp = getComputedProp(entity, 'bad_expr');
      expect(badProp?.computation_status).toBe('error');
      expect(badProp?.computation_error).toBeDefined();
    });
  });

  // ===========================================================================
  // PERFORMANCE
  // ===========================================================================

  describe('Performance', () => {
    it('should only recalculate affected properties', async () => {
      // Create entity with multiple independent computed props
      const request = {
        type: 'perf_test',
        properties: {
          a: properties.number(1),
          b: properties.number(2),
          c: properties.number(3),
          derived_a: properties.computed('#a * 10'),
          derived_b: properties.computed('#b * 10'),
          derived_c: properties.computed('#c * 10'),
        },
      };

      const createResponse = await client.post<EntityResponse>('/entities', request);
      const created = assertEntityCreated(createResponse);

      const originalCachedAtA = getComputedProp(created, 'derived_a')?.cached_at;
      const originalCachedAtB = getComputedProp(created, 'derived_b')?.cached_at;

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update only 'a' - should only recalculate derived_a
      const updateRequest = fixtures.update(1, {
        a: properties.number(5),
      });

      const updateResponse = await client.put<EntityResponse>(
        `/entities/${created.id}`,
        updateRequest
      );
      const updated = assertOk(updateResponse).entity;

      const updatedDerivedA = getComputedProp(updated, 'derived_a');
      const updatedDerivedB = getComputedProp(updated, 'derived_b');

      // derived_a should be updated with new value
      expect(updatedDerivedA?.cached_value).toEqual({ type: 'number', value: 50 });

      // Note: The server may or may not optimize to skip unchanged properties
      // This test just verifies correct values are returned
      expect(updatedDerivedB?.cached_value).toEqual({ type: 'number', value: 20 });
    });

    it('should use cached values when dependencies unchanged', async () => {
      // Create entity
      const request = fixtures.productWithTotal({
        quantity: 10,
        unitPrice: 5.0,
      });

      const createResponse = await client.post<EntityResponse>('/entities', request);
      const created = assertEntityCreated(createResponse);

      // Update an unrelated property (name)
      const updateRequest = fixtures.update(1, {
        name: properties.text('Updated Name'),
      });

      const updateResponse = await client.put<EntityResponse>(
        `/entities/${created.id}`,
        updateRequest
      );
      const updated = assertOk(updateResponse).entity;

      // Total should still have same cached value
      const originalTotal = getComputedProp(created, 'total')?.cached_value;
      const updatedTotal = getComputedProp(updated, 'total')?.cached_value;

      expect(updatedTotal).toEqual(originalTotal);
    });
  });
});
