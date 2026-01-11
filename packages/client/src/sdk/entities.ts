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
 * Entity API client.
 */
export class EntityApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new entity.
   */
  async create(input: CreateEntityInput): Promise<Entity> {
    return this.http.post<Entity>('/entities', input);
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
      return await this.http.get<Entity>(`/entities/${id}`, params);
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
    return this.http.put<Entity>(`/entities/${id}`, body);
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
