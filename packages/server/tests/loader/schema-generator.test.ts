/**
 * Tests for schema-generator.ts
 */

import { describe, it, expect } from 'vitest';
import {
  generateTypeSchema,
  generateAllTypeSchemas,
  convertProperty,
  convertComputedProperty,
  generateLifecycleSchema,
  validateInheritance,
} from '../../src/loader/schema-generator.js';
import type { EntityTypeConfig, PropertyConfig, ComputedPropertyConfig, LifecycleConfig } from '../../src/config/types.js';

describe('schema-generator', () => {
  describe('generateTypeSchema', () => {
    it('should generate a basic type schema', () => {
      const config: EntityTypeConfig = {
        id: 'part',
        name: 'Part',
        description: 'A manufactured component',
        properties: [
          { name: 'part_number', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
        ],
      };

      const schema = generateTypeSchema('part', config, 'tenant-1');

      expect(schema.tenant_id).toBe('tenant-1');
      expect(schema.type_path).toBe('part');
      expect(schema.name).toBe('Part');
      expect(schema.description).toBe('A manufactured component');
      expect(schema.abstract).toBe(false);
      expect(schema.properties).toHaveLength(2);
    });

    it('should handle extends', () => {
      const config: EntityTypeConfig = {
        id: 'assembly',
        name: 'Assembly',
        extends: 'part',
        properties: [{ name: 'assembly_type', type: 'text' }],
      };

      const schema = generateTypeSchema('assembly', config, null);

      expect(schema.extends_type).toBe('part');
      expect(schema.tenant_id).toBeNull();
    });

    it('should handle abstract types', () => {
      const config: EntityTypeConfig = {
        id: 'base_entity',
        name: 'Base Entity',
        abstract: true,
        properties: [],
      };

      const schema = generateTypeSchema('base_entity', config, 'tenant-1');

      expect(schema.abstract).toBe(true);
    });

    it('should add computed properties', () => {
      const config: EntityTypeConfig = {
        id: 'part',
        name: 'Part',
        properties: [{ name: 'price', type: 'number' }],
        computed: [
          {
            name: 'total_cost',
            expression: '#price * #quantity',
            dimension: 'currency',
            unit: 'USD',
          },
        ],
      };

      const schema = generateTypeSchema('part', config, 'tenant-1');

      expect(schema.properties).toHaveLength(2);
      const computed = schema.properties.find((p) => p.name === 'total_cost');
      expect(computed).toBeDefined();
      expect(computed?.value_type).toBe('computed');
      expect(computed?.expression).toBe('#price * #quantity');
      expect(computed?.dimension).toBe('currency');
    });

    it('should generate lifecycle state property', () => {
      const config: EntityTypeConfig = {
        id: 'part',
        name: 'Part',
        properties: [],
        lifecycle: {
          stateProperty: 'status',
          initialState: 'draft',
          states: [
            { value: 'draft', label: 'Draft' },
            { value: 'released', label: 'Released' },
          ],
          transitions: [],
        },
      };

      const schema = generateTypeSchema('part', config, 'tenant-1');

      const statusProp = schema.properties.find((p) => p.name === 'status');
      expect(statusProp).toBeDefined();
      expect(statusProp?.value_type).toBe('option');
      expect(statusProp?.required).toBe(true);
      expect(statusProp?.default).toBe('draft');
      expect(statusProp?.options).toHaveLength(2);
    });
  });

  describe('convertProperty', () => {
    it('should convert simple text property', () => {
      const prop: PropertyConfig = {
        name: 'part_number',
        type: 'text',
        required: true,
        unique: true,
      };

      const result = convertProperty(prop);

      expect(result.name).toBe('part_number');
      expect(result.value_type).toBe('text');
      expect(result.required).toBe(true);
      expect(result.unique).toBe(true);
    });

    it('should convert number property with dimension', () => {
      const prop: PropertyConfig = {
        name: 'weight',
        type: {
          type: 'number',
          dimension: 'mass',
          unit: 'kg',
          min: 0,
        },
      };

      const result = convertProperty(prop);

      expect(result.value_type).toBe('number');
      expect(result.dimension).toBe('mass');
      expect(result.unit).toBe('kg');
    });

    it('should convert reference property', () => {
      const prop: PropertyConfig = {
        name: 'material',
        type: {
          type: 'reference',
          entityType: 'material',
          displayProperty: 'name',
        },
      };

      const result = convertProperty(prop);

      expect(result.value_type).toBe('reference');
      expect(result.reference_type).toBe('material');
      expect(result.reference_display).toBe('name');
    });

    it('should convert option property', () => {
      const prop: PropertyConfig = {
        name: 'category',
        type: {
          type: 'option',
          options: [
            { value: 'mechanical', label: 'Mechanical', color: 'blue' },
            { value: 'electrical', label: 'Electrical', color: 'yellow' },
          ],
        },
      };

      const result = convertProperty(prop);

      expect(result.value_type).toBe('option');
      expect(result.options).toHaveLength(2);
      expect(result.options?.[0]?.value).toBe('mechanical');
      expect(result.options?.[0]?.color).toBe('blue');
    });

    it('should convert list property', () => {
      const prop: PropertyConfig = {
        name: 'tags',
        type: {
          type: 'list',
          element: 'text',
        },
      };

      const result = convertProperty(prop);

      expect(result.value_type).toBe('list');
      expect(result.element_type).toBeDefined();
      expect(result.element_type?.value_type).toBe('text');
    });

    it('should handle default value', () => {
      const prop: PropertyConfig = {
        name: 'revision',
        type: 'text',
        default: 'A',
      };

      const result = convertProperty(prop);

      expect(result.default).toBe('A');
    });

    it('should handle validation rules', () => {
      const prop: PropertyConfig = {
        name: 'part_number',
        type: 'text',
        validation: {
          pattern: '^[A-Z]{2}-\\d{6}$',
          patternMessage: 'Must be format XX-000000',
        },
      };

      const result = convertProperty(prop);

      expect(result.validation?.pattern).toBe('^[A-Z]{2}-\\d{6}$');
      expect(result.validation?.patternMessage).toBe('Must be format XX-000000');
    });
  });

  describe('convertComputedProperty', () => {
    it('should convert computed property', () => {
      const prop: ComputedPropertyConfig = {
        name: 'total_cost',
        expression: '#unit_cost * #quantity',
        dimension: 'currency',
        unit: 'USD',
        dependencies: ['unit_cost', 'quantity'],
      };

      const result = convertComputedProperty(prop);

      expect(result.name).toBe('total_cost');
      expect(result.value_type).toBe('computed');
      expect(result.expression).toBe('#unit_cost * #quantity');
      expect(result.dimension).toBe('currency');
      expect(result.unit).toBe('USD');
      expect(result.dependencies).toEqual(['unit_cost', 'quantity']);
    });
  });

  describe('generateLifecycleSchema', () => {
    it('should generate lifecycle schema', () => {
      const config: LifecycleConfig = {
        stateProperty: 'status',
        initialState: 'draft',
        states: [
          { value: 'draft', label: 'Draft', color: 'gray', editable: true },
          { value: 'released', label: 'Released', color: 'green', editable: false },
        ],
        transitions: [
          { from: 'draft', to: 'released', action: 'release', permission: 'part.release' },
        ],
      };

      const result = generateLifecycleSchema(config);

      expect(result.state_property).toBe('status');
      expect(result.initial_state).toBe('draft');
      expect(result.states).toHaveLength(2);
      expect(result.states[0]?.color).toBe('gray');
      expect(result.transitions).toHaveLength(1);
      expect(result.transitions[0]?.permission).toBe('part.release');
    });
  });

  describe('generateAllTypeSchemas', () => {
    it('should generate all schemas in inheritance order', () => {
      const entities: Record<string, EntityTypeConfig> = {
        assembly: {
          id: 'assembly',
          name: 'Assembly',
          extends: 'part',
          properties: [],
        },
        part: {
          id: 'part',
          name: 'Part',
          properties: [{ name: 'part_number', type: 'text' }],
        },
      };

      const schemas = generateAllTypeSchemas(entities, 'tenant-1');

      expect(schemas).toHaveLength(2);
      // Part should come before assembly (parent before child)
      expect(schemas[0]?.type_path).toBe('part');
      expect(schemas[1]?.type_path).toBe('assembly');
    });
  });

  describe('validateInheritance', () => {
    it('should pass for valid inheritance', () => {
      const entities: Record<string, EntityTypeConfig> = {
        part: { id: 'part', name: 'Part', properties: [] },
        assembly: { id: 'assembly', name: 'Assembly', extends: 'part', properties: [] },
      };

      const errors = validateInheritance(entities);

      expect(errors).toHaveLength(0);
    });

    it('should detect unknown extends reference', () => {
      const entities: Record<string, EntityTypeConfig> = {
        part: { id: 'part', name: 'Part', extends: 'unknown', properties: [] },
      };

      const errors = validateInheritance(entities);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("extends unknown type 'unknown'");
    });

    it('should allow system type extends', () => {
      const entities: Record<string, EntityTypeConfig> = {
        part: { id: 'part', name: 'Part', extends: 'trellis.auditable', properties: [] },
      };

      const errors = validateInheritance(entities);

      expect(errors).toHaveLength(0);
    });

    it('should detect circular inheritance', () => {
      const entities: Record<string, EntityTypeConfig> = {
        a: { id: 'a', name: 'A', extends: 'b', properties: [] },
        b: { id: 'b', name: 'B', extends: 'a', properties: [] },
      };

      const errors = validateInheritance(entities);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('Circular'))).toBe(true);
    });
  });
});
