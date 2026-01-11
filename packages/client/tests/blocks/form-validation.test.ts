/**
 * Trellis FormBlock - Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { validateField, validateForm } from '../../src/blocks/form/validation.js';
import type { FieldConfig } from '../../src/blocks/form/types.js';

describe('validateField', () => {
  describe('required validation', () => {
    const requiredConfig: FieldConfig = {
      property: 'name' as never,
      required: true,
    };

    it('returns error for undefined value', () => {
      expect(validateField(undefined, requiredConfig)).toBe('This field is required');
    });

    it('returns error for null value', () => {
      expect(validateField(null, requiredConfig)).toBe('This field is required');
    });

    it('returns error for empty string', () => {
      expect(validateField('', requiredConfig)).toBe('This field is required');
    });

    it('returns error for empty array', () => {
      expect(validateField([], requiredConfig)).toBe('This field is required');
    });

    it('returns null for valid value', () => {
      expect(validateField('value', requiredConfig)).toBeNull();
    });

    it('returns null for non-required empty value', () => {
      const optionalConfig: FieldConfig = { property: 'name' as never };
      expect(validateField('', optionalConfig)).toBeNull();
    });
  });

  describe('text validation', () => {
    it('validates minimum length', () => {
      const config: FieldConfig = {
        property: 'name' as never,
        type: 'text',
        minLength: 3,
      };
      expect(validateField('ab', config)).toBe('Must be at least 3 characters');
      expect(validateField('abc', config)).toBeNull();
    });

    it('validates maximum length', () => {
      const config: FieldConfig = {
        property: 'name' as never,
        type: 'text',
        maxLength: 5,
      };
      expect(validateField('abcdef', config)).toBe('Must be at most 5 characters');
      expect(validateField('abcde', config)).toBeNull();
    });

    it('validates pattern', () => {
      const config: FieldConfig = {
        property: 'email' as never,
        type: 'text',
        pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
      };
      expect(validateField('invalid', config)).toBe('Invalid format');
      expect(validateField('test@example.com', config)).toBeNull();
    });

    it('returns error for non-string value', () => {
      const config: FieldConfig = {
        property: 'name' as never,
        type: 'text',
      };
      expect(validateField(123, config)).toBe('Must be text');
    });
  });

  describe('number validation', () => {
    it('validates minimum value', () => {
      const config: FieldConfig = {
        property: 'price' as never,
        type: 'number',
        min: 0,
      };
      expect(validateField(-1, config)).toBe('Must be at least 0');
      expect(validateField(0, config)).toBeNull();
    });

    it('validates maximum value', () => {
      const config: FieldConfig = {
        property: 'quantity' as never,
        type: 'number',
        max: 100,
      };
      expect(validateField(101, config)).toBe('Must be at most 100');
      expect(validateField(100, config)).toBeNull();
    });

    it('returns error for non-number value', () => {
      const config: FieldConfig = {
        property: 'price' as never,
        type: 'number',
      };
      expect(validateField('abc', config)).toBe('Must be a number');
    });

    it('parses string numbers', () => {
      const config: FieldConfig = {
        property: 'price' as never,
        type: 'number',
        min: 0,
      };
      expect(validateField('10', config)).toBeNull();
      expect(validateField('-5', config)).toBe('Must be at least 0');
    });
  });

  describe('date validation', () => {
    it('returns error for invalid date', () => {
      const config: FieldConfig = {
        property: 'created_at' as never,
        type: 'date',
      };
      expect(validateField('not-a-date', config)).toBe('Invalid date');
    });

    it('accepts valid ISO date', () => {
      const config: FieldConfig = {
        property: 'created_at' as never,
        type: 'date',
      };
      expect(validateField('2024-01-15', config)).toBeNull();
    });

    it('accepts valid ISO datetime', () => {
      const config: FieldConfig = {
        property: 'created_at' as never,
        type: 'datetime',
      };
      expect(validateField('2024-01-15T10:30:00Z', config)).toBeNull();
    });
  });

  describe('boolean validation', () => {
    it('returns error for non-boolean value', () => {
      const config: FieldConfig = {
        property: 'active' as never,
        type: 'boolean',
      };
      expect(validateField('yes', config)).toBe('Must be true or false');
    });

    it('accepts boolean values', () => {
      const config: FieldConfig = {
        property: 'active' as never,
        type: 'boolean',
      };
      expect(validateField(true, config)).toBeNull();
      expect(validateField(false, config)).toBeNull();
    });
  });

  describe('select validation', () => {
    const config: FieldConfig = {
      property: 'status' as never,
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    };

    it('returns error for invalid selection', () => {
      expect(validateField('unknown', config)).toBe('Invalid selection');
    });

    it('accepts valid selection', () => {
      expect(validateField('active', config)).toBeNull();
      expect(validateField('inactive', config)).toBeNull();
    });
  });

  describe('relation validation', () => {
    it('returns error for non-string value (single)', () => {
      const config: FieldConfig = {
        property: 'category' as never,
        type: 'relation',
        target: 'category' as never,
      };
      expect(validateField(123, config)).toBe('Invalid reference');
    });

    it('accepts string entity ID', () => {
      const config: FieldConfig = {
        property: 'category' as never,
        type: 'relation',
        target: 'category' as never,
      };
      expect(validateField('ent_abc123', config)).toBeNull();
    });

    it('validates multiple selection', () => {
      const config: FieldConfig = {
        property: 'tags' as never,
        type: 'relation',
        target: 'tag' as never,
        multiple: true,
      };
      expect(validateField(['ent_1', 'ent_2'], config)).toBeNull();
      expect(validateField('ent_1', config)).toBe('Must be a list of references');
      expect(validateField([123], config)).toBe('Invalid reference');
    });
  });

  describe('custom validation', () => {
    it('runs custom validate function', () => {
      const config: FieldConfig = {
        property: 'code' as never,
        type: 'text',
        validate: (value) => {
          if (typeof value === 'string' && !value.startsWith('CODE-')) {
            return 'Must start with CODE-';
          }
          return null;
        },
      };
      expect(validateField('ABC', config)).toBe('Must start with CODE-');
      expect(validateField('CODE-123', config)).toBeNull();
    });
  });
});

describe('validateForm', () => {
  const fields: FieldConfig[] = [
    { property: 'name' as never, type: 'text', required: true },
    { property: 'price' as never, type: 'number', min: 0 },
    { property: 'status' as never, type: 'select', options: [{ value: 'active', label: 'Active' }] },
  ];

  it('returns empty object for valid form', () => {
    const values = {
      name: 'Product',
      price: 10,
      status: 'active',
    };
    expect(validateForm(values, fields)).toEqual({});
  });

  it('returns errors for invalid fields', () => {
    const values = {
      name: '',
      price: -5,
      status: 'invalid',
    };
    const errors = validateForm(values, fields);
    expect(errors['name']).toBe('This field is required');
    expect(errors['price']).toBe('Must be at least 0');
    expect(errors['status']).toBe('Invalid selection');
  });

  it('handles missing fields', () => {
    const values = {};
    const errors = validateForm(values, fields);
    expect(errors['name']).toBe('This field is required');
    expect(errors['price']).toBeUndefined();
  });
});
