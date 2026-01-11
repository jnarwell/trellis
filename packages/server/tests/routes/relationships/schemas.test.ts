/**
 * Relationship API Schema Tests
 *
 * Tests for relationship API request/response validation schemas.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { FormatRegistry } from '@sinclair/typebox';
import {
  CreateRelationshipBody,
  RelationshipIdParams,
  EntityIdParams,
  ListRelationshipsQuery,
  RelationshipResponse,
  ListRelationshipsResponse,
} from '../../../src/routes/relationships/schemas.js';

// =============================================================================
// SETUP - Register UUID format for TypeBox validation
// =============================================================================

beforeAll(() => {
  // Register UUID format validator (TypeBox doesn't validate formats by default)
  FormatRegistry.Set(
    'uuid',
    (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
});

// =============================================================================
// CREATE RELATIONSHIP BODY TESTS
// =============================================================================

describe('CreateRelationshipBody', () => {
  it('accepts valid create relationship request', () => {
    const input = {
      type: 'parent_of',
      from_entity: '123e4567-e89b-12d3-a456-426614174000',
      to_entity: '123e4567-e89b-12d3-a456-426614174001',
    };
    const isValid = Value.Check(CreateRelationshipBody, input);
    expect(isValid).toBe(true);
  });

  it('accepts with optional path', () => {
    const input = {
      type: 'parent_of',
      from_entity: '123e4567-e89b-12d3-a456-426614174000',
      to_entity: '123e4567-e89b-12d3-a456-426614174001',
      path: 'root.child',
    };
    const isValid = Value.Check(CreateRelationshipBody, input);
    expect(isValid).toBe(true);
  });

  it('accepts with optional metadata', () => {
    const input = {
      type: 'parent_of',
      from_entity: '123e4567-e89b-12d3-a456-426614174000',
      to_entity: '123e4567-e89b-12d3-a456-426614174001',
      metadata: {
        position: { type: 'number', value: 1 },
      },
    };
    const isValid = Value.Check(CreateRelationshipBody, input);
    expect(isValid).toBe(true);
  });

  it('rejects missing type', () => {
    const input = {
      from_entity: '123e4567-e89b-12d3-a456-426614174000',
      to_entity: '123e4567-e89b-12d3-a456-426614174001',
    };
    const isValid = Value.Check(CreateRelationshipBody, input);
    expect(isValid).toBe(false);
  });

  it('rejects empty type', () => {
    const input = {
      type: '',
      from_entity: '123e4567-e89b-12d3-a456-426614174000',
      to_entity: '123e4567-e89b-12d3-a456-426614174001',
    };
    const isValid = Value.Check(CreateRelationshipBody, input);
    expect(isValid).toBe(false);
  });

  it('rejects missing from_entity', () => {
    const input = {
      type: 'parent_of',
      to_entity: '123e4567-e89b-12d3-a456-426614174001',
    };
    const isValid = Value.Check(CreateRelationshipBody, input);
    expect(isValid).toBe(false);
  });

  it('rejects missing to_entity', () => {
    const input = {
      type: 'parent_of',
      from_entity: '123e4567-e89b-12d3-a456-426614174000',
    };
    const isValid = Value.Check(CreateRelationshipBody, input);
    expect(isValid).toBe(false);
  });

  it('rejects invalid UUID for from_entity', () => {
    const input = {
      type: 'parent_of',
      from_entity: 'not-a-uuid',
      to_entity: '123e4567-e89b-12d3-a456-426614174001',
    };
    const isValid = Value.Check(CreateRelationshipBody, input);
    expect(isValid).toBe(false);
  });

  it('rejects invalid UUID for to_entity', () => {
    const input = {
      type: 'parent_of',
      from_entity: '123e4567-e89b-12d3-a456-426614174000',
      to_entity: 'not-a-uuid',
    };
    const isValid = Value.Check(CreateRelationshipBody, input);
    expect(isValid).toBe(false);
  });
});


// =============================================================================
// RELATIONSHIP ID PARAMS TESTS
// =============================================================================

describe('RelationshipIdParams', () => {
  it('accepts valid UUID', () => {
    const input = { id: '123e4567-e89b-12d3-a456-426614174000' };
    const isValid = Value.Check(RelationshipIdParams, input);
    expect(isValid).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const input = { id: 'not-a-uuid' };
    const isValid = Value.Check(RelationshipIdParams, input);
    expect(isValid).toBe(false);
  });

  it('rejects missing id', () => {
    const input = {};
    const isValid = Value.Check(RelationshipIdParams, input);
    expect(isValid).toBe(false);
  });
});

// =============================================================================
// ENTITY ID PARAMS TESTS
// =============================================================================

describe('EntityIdParams', () => {
  it('accepts valid UUID', () => {
    const input = { id: '123e4567-e89b-12d3-a456-426614174000' };
    const isValid = Value.Check(EntityIdParams, input);
    expect(isValid).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const input = { id: 'not-a-uuid' };
    const isValid = Value.Check(EntityIdParams, input);
    expect(isValid).toBe(false);
  });

  it('rejects missing id', () => {
    const input = {};
    const isValid = Value.Check(EntityIdParams, input);
    expect(isValid).toBe(false);
  });
});

// =============================================================================
// LIST RELATIONSHIPS QUERY TESTS
// =============================================================================

describe('ListRelationshipsQuery', () => {
  it('accepts empty query', () => {
    const input = {};
    const isValid = Value.Check(ListRelationshipsQuery, input);
    expect(isValid).toBe(true);
  });

  it('accepts with type filter', () => {
    const input = { type: 'parent_of' };
    const isValid = Value.Check(ListRelationshipsQuery, input);
    expect(isValid).toBe(true);
  });

  it('accepts direction=outgoing', () => {
    const input = { direction: 'outgoing' };
    const isValid = Value.Check(ListRelationshipsQuery, input);
    expect(isValid).toBe(true);
  });

  it('accepts direction=incoming', () => {
    const input = { direction: 'incoming' };
    const isValid = Value.Check(ListRelationshipsQuery, input);
    expect(isValid).toBe(true);
  });

  it('accepts direction=both', () => {
    const input = { direction: 'both' };
    const isValid = Value.Check(ListRelationshipsQuery, input);
    expect(isValid).toBe(true);
  });

  it('rejects invalid direction', () => {
    const input = { direction: 'invalid' };
    const isValid = Value.Check(ListRelationshipsQuery, input);
    expect(isValid).toBe(false);
  });

  it('accepts include_entities flag', () => {
    const input = { include_entities: true };
    const isValid = Value.Check(ListRelationshipsQuery, input);
    expect(isValid).toBe(true);
  });

  it('accepts all query params combined', () => {
    const input = {
      type: 'parent_of',
      direction: 'outgoing',
      include_entities: true,
    };
    const isValid = Value.Check(ListRelationshipsQuery, input);
    expect(isValid).toBe(true);
  });
});

// =============================================================================
// RELATIONSHIP RESPONSE TESTS
// =============================================================================

describe('RelationshipResponse', () => {
  it('validates complete relationship response', () => {
    const input = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      tenant_id: '123e4567-e89b-12d3-a456-426614174001',
      type: 'parent_of',
      from_entity: '123e4567-e89b-12d3-a456-426614174002',
      to_entity: '123e4567-e89b-12d3-a456-426614174003',
      created_at: '2024-01-15T10:30:00Z',
      created_by: '123e4567-e89b-12d3-a456-426614174004',
    };
    const isValid = Value.Check(RelationshipResponse, input);
    expect(isValid).toBe(true);
  });

  it('validates response with optional metadata', () => {
    const input = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      tenant_id: '123e4567-e89b-12d3-a456-426614174001',
      type: 'parent_of',
      from_entity: '123e4567-e89b-12d3-a456-426614174002',
      to_entity: '123e4567-e89b-12d3-a456-426614174003',
      metadata: { position: { type: 'number', value: 1 } },
      created_at: '2024-01-15T10:30:00Z',
      created_by: '123e4567-e89b-12d3-a456-426614174004',
    };
    const isValid = Value.Check(RelationshipResponse, input);
    expect(isValid).toBe(true);
  });

  it('validates response with optional path', () => {
    const input = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      tenant_id: '123e4567-e89b-12d3-a456-426614174001',
      type: 'parent_of',
      from_entity: '123e4567-e89b-12d3-a456-426614174002',
      to_entity: '123e4567-e89b-12d3-a456-426614174003',
      path: 'root.child',
      created_at: '2024-01-15T10:30:00Z',
      created_by: '123e4567-e89b-12d3-a456-426614174004',
    };
    const isValid = Value.Check(RelationshipResponse, input);
    expect(isValid).toBe(true);
  });
});

// =============================================================================
// LIST RELATIONSHIPS RESPONSE TESTS
// =============================================================================

describe('ListRelationshipsResponse', () => {
  it('validates empty relationships array', () => {
    const input = { relationships: [] };
    const isValid = Value.Check(ListRelationshipsResponse, input);
    expect(isValid).toBe(true);
  });

  it('validates array with relationships', () => {
    const input = {
      relationships: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          tenant_id: '123e4567-e89b-12d3-a456-426614174001',
          type: 'parent_of',
          from_entity: '123e4567-e89b-12d3-a456-426614174002',
          to_entity: '123e4567-e89b-12d3-a456-426614174003',
          created_at: '2024-01-15T10:30:00Z',
          created_by: '123e4567-e89b-12d3-a456-426614174004',
        },
      ],
    };
    const isValid = Value.Check(ListRelationshipsResponse, input);
    expect(isValid).toBe(true);
  });
});
