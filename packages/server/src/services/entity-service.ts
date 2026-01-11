/**
 * Trellis Server - Entity Service
 *
 * Business logic for entity operations.
 * Transforms PropertyInput to Property and coordinates with repository.
 */

import { uuidv7 } from 'uuidv7';
import type { Pool } from 'pg';
import {
  parseWithDependencies,
  type Entity,
  type EntityId,
  type TenantId,
  type ActorId,
  type TypePath,
  type PropertyName,
  type PropertyInput,
  type Property,
  type LiteralProperty,
  type InheritedProperty,
  type ComputedProperty,
  type MeasuredProperty,
  type KernelError,
} from '@trellis/kernel';
import { withTenantTransaction, type TenantScopedClient } from '../db/client.js';
import { EntityRepository, type EntityRow } from '../repositories/entity-repository.js';
import { EventFactory, type EventEmitter } from '../events/emitter.js';
import { ComputationService } from '../evaluation/computation-service.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for getting an entity.
 */
export interface GetEntityOptions {
  resolveInherited?: boolean;
  evaluateComputed?: boolean;
}

/**
 * Input for creating an entity via the service.
 */
export interface CreateEntityServiceInput {
  type: TypePath;
  properties: Record<string, PropertyInput>;
}

/**
 * Input for updating an entity via the service.
 */
export interface UpdateEntityServiceInput {
  id: EntityId;
  version: number;
  setProperties?: Record<string, PropertyInput>;
  removeProperties?: string[];
}

/**
 * Options for deleting an entity.
 */
export interface DeleteEntityOptions {
  hardDelete?: boolean;
}

/**
 * Options for EntityService configuration.
 */
export interface EntityServiceOptions {
  /** Whether to evaluate computed properties on create/update */
  evaluateOnWrite?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Transform PropertyInput to full Property.
 * Adds name, and for computed/inherited, sets computation_status to 'pending'.
 */
function transformPropertyInput(
  name: string,
  input: PropertyInput
): Property {
  const propertyName = name as PropertyName;

  switch (input.source) {
    case 'literal':
      return {
        source: 'literal',
        name: propertyName,
        value: input.value,
      } as LiteralProperty;

    case 'inherited':
      return {
        source: 'inherited',
        name: propertyName,
        from_entity: input.from_entity,
        from_property: input.from_property,
        override: input.override,
        computation_status: 'pending',
      } as InheritedProperty;

    case 'computed': {
      // Parse expression and extract dependencies
      const { dependencies } = parseWithDependencies(input.expression);
      return {
        source: 'computed',
        name: propertyName,
        expression: input.expression,
        dependencies: dependencies.map((d) => d.path),
        computation_status: 'pending',
      } as ComputedProperty;
    }

    case 'measured':
      return {
        source: 'measured',
        name: propertyName,
        value: input.value,
        uncertainty: input.uncertainty,
        measured_at: input.measured_at,
      } as MeasuredProperty;
  }
}

/**
 * Transform all properties from input to full properties.
 */
function transformProperties(
  properties: Record<string, PropertyInput>
): Record<PropertyName, Property> {
  const result: Record<PropertyName, Property> = {};
  for (const [name, input] of Object.entries(properties)) {
    result[name as PropertyName] = transformPropertyInput(name, input);
  }
  return result;
}

/**
 * Convert EntityRow to Entity.
 */
function rowToEntity(row: EntityRow): Entity {
  return {
    id: row.id as EntityId,
    tenant_id: row.tenant_id as TenantId,
    type: row.type_path as TypePath,
    properties: row.properties as Record<PropertyName, Property>,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    created_by: row.created_by as ActorId,
    version: row.version,
  };
}

/**
 * Create a KernelError.
 */
function createError(
  code: KernelError['code'],
  message: string,
  details?: Record<string, unknown>
): KernelError {
  if (details !== undefined) {
    return { code, message, details };
  }
  return { code, message };
}

/**
 * Detect property changes between two property sets.
 */
function detectPropertyChanges(
  before: Record<PropertyName, Property>,
  after: Record<PropertyName, Property>
): {
  changed: PropertyName[];
  added: PropertyName[];
  removed: PropertyName[];
  modifications: Array<{
    name: PropertyName;
    changeType: 'added' | 'modified' | 'removed';
    previous: Property | null;
    current: Property | null;
  }>;
} {
  const changed: PropertyName[] = [];
  const added: PropertyName[] = [];
  const removed: PropertyName[] = [];
  const modifications: Array<{
    name: PropertyName;
    changeType: 'added' | 'modified' | 'removed';
    previous: Property | null;
    current: Property | null;
  }> = [];

  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));

  // Find added and modified properties
  for (const key of afterKeys) {
    const propName = key as PropertyName;
    if (!beforeKeys.has(key)) {
      added.push(propName);
      modifications.push({
        name: propName,
        changeType: 'added',
        previous: null,
        current: after[propName] ?? null,
      });
    } else if (JSON.stringify(before[propName]) !== JSON.stringify(after[propName])) {
      changed.push(propName);
      modifications.push({
        name: propName,
        changeType: 'modified',
        previous: before[propName] ?? null,
        current: after[propName] ?? null,
      });
    }
  }

  // Find removed properties
  for (const key of beforeKeys) {
    const propName = key as PropertyName;
    if (!afterKeys.has(key)) {
      removed.push(propName);
      modifications.push({
        name: propName,
        changeType: 'removed',
        previous: before[propName] ?? null,
        current: null,
      });
    }
  }

  return { changed, added, removed, modifications };
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Entity service for business logic.
 */
