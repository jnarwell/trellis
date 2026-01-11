/**
 * Trellis Client SDK - Relationship Operations
 *
 * CRUD operations for relationships.
 */

import type {
  Relationship,
  EntityId,
  CreateRelationshipInput,
} from '@trellis/kernel';
import type { HttpClient } from './http.js';
import type { ListRelationshipsOptions } from './types.js';

/**
 * Response wrapper for relationship list.
 */
interface ListRelationshipsResponse {
  readonly relationships: readonly Relationship[];
}

/**
 * Relationship API client.
 */
export class RelationshipApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new relationship.
   */
  async create(input: CreateRelationshipInput): Promise<Relationship> {
    return this.http.post<Relationship>('/relationships', input);
  }

  /**
   * Delete a relationship by ID.
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/relationships/${id}`);
  }

  /**
   * List relationships for an entity.
   */
  async list(
    entityId: EntityId,
    options?: ListRelationshipsOptions
  ): Promise<readonly Relationship[]> {
    const params: Record<string, string> = {};

    if (options?.type) {
      params['type'] = options.type;
    }
    if (options?.direction) {
      params['direction'] = options.direction;
    }

    const response = await this.http.get<ListRelationshipsResponse>(
      `/entities/${entityId}/relationships`,
      params
    );

    return response.relationships;
  }
}
