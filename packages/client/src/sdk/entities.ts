/**
 * Trellis Client SDK - Entity Operations
 *
 * CRUD operations for entities.
 */

import type {
  Entity,
  EntityId,
  CreateEntityInput,
  UpdateEntityInput,
} from '@trellis/kernel';
import type { HttpClient } from './http.js';
import type { GetEntityOptions, DeleteEntityOptions } from './types.js';
import { TrellisError } from './types.js';

/**
 * Server response wrapper for entity endpoints.
 */
interface EntityResponse {
  entity: Entity;
}

/**
 * Entity API client.
 */
export class EntityApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new entity.
   */
  async create(input: CreateEntityInput): Promise<Entity> {
    const response = await this.http.post<EntityResponse>('/entities', input);
    return response.entity;
  }

  /**
   * Get an entity by ID.
   */
  async get(id: EntityId, options?: GetEntityOptions): Promise<Entity | null> {
    const params: Record<string, string | boolean> = {};

    if (options?.resolveInherited) {
      params['resolve_inherited'] = true;
    }
    if (options?.evaluateComputed) {
      params['evaluate_computed'] = true;
    }
    if (options?.includeRelationships?.length) {
      params['include_relationships'] = options.includeRelationships.join(',');
    }

    try {
      const response = await this.http.get<EntityResponse>(`/entities/${id}`, params);
      return response.entity;
    } catch (error) {
      // Return null for 404
      if (error instanceof TrellisError && (error.code === 'NOT_FOUND' || error.code === 'HTTP_404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update an entity.
   */
  async update(input: UpdateEntityInput): Promise<Entity> {
    const { id, ...body } = input;
    const response = await this.http.put<EntityResponse>(`/entities/${id}`, body);
    return response.entity;
  }

  /**
   * Delete an entity.
   */
  async delete(id: EntityId, options?: DeleteEntityOptions): Promise<void> {
    const params: Record<string, boolean> = {};

    if (options?.cascadeRelationships !== undefined) {
      params['cascade_relationships'] = options.cascadeRelationships;
    }
    if (options?.hardDelete) {
      params['hard_delete'] = true;
    }

    await this.http.delete(`/entities/${id}`);
  }
}