export class EntityService {
  private readonly eventFactory: EventFactory;
  private readonly computationService: ComputationService;
  private readonly evaluateOnWrite: boolean;

  constructor(
    private readonly pool: Pool,
    private readonly tenantId: TenantId,
    private readonly actorId: ActorId,
    private readonly events?: EventEmitter,
    options: EntityServiceOptions = {}
  ) {
    this.eventFactory = new EventFactory({
      tenantId: this.tenantId,
      actorId: this.actorId,
    });
    this.computationService = new ComputationService(pool, tenantId, actorId);
    this.evaluateOnWrite = options.evaluateOnWrite ?? true;
  }

  /**
   * Create a new entity.
   */
  async create(input: CreateEntityServiceInput): Promise<Entity> {
    // TODO: Schema validation in Phase 3
    // Validate type exists in type_schemas table

    const entityId = uuidv7() as EntityId;
    const properties = transformProperties(input.properties);

    // Check if we have computed properties that need evaluation
    const hasComputedProperties = Object.values(properties).some(
      (p) => p.source === 'computed'
    );

    let entity = await withTenantTransaction(
      this.pool,
      this.tenantId,
      async (client) => {
        const repository = new EntityRepository(client);
        const row = await repository.create({
          id: entityId,
          type: input.type,
          properties,
          createdBy: this.actorId,
        });
        return rowToEntity(row);
      }
    );

    // Evaluate computed properties if enabled and there are any
    if (this.evaluateOnWrite && hasComputedProperties) {
      const computeResult = await this.computationService.computeProperties(entity);

      // Update entity with computed values if any changed
      if (computeResult.results.length > 0) {
        entity = await withTenantTransaction(
          this.pool,
          this.tenantId,
          async (client) => {
            const repository = new EntityRepository(client);
            const updatedRow = await repository.update({
              id: entity.id,
              properties: computeResult.properties,
              expectedVersion: entity.version,
            });
            return updatedRow ? rowToEntity(updatedRow) : entity;
          }
        );
      }
    }

    // Emit events
    if (this.events) {
      // Emit entity_created
      const createdEvent = this.eventFactory.entityCreated({
        entityId: entity.id,
        type: entity.type,
        properties: entity.properties,
      });
      await this.events.emit(createdEvent);

      // Emit property_changed for each initial property
      for (const [name, prop] of Object.entries(entity.properties)) {
        const propEvent = this.eventFactory.propertyChanged({
          entityId: entity.id,
          propertyName: name,
          changeType: 'added',
          previous: null,
          current: prop,
        });
        await this.events.emit(propEvent);
      }
    }

    return entity;
  }

  /**
   * Get an entity by ID.
   */
  async get(id: EntityId, options: GetEntityOptions = {}): Promise<Entity> {
    let entity = await withTenantTransaction(
      this.pool,
      this.tenantId,
      async (client) => {
        const repository = new EntityRepository(client);
        const row = await repository.findById(id);
        return row ? rowToEntity(row) : null;
      }
    );

    if (!entity) {
      throw createError('NOT_FOUND', `Entity ${id} not found`);
    }

    // Evaluate stale/pending computed properties on read
    if (options.evaluateComputed) {
      const computeResult = await this.computationService.computeProperties(
        entity,
        { onlyStale: true }
      );

      // Update entity with computed values if any changed
      if (computeResult.results.length > 0) {
        entity = await withTenantTransaction(
          this.pool,
          this.tenantId,
          async (client) => {
            const repository = new EntityRepository(client);
            const updatedRow = await repository.update({
              id: entity!.id,
              properties: computeResult.properties,
              expectedVersion: entity!.version,
            });
            return updatedRow ? rowToEntity(updatedRow) : entity!;
          }
        );
      }
    }

    // TODO: Implement resolve_inherited option
    // This requires the inheritance resolver (future work)
    if (options.resolveInherited) {
      // For now, return entity as-is
    }

    return entity;
  }

