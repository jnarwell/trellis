/**
 * Trellis E2E Tests - Relationships
 *
 * Tests for relationship operations: create, list, delete, and constraints.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  TestHarness,
  TestClient,
  fixtures,
  assertCreated,
  assertOk,
  assertNotFound,
  assertNoContent,
  assertBadRequest,
  assertRelationshipCreated,
  assertRelationshipConnects,
  type EntityResponse,
  type RelationshipResponse,
} from '../harness/index.js';
import type { KernelError, Entity } from '@trellis/kernel';

describe('Relationships', () => {
  let harness: TestHarness;
  let client: TestClient;

  // Pre-created entities for relationship tests
  let category: Entity;
  let product1: Entity;
  let product2: Entity;
  let assembly: Entity;
  let part1: Entity;
  let part2: Entity;

  beforeAll(async () => {
    harness = new TestHarness();
    await harness.setup();
  });

  beforeEach(async () => {
    await harness.reset();
    client = harness.client();

    // Create test entities for relationships
    const categoryRes = await client.post<EntityResponse>(
      '/entities',
      fixtures.category({ name: 'Electronics' })
    );
    category = assertCreated(categoryRes).entity;

    const product1Res = await client.post<EntityResponse>(
      '/entities',
      fixtures.product({ name: 'Phone', sku: 'PHN-001', price: 999 })
    );
    product1 = assertCreated(product1Res).entity;

    const product2Res = await client.post<EntityResponse>(
      '/entities',
      fixtures.product({ name: 'Tablet', sku: 'TBL-001', price: 599 })
    );
    product2 = assertCreated(product2Res).entity;

    const assemblyRes = await client.post<EntityResponse>(
      '/entities',
      fixtures.assembly({ name: 'Main Assembly' })
    );
    assembly = assertCreated(assemblyRes).entity;

    const part1Res = await client.post<EntityResponse>(
      '/entities',
      fixtures.part({ name: 'CPU', partNumber: 'CPU-001' })
    );
    part1 = assertCreated(part1Res).entity;

    const part2Res = await client.post<EntityResponse>(
      '/entities',
      fixtures.part({ name: 'RAM', partNumber: 'RAM-001' })
    );
    part2 = assertCreated(part2Res).entity;
  });

  afterAll(async () => {
    await harness.teardown();
  });

  // ===========================================================================
  // CREATE RELATIONSHIP
  // ===========================================================================

  describe('POST /relationships - Create Relationship', () => {
    it('should create a relationship between entities', async () => {
      const request = fixtures.relationship('belongs_to', product1.id, category.id);

      const response = await client.post<RelationshipResponse>(
        '/relationships',
        request
      );

      const relationship = assertRelationshipCreated(response);
      assertRelationshipConnects(relationship, product1.id, category.id);
      expect(relationship.type).toBe('belongs_to');
    });

    it('should create a relationship with metadata', async () => {
      const request = fixtures.relationship(
        'related_to',
        product1.id,
        product2.id,
        { position: { type: 'number', value: 1 } }
      );

      const response = await client.post<RelationshipResponse>(
        '/relationships',
        request
      );

      const relationship = assertRelationshipCreated(response);
      expect(relationship.metadata).toBeDefined();
    });

    it('should create bidirectional relationships', async () => {
      // Create parent_of relationship (bidirectional with child_of)
      const request = fixtures.relationship('parent_of', assembly.id, part1.id);

      const response = await client.post<RelationshipResponse>(
        '/relationships',
        request
      );

      const relationship = assertRelationshipCreated(response);
      expect(relationship.type).toBe('parent_of');

      // Verify inverse relationship was created by listing relationships
      const listResponse = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: part1.id, direction: 'outgoing' } }
      );

      assertOk(listResponse);
      const inverseRel = listResponse.body.relationships.find(
        (r) => r.type === 'child_of' && r.to_entity === assembly.id
      );
      expect(inverseRel).toBeDefined();
    });

    it('should reject relationship with non-existent source entity', async () => {
      const fakeId = '019fffff-dead-beef-cafe-000000000000';
      const request = fixtures.relationship('belongs_to', fakeId, category.id);

      const response = await client.post<KernelError>('/relationships', request);

      assertNotFound(response);
      expect(response.body.details).toHaveProperty('field', 'from_entity');
    });

    it('should reject relationship with non-existent target entity', async () => {
      const fakeId = '019fffff-dead-beef-cafe-000000000000';
      const request = fixtures.relationship('belongs_to', product1.id, fakeId);

      const response = await client.post<KernelError>('/relationships', request);

      assertNotFound(response);
      expect(response.body.details).toHaveProperty('field', 'to_entity');
    });

    it('should reject unknown relationship type', async () => {
      const request = fixtures.relationship(
        'unknown_type',
        product1.id,
        category.id
      );

      const response = await client.post<KernelError>('/relationships', request);

      assertNotFound(response);
      expect(response.body.details).toHaveProperty('relationship_type', 'unknown_type');
    });

    it('should reject self-referencing relationship', async () => {
      const request = fixtures.relationship('related_to', product1.id, product1.id);

      const response = await client.post<KernelError>('/relationships', request);

      // This should be rejected by DB constraint
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ===========================================================================
  // LIST RELATIONSHIPS
  // ===========================================================================

  describe('GET /relationships - List Relationships', () => {
    beforeEach(async () => {
      // Create some relationships for listing tests
      await client.post('/relationships', fixtures.relationship('belongs_to', product1.id, category.id));
      await client.post('/relationships', fixtures.relationship('belongs_to', product2.id, category.id));
      await client.post('/relationships', fixtures.relationship('parent_of', assembly.id, part1.id));
      await client.post('/relationships', fixtures.relationship('parent_of', assembly.id, part2.id));
    });

    it('should list all relationships for an entity', async () => {
      const response = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: category.id } }
      );

      assertOk(response);
      expect(response.body.relationships.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter relationships by type', async () => {
      const response = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: assembly.id, type: 'parent_of' } }
      );

      assertOk(response);
      expect(response.body.relationships).toHaveLength(2);
      response.body.relationships.forEach((r) => {
        expect(r.type).toBe('parent_of');
      });
    });

    it('should filter relationships by direction (outgoing)', async () => {
      const response = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: assembly.id, direction: 'outgoing' } }
      );

      assertOk(response);
      response.body.relationships.forEach((r) => {
        expect(r.from_entity).toBe(assembly.id);
      });
    });

    it('should filter relationships by direction (incoming)', async () => {
      const response = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: category.id, direction: 'incoming' } }
      );

      assertOk(response);
      response.body.relationships.forEach((r) => {
        expect(r.to_entity).toBe(category.id);
      });
    });

    it('should return 404 for non-existent entity', async () => {
      const fakeId = '019fffff-dead-beef-cafe-000000000000';

      const response = await client.get<KernelError>('/relationships', {
        query: { entity_id: fakeId },
      });

      assertNotFound(response);
    });
  });

  // ===========================================================================
  // DELETE RELATIONSHIP
  // ===========================================================================

  describe('DELETE /relationships/:id - Delete Relationship', () => {
    it('should delete a relationship', async () => {
      // Create relationship
      const createResponse = await client.post<RelationshipResponse>(
        '/relationships',
        fixtures.relationship('related_to', product1.id, product2.id)
      );
      const created = assertRelationshipCreated(createResponse);

      // Delete relationship
      const deleteResponse = await client.delete(`/relationships/${created.id}`);

      assertNoContent(deleteResponse);

      // Verify relationship is gone
      const listResponse = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: product1.id, type: 'related_to' } }
      );
      assertOk(listResponse);
      expect(listResponse.body.relationships).toHaveLength(0);
    });

    it('should delete bidirectional relationships together', async () => {
      // Create bidirectional relationship
      const createResponse = await client.post<RelationshipResponse>(
        '/relationships',
        fixtures.relationship('parent_of', assembly.id, part1.id)
      );
      const created = assertRelationshipCreated(createResponse);

      // Delete relationship
      await client.delete(`/relationships/${created.id}`);

      // Verify both directions are gone
      const outgoingResponse = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: assembly.id, type: 'parent_of' } }
      );
      assertOk(outgoingResponse);
      expect(
        outgoingResponse.body.relationships.filter(
          (r) => r.to_entity === part1.id
        )
      ).toHaveLength(0);

      const incomingResponse = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: part1.id, type: 'child_of' } }
      );
      assertOk(incomingResponse);
      expect(
        incomingResponse.body.relationships.filter(
          (r) => r.to_entity === assembly.id
        )
      ).toHaveLength(0);
    });

    it('should return 404 for non-existent relationship', async () => {
      const fakeId = '019fffff-dead-beef-cafe-000000000000';

      const response = await client.delete<KernelError>(`/relationships/${fakeId}`);

      assertNotFound(response);
    });
  });

  // ===========================================================================
  // RELATIONSHIP CONSTRAINTS
  // ===========================================================================

  describe('Relationship Constraints', () => {
    it('should prevent duplicate relationships', async () => {
      // Create first relationship
      await client.post('/relationships', fixtures.relationship('related_to', product1.id, product2.id));

      // Try to create duplicate
      const response = await client.post<KernelError>(
        '/relationships',
        fixtures.relationship('related_to', product1.id, product2.id)
      );

      // Should fail due to unique constraint
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should enforce many_to_one cardinality (belongs_to)', async () => {
      // First belongs_to should succeed
      await client.post('/relationships', fixtures.relationship('belongs_to', product1.id, category.id));

      // Create another category
      const category2Res = await client.post<EntityResponse>(
        '/entities',
        fixtures.category({ name: 'Accessories' })
      );
      const category2 = assertCreated(category2Res).entity;

      // Second belongs_to for same product should fail (many_to_one constraint)
      const response = await client.post<KernelError>(
        '/relationships',
        fixtures.relationship('belongs_to', product1.id, category2.id)
      );

      assertBadRequest(response, 'VALIDATION_ERROR');
      expect(response.body.details).toHaveProperty('cardinality', 'many_to_one');
    });
  });

  // ===========================================================================
  // RELATIONSHIP LIFECYCLE
  // ===========================================================================

  describe('Full Relationship Lifecycle', () => {
    it('should complete create → list → delete lifecycle', async () => {
      // 1. CREATE
      const createResponse = await client.post<RelationshipResponse>(
        '/relationships',
        fixtures.relationship('parent_of', assembly.id, part1.id)
      );
      const created = assertRelationshipCreated(createResponse);

      // 2. LIST - verify it exists
      const listResponse = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: assembly.id, type: 'parent_of' } }
      );
      assertOk(listResponse);
      expect(listResponse.body.relationships).toHaveLength(1);
      expect(listResponse.body.relationships[0]?.id).toBe(created.id);

      // 3. DELETE
      const deleteResponse = await client.delete(`/relationships/${created.id}`);
      assertNoContent(deleteResponse);

      // 4. VERIFY DELETED
      const verifyResponse = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: assembly.id, type: 'parent_of' } }
      );
      assertOk(verifyResponse);
      expect(verifyResponse.body.relationships).toHaveLength(0);
    });

    it('should handle complex relationship graph', async () => {
      // Create a hierarchy: assembly -> multiple parts
      await client.post('/relationships', fixtures.relationship('parent_of', assembly.id, part1.id));
      await client.post('/relationships', fixtures.relationship('parent_of', assembly.id, part2.id));

      // Create product -> category relationships
      await client.post('/relationships', fixtures.relationship('belongs_to', product1.id, category.id));
      await client.post('/relationships', fixtures.relationship('belongs_to', product2.id, category.id));

      // Create product -> product relationship
      await client.post('/relationships', fixtures.relationship('related_to', product1.id, product2.id));

      // Verify assembly has 2 children
      const assemblyRels = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: assembly.id, type: 'parent_of', direction: 'outgoing' } }
      );
      assertOk(assemblyRels);
      expect(assemblyRels.body.relationships).toHaveLength(2);

      // Verify category has 2 incoming belongs_to
      const categoryRels = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: category.id, type: 'has_many', direction: 'outgoing' } }
      );
      assertOk(categoryRels);
      expect(categoryRels.body.relationships).toHaveLength(2);

      // Verify product1 has multiple relationships
      const product1Rels = await client.get<{ relationships: RelationshipResponse[] }>(
        '/relationships',
        { query: { entity_id: product1.id } }
      );
      assertOk(product1Rels);
      expect(product1Rels.body.relationships.length).toBeGreaterThanOrEqual(2);
    });
  });
});
