/**
 * Trellis Server - Evaluation Context Builder
 *
 * Builds an EvaluationContext for the kernel expression evaluator
 * by pre-fetching entities and relationships from the database.
 */

import type { Pool } from 'pg';
import {
  createContext as createKernelContext,
  getReferencedEntityIds,
  type EvaluationContext,
  type Expression,
  type Entity,
  type EntityId,
  type TenantId,
  type PropertyName,
  type Property,
  type ComputedProperty,
} from '@trellis/kernel';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for building evaluation context.
 */
export interface ContextBuilderOptions {
  /** Maximum evaluation depth (default: 50) */
  maxDepth?: number;
  /** Pre-loaded entities to include in cache */
  entityCache?: Map<string, Entity>;
  /** Pre-loaded relationships to include in cache */
  relationshipCache?: Map<string, Map<string, readonly string[]>>;
}

/**
 * Database row for entity query.
 */
interface EntityRow {
  id: string;
  tenant_id: string;
  type_path: string;
  properties: Record<string, Property>;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

/**
 * Database row for relationship query.
 */
interface RelationshipRow {
  from_entity: string;
  to_entity: string;
  type: string;
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

/**
 * Builds EvaluationContext for expression evaluation.
 *
 * Responsibilities:
 * - Pre-fetch entities referenced by @{uuid} syntax
 * - Pre-fetch relationships for @self.rel.prop traversals
 * - Cache entities and relationships for efficient evaluation
 */
export class EvaluationContextBuilder {
  constructor(
    private readonly pool: Pool,
    private readonly tenantId: TenantId
  ) {}

  /**
   * Build a context for evaluating a single entity's computed properties.
   */
  async buildForEntity(
    entity: Entity,
    options: ContextBuilderOptions = {}
  ): Promise<EvaluationContext> {
    const entityCache = new Map<string, Entity>(options.entityCache ?? []);
    const relationshipCache = new Map<string, Map<string, readonly string[]>>(
      options.relationshipCache ?? []
    );

    // Add current entity to cache
    entityCache.set(entity.id, entity);

    // Collect all expressions to analyze
    const expressions = this.collectComputedExpressions(entity);

    // Pre-fetch referenced entities and relationships
    if (expressions.length > 0) {
      await this.prefetchDependencies(
        entity,
        expressions,
        entityCache,
        relationshipCache
      );
    }

    return createKernelContext(entity, this.tenantId, {
      entityCache,
      relationshipCache,
      maxDepth: options.maxDepth ?? 50,
    });
  }

  /**
   * Build context for a specific computed property.
   */
  async buildForProperty(
    entity: Entity,
    propertyName: PropertyName,
    ast: Expression,
    options: ContextBuilderOptions = {}
  ): Promise<EvaluationContext> {
    const entityCache = new Map<string, Entity>(options.entityCache ?? []);
    const relationshipCache = new Map<string, Map<string, readonly string[]>>(
      options.relationshipCache ?? []
    );

    // Add current entity to cache
    entityCache.set(entity.id, entity);

    // Pre-fetch for this specific expression
    await this.prefetchForExpression(
      entity,
      ast,
      entityCache,
      relationshipCache
    );

    return createKernelContext(entity, this.tenantId, {
      entityCache,
      relationshipCache,
      maxDepth: options.maxDepth ?? 50,
    });
  }

  /**
   * Collect all computed property expressions from an entity.
   */
  private collectComputedExpressions(
    entity: Entity
  ): Array<{ name: PropertyName; expression: string }> {
    const expressions: Array<{ name: PropertyName; expression: string }> = [];

    for (const [name, prop] of Object.entries(entity.properties)) {
      if (prop.source === 'computed') {
        const computedProp = prop as ComputedProperty;
        expressions.push({
          name: name as PropertyName,
          expression: computedProp.expression,
        });
      }
    }

    return expressions;
  }

  /**
   * Pre-fetch all dependencies for multiple expressions.
   */
  private async prefetchDependencies(
    entity: Entity,
    expressions: Array<{ name: PropertyName; expression: string }>,
    entityCache: Map<string, Entity>,
    relationshipCache: Map<string, Map<string, readonly string[]>>
  ): Promise<void> {
    // Import parser lazily to avoid circular deps
    const { parse } = await import('@trellis/kernel');

    // Parse all expressions and collect entity IDs
    const referencedEntityIds = new Set<string>();

    for (const { expression } of expressions) {
      try {
        const ast = parse(expression);
        const entityIds = getReferencedEntityIds(ast);
        for (const id of entityIds) {
          referencedEntityIds.add(id);
        }
      } catch {
        // Skip invalid expressions - they'll error during evaluation
      }
    }

    // Fetch referenced entities
    if (referencedEntityIds.size > 0) {
      await this.fetchEntities([...referencedEntityIds], entityCache);
    }

    // Fetch relationships for current entity
    await this.fetchRelationships(entity.id, relationshipCache);
  }