  /**
   * Update an entity with optimistic locking.
   */
  async update(input: UpdateEntityServiceInput): Promise<Entity> {
    // Track changes for event emission
    let beforeProperties: Record<PropertyName, Property> = {};
    let hasNewComputedProperties = false;

    let entity = await withTenantTransaction(
      this.pool,
      this.tenantId,
      async (client) => {
        const repository = new EntityRepository(client);

        // Get current entity to merge properties
        const currentRow = await repository.findById(input.id);

        if (!currentRow) {
          throw createError('NOT_FOUND', `Entity ${input.id} not found`);
        }

        // Check version before attempting update
        if (currentRow.version !== input.version) {
          throw createError('VERSION_CONFLICT', 'Entity was modified by another request', {
            entity_id: input.id,
            expected_version: input.version,
            actual_version: currentRow.version,
          });
        }

        // Store before state for change detection
        beforeProperties = { ...currentRow.properties };

        // Build new properties
        let newProperties = { ...currentRow.properties };

        // Remove specified properties
        if (input.removeProperties) {
          for (const propName of input.removeProperties) {
            delete newProperties[propName as PropertyName];
          }
        }

        // Set new properties (overwrite or add)
        if (input.setProperties) {
          const transformedProps = transformProperties(input.setProperties);
          newProperties = { ...newProperties, ...transformedProps };

          // Check if any new properties are computed
          hasNewComputedProperties = Object.values(transformedProps).some(
            (p) => p.source === 'computed'
          );
        }

        // Perform update with optimistic lock
        const updatedRow = await repository.update({
          id: input.id,
          properties: newProperties,
          expectedVersion: input.version,
        });

        // This should not happen since we already checked version, but handle it
        if (!updatedRow) {
          // Re-fetch to get current version for error details
          const latestRow = await repository.findByIdIncludeDeleted(input.id);
          if (!latestRow) {
            throw createError('NOT_FOUND', `Entity ${input.id} not found`);
          }
          throw createError('VERSION_CONFLICT', 'Entity was modified by another request', {
            entity_id: input.id,
            expected_version: input.version,
            actual_version: latestRow.version,
          });
        }

        return rowToEntity(updatedRow);
      }
    );

    // Evaluate new computed properties if enabled
    if (this.evaluateOnWrite && hasNewComputedProperties) {
      const computeResult = await this.computationService.computeProperties(entity);

      // Update entity with computed values if any changed
      if (computeResult.results.length > 0) {
        entity = await withTenantTransaction(
          this.pool,
          this.tenantId,
          async (client) => {
            const repository = new EntityRepository(client);
            const updatedRow = await repository.update({
              id: entity.id,
              properties: computeResult.properties,
              expectedVersion: entity.version,
            });
            return updatedRow ? rowToEntity(updatedRow) : entity;
          }
        );
      }
    }

    // Emit events
    if (this.events) {
      const changes = detectPropertyChanges(beforeProperties, entity.properties);

      // Emit entity_updated
      const updatedEvent = this.eventFactory.entityUpdated({
        entityId: entity.id,
        previousVersion: input.version,
        newVersion: entity.version,
        changedProperties: [...changes.changed, ...changes.added],
        removedProperties: changes.removed,
      });
      await this.events.emit(updatedEvent);

      // Emit property_changed for each modification
      for (const mod of changes.modifications) {
        const propEvent = this.eventFactory.propertyChanged({
          entityId: entity.id,
          propertyName: mod.name,
          changeType: mod.changeType,
          previous: mod.previous,
          current: mod.current,
        });
        await this.events.emit(propEvent);
      }
    }

    return entity;
  }

  /**
   * Delete an entity (soft or hard).
   */
  async delete(id: EntityId, options: DeleteEntityOptions = {}): Promise<void> {
    // Capture entity state before deletion for event
    let entityBeforeDelete: Entity | null = null;

    if (this.events) {
      entityBeforeDelete = await withTenantTransaction(
        this.pool,
        this.tenantId,
        async (client) => {
          const repository = new EntityRepository(client);
          const row = await repository.findById(id);
          return row ? rowToEntity(row) : null;
        }
      );
    }

    const deleted = await withTenantTransaction(
      this.pool,
      this.tenantId,
      async (client) => {
        const repository = new EntityRepository(client);

        if (options.hardDelete) {
          return repository.hardDelete(id);
        } else {
          return repository.softDelete(id, this.actorId);
        }
      }
    );

    if (!deleted) {
      throw createError('NOT_FOUND', `Entity ${id} not found`);
    }

    // Emit entity_deleted event
    if (this.events && entityBeforeDelete) {
      const deletedEvent = this.eventFactory.entityDeleted({
        entityId: id,
        type: entityBeforeDelete.type,
        finalVersion: entityBeforeDelete.version,
        hardDelete: options.hardDelete ?? false,
        finalProperties: entityBeforeDelete.properties,
      });
      await this.events.emit(deletedEvent);
    }
  }
}

/**
 * Create an EntityService instance.
 */
export function createEntityService(
  pool: Pool,
  tenantId: TenantId,
  actorId: ActorId,
  events?: EventEmitter,
  options?: EntityServiceOptions
): EntityService {
  return new EntityService(pool, tenantId, actorId, events, options);
}
