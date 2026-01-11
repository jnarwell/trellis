/**
 * Trellis E2E Tests - Entity Lifecycle
 *
 * Tests for the complete entity lifecycle: Create → Read → Update → Delete
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  TestHarness,
  TestClient,
  fixtures,
  properties,
  assertEntityCreated,
  assertOk,
  assertNotFound,
  assertNoContent,
  assertConflict,
  assertBadRequest,
  assertUnauthorized,
  assertEntityVersion,
  assertEntityHasProperty,
  assertEntityMissingProperty,
  assertEntityType,
  type EntityResponse,
} from '../harness/index.js';
import type { KernelError } from '@trellis/kernel';

describe('Entity Lifecycle', () => {
  let harness: TestHarness;
  let client: TestClient;

  beforeAll(async () => {
    harness = new TestHarness();
    await harness.setup();
  });

  beforeEach(async () => {
    await harness.reset();
    client = harness.client();
  });

  afterAll(async () => {
    await harness.teardown();
  });

  // ===========================================================================
  // CREATE ENTITY
  // ===========================================================================

  describe('POST /entities - Create Entity', () => {
    it('should create an entity with literal properties', async () => {
      const request = fixtures.product({
        name: 'Widget Pro',
        sku: 'WGT-PRO-001',
        price: 99.99,
      });

      const response = await client.post<EntityResponse>('/entities', request);

      const entity = assertEntityCreated(response);
      expect(entity.id).toBeDefined();
      expect(entity.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      assertEntityType(entity, 'product');
      assertEntityVersion(entity, 1);
      assertEntityHasProperty(entity, 'name', 'Widget Pro');
      assertEntityHasProperty(entity, 'sku', 'WGT-PRO-001');
      assertEntityHasProperty(entity, 'price', 99.99);
    });

    it('should create an entity with empty properties', async () => {
      const request = fixtures.entity('empty_entity', {});

      const response = await client.post<EntityResponse>('/entities', request);

      const entity = assertEntityCreated(response);
      assertEntityType(entity, 'empty_entity');
      expect(Object.keys(entity.properties)).toHaveLength(0);
    });

    it('should create an entity with computed property', async () => {
      const request = fixtures.productWithTotal({
        quantity: 10,
        unitPrice: 5.0,
      });

      const response = await client.post<EntityResponse>('/entities', request);

      const entity = assertEntityCreated(response);
      assertEntityHasProperty(entity, 'quantity', 10);
      assertEntityHasProperty(entity, 'unit_price', 5.0);
      // Computed property should exist with 'pending' status
      expect(entity.properties['total' as keyof typeof entity.properties]).toBeDefined();
      expect((entity.properties['total' as keyof typeof entity.properties])?.source).toBe('computed');
    });

    it('should create an entity with measured property', async () => {
      const request = {
        type: 'measurement',
        properties: {
          length: properties.measured(10.5, 'mm', 0.1, '2024-01-15T10:30:00Z'),
        },
      };

      const response = await client.post<EntityResponse>('/entities', request);

      const entity = assertEntityCreated(response);
      expect((entity.properties['length' as keyof typeof entity.properties])?.source).toBe('measured');
    });

    it('should reject empty type', async () => {
      const request = {
        type: '',
        properties: {},
      };

      const response = await client.post<KernelError>('/entities', request);

      assertBadRequest(response, 'VALIDATION_ERROR');
    });

    it('should reject missing type', async () => {
      const request = {
        properties: {},
      };

      const response = await client.post<KernelError>('/entities', request);

      assertBadRequest(response, 'VALIDATION_ERROR');
    });

    it('should reject request without auth headers', async () => {
      const request = fixtures.product();

      const response = await client.unauthenticated<KernelError>(
        'POST',
        '/entities',
        request
      );

      assertUnauthorized(response);
    });
  });

  // ===========================================================================
  // READ ENTITY
  // ===========================================================================

  describe('GET /entities/:id - Read Entity', () => {
    it('should read an existing entity', async () => {
      // Create entity first
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Test Read' })
      );
      const created = assertEntityCreated(createResponse);

      // Read the entity
      const readResponse = await client.get<EntityResponse>(
        `/entities/${created.id}`
      );

      const entity = assertOk(readResponse).entity;
      expect(entity.id).toBe(created.id);
      assertEntityHasProperty(entity, 'name', 'Test Read');
    });

    it('should return 404 for non-existent entity', async () => {
      const fakeId = '019fffff-dead-beef-cafe-000000000000';

      const response = await client.get<KernelError>(`/entities/${fakeId}`);

      assertNotFound(response);
    });

    it('should return 404 for invalid UUID', async () => {
      const response = await client.get<KernelError>('/entities/not-a-uuid');

      assertBadRequest(response, 'VALIDATION_ERROR');
    });

    it('should reject request without auth headers', async () => {
      const response = await client.unauthenticated<KernelError>(
        'GET',
        '/entities/019fffff-dead-beef-cafe-000000000000'
      );

      assertUnauthorized(response);
    });
  });

  // ===========================================================================
  // UPDATE ENTITY
  // ===========================================================================

  describe('PUT /entities/:id - Update Entity', () => {
    it('should update entity properties', async () => {
      // Create entity
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Original Name', price: 50 })
      );
      const created = assertEntityCreated(createResponse);

      // Update the entity
      const updateRequest = fixtures.update(1, {
        name: properties.text('Updated Name'),
        price: properties.number(75.0, 'USD'),
      });

      const updateResponse = await client.put<EntityResponse>(
        `/entities/${created.id}`,
        updateRequest
      );

      const updated = assertOk(updateResponse).entity;
      expect(updated.id).toBe(created.id);
      assertEntityVersion(updated, 2);
      assertEntityHasProperty(updated, 'name', 'Updated Name');
      assertEntityHasProperty(updated, 'price', 75.0);
    });

    it('should add new properties', async () => {
      // Create entity
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.entity('test', { name: properties.text('Test') })
      );
      const created = assertEntityCreated(createResponse);

      // Add new property
      const updateRequest = fixtures.update(1, {
        description: properties.text('A new description'),
      });

      const updateResponse = await client.put<EntityResponse>(
        `/entities/${created.id}`,
        updateRequest
      );

      const updated = assertOk(updateResponse).entity;
      assertEntityHasProperty(updated, 'description', 'A new description');
      // Original property should still exist
      assertEntityHasProperty(updated, 'name', 'Test');
    });

    it('should remove properties', async () => {
      // Create entity with multiple properties
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.entity('test', {
          name: properties.text('Test'),
          description: properties.text('To be removed'),
          status: properties.text('active'),
        })
      );
      const created = assertEntityCreated(createResponse);

      // Remove property
      const updateRequest = fixtures.update(1, undefined, ['description']);

      const updateResponse = await client.put<EntityResponse>(
        `/entities/${created.id}`,
        updateRequest
      );

      const updated = assertOk(updateResponse).entity;
      assertEntityMissingProperty(updated, 'description');
      // Other properties should still exist
      assertEntityHasProperty(updated, 'name', 'Test');
      assertEntityHasProperty(updated, 'status', 'active');
    });

    it('should reject update with wrong version (optimistic locking)', async () => {
      // Create entity
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Conflict Test' })
      );
      const created = assertEntityCreated(createResponse);

      // First update succeeds
      const update1 = fixtures.update(1, { name: properties.text('Update 1') });
      await client.put<EntityResponse>(`/entities/${created.id}`, update1);

      // Second update with old version fails
      const update2 = fixtures.update(1, { name: properties.text('Update 2') }); // Still using version 1

      const response = await client.put<KernelError>(
        `/entities/${created.id}`,
        update2
      );

      assertConflict(response);
      expect(response.body.details).toHaveProperty('expected_version', 1);
      expect(response.body.details).toHaveProperty('actual_version', 2);
    });

    it('should return 404 for non-existent entity', async () => {
      const fakeId = '019fffff-dead-beef-cafe-000000000000';
      const updateRequest = fixtures.update(1, { name: properties.text('Test') });

      const response = await client.put<KernelError>(
        `/entities/${fakeId}`,
        updateRequest
      );

      assertNotFound(response);
    });

    it('should reject update without version', async () => {
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product()
      );
      const created = assertEntityCreated(createResponse);

      const updateRequest = {
        set_properties: { name: properties.text('Test') },
        // Missing version!
      };

      const response = await client.put<KernelError>(
        `/entities/${created.id}`,
        updateRequest
      );

      assertBadRequest(response, 'VALIDATION_ERROR');
    });
  });

  // ===========================================================================
  // DELETE ENTITY
  // ===========================================================================

  describe('DELETE /entities/:id - Delete Entity', () => {
    it('should soft delete an entity', async () => {
      // Create entity
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'To Delete' })
      );
      const created = assertEntityCreated(createResponse);

      // Delete the entity
      const deleteResponse = await client.delete(`/entities/${created.id}`);

      assertNoContent(deleteResponse);

      // Entity should not be found (soft deleted)
      const getResponse = await client.get<KernelError>(
        `/entities/${created.id}`
      );
      assertNotFound(getResponse);
    });

    it('should hard delete an entity when requested', async () => {
      // Create entity
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'To Hard Delete' })
      );
      const created = assertEntityCreated(createResponse);

      // Hard delete the entity
      const deleteResponse = await client.delete(`/entities/${created.id}`, {
        query: { hard_delete: 'true' },
      });

      assertNoContent(deleteResponse);

      // Entity should not be found
      const getResponse = await client.get<KernelError>(
        `/entities/${created.id}`
      );
      assertNotFound(getResponse);
    });

    it('should return 404 for non-existent entity', async () => {
      const fakeId = '019fffff-dead-beef-cafe-000000000000';

      const response = await client.delete<KernelError>(`/entities/${fakeId}`);

      assertNotFound(response);
    });

    it('should reject request without auth headers', async () => {
      const response = await client.unauthenticated<KernelError>(
        'DELETE',
        '/entities/019fffff-dead-beef-cafe-000000000000'
      );

      assertUnauthorized(response);
    });
  });

  // ===========================================================================
  // FULL LIFECYCLE
  // ===========================================================================

  describe('Full Entity Lifecycle', () => {
    it('should complete full CRUD lifecycle', async () => {
      // 1. CREATE
      const createRequest = fixtures.product({
        name: 'Lifecycle Test Product',
        sku: 'LIFE-001',
        price: 100.0,
      });
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        createRequest
      );
      const created = assertEntityCreated(createResponse);
      const entityId = created.id;

      // 2. READ
      const readResponse = await client.get<EntityResponse>(
        `/entities/${entityId}`
      );
      const read = assertOk(readResponse).entity;
      expect(read.id).toBe(entityId);
      assertEntityHasProperty(read, 'name', 'Lifecycle Test Product');

      // 3. UPDATE
      const updateRequest = fixtures.update(1, {
        name: properties.text('Updated Product'),
        price: properties.number(150.0, 'USD'),
      });
      const updateResponse = await client.put<EntityResponse>(
        `/entities/${entityId}`,
        updateRequest
      );
      const updated = assertOk(updateResponse).entity;
      assertEntityVersion(updated, 2);
      assertEntityHasProperty(updated, 'name', 'Updated Product');
      assertEntityHasProperty(updated, 'price', 150.0);

      // 4. DELETE
      const deleteResponse = await client.delete(`/entities/${entityId}`);
      assertNoContent(deleteResponse);

      // 5. VERIFY DELETED
      const verifyResponse = await client.get<KernelError>(
        `/entities/${entityId}`
      );
      assertNotFound(verifyResponse);
    });

    it('should handle multiple sequential updates', async () => {
      // Create
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Multi-Update Test', price: 10 })
      );
      const created = assertEntityCreated(createResponse);

      // Multiple updates
      for (let i = 1; i <= 5; i++) {
        const updateRequest = fixtures.update(i, {
          price: properties.number(10 * (i + 1), 'USD'),
        });
        const updateResponse = await client.put<EntityResponse>(
          `/entities/${created.id}`,
          updateRequest
        );
        const updated = assertOk(updateResponse).entity;
        assertEntityVersion(updated, i + 1);
        assertEntityHasProperty(updated, 'price', 10 * (i + 1));
      }

      // Final read
      const readResponse = await client.get<EntityResponse>(
        `/entities/${created.id}`
      );
      const final = assertOk(readResponse).entity;
      assertEntityVersion(final, 6);
      assertEntityHasProperty(final, 'price', 60);
    });
  });
});
