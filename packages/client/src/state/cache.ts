/**
 * Trellis Client SDK - Entity Cache
 *
 * Simple LRU cache for entities with TTL support.
 */

import type { Entity, EntityId, KernelEvent } from '@trellis/kernel';
import type { CacheConfig, CacheEntry, QueryResult } from '../sdk/types.js';

/**
 * Default cache configuration.
 */
const DEFAULT_CONFIG: Required<CacheConfig> = {
  defaultTtl: 60000, // 1 minute
  maxEntries: 1000,
  enabled: true,
};

/**
 * Cache key for queries.
 */
function createQueryKey(type: string | undefined, filter: unknown): string {
  return `query:${type ?? 'all'}:${JSON.stringify(filter)}`;
}

/**
 * Callback for cache invalidation events.
 */
export type CacheInvalidationCallback = (type: string) => void;

/**
 * Entity cache with LRU eviction and TTL.
 */
export class EntityCache {
  private readonly config: Required<CacheConfig>;
  private readonly entities = new Map<string, CacheEntry<Entity>>();
  private readonly queries = new Map<string, CacheEntry<QueryResult<Entity>>>();
  private readonly accessOrder: string[] = [];
  private readonly invalidationListeners = new Set<CacheInvalidationCallback>();

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Subscribe to cache invalidation events.
   */
  onInvalidate(callback: CacheInvalidationCallback): () => void {
    this.invalidationListeners.add(callback);
    return () => this.invalidationListeners.delete(callback);
  }

  /**
   * Notify listeners of invalidation.
   */
  private notifyInvalidation(type: string): void {
    for (const listener of this.invalidationListeners) {
      listener(type);
    }
  }

  /**
   * Check if caching is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // ===========================================================================
  // ENTITY CACHE
  // ===========================================================================

  /**
   * Get a cached entity.
   */
  getEntity(id: EntityId): Entity | null {
    if (!this.config.enabled) return null;

    const entry = this.entities.get(id);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.entities.delete(id);
      return null;
    }

    // Update access order for LRU
    this.touch(id);

    return entry.data;
  }

  /**
   * Cache an entity.
   */
  setEntity(entity: Entity, ttl?: number): void {
    if (!this.config.enabled) return;

    const effectiveTtl = ttl ?? this.config.defaultTtl;
    const now = Date.now();

    this.entities.set(entity.id, {
      data: entity,
      fetchedAt: now,
      expiresAt: now + effectiveTtl,
    });

    this.touch(entity.id);
    this.evictIfNeeded();
  }

  /**
   * Invalidate a cached entity.
   */
  invalidateEntity(id: EntityId): void {
    this.entities.delete(id);
  }

  /**
   * Check if an entity is cached and valid.
   */
  hasEntity(id: EntityId): boolean {
    return this.getEntity(id) !== null;
  }

  // ===========================================================================
  // QUERY CACHE
  // ===========================================================================

  /**
   * Get cached query results.
   */
  getQuery(type: string | undefined, filter: unknown): QueryResult<Entity> | null {
    if (!this.config.enabled) return null;

    const key = createQueryKey(type, filter);
    const entry = this.queries.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.queries.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache query results.
   */
  setQuery(
    type: string | undefined,
    filter: unknown,
    result: QueryResult<Entity>,
    ttl?: number
  ): void {
    if (!this.config.enabled) return;

    const effectiveTtl = ttl ?? this.config.defaultTtl;
    const now = Date.now();
    const key = createQueryKey(type, filter);

    this.queries.set(key, {
      data: result,
      fetchedAt: now,
      expiresAt: now + effectiveTtl,
    });

    // Also cache individual entities from the result
    for (const entity of result.data) {
      this.setEntity(entity, ttl);
    }
  }

  /**
   * Invalidate a cached query.
   */
  invalidateQuery(type: string | undefined, filter: unknown): void {
    const key = createQueryKey(type, filter);
    this.queries.delete(key);
  }

  /**
   * Invalidate all queries for a type.
   */
  invalidateQueriesForType(type: string): void {
    const prefix = `query:${type}:`;
    for (const key of this.queries.keys()) {
      if (key.startsWith(prefix)) {
        this.queries.delete(key);
      }
    }
    // Notify listeners so they can refetch
    this.notifyInvalidation(type);
  }

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  /**
   * Handle a kernel event and invalidate affected cache entries.
   */
  handleEvent(event: KernelEvent): void {
    switch (event.event_type) {
      case 'entity_created':
        // Invalidate queries that might include this entity
        this.invalidateQueriesForType(event.payload.type);
        break;

      case 'entity_updated': {
        // Invalidate the entity and related queries
        if (event.entity_id) {
          this.invalidateEntity(event.entity_id);
        }
        // Remote updates change list-visible data (e.g. kanban status):
        // refresh type-level queries when the event names the type
        const updatedType = (event.payload as { type?: string }).type;
        if (updatedType) {
          this.invalidateQueriesForType(updatedType);
        }
        break;
      }

      case 'entity_deleted':
        // Invalidate entity and queries
        if (event.entity_id) {
          this.invalidateEntity(event.entity_id);
        }
        this.invalidateQueriesForType(event.payload.type);
        break;

      case 'property_changed':
      case 'property_stale':
        // Invalidate the entity
        if (event.entity_id) {
          this.invalidateEntity(event.entity_id);
        }
        break;
    }
  }

  /**
   * Clear all cached data.
   */
  clear(): void {
    this.entities.clear();
    this.queries.clear();
    this.accessOrder.length = 0;
  }

  /**
   * Get cache statistics.
   */
  getStats(): {
    entityCount: number;
    queryCount: number;
    maxEntries: number;
  } {
    return {
      entityCount: this.entities.size,
      queryCount: this.queries.size,
      maxEntries: this.config.maxEntries,
    };
  }

  // ===========================================================================
  // LRU MANAGEMENT
  // ===========================================================================

  private touch(id: string): void {
    const index = this.accessOrder.indexOf(id);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(id);
  }

  private evictIfNeeded(): void {
    while (this.entities.size > this.config.maxEntries) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.entities.delete(oldest);
      } else {
        break;
      }
    }
  }
}