  /**
   * Pre-fetch dependencies for a single expression.
   */
  private async prefetchForExpression(
    entity: Entity,
    ast: Expression,
    entityCache: Map<string, Entity>,
    relationshipCache: Map<string, Map<string, readonly string[]>>
  ): Promise<void> {
    // Get directly referenced entity IDs
    const referencedEntityIds = getReferencedEntityIds(ast);

    // Fetch referenced entities
    if (referencedEntityIds.length > 0) {
      await this.fetchEntities([...referencedEntityIds], entityCache);
    }

    // Fetch relationships for current entity
    await this.fetchRelationships(entity.id, relationshipCache);
  }

  /**
   * Fetch multiple entities by ID and add to cache.
   */
  private async fetchEntities(
    entityIds: string[],
    cache: Map<string, Entity>
  ): Promise<void> {
    // Filter out already cached entities
    const idsToFetch = entityIds.filter((id) => !cache.has(id));
    if (idsToFetch.length === 0) return;

    const result = await this.pool.query<EntityRow>(
      `SELECT id, tenant_id, type_path, properties, version, created_at, updated_at, created_by
       FROM entities
       WHERE tenant_id = $1
         AND id = ANY($2)
         AND deleted_at IS NULL`,
      [this.tenantId, idsToFetch]
    );

    for (const row of result.rows) {
      const entity: Entity = {
        id: row.id as EntityId,
        tenant_id: row.tenant_id as TenantId,
        type: row.type_path as Entity['type'],
        properties: row.properties as Record<PropertyName, Property>,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
        created_by: row.created_by as Entity['created_by'],
        version: row.version,
      };
      cache.set(row.id, entity);
    }
  }

  /**
   * Fetch all outgoing relationships for an entity and add to cache.
   */
  private async fetchRelationships(
    entityId: string,
    cache: Map<string, Map<string, readonly string[]>>
  ): Promise<void> {
    // Skip if already cached
    if (cache.has(entityId)) return;

    const result = await this.pool.query<RelationshipRow>(
      `SELECT from_entity, to_entity, type
       FROM relationships
       WHERE tenant_id = $1
         AND from_entity = $2`,
      [this.tenantId, entityId]
    );

    // Group by relationship type
    const relsByType = new Map<string, string[]>();
    for (const row of result.rows) {
      const existing = relsByType.get(row.type) ?? [];
      existing.push(row.to_entity);
      relsByType.set(row.type, existing);
    }

    cache.set(entityId, relsByType);
  }

  /**
   * Fetch relationships for traversal and recursively load target entities.
   * Used for multi-hop traversals like @self.parent.category.markup.
   */
  async fetchRelationshipChain(
    startEntityId: string,
    relationshipTypes: readonly string[],
    entityCache: Map<string, Entity>,
    relationshipCache: Map<string, Map<string, readonly string[]>>
  ): Promise<void> {
    let currentEntityIds = [startEntityId];

    for (const relType of relationshipTypes) {
      const nextEntityIds: string[] = [];

      for (const entityId of currentEntityIds) {
        // Ensure relationships are cached
        await this.fetchRelationships(entityId, relationshipCache);

        // Get related entity IDs
        const entityRels = relationshipCache.get(entityId);
        const relatedIds = entityRels?.get(relType) ?? [];
        nextEntityIds.push(...relatedIds);
      }

      // Fetch the target entities
      if (nextEntityIds.length > 0) {
        await this.fetchEntities(nextEntityIds, entityCache);

        // Also fetch their relationships for further traversal
        for (const id of nextEntityIds) {
          await this.fetchRelationships(id, relationshipCache);
        }
      }

      currentEntityIds = nextEntityIds;
    }
  }
}

/**
 * Create an EvaluationContextBuilder instance.
 */
export function createContextBuilder(
  pool: Pool,
  tenantId: TenantId
): EvaluationContextBuilder {
  return new EvaluationContextBuilder(pool, tenantId);
}
