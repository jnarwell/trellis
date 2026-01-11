/**
 * Trellis Server - Computation Service
 *
 * Orchestrates the evaluation of computed properties:
 * - Evaluates computed properties on entity create/update
 * - Updates entity with computed values
 * - Handles recalculation of stale properties
 */

import type { Pool } from 'pg';
import {
  type Entity,
  type EntityId,
  type TenantId,
  type ActorId,
  type PropertyName,
  type Property,
  type ComputedProperty,
  type Value,
} from '@trellis/kernel';
import { withTenantTransaction } from '../db/client.js';
import { EntityRepository, type EntityRow } from '../repositories/entity-repository.js';
import { PropertyEvaluator, type ComputedPropertyResult } from './evaluator.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of computing properties for an entity.
 */
export interface ComputationResult {
  /** Updated properties map */
  readonly properties: Record<PropertyName, Property>;
  /** Results for each computed property */
  readonly results: readonly ComputedPropertyResult[];
  /** Whether all computations succeeded */
  readonly allSucceeded: boolean;
}

/**
 * Options for property computation.
 */
export interface ComputeOptions {
  /** Only compute properties that are pending or stale */
  onlyStale?: boolean;
  /** Skip persisting updates (for preview) */
  skipPersist?: boolean;
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Service for computing and updating computed properties.
 *
 * Key responsibilities:
 * 1. Evaluate computed properties using PropertyEvaluator
 * 2. Update entity properties with computed values
 * 3. Handle the pending → valid/error state transition
 * 4. Coordinate recalculation of stale properties
 */
export class ComputationService {
  private readonly evaluator: PropertyEvaluator;

  constructor(
    private readonly pool: Pool,
    private readonly tenantId: TenantId,
    private readonly actorId: ActorId
  ) {
    this.evaluator = new PropertyEvaluator(pool, tenantId);
  }

  /**
   * Compute all computed properties on an entity and return updated properties.
   *
   * This is the main entry point called by EntityService after create/update.
   * It evaluates all computed properties and returns a new properties map
   * with computed values filled in.
   */
  async computeProperties(
    entity: Entity,
    options: ComputeOptions = {}
  ): Promise<ComputationResult> {
    // Build entity with current properties for evaluation
    const evalOptions = options.onlyStale ? { skipValid: true } : {};
    const evalResult = await this.evaluator.evaluateEntity(entity, evalOptions);

    // Build updated properties map
    const updatedProperties = { ...entity.properties };

    for (const result of evalResult.properties) {
      const currentProp = updatedProperties[result.propertyName];
      if (!currentProp || currentProp.source !== 'computed') continue;

      const computedProp = currentProp as ComputedProperty;

      if (result.success) {
        // Update with computed value - build object without undefined fields
        const updated: ComputedProperty = {
          source: 'computed',
          name: computedProp.name,
          expression: computedProp.expression,
          dependencies: computedProp.dependencies,
          cached_at: new Date().toISOString(),
          computation_status: 'valid',
        };
        // Only include cached_value if it exists
        if (result.value !== undefined && result.value !== null) {
          (updated as { cached_value?: Value }).cached_value = result.value;
        }
        updatedProperties[result.propertyName] = updated;
      } else {
        // Update with error state
        const updated: ComputedProperty = {
          source: 'computed',
          name: computedProp.name,
          expression: computedProp.expression,
          dependencies: computedProp.dependencies,
          computation_status: result.status,
        };
        if (result.error) {
          (updated as { computation_error?: string }).computation_error = result.error;
        }
        updatedProperties[result.propertyName] = updated;
      }
    }

    return {
      properties: updatedProperties,
      results: evalResult.properties,
      allSucceeded: evalResult.allSucceeded,
    };
  }

  /**
   * Compute a single property on an entity.
   */
  async computeProperty(
    entity: Entity,
    propertyName: PropertyName
  ): Promise<ComputedPropertyResult> {
    const prop = entity.properties[propertyName];
    if (!prop || prop.source !== 'computed') {
      return {
        propertyName,
        success: false,
        status: 'error',
        error: `Property '${propertyName}' is not a computed property`,
      };
    }

    return this.evaluator.evaluateProperty(
      entity,
      propertyName,
      prop as ComputedProperty
    );
  }

