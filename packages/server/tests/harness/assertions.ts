/**
 * Trellis E2E Test Harness - Assertions
 *
 * Custom assertion helpers for E2E tests.
 */

import { expect } from 'vitest';
import type { TestResponse } from './client.js';
import type { Entity, Relationship, Property, KernelError } from '@trellis/kernel';

// =============================================================================
// RESPONSE ASSERTIONS
// =============================================================================

/**
 * Assert response status code.
 */
export function assertStatus(response: TestResponse, expectedStatus: number): void {
  expect(response.status).toBe(expectedStatus);
}

/**
 * Assert successful response (2xx status).
 */
export function assertSuccess(response: TestResponse): void {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

/**
 * Assert 201 Created response.
 */
export function assertCreated<T>(response: TestResponse<T>): T {
  expect(response.status).toBe(201);
  return response.body;
}

/**
 * Assert 200 OK response.
 */
export function assertOk<T>(response: TestResponse<T>): T {
  expect(response.status).toBe(200);
  return response.body;
}

/**
 * Assert 204 No Content response.
 */
export function assertNoContent(response: TestResponse): void {
  expect(response.status).toBe(204);
}

/**
 * Assert 400 Bad Request response.
 */
export function assertBadRequest(
  response: TestResponse<KernelError>,
  expectedCode?: string
): void {
  expect(response.status).toBe(400);
  expect(response.body.code).toBeDefined();
  if (expectedCode) {
    expect(response.body.code).toBe(expectedCode);
  }
}

/**
 * Assert 401 Unauthorized response.
 */
export function assertUnauthorized(response: TestResponse): void {
  expect(response.status).toBe(401);
}

/**
 * Assert 404 Not Found response.
 */
export function assertNotFound(response: TestResponse<KernelError>): void {
  expect(response.status).toBe(404);
  expect(response.body.code).toBe('NOT_FOUND');
}

/**
 * Assert 409 Conflict response (version conflict).
 */
export function assertConflict(response: TestResponse<KernelError>): void {
  expect(response.status).toBe(409);
  expect(response.body.code).toBe('VERSION_CONFLICT');
}

/**
 * Assert response is a KernelError.
 */
export function assertError(
  response: TestResponse<KernelError>,
  expectedCode: string,
  expectedStatus?: number
): void {
  if (expectedStatus) {
    expect(response.status).toBe(expectedStatus);
  }
  expect(response.body.code).toBe(expectedCode);
  expect(response.body.message).toBeDefined();
}

// =============================================================================
// ENTITY ASSERTIONS
// =============================================================================

export interface EntityResponse {
  entity: Entity;
}

/**
 * Assert entity was created successfully.
 */
export function assertEntityCreated(
  response: TestResponse<EntityResponse>
): Entity {
  assertCreated(response);
  expect(response.body.entity).toBeDefined();
  expect(response.body.entity.id).toBeDefined();
  expect(response.body.entity.version).toBe(1);
  return response.body.entity;
}

/**
 * Assert entity exists and has expected properties.
 */
export function assertEntityHasProperty(
  entity: Entity,
  propertyName: string,
  expectedValue?: unknown
): void {
  expect(entity.properties).toHaveProperty(propertyName);

  if (expectedValue !== undefined) {
    const prop = entity.properties[propertyName];
    if (!prop) {
      throw new Error(`Property ${propertyName} not found`);
    }

    // Handle different property sources
    if ('value' in prop) {
      const value = prop.value;
      if (typeof value === 'object' && value !== null && 'value' in value) {
        expect((value as { value: unknown }).value).toEqual(expectedValue);
      } else {
        expect(value).toEqual(expectedValue);
      }
    }
  }
}

/**
 * Assert entity does not have a property.
 */
export function assertEntityMissingProperty(
  entity: Entity,
  propertyName: string
): void {
  expect(entity.properties).not.toHaveProperty(propertyName);
}

/**
 * Assert entity has correct type.
 */
export function assertEntityType(entity: Entity, expectedType: string): void {
  expect(entity.type).toBe(expectedType);
}

/**
 * Assert entity has correct version.
 */
export function assertEntityVersion(
  entity: Entity,
  expectedVersion: number
): void {
  expect(entity.version).toBe(expectedVersion);
}

// =============================================================================
// RELATIONSHIP ASSERTIONS
// =============================================================================

export interface RelationshipResponse {
  id: string;
  type: string;
  from_entity: string;
  to_entity: string;
  metadata?: Record<string, unknown>;
}

/**
 * Assert relationship was created successfully.
 */
export function assertRelationshipCreated(
  response: TestResponse<RelationshipResponse>
): RelationshipResponse {
  assertCreated(response);
  expect(response.body.id).toBeDefined();
  expect(response.body.type).toBeDefined();
  expect(response.body.from_entity).toBeDefined();
  expect(response.body.to_entity).toBeDefined();
  return response.body;
}

/**
 * Assert relationship connects expected entities.
 */
export function assertRelationshipConnects(
  relationship: RelationshipResponse,
  fromEntity: string,
  toEntity: string
): void {
  expect(relationship.from_entity).toBe(fromEntity);
  expect(relationship.to_entity).toBe(toEntity);
}

// =============================================================================
// QUERY ASSERTIONS
// =============================================================================

export interface QueryResponse {
  entities: Entity[];
  total?: number;
  next_cursor?: string;
}

/**
 * Assert query returned expected number of results.
 */
export function assertQueryCount(
  response: TestResponse<QueryResponse>,
  expectedCount: number
): Entity[] {
  assertOk(response);
  expect(response.body.entities).toHaveLength(expectedCount);
  return response.body.entities;
}

/**
 * Assert query includes entity with specific ID.
 */
export function assertQueryIncludesEntity(
  response: TestResponse<QueryResponse>,
  entityId: string
): void {
  assertOk(response);
  const ids = response.body.entities.map((e) => e.id);
  expect(ids).toContain(entityId);
}

/**
 * Assert query excludes entity with specific ID.
 */
export function assertQueryExcludesEntity(
  response: TestResponse<QueryResponse>,
  entityId: string
): void {
  assertOk(response);
  const ids = response.body.entities.map((e) => e.id);
  expect(ids).not.toContain(entityId);
}

/**
 * Assert query results are sorted correctly.
 */
export function assertQuerySorted(
  response: TestResponse<QueryResponse>,
  propertyPath: string,
  direction: 'asc' | 'desc'
): void {
  assertOk(response);
  const entities = response.body.entities;

  if (entities.length < 2) return;

  for (let i = 0; i < entities.length - 1; i++) {
    const current = getNestedProperty(entities[i]!, propertyPath);
    const next = getNestedProperty(entities[i + 1]!, propertyPath);

    if (current === null || next === null) continue;

    if (direction === 'asc') {
      expect(current <= next).toBe(true);
    } else {
      expect(current >= next).toBe(true);
    }
  }
}

/**
 * Assert query has total count.
 */
export function assertQueryTotal(
  response: TestResponse<QueryResponse>,
  expectedTotal: number
): void {
  assertOk(response);
  expect(response.body.total).toBe(expectedTotal);
}

/**
 * Assert query has pagination cursor.
 */
export function assertQueryHasCursor(
  response: TestResponse<QueryResponse>
): string {
  assertOk(response);
  expect(response.body.next_cursor).toBeDefined();
  return response.body.next_cursor!;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get nested property from an object using dot notation.
 */
function getNestedProperty(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }

  // Extract value from Property structure if needed
  if (
    typeof current === 'object' &&
    current !== null &&
    'value' in current
  ) {
    const prop = current as { value: unknown };
    if (
      typeof prop.value === 'object' &&
      prop.value !== null &&
      'value' in prop.value
    ) {
      return (prop.value as { value: unknown }).value;
    }
    return prop.value;
  }

  return current;
}
