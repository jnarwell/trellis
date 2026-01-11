/**
 * Tests for relationship-loader.ts
 */

import { describe, it, expect } from 'vitest';
import {
  generateRelationshipSchema,
  generateInverseRelationshipSchema,
  generateAllRelationshipSchemas,
  validateRelationshipConfigs,
  type RelationshipTypeConfig,
} from '../../src/loader/relationship-loader.js';

describe('relationship-loader', () => {
  describe('generateRelationshipSchema', () => {
    it('should generate a basic relationship schema', () => {
      const config: RelationshipTypeConfig = {
        id: 'bom_contains',
        name: 'BOM Contains',
        from_types: ['assembly'],
        to_types: ['part', 'assembly'],
        cardinality: 'one_to_many',
      };

      const schema = generateRelationshipSchema(config, 'tenant-1');

      expect(schema.tenant_id).toBe('tenant-1');
      expect(schema.type).toBe('bom_contains');
      expect(schema.name).toBe('BOM Contains');
      expect(schema.from_types).toEqual(['assembly']);
      expect(schema.to_types).toEqual(['part', 'assembly']);
      expect(schema.cardinality).toBe('one_to_many');
      expect(schema.bidirectional).toBe(false);
      expect(schema.inverse_type).toBeNull();
    });

    it('should handle bidirectional relationships', () => {
      const config: RelationshipTypeConfig = {
        id: 'bom_contains',
        name: 'BOM Contains',
        from_types: ['assembly'],
        to_types: ['part'],
        bidirectional: true,
        inverse_type: 'contained_in',
      };

      const schema = generateRelationshipSchema(config, null);

      expect(schema.bidirectional).toBe(true);
      expect(schema.inverse_type).toBe('contained_in');
    });

    it('should handle metadata properties', () => {
      const config: RelationshipTypeConfig = {
        id: 'bom_contains',
        name: 'BOM Contains',
        from_types: ['assembly'],
        to_types: ['part'],
        metadata: {
          quantity: {
            name: 'quantity',
            type: 'number',
            required: true,
            default: 1,
          },
          reference_designator: {
            name: 'reference_designator',
            type: 'text',
          },
        },
      };

      const schema = generateRelationshipSchema(config, 'tenant-1');

      expect(Object.keys(schema.metadata_schema)).toHaveLength(2);
      expect(schema.metadata_schema.quantity?.value_type).toBe('number');
      expect(schema.metadata_schema.quantity?.required).toBe(true);
      expect(schema.metadata_schema.quantity?.default).toBe(1);
    });

    it('should default cardinality to many_to_many', () => {
      const config: RelationshipTypeConfig = {
        id: 'related_to',
        name: 'Related To',
        from_types: ['part'],
        to_types: ['part'],
      };

      const schema = generateRelationshipSchema(config, 'tenant-1');

      expect(schema.cardinality).toBe('many_to_many');
    });
  });

  describe('generateInverseRelationshipSchema', () => {
    it('should generate inverse schema for bidirectional relationship', () => {
      const config: RelationshipTypeConfig = {
        id: 'bom_contains',
        name: 'BOM Contains',
        description: 'Parent contains child',
        from_types: ['assembly'],
        to_types: ['part'],
        cardinality: 'one_to_many',
        bidirectional: true,
        inverse_type: 'contained_in',
      };

      const inverse = generateInverseRelationshipSchema(config, 'tenant-1');

      expect(inverse).not.toBeNull();
      expect(inverse?.type).toBe('contained_in');
      expect(inverse?.name).toBe('Inverse of BOM Contains');
      expect(inverse?.from_types).toEqual(['part']); // Swapped
      expect(inverse?.to_types).toEqual(['assembly']); // Swapped
      expect(inverse?.cardinality).toBe('many_to_one'); // Inverted
      expect(inverse?.inverse_type).toBe('bom_contains');
    });

    it('should return null for non-bidirectional relationship', () => {
      const config: RelationshipTypeConfig = {
        id: 'bom_contains',
        name: 'BOM Contains',
        from_types: ['assembly'],
        to_types: ['part'],
        bidirectional: false,
      };

      const inverse = generateInverseRelationshipSchema(config, 'tenant-1');

      expect(inverse).toBeNull();
    });

    it('should return null if inverse_type not specified', () => {
      const config: RelationshipTypeConfig = {
        id: 'bom_contains',
        name: 'BOM Contains',
        from_types: ['assembly'],
        to_types: ['part'],
        bidirectional: true,
        // Missing inverse_type
      };

      const inverse = generateInverseRelationshipSchema(config, 'tenant-1');

      expect(inverse).toBeNull();
    });

    it('should keep symmetric cardinalities unchanged', () => {
      const oneToOne: RelationshipTypeConfig = {
        id: 'one_to_one_rel',
        name: 'One to One',
        from_types: ['a'],
        to_types: ['b'],
        cardinality: 'one_to_one',
        bidirectional: true,
        inverse_type: 'inverse_one_to_one',
      };

      const manyToMany: RelationshipTypeConfig = {
        id: 'many_to_many_rel',
        name: 'Many to Many',
        from_types: ['a'],
        to_types: ['b'],
        cardinality: 'many_to_many',
        bidirectional: true,
        inverse_type: 'inverse_many_to_many',
      };

      const inverse1 = generateInverseRelationshipSchema(oneToOne, null);
      const inverse2 = generateInverseRelationshipSchema(manyToMany, null);

      expect(inverse1?.cardinality).toBe('one_to_one');
      expect(inverse2?.cardinality).toBe('many_to_many');
    });
  });

  describe('generateAllRelationshipSchemas', () => {
    it('should generate schemas including inverses', () => {
      const configs: RelationshipTypeConfig[] = [
        {
          id: 'bom_contains',
          name: 'BOM Contains',
          from_types: ['assembly'],
          to_types: ['part'],
          bidirectional: true,
          inverse_type: 'contained_in',
        },
        {
          id: 'related_to',
          name: 'Related To',
          from_types: ['part'],
          to_types: ['part'],
        },
      ];

      const schemas = generateAllRelationshipSchemas(configs, 'tenant-1');

      expect(schemas).toHaveLength(3); // bom_contains + contained_in + related_to
      expect(schemas.map((s) => s.type)).toContain('bom_contains');
      expect(schemas.map((s) => s.type)).toContain('contained_in');
      expect(schemas.map((s) => s.type)).toContain('related_to');
    });
  });

  describe('validateRelationshipConfigs', () => {
    const entityIds = new Set(['part', 'assembly', 'material']);

    it('should pass for valid configs', () => {
      const configs: RelationshipTypeConfig[] = [
        {
          id: 'bom_contains',
          name: 'BOM Contains',
          from_types: ['assembly'],
          to_types: ['part', 'assembly'],
          bidirectional: true,
          inverse_type: 'contained_in',
        },
      ];

      const errors = validateRelationshipConfigs(configs, entityIds);

      expect(errors).toHaveLength(0);
    });

    it('should detect duplicate type IDs', () => {
      const configs: RelationshipTypeConfig[] = [
        {
          id: 'rel_type',
          name: 'Rel 1',
          from_types: ['part'],
          to_types: ['part'],
        },
        {
          id: 'rel_type',
          name: 'Rel 2',
          from_types: ['assembly'],
          to_types: ['assembly'],
        },
      ];

      const errors = validateRelationshipConfigs(configs, entityIds);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Duplicate');
    });

    it('should detect unknown from_types', () => {
      const configs: RelationshipTypeConfig[] = [
        {
          id: 'test_rel',
          name: 'Test',
          from_types: ['unknown_type'],
          to_types: ['part'],
        },
      ];

      const errors = validateRelationshipConfigs(configs, entityIds);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('unknown from_type');
    });

    it('should detect unknown to_types', () => {
      const configs: RelationshipTypeConfig[] = [
        {
          id: 'test_rel',
          name: 'Test',
          from_types: ['part'],
          to_types: ['unknown_type'],
        },
      ];

      const errors = validateRelationshipConfigs(configs, entityIds);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('unknown to_type');
    });

    it('should allow system types', () => {
      const configs: RelationshipTypeConfig[] = [
        {
          id: 'test_rel',
          name: 'Test',
          from_types: ['trellis.base'],
          to_types: ['trellis.document'],
        },
      ];

      const errors = validateRelationshipConfigs(configs, entityIds);

      expect(errors).toHaveLength(0);
    });

    it('should require inverse_type for bidirectional relationships', () => {
      const configs: RelationshipTypeConfig[] = [
        {
          id: 'test_rel',
          name: 'Test',
          from_types: ['part'],
          to_types: ['assembly'],
          bidirectional: true,
          // Missing inverse_type
        },
      ];

      const errors = validateRelationshipConfigs(configs, entityIds);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('must specify inverse_type');
    });

    it('should detect inverse_type conflicts', () => {
      const configs: RelationshipTypeConfig[] = [
        {
          id: 'rel_a',
          name: 'Rel A',
          from_types: ['part'],
          to_types: ['assembly'],
          bidirectional: true,
          inverse_type: 'rel_b',
        },
        {
          id: 'rel_b',
          name: 'Rel B',
          from_types: ['material'],
          to_types: ['part'],
        },
      ];

      const errors = validateRelationshipConfigs(configs, entityIds);

      // The inverse_type 'rel_b' will be added first, then the actual 'rel_b' will be flagged as duplicate
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Duplicate');
    });
  });
});