  /**
   * Recalculate a stale property and persist the update.
   *
   * Called by the recalculation handler when a property_stale event fires.
   */
  async recalculateProperty(
    entityId: EntityId,
    propertyName: PropertyName
  ): Promise<ComputedPropertyResult> {
    // Fetch current entity
    const entity = await this.fetchEntity(entityId);
    if (!entity) {
      return {
        propertyName,
        success: false,
        status: 'error',
        error: `Entity '${entityId}' not found`,
      };
    }

    // Check property exists and is computed
    const prop = entity.properties[propertyName];
    if (!prop) {
      return {
        propertyName,
        success: false,
        status: 'error',
        error: `Property '${propertyName}' not found on entity`,
      };
    }

    if (prop.source !== 'computed') {
      return {
        propertyName,
        success: false,
        status: 'error',
        error: `Property '${propertyName}' is not computed (source: ${prop.source})`,
      };
    }

    // Evaluate the property
    const result = await this.evaluator.evaluateProperty(
      entity,
      propertyName,
      prop as ComputedProperty
    );

    // Persist the result
    await this.persistPropertyUpdate(entity, propertyName, result);

    return result;
  }

  /**
   * Recalculate multiple stale properties efficiently.
   */
  async recalculateProperties(
    entityId: EntityId,
    propertyNames: readonly PropertyName[]
  ): Promise<readonly ComputedPropertyResult[]> {
    const results: ComputedPropertyResult[] = [];

    // Fetch entity once
    const entity = await this.fetchEntity(entityId);
    if (!entity) {
      for (const name of propertyNames) {
        results.push({
          propertyName: name,
          success: false,
          status: 'error',
          error: `Entity '${entityId}' not found`,
        });
      }
      return results;
    }

    // Evaluate all properties sharing context
    const evalResult = await this.evaluator.evaluateEntity(entity);

    // Filter to requested properties
    const relevantResults = evalResult.properties.filter((r) =>
      propertyNames.includes(r.propertyName)
    );

    // Persist updates
    for (const result of relevantResults) {
      await this.persistPropertyUpdate(entity, result.propertyName, result);
      results.push(result);
    }

    return results;
  }

  /**
   * Get all stale properties for an entity.
   */
  async getStaleProperties(entityId: EntityId): Promise<readonly PropertyName[]> {
    const entity = await this.fetchEntity(entityId);
    if (!entity) return [];

    const stale: PropertyName[] = [];
    for (const [name, prop] of Object.entries(entity.properties)) {
      if (
        prop.source === 'computed' &&
        (prop as ComputedProperty).computation_status === 'stale'
      ) {
        stale.push(name as PropertyName);
      }
    }

    return stale;
  }

  /**
   * Fetch an entity by ID.
   */
  private async fetchEntity(entityId: EntityId): Promise<Entity | null> {
    return withTenantTransaction(
      this.pool,
      this.tenantId,
      async (client) => {
        const repository = new EntityRepository(client);
        const row = await repository.findById(entityId);
        return row ? this.rowToEntity(row) : null;
      }
    );
  }

  /**
   * Persist a property computation result to the database.
   */
  private async persistPropertyUpdate(
    entity: Entity,
    propertyName: PropertyName,
    result: ComputedPropertyResult
  ): Promise<void> {
    const currentProp = entity.properties[propertyName] as ComputedProperty;

    let updatedProp: ComputedProperty;
    if (result.success) {
      // Build updated property without undefined fields
      updatedProp = {
        source: 'computed',
        name: currentProp.name,
        expression: currentProp.expression,
        dependencies: currentProp.dependencies,
        cached_at: new Date().toISOString(),
        computation_status: 'valid',
      };
      if (result.value !== undefined && result.value !== null) {
        (updatedProp as { cached_value?: Value }).cached_value = result.value;
      }
    } else {
      updatedProp = {
        source: 'computed',
        name: currentProp.name,
        expression: currentProp.expression,
        dependencies: currentProp.dependencies,
        computation_status: result.status,
      };
      if (result.error) {
        (updatedProp as { computation_error?: string }).computation_error = result.error;
      }
    }

    await withTenantTransaction(
      this.pool,
      this.tenantId,
      async (client) => {
        // Use JSON path update for efficiency
        await client.query(
          `UPDATE entities
           SET properties = jsonb_set(properties, $2::text[], $3::jsonb),
               updated_at = NOW()
           WHERE tenant_id = $4
             AND id = $1
             AND deleted_at IS NULL`,
          [
            entity.id,
            [propertyName],
            JSON.stringify(updatedProp),
            this.tenantId,
          ]
        );
      }
    );
  }

  /**
   * Convert database row to Entity.
   */
  private rowToEntity(row: EntityRow): Entity {
    return {
      id: row.id as EntityId,
      tenant_id: row.tenant_id as TenantId,
      type: row.type_path as Entity['type'],
      properties: row.properties as Record<PropertyName, Property>,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      created_by: row.created_by as ActorId,
      version: row.version,
    };
  }
}

/**
 * Create a ComputationService instance.
 */
export function createComputationService(
  pool: Pool,
  tenantId: TenantId,
  actorId: ActorId
): ComputationService {
  return new ComputationService(pool, tenantId, actorId);
}
