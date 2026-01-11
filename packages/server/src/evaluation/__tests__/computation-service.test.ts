/**
 * Tests for ComputationService.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import type {
  Entity,
  EntityId,
  TenantId,
  ActorId,
  PropertyName,
  ComputedProperty,
  LiteralProperty,
} from '@trellis/kernel';
import { ComputationService } from '../computation-service.js';

describe('ComputationService', () => {
  let mockPool: Pool;
  let mockClient: PoolClient;
  const tenantId = 'tenant-1' as TenantId;
  const actorId = 'actor-1' as ActorId;

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    } as unknown as PoolClient;

    mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      connect: vi.fn().mockResolvedValue(mockClient),
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
      created_by: actorId,
      version: 1,
    };
  }

  describe('computeProperties', () => {
    it('should compute all computed properties and return updated map', async () => {
      const service = new ComputationService(mockPool, tenantId, actorId);

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

      const result = await service.computeProperties(entity);

      expect(result.allSucceeded).toBe(true);
      expect(result.results).toHaveLength(1);

      // Check the updated properties map
      const totalProp = result.properties['total' as PropertyName] as ComputedProperty;
      expect(totalProp.computation_status).toBe('valid');
      expect(totalProp.cached_value).toEqual({ type: 'number', value: 50 });
      expect(totalProp.cached_at).toBeDefined();
    });

    it('should set error status on computation failure', async () => {
      const service = new ComputationService(mockPool, tenantId, actorId);

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
        bad: {
          source: 'computed',
          name: 'bad' as PropertyName,
          expression: '#a / #b',
          dependencies: ['a', 'b'],
          computation_status: 'pending',
        } as ComputedProperty,
      });

      const result = await service.computeProperties(entity);

      expect(result.allSucceeded).toBe(false);

      const badProp = result.properties['bad' as PropertyName] as ComputedProperty;
      expect(badProp.computation_status).toBe('error');
      expect(badProp.computation_error).toBeDefined();
    });

    it('should only compute stale properties when onlyStale is true', async () => {
      const service = new ComputationService(mockPool, tenantId, actorId);

      const entity = createTestEntity({
        a: {
          source: 'literal',
          name: 'a' as PropertyName,
          value: { type: 'number', value: 10 },
        } as LiteralProperty,
        valid: {
          source: 'computed',
          name: 'valid' as PropertyName,
          expression: '#a * 2',
          dependencies: ['a'],
          computation_status: 'valid',
          cached_value: { type: 'number', value: 20 },
        } as ComputedProperty,
        stale: {
          source: 'computed',
          name: 'stale' as PropertyName,
          expression: '#a * 3',
          dependencies: ['a'],
          computation_status: 'stale',
        } as ComputedProperty,
      });

      const result = await service.computeProperties(entity, { onlyStale: true });

      // Should only have evaluated the stale property
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.propertyName).toBe('stale');
    });

    it('should preserve non-computed properties', async () => {
      const service = new ComputationService(mockPool, tenantId, actorId);

      const entity = createTestEntity({
        literal: {
          source: 'literal',
          name: 'literal' as PropertyName,
          value: { type: 'text', value: 'hello' },
        } as LiteralProperty,
        computed: {
          source: 'computed',
          name: 'computed' as PropertyName,
          expression: '1 + 1',
          dependencies: [],
          computation_status: 'pending',
        } as ComputedProperty,
      });

      const result = await service.computeProperties(entity);

      // Literal property should be preserved unchanged
      expect(result.properties['literal' as PropertyName]).toEqual(entity.properties['literal' as PropertyName]);
    });
  });

  describe('computeProperty', () => {
    it('should compute a single property', async () => {
      const service = new ComputationService(mockPool, tenantId, actorId);

      const entity = createTestEntity({
        x: {
          source: 'literal',
          name: 'x' as PropertyName,
          value: { type: 'number', value: 7 },
        } as LiteralProperty,
        doubled: {
          source: 'computed',
          name: 'doubled' as PropertyName,
          expression: '#x * 2',
          dependencies: ['x'],
          computation_status: 'pending',
        } as ComputedProperty,
      });

      const result = await service.computeProperty(entity, 'doubled' as PropertyName);

      expect(result.success).toBe(true);
      expect(result.value).toEqual({ type: 'number', value: 14 });
    });

    it('should return error for non-computed property', async () => {
      const service = new ComputationService(mockPool, tenantId, actorId);

      const entity = createTestEntity({
        literal: {
          source: 'literal',
          name: 'literal' as PropertyName,
          value: { type: 'text', value: 'hello' },
        } as LiteralProperty,
      });

      const result = await service.computeProperty(entity, 'literal' as PropertyName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a computed property');
    });

    it('should return error for missing property', async () => {
      const service = new ComputationService(mockPool, tenantId, actorId);

      const entity = createTestEntity({});

      const result = await service.computeProperty(entity, 'missing' as PropertyName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a computed property');
    });
  });

  describe('getStaleProperties', () => {
    it('should return empty array when entity not found', async () => {
      // Mock findById to return null
      mockClient.query = vi.fn().mockResolvedValue({ rows: [] });

      const service = new ComputationService(mockPool, tenantId, actorId);

      const result = await service.getStaleProperties('missing' as EntityId);

      expect(result).toEqual([]);
    });
  });
});
