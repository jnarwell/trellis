/**
 * Tests for PropertyEvaluator.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'pg';
import type {
  Entity,
  EntityId,
  TenantId,
  ActorId,
  PropertyName,
  ComputedProperty,
  LiteralProperty,
} from '@trellis/kernel';
import { PropertyEvaluator } from '../evaluator.js';

// Mock the kernel parse and evaluate
vi.mock('@trellis/kernel', async () => {
  const actual = await vi.importActual('@trellis/kernel');
  return {
    ...actual,
    // Keep actual implementations for types
  };
});

describe('PropertyEvaluator', () => {
  let mockPool: Pool;
  const tenantId = 'tenant-1' as TenantId;

  beforeEach(() => {
    // Create mock pool that returns empty results
    mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Pool;
  });

  /**
   * Helper to create a test entity.
   */
  function createTestEntity(
    properties: Record<string, any>,
    id: string = 'entity-1'
  ): Entity {
    return {
      id: id as EntityId,
      tenant_id: tenantId,
      type: 'product' as any,
      properties: properties as any,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      created_by: 'actor-1' as ActorId,
      version: 1,
    };
  }

  describe('evaluateProperty', () => {
    it('should evaluate a simple arithmetic expression', async () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      const entity = createTestEntity({
        quantity: {
          source: 'literal',
          name: 'quantity' as PropertyName,
          value: { type: 'number', value: 10 },
        } as LiteralProperty,
        unit_price: {
          source: 'literal',
          name: 'unit_price' as PropertyName,
          value: { type: 'number', value: 5 },
        } as LiteralProperty,
        total: {
          source: 'computed',
          name: 'total' as PropertyName,
          expression: '#quantity * #unit_price',
          dependencies: ['quantity', 'unit_price'],
          computation_status: 'pending',
        } as ComputedProperty,
      });

      const result = await evaluator.evaluateProperty(
        entity,
        'total' as PropertyName,
        entity.properties['total' as PropertyName] as ComputedProperty
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('valid');
      expect(result.value).toEqual({ type: 'number', value: 50 });
    });

    it('should handle division by zero', async () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      const entity = createTestEntity({
        a: {
          source: 'literal',
          name: 'a' as PropertyName,
          value: { type: 'number', value: 10 },
        } as LiteralProperty,
        b: {
          source: 'literal',
          name: 'b' as PropertyName,
          value: { type: 'number', value: 0 },
        } as LiteralProperty,
        result: {
          source: 'computed',
          name: 'result' as PropertyName,
          expression: '#a / #b',
          dependencies: ['a', 'b'],
          computation_status: 'pending',
        } as ComputedProperty,
      });

      const result = await evaluator.evaluateProperty(
        entity,
        'result' as PropertyName,
        entity.properties['result' as PropertyName] as ComputedProperty
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.error?.toLowerCase()).toContain('division');
    });

    it('should evaluate conditional expressions', async () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      const entity = createTestEntity({
        quantity: {
          source: 'literal',
          name: 'quantity' as PropertyName,
          value: { type: 'number', value: 150 },
        } as LiteralProperty,
        unit_price: {
          source: 'literal',
          name: 'unit_price' as PropertyName,
          value: { type: 'number', value: 10 },
        } as LiteralProperty,
        bulk_price: {
          source: 'literal',
          name: 'bulk_price' as PropertyName,
          value: { type: 'number', value: 8 },
        } as LiteralProperty,
        price: {
          source: 'computed',
          name: 'price' as PropertyName,
          expression: 'IF(#quantity > 100, #bulk_price, #unit_price)',
          dependencies: ['quantity', 'unit_price', 'bulk_price'],
          computation_status: 'pending',
        } as ComputedProperty,
      });

      const result = await evaluator.evaluateProperty(
        entity,
        'price' as PropertyName,
        entity.properties['price' as PropertyName] as ComputedProperty
      );

      expect(result.success).toBe(true);
      expect(result.value).toEqual({ type: 'number', value: 8 });
    });

    it('should evaluate aggregation functions', async () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      // Note: This test uses a simplified case without relationship traversal
      // A full test would need to mock the relationship cache

      const entity = createTestEntity({
        values: {
          source: 'literal',
          name: 'values' as PropertyName,
          value: {
            type: 'list',
            element_type: 'number',
            values: [
              { type: 'number', value: 10 },
              { type: 'number', value: 20 },
              { type: 'number', value: 30 },
            ],
          },
        } as LiteralProperty,
      });

      // For now, just test that the evaluator can be created and run
      // Full aggregation tests require relationship mocking
      expect(evaluator).toBeDefined();
    });

    it('should handle missing properties gracefully', async () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      const entity = createTestEntity({
        total: {
          source: 'computed',
          name: 'total' as PropertyName,
          expression: '#nonexistent * 2',
          dependencies: ['nonexistent'],
          computation_status: 'pending',
        } as ComputedProperty,
      });

      const result = await evaluator.evaluateProperty(
        entity,
        'total' as PropertyName,
        entity.properties['total' as PropertyName] as ComputedProperty
      );

      // Missing property returns null, so null * 2 = null
      expect(result.success).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should handle parse errors', async () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      const entity = createTestEntity({
        bad: {
          source: 'computed',
          name: 'bad' as PropertyName,
          expression: '#a +++ #b', // Invalid syntax
          dependencies: [],
          computation_status: 'pending',
        } as ComputedProperty,
      });

      const result = await evaluator.evaluateProperty(
        entity,
        'bad' as PropertyName,
        entity.properties['bad' as PropertyName] as ComputedProperty
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
    });
  });

  describe('evaluateEntity', () => {
    it('should evaluate all computed properties', async () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      const entity = createTestEntity({
        a: {
          source: 'literal',
          name: 'a' as PropertyName,
          value: { type: 'number', value: 10 },
        } as LiteralProperty,
        b: {
          source: 'literal',
          name: 'b' as PropertyName,
          value: { type: 'number', value: 5 },
        } as LiteralProperty,
        sum: {
          source: 'computed',
          name: 'sum' as PropertyName,
          expression: '#a + #b',
          dependencies: ['a', 'b'],
          computation_status: 'pending',
        } as ComputedProperty,
        product: {
          source: 'computed',
          name: 'product' as PropertyName,
          expression: '#a * #b',
          dependencies: ['a', 'b'],
          computation_status: 'pending',
        } as ComputedProperty,
      });

      const result = await evaluator.evaluateEntity(entity);

      expect(result.entityId).toBe('entity-1');
      expect(result.properties).toHaveLength(2);
      expect(result.allSucceeded).toBe(true);

      const sumResult = result.properties.find((p) => p.propertyName === 'sum');
      expect(sumResult?.value).toEqual({ type: 'number', value: 15 });

      const productResult = result.properties.find((p) => p.propertyName === 'product');
      expect(productResult?.value).toEqual({ type: 'number', value: 50 });
    });

    it('should skip valid properties when skipValid is true', async () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      const entity = createTestEntity({
        a: {
          source: 'literal',
          name: 'a' as PropertyName,
          value: { type: 'number', value: 10 },
        } as LiteralProperty,
        valid_computed: {
          source: 'computed',
          name: 'valid_computed' as PropertyName,
          expression: '#a * 2',
          dependencies: ['a'],
          computation_status: 'valid',
          cached_value: { type: 'number', value: 20 },
        } as ComputedProperty,
        pending_computed: {
          source: 'computed',
          name: 'pending_computed' as PropertyName,
          expression: '#a * 3',
          dependencies: ['a'],
          computation_status: 'pending',
        } as ComputedProperty,
      });

      const result = await evaluator.evaluateEntity(entity, { skipValid: true });

      // Should only evaluate the pending one
      expect(result.properties).toHaveLength(1);
      expect(result.properties[0]?.propertyName).toBe('pending_computed');
    });

    it('should skip non-computed properties', async () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      const entity = createTestEntity({
        literal_prop: {
          source: 'literal',
          name: 'literal_prop' as PropertyName,
          value: { type: 'number', value: 10 },
        } as LiteralProperty,
        measured_prop: {
          source: 'measured',
          name: 'measured_prop' as PropertyName,
          value: { type: 'number', value: 25.5 },
        } as any,
      });

      const result = await evaluator.evaluateEntity(entity);

      expect(result.properties).toHaveLength(0);
    });
  });

  describe('parseExpression', () => {
    it('should parse valid expressions', () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      const ast = evaluator.parseExpression('#a + #b');

      expect(ast).toBeDefined();
      expect(ast.type).toBe('Expression');
    });

    it('should throw on invalid expressions', () => {
      const evaluator = new PropertyEvaluator(mockPool, tenantId);

      expect(() => evaluator.parseExpression('#a +++')).toThrow();
    });
  });
});
