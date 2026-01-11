/**
 * Tests for seed-data.ts
 */

import { describe, it, expect } from 'vitest';
import {
  generateEntityId,
  resolveSeedEntities,
  resolveSeedRelationships,
  convertPropertiesToDbFormat,
  validateSeedData,
  mergeSeedConfigs,
  type SeedFileConfig,
  type ResolvedSeedEntity,
} from '../../src/loader/seed-data.js';
import type { EntityTypeConfig } from '../../src/config/types.js';

describe('seed-data', () => {
  describe('generateEntityId', () => {
    it('should generate a valid UUID v7 format', () => {
      const id = generateEntityId();

      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateEntityId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate time-ordered IDs', () => {
      const id1 = generateEntityId();
      const id2 = generateEntityId();

      // First 12 hex chars are timestamp
      const ts1 = id1.replace(/-/g, '').slice(0, 12);
      const ts2 = id2.replace(/-/g, '').slice(0, 12);

      expect(BigInt('0x' + ts2)).toBeGreaterThanOrEqual(BigInt('0x' + ts1));
    });
  });

  describe('resolveSeedEntities', () => {
    const entitySchemas: Record<string, EntityTypeConfig> = {
      material: {
        id: 'material',
        name: 'Material',
        properties: [
          { name: 'material_code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'density', type: 'number' },
        ],
      },
    };

    it('should resolve entities with generated IDs', () => {
      const config: SeedFileConfig = {
        entities: [
          {
            type: 'material',
            data: { material_code: 'MAT-001', name: 'Aluminum' },
          },
        ],
      };

      const resolved = resolveSeedEntities(config, entitySchemas);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.id).toBeDefined();
      expect(resolved[0]?.type).toBe('material');
      expect(resolved[0]?.properties).toBeDefined();
    });

    it('should use provided ID as refId', () => {
      const config: SeedFileConfig = {
        entities: [
          {
            type: 'material',
            id: 'mat-aluminum',
            data: { material_code: 'MAT-001', name: 'Aluminum' },
          },
        ],
      };

      const resolved = resolveSeedEntities(config, entitySchemas);

      expect(resolved[0]?.id).toBe('mat-aluminum');
      expect(resolved[0]?.refId).toBe('mat-aluminum');
    });

    it('should throw for unknown entity type', () => {
      const config: SeedFileConfig = {
        entities: [
          { type: 'unknown', data: { name: 'Test' } },
        ],
      };

      expect(() => resolveSeedEntities(config, entitySchemas)).toThrow(
        /Unknown entity type/
      );
    });
  });

  describe('convertPropertiesToDbFormat', () => {
    const schema: EntityTypeConfig = {
      id: 'part',
      name: 'Part',
      properties: [
        { name: 'part_number', type: 'text', required: true },
        { name: 'weight', type: { type: 'number', dimension: 'mass', unit: 'kg' } },
        { name: 'active', type: 'boolean' },
        { name: 'created_at', type: 'datetime' },
      ],
    };

    it('should wrap values in literal source format', () => {
      const data = { part_number: 'PN-001' };
      const result = convertPropertiesToDbFormat(data, schema);

      expect(result.part_number).toEqual({
        source: 'literal',
        value: { type: 'text', value: 'PN-001' },
      });
    });

    it('should convert numeric strings to numbers', () => {
      const data = { weight: '2.5' };
      const result = convertPropertiesToDbFormat(data, schema);

      expect(result.weight).toEqual({
        source: 'literal',
        value: { type: 'number', value: 2.5 },
      });
    });

    it('should convert boolean strings', () => {
      const data = { active: 'true' };
      const result = convertPropertiesToDbFormat(data, schema);

      expect(result.active).toEqual({
        source: 'literal',
        value: { type: 'boolean', value: true },
      });
    });

    it('should convert dates to ISO strings', () => {
      const date = new Date('2024-01-15');
      const data = { created_at: date };
      const result = convertPropertiesToDbFormat(data, schema);

      expect(result.created_at).toEqual({
        source: 'literal',
        value: { type: 'datetime', value: date.toISOString() },
      });
    });

    it('should use default values when property not provided', () => {
      const schemaWithDefault: EntityTypeConfig = {
        id: 'part',
        name: 'Part',
        properties: [
          { name: 'revision', type: 'text', default: 'A' },
        ],
      };

      const data = {};
      const result = convertPropertiesToDbFormat(data, schemaWithDefault);

      expect(result.revision).toEqual({
        source: 'literal',
        value: { type: 'text', value: 'A' },
      });
    });
  });

  describe('resolveSeedRelationships', () => {
    const entities: ResolvedSeedEntity[] = [
      { id: 'uuid-1', type: 'assembly', properties: {}, refId: 'assembly-main' },
      { id: 'uuid-2', type: 'part', properties: {}, refId: 'part-a' },
      { id: 'uuid-3', type: 'part', properties: {} },
    ];

    it('should resolve relationships using refIds', () => {
      const config: SeedFileConfig = {
        relationships: [
          { type: 'bom_contains', from: 'assembly-main', to: 'part-a' },
        ],
      };

      const resolved = resolveSeedRelationships(config, entities);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.from_entity).toBe('uuid-1');
      expect(resolved[0]?.to_entity).toBe('uuid-2');
    });

    it('should resolve relationships using actual IDs', () => {
      const config: SeedFileConfig = {
        relationships: [
          { type: 'bom_contains', from: 'uuid-1', to: 'uuid-3' },
        ],
      };

      const resolved = resolveSeedRelationships(config, entities);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.from_entity).toBe('uuid-1');
      expect(resolved[0]?.to_entity).toBe('uuid-3');
    });

    it('should include metadata', () => {
      const config: SeedFileConfig = {
        relationships: [
          {
            type: 'bom_contains',
            from: 'assembly-main',
            to: 'part-a',
            metadata: { quantity: 2 },
          },
        ],
      };

      const resolved = resolveSeedRelationships(config, entities);

      expect(resolved[0]?.metadata).toEqual({ quantity: 2 });
    });

    it('should throw for unknown from reference', () => {
      const config: SeedFileConfig = {
        relationships: [
          { type: 'bom_contains', from: 'unknown-ref', to: 'part-a' },
        ],
      };

      expect(() => resolveSeedRelationships(config, entities)).toThrow(
        /unknown 'from' entity/
      );
    });

    it('should throw for unknown to reference', () => {
      const config: SeedFileConfig = {
        relationships: [
          { type: 'bom_contains', from: 'assembly-main', to: 'unknown-ref' },
        ],
      };

      expect(() => resolveSeedRelationships(config, entities)).toThrow(
        /unknown 'to' entity/
      );
    });
  });

  describe('validateSeedData', () => {
    const entitySchemas: Record<string, EntityTypeConfig> = {
      part: {
        id: 'part',
        name: 'Part',
        properties: [
          { name: 'part_number', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
        ],
      },
      material: {
        id: 'material',
        name: 'Material',
        properties: [
          { name: 'material_code', type: 'text', required: true },
        ],
      },
    };

    it('should pass for valid seed data', () => {
      const config: SeedFileConfig = {
        entities: [
          { type: 'part', data: { part_number: 'PN-001', name: 'Part 1' } },
        ],
      };

      const errors = validateSeedData(config, entitySchemas);

      expect(errors).toHaveLength(0);
    });

    it('should detect unknown entity type', () => {
      const config: SeedFileConfig = {
        entities: [
          { type: 'unknown', data: { name: 'Test' } },
        ],
      };

      const errors = validateSeedData(config, entitySchemas);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('unknown type');
    });

    it('should detect missing required properties', () => {
      const config: SeedFileConfig = {
        entities: [
          { type: 'part', data: { part_number: 'PN-001' } }, // Missing 'name'
        ],
      };

      const errors = validateSeedData(config, entitySchemas);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("missing required property: 'name'");
    });

    it('should detect duplicate IDs', () => {
      const config: SeedFileConfig = {
        entities: [
          { id: 'dup-id', type: 'part', data: { part_number: 'PN-001', name: 'Part 1' } },
          { id: 'dup-id', type: 'material', data: { material_code: 'MAT-001' } },
        ],
      };

      const errors = validateSeedData(config, entitySchemas);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Duplicate seed entity ID');
    });

    it('should detect unknown relationship references', () => {
      const config: SeedFileConfig = {
        entities: [
          { id: 'entity-1', type: 'part', data: { part_number: 'PN-001', name: 'Part 1' } },
        ],
        relationships: [
          { type: 'rel', from: 'entity-1', to: 'unknown-ref' },
        ],
      };

      const errors = validateSeedData(config, entitySchemas);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('unknown');
    });

    it('should allow UUID references in relationships', () => {
      const config: SeedFileConfig = {
        entities: [],
        relationships: [
          {
            type: 'rel',
            from: '12345678-1234-1234-1234-123456789012',
            to: '87654321-4321-4321-4321-210987654321',
          },
        ],
      };

      const errors = validateSeedData(config, entitySchemas);

      expect(errors).toHaveLength(0);
    });
  });

  describe('mergeSeedConfigs', () => {
    it('should merge multiple configs', () => {
      const configs: SeedFileConfig[] = [
        {
          entities: [{ type: 'part', data: { name: 'Part 1' } }],
          relationships: [{ type: 'rel1', from: 'a', to: 'b' }],
        },
        {
          entities: [{ type: 'material', data: { name: 'Mat 1' } }],
          relationships: [{ type: 'rel2', from: 'c', to: 'd' }],
        },
      ];

      const merged = mergeSeedConfigs(configs);

      expect(merged.entities).toHaveLength(2);
      expect(merged.relationships).toHaveLength(2);
    });

    it('should handle configs with missing sections', () => {
      const configs: SeedFileConfig[] = [
        { entities: [{ type: 'part', data: {} }] },
        { relationships: [{ type: 'rel', from: 'a', to: 'b' }] },
        {},
      ];

      const merged = mergeSeedConfigs(configs);

      expect(merged.entities).toHaveLength(1);
      expect(merged.relationships).toHaveLength(1);
    });
  });
});
