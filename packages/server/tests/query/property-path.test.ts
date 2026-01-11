/**
 * Property Path Translation Tests
 *
 * Tests for translating API property paths to PostgreSQL JSONB accessors.
 */

import { describe, it, expect } from 'vitest';
import {
  propertyPathToSQL,
  propertyExistsSQL,
  validatePropertyPath,
  inferSQLValueType,
} from '../../src/query/property-path.js';

describe('validatePropertyPath', () => {
  it('accepts simple property name', () => {
    expect(validatePropertyPath('name')).toBe(true);
  });

  it('accepts property with underscores', () => {
    expect(validatePropertyPath('unit_price')).toBe(true);
  });

  it('accepts property starting with underscore', () => {
    expect(validatePropertyPath('_internal')).toBe(true);
  });

  it('accepts nested property path', () => {
    expect(validatePropertyPath('metadata.category')).toBe(true);
  });

  it('accepts deeply nested path', () => {
    expect(validatePropertyPath('metadata.tags.first')).toBe(true);
  });

  it('accepts alphanumeric with numbers', () => {
    expect(validatePropertyPath('field1')).toBe(true);
    expect(validatePropertyPath('item2.subfield3')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validatePropertyPath('')).toBe(false);
  });

  it('rejects path starting with number', () => {
    expect(validatePropertyPath('1field')).toBe(false);
  });

  it('rejects path with special characters', () => {
    expect(validatePropertyPath('field-name')).toBe(false);
    expect(validatePropertyPath('field@name')).toBe(false);
    expect(validatePropertyPath("field'name")).toBe(false);
  });

  it('rejects path with spaces', () => {
    expect(validatePropertyPath('field name')).toBe(false);
  });

  it('rejects path with consecutive dots', () => {
    expect(validatePropertyPath('field..name')).toBe(false);
  });

  it('rejects path starting with dot', () => {
    expect(validatePropertyPath('.field')).toBe(false);
  });

  it('rejects path ending with dot', () => {
    expect(validatePropertyPath('field.')).toBe(false);
  });
});

describe('propertyPathToSQL', () => {
  describe('simple property access', () => {
    it('generates correct SQL for text value', () => {
      const sql = propertyPathToSQL('name', 'text');
      expect(sql).toBe("properties->'name'->'value'->>'value'");
    });

    it('generates correct SQL for numeric value', () => {
      const sql = propertyPathToSQL('price', 'numeric');
      expect(sql).toBe("(properties->'price'->'value'->>'value')::numeric");
    });

    it('generates correct SQL for boolean value', () => {
      const sql = propertyPathToSQL('active', 'boolean');
      expect(sql).toBe("(properties->'active'->'value'->>'value')::boolean");
    });

    it('generates correct SQL for jsonb value', () => {
      const sql = propertyPathToSQL('tags', 'jsonb');
      expect(sql).toBe("properties->'tags'->'value'->'value'");
    });

    it('defaults to text type', () => {
      const sql = propertyPathToSQL('name');
      expect(sql).toBe("properties->'name'->'value'->>'value'");
    });
  });

  describe('nested property access', () => {
    it('handles single level nesting', () => {
      const sql = propertyPathToSQL('metadata.category', 'text');
      expect(sql).toBe("properties->'metadata'->'value'->'category'->>'value'");
    });

    it('handles multiple levels of nesting', () => {
      const sql = propertyPathToSQL('metadata.tags.primary', 'text');
      expect(sql).toBe("properties->'metadata'->'value'->'tags'->'primary'->>'value'");
    });

    it('handles nested numeric access', () => {
      const sql = propertyPathToSQL('dimensions.width', 'numeric');
      expect(sql).toBe("(properties->'dimensions'->'value'->'width'->>'value')::numeric");
    });
  });

  describe('SQL injection prevention', () => {
    it('escapes single quotes in property names', () => {
      // This should throw because the path is invalid
      expect(() => propertyPathToSQL("name'; DROP TABLE--", 'text')).toThrow(
        'Invalid property path'
      );
    });

    it('throws on invalid path', () => {
      expect(() => propertyPathToSQL('')).toThrow('Invalid property path');
      expect(() => propertyPathToSQL('1invalid')).toThrow('Invalid property path');
      expect(() => propertyPathToSQL('field-name')).toThrow('Invalid property path');
    });
  });
});

describe('propertyExistsSQL', () => {
  it('generates correct SQL for simple property', () => {
    const sql = propertyExistsSQL('name');
    expect(sql).toBe("properties ? 'name'");
  });

  it('uses top-level property for nested path', () => {
    const sql = propertyExistsSQL('metadata.category');
    expect(sql).toBe("properties ? 'metadata'");
  });

  it('throws on invalid property name', () => {
    expect(() => propertyExistsSQL('')).toThrow('Invalid property name');
    expect(() => propertyExistsSQL('1invalid')).toThrow('Invalid property name');
  });
});

describe('inferSQLValueType', () => {
  it('returns numeric for numbers', () => {
    expect(inferSQLValueType(42)).toBe('numeric');
    expect(inferSQLValueType(3.14)).toBe('numeric');
    expect(inferSQLValueType(-100)).toBe('numeric');
  });

  it('returns boolean for booleans', () => {
    expect(inferSQLValueType(true)).toBe('boolean');
    expect(inferSQLValueType(false)).toBe('boolean');
  });

  it('returns jsonb for arrays', () => {
    expect(inferSQLValueType([])).toBe('jsonb');
    expect(inferSQLValueType([1, 2, 3])).toBe('jsonb');
    expect(inferSQLValueType(['a', 'b'])).toBe('jsonb');
  });

  it('returns text for strings', () => {
    expect(inferSQLValueType('hello')).toBe('text');
    expect(inferSQLValueType('')).toBe('text');
  });

  it('returns text for null and undefined', () => {
    expect(inferSQLValueType(null)).toBe('text');
    expect(inferSQLValueType(undefined)).toBe('text');
  });

  it('returns text for objects', () => {
    expect(inferSQLValueType({})).toBe('text');
    expect(inferSQLValueType({ key: 'value' })).toBe('text');
  });
});
