/**
 * Entity API Schema Tests
 *
 * Tests for entity API request/response validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  createEntityBodySchema,
  updateEntityBodySchema,
  entityParamsSchema,
  getEntityQuerySchema,
  deleteEntityQuerySchema,
  propertyInputSchema,
} from '../../../src/routes/entities/schemas.js';

// =============================================================================
// PROPERTY INPUT SCHEMA TESTS
// =============================================================================

describe('propertyInputSchema', () => {
  describe('literal properties', () => {
    it('accepts valid text literal', () => {
      const input = {
        source: 'literal',
        value: { type: 'text', value: 'hello' },
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts valid number literal', () => {
      const input = {
        source: 'literal',
        value: { type: 'number', value: 42, unit: 'USD' },
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts valid boolean literal', () => {
      const input = {
        source: 'literal',
        value: { type: 'boolean', value: true },
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts valid datetime literal', () => {
      const input = {
        source: 'literal',
        value: { type: 'datetime', value: '2024-01-15T10:30:00Z' },
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts valid reference literal', () => {
      const input = {
        source: 'literal',
        value: {
          type: 'reference',
          entity_id: '123e4567-e89b-12d3-a456-426614174000',
        },
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('inherited properties', () => {
    it('accepts valid inherited property', () => {
      const input = {
        source: 'inherited',
        from_entity: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts inherited with from_property', () => {
      const input = {
        source: 'inherited',
        from_entity: '123e4567-e89b-12d3-a456-426614174000',
        from_property: 'price',
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts inherited with override', () => {
      const input = {
        source: 'inherited',
        from_entity: '123e4567-e89b-12d3-a456-426614174000',
        override: { type: 'number', value: 100 },
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID for from_entity', () => {
      const input = {
        source: 'inherited',
        from_entity: 'not-a-uuid',
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('computed properties', () => {
    it('accepts valid computed property', () => {
      const input = {
        source: 'computed',
        expression: '#price * 0.3',
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects empty expression', () => {
      const input = {
        source: 'computed',
        expression: '',
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('measured properties', () => {
    it('accepts valid measured property', () => {
      const input = {
        source: 'measured',
        value: { type: 'number', value: 10.5, unit: 'mm' },
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts measured with uncertainty', () => {
      const input = {
        source: 'measured',
        value: { type: 'number', value: 10.5, unit: 'mm' },
        uncertainty: 0.1,
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts measured with measured_at', () => {
      const input = {
        source: 'measured',
        value: { type: 'number', value: 10.5, unit: 'mm' },
        measured_at: '2024-01-15T10:30:00Z',
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects negative uncertainty', () => {
      const input = {
        source: 'measured',
        value: { type: 'number', value: 10.5, unit: 'mm' },
        uncertainty: -0.1,
      };
      const result = propertyInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// CREATE ENTITY SCHEMA TESTS
// =============================================================================

describe('createEntityBodySchema', () => {
  it('accepts valid create entity request', () => {
    const input = {
      type: 'product',
      properties: {
        name: { source: 'literal', value: { type: 'text', value: 'Widget' } },
        price: { source: 'literal', value: { type: 'number', value: 99.99 } },
      },
    };
    const result = createEntityBodySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts with empty properties', () => {
    const input = {
      type: 'product',
      properties: {},
    };
    const result = createEntityBodySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects empty type', () => {
    const input = {
      type: '',
      properties: {},
    };
    const result = createEntityBodySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing type', () => {
    const input = {
      properties: {},
    };
    const result = createEntityBodySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing properties', () => {
    const input = {
      type: 'product',
    };
    const result = createEntityBodySchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// UPDATE ENTITY SCHEMA TESTS
// =============================================================================

describe('updateEntityBodySchema', () => {
  it('accepts valid update with set_properties', () => {
    const input = {
      expected_version: 1,
      set_properties: {
        name: { source: 'literal', value: { type: 'text', value: 'Updated' } },
      },
    };
    const result = updateEntityBodySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts valid update with remove_properties', () => {
    const input = {
      expected_version: 1,
      remove_properties: ['deprecated_field'],
    };
    const result = updateEntityBodySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts update with both set and remove', () => {
    const input = {
      expected_version: 2,
      set_properties: {
        name: { source: 'literal', value: { type: 'text', value: 'New' } },
      },
      remove_properties: ['old_field'],
    };
    const result = updateEntityBodySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects missing expected_version', () => {
    const input = {
      set_properties: {
        name: { source: 'literal', value: { type: 'text', value: 'Updated' } },
      },
    };
    const result = updateEntityBodySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects zero expected_version', () => {
    const input = {
      expected_version: 0,
      set_properties: {},
    };
    const result = updateEntityBodySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects negative expected_version', () => {
    const input = {
      expected_version: -1,
      set_properties: {},
    };
    const result = updateEntityBodySchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// ENTITY PARAMS SCHEMA TESTS
// =============================================================================

describe('entityParamsSchema', () => {
  it('accepts valid UUID', () => {
    const input = { id: '123e4567-e89b-12d3-a456-426614174000' };
    const result = entityParamsSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const input = { id: 'not-a-uuid' };
    const result = entityParamsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const input = {};
    const result = entityParamsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// GET ENTITY QUERY SCHEMA TESTS
// =============================================================================

describe('getEntityQuerySchema', () => {
  it('accepts empty query', () => {
    const input = {};
    const result = getEntityQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.resolve_inherited).toBe(false);
      expect(result.data.evaluate_computed).toBe(false);
    }
  });

  it('parses resolve_inherited=true', () => {
    const input = { resolve_inherited: 'true' };
    const result = getEntityQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.resolve_inherited).toBe(true);
    }
  });

  it('parses resolve_inherited=false', () => {
    const input = { resolve_inherited: 'false' };
    const result = getEntityQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.resolve_inherited).toBe(false);
    }
  });

  it('parses evaluate_computed=true', () => {
    const input = { evaluate_computed: 'true' };
    const result = getEntityQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.evaluate_computed).toBe(true);
    }
  });
});

// =============================================================================
// DELETE ENTITY QUERY SCHEMA TESTS
// =============================================================================

describe('deleteEntityQuerySchema', () => {
  it('defaults hard_delete to false', () => {
    const input = {};
    const result = deleteEntityQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hard_delete).toBe(false);
    }
  });

  it('parses hard_delete=true', () => {
    const input = { hard_delete: 'true' };
    const result = deleteEntityQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hard_delete).toBe(true);
    }
  });

  it('parses hard_delete=false', () => {
    const input = { hard_delete: 'false' };
    const result = deleteEntityQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hard_delete).toBe(false);
    }
  });
});
