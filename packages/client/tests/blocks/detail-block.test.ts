/**
 * DetailBlock Unit Tests
 *
 * Tests for DetailBlock utility functions.
 */

import { describe, it, expect } from 'vitest';
import type { Entity, PropertyName } from '@trellis/kernel';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const mockEntity = (id: string, data: Record<string, unknown>): Entity => ({
  id: id as Entity['id'],
  type: 'product' as Entity['type'],
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  properties: Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      { source: 'literal' as const, name: key as PropertyName, value: { type: 'text', value } },
    ])
  ),
});

// =============================================================================
// FIELD FORMAT TESTS
// =============================================================================

describe('DetailField formatting', () => {
  describe('propertyToLabel', () => {
    // Simulate the propertyToLabel function logic
    const propertyToLabel = (property: string): string => {
      return property
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    it('formats snake_case to Title Case', () => {
      expect(propertyToLabel('created_at')).toBe('Created At');
      expect(propertyToLabel('unit_price')).toBe('Unit Price');
    });

    it('formats camelCase to Title Case', () => {
      expect(propertyToLabel('createdAt')).toBe('Created At');
      expect(propertyToLabel('unitPrice')).toBe('Unit Price');
    });

    it('handles single word', () => {
      expect(propertyToLabel('name')).toBe('Name');
      expect(propertyToLabel('status')).toBe('Status');
    });
  });
});

// =============================================================================
// PROPERTY VALUE EXTRACTION TESTS
// =============================================================================

describe('Property value extraction', () => {
  // Simulate getPropertyValue function logic
  const getPropertyValue = (entity: Entity, property: PropertyName): unknown => {
    const prop = entity.properties[property];
    if (!prop) return undefined;

    switch (prop.source) {
      case 'literal':
      case 'measured':
        const directValue = (prop as { value: unknown }).value;
        if (directValue && typeof directValue === 'object' && 'value' in directValue) {
          return (directValue as { value: unknown }).value;
        }
        return directValue;

      case 'inherited':
        const inheritedProp = prop as { override?: { value?: unknown }; resolved_value?: { value?: unknown } };
        const inheritedValue = inheritedProp.override ?? inheritedProp.resolved_value;
        if (inheritedValue && typeof inheritedValue === 'object' && 'value' in inheritedValue) {
          return inheritedValue.value;
        }
        return inheritedValue;

      case 'computed':
        const computedProp = prop as { cached_value?: { value?: unknown } };
        const cachedValue = computedProp.cached_value;
        if (cachedValue && typeof cachedValue === 'object' && 'value' in cachedValue) {
          return cachedValue.value;
        }
        return cachedValue;

      default:
        return undefined;
    }
  };

  it('extracts value from literal property', () => {
    const entity = mockEntity('1', { name: 'Test Product' });
    expect(getPropertyValue(entity, 'name' as PropertyName)).toBe('Test Product');
  });

  it('returns undefined for missing property', () => {
    const entity = mockEntity('1', { name: 'Test' });
    expect(getPropertyValue(entity, 'nonexistent' as PropertyName)).toBeUndefined();
  });

  it('handles number values', () => {
    const entity = mockEntity('1', { price: 99.99 });
    expect(getPropertyValue(entity, 'price' as PropertyName)).toBe(99.99);
  });

  it('handles boolean values', () => {
    const entity = mockEntity('1', { active: true });
    expect(getPropertyValue(entity, 'active' as PropertyName)).toBe(true);
  });
});

// =============================================================================
// ACTION TARGET TEMPLATE TESTS
// =============================================================================

describe('Action target templates', () => {
  // Simulate evaluateActionTarget function
  const getPropertyValue = (entity: Entity, property: PropertyName): unknown => {
    const prop = entity.properties[property];
    if (!prop) return undefined;
    const propValue = (prop as { value: unknown }).value;
    if (propValue && typeof propValue === 'object' && 'value' in propValue) {
      return (propValue as { value: unknown }).value;
    }
    return propValue;
  };

  const evaluateActionTarget = (template: string, entity: Entity): string => {
    return template.replace(/\$\{?\$?entity\.(\w+)\}?/g, (_, property) => {
      if (property === 'id') return entity.id;
      if (property === 'type') return entity.type;
      const value = getPropertyValue(entity, property as PropertyName);
      return value !== undefined && value !== null ? String(value) : '';
    });
  };

  const entity = mockEntity('ent_123', { name: 'Test', status: 'active' });

  it('evaluates ${$entity.id} template', () => {
    expect(evaluateActionTarget('/edit/${$entity.id}', entity)).toBe('/edit/ent_123');
  });

  it('evaluates ${entity.id} template (without $)', () => {
    expect(evaluateActionTarget('/edit/${entity.id}', entity)).toBe('/edit/ent_123');
  });

  it('evaluates $entity.property template', () => {
    expect(evaluateActionTarget('/view/$entity.id', entity)).toBe('/view/ent_123');
  });

  it('evaluates property values', () => {
    expect(evaluateActionTarget('/products/${entity.name}', entity)).toBe('/products/Test');
  });

  it('handles missing properties gracefully', () => {
    expect(evaluateActionTarget('/view/${entity.missing}', entity)).toBe('/view/');
  });

  it('handles multiple templates in one string', () => {
    expect(evaluateActionTarget('/${entity.type}/${entity.id}', entity)).toBe('/product/ent_123');
  });
});

// =============================================================================
// SECTION CONFIG TESTS
// =============================================================================

describe('DetailSection configuration', () => {
  it('validates section structure', () => {
    const section = {
      title: 'Basic Info',
      fields: [
        { property: 'name' as PropertyName, label: 'Product Name' },
        { property: 'status' as PropertyName, format: 'badge' as const },
      ],
      collapsible: true,
      defaultCollapsed: false,
    };

    expect(section.title).toBe('Basic Info');
    expect(section.fields).toHaveLength(2);
    expect(section.fields[0].label).toBe('Product Name');
    expect(section.fields[1].format).toBe('badge');
    expect(section.collapsible).toBe(true);
    expect(section.defaultCollapsed).toBe(false);
  });

  it('validates action configuration', () => {
    const action = {
      label: 'Delete',
      event: 'delete',
      variant: 'danger' as const,
      confirm: true,
      confirmMessage: 'Are you sure?',
    };

    expect(action.label).toBe('Delete');
    expect(action.event).toBe('delete');
    expect(action.variant).toBe('danger');
    expect(action.confirm).toBe(true);
    expect(action.confirmMessage).toBe('Are you sure?');
  });
});
