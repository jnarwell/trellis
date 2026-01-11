/**
 * Trellis Product Loader - Main Orchestrator
 *
 * Loads a complete product definition from YAML into the database.
 */

import { dirname, basename, resolve } from 'node:path';
import type { TenantId, ActorId, BlockRegistry } from '@trellis/kernel';

/**
 * Minimal database interface for the product loader.
 * Compatible with Prisma or any database adapter that implements these methods.
 */
export interface ProductLoaderDb {
  $transaction<T>(fn: (tx: ProductLoaderDbTx) => Promise<T>): Promise<T>;
  tenants: DbTable;
  actors: DbTable;
}

interface DbTable {
  findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
}

/** Transaction context */
type ProductLoaderDbTx = {
  type_schemas: DbTable;
  entities: DbTable;
  relationships: DbTable;
};
import { loadProduct } from '../config/loader.js';
import { validateProduct } from '../config/validator.js';
import type { ProductConfig, ProductValidationError, ProductValidationWarning } from '../config/types.js';
import type {
  LoadResult,
  ProductLoaderOptions,
  TypeSchemaRecord,
  RelationshipSchemaRecord,
  LoaderEvent,
  LoaderEventHandler,
} from './types.js';
import {
  generateTypeSchema,
  generateAllTypeSchemas,
  validateInheritance,
  generateLifecycleSchema,
} from './schema-generator.js';
import {
  generateRelationshipSchema,
  generateAllRelationshipSchemas,
  validateRelationshipConfigs,
  type RelationshipTypeConfig,
} from './relationship-loader.js';
import {
  loadSeedFiles,
  mergeSeedConfigs,
  resolveSeedEntities,
  resolveSeedRelationships,
  validateSeedData,
  generateEntityId,
  type SeedFileConfig,
} from './seed-data.js';

// =============================================================================
// PRODUCT LOADER CLASS
// =============================================================================

/**
 * Loads product configurations into the database.
 */
export class ProductLoader {
  private eventHandler?: LoaderEventHandler;

  constructor(
    private readonly db: ProductLoaderDb,
    private readonly blockRegistry: BlockRegistry
  ) {}

  /**
   * Set an event handler to receive loading progress events.
   */
  onEvent(handler: LoaderEventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Emit an event to the handler if one is set.
   */
  private emit(event: LoaderEvent): void {
    if (this.eventHandler) {
      this.eventHandler(event);
    }
  }

  /**
   * Load a product from a YAML file into the database.
   */
  async load(
    productPath: string,
    options: ProductLoaderOptions = {}
  ): Promise<LoadResult> {
    const startTime = Date.now();
    const absolutePath = resolve(productPath);

    try {
      // 1. Load YAML configuration
      const config = await loadProduct({
        basePath: dirname(absolutePath),
        productFile: basename(absolutePath),
        validate: false,
      });

      this.emit({ type: 'load_started', productId: config.manifest.id });

      // 2. Ensure tenant exists
      const tenantId = options.tenantId ?? await this.ensureTenant(config.manifest.id);
      const actorId = options.actorId ?? await this.ensureSystemActor(tenantId);

      // 3. Validate configuration
      const validation = validateProduct(config, this.blockRegistry, tenantId);

      this.emit({
        type: 'validation_complete',
        valid: validation.valid,
        errorCount: validation.errors.length,
      });

      // Additional inheritance validation
      const inheritanceErrors = validateInheritance(config.entities);
      const allErrors: ProductValidationError[] = [...validation.errors];

      for (const msg of inheritanceErrors) {
        allErrors.push({
          category: 'entity-invalid',
          code: 'INHERITANCE_ERROR',
          message: msg,
          path: ['entities'],
          value: null,
          expected: 'Valid inheritance chain',
          suggestions: [],
        });
      }

      if (allErrors.length > 0) {
        return this.buildResult(
          false,
          config.manifest.id,
          tenantId,
          0,
          0,
          0,
          allErrors,
          validation.warnings,
          startTime
        );
      }

      // 4. Dry run - return success without writing
      if (options.dryRun) {
        return this.buildResult(
          true,
          config.manifest.id,
          tenantId,
          Object.keys(config.entities).length,
          0, // Would be relationships count
          0,
          [],
          validation.warnings,
          startTime
        );
      }

      // 5. Execute in transaction
      const result = await this.executeLoad(
        config,
        tenantId,
        actorId,
        options,
        validation.warnings,
        startTime
      );

      this.emit({
        type: 'load_complete',
        success: result.success,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit({ type: 'load_error', error: message });

      return this.buildResult(
        false,
        'unknown',
        '' as TenantId,
        0,
        0,
        0,
        [{
          category: 'manifest-invalid',
          code: 'LOAD_ERROR',
          message: `Failed to load product: ${message}`,
          path: [],
          value: null,
          expected: 'Valid product configuration',
          suggestions: [],
        }],
        [],
        startTime
      );
    }
  }

  /**
   * Validate a product without loading it.
   */
  async validate(productPath: string): Promise<LoadResult> {
    return this.load(productPath, { dryRun: true });
  }

  /**
   * Execute the actual database load in a transaction.
   */
  private async executeLoad(
    config: ProductConfig,
    tenantId: TenantId,
    actorId: ActorId,
    options: ProductLoaderOptions,
    warnings: readonly ProductValidationWarning[],
    startTime: number
  ): Promise<LoadResult> {
    // Use transaction for atomic loading
    return this.db.$transaction(async (tx) => {
      // 1. Create entity type schemas
      const entityTypesCreated = await this.createEntityTypes(
        tx,
        config,
        tenantId,
        options.force ?? false
      );

      // 2. Create relationship schemas (if any)
      // Note: Relationships might be defined separately or inferred
      const relationshipTypesCreated = 0; // TODO: Load from config when relationships are defined

      // 3. Load seed data
      let entitiesSeeded = 0;
      if (!options.skipSeed) {
        entitiesSeeded = await this.loadSeedData(
          tx,
          config,
          tenantId,
          actorId
        );
      }

      return this.buildResult(
        true,
        config.manifest.id,
        tenantId,
        entityTypesCreated,
        relationshipTypesCreated,
        entitiesSeeded,
        [],
        warnings,
        startTime
      );
    });
  }

  /**
   * Create entity type schemas in the database.
   */
  private async createEntityTypes(
    tx: ProductLoaderDbTx,
    config: ProductConfig,
    tenantId: TenantId,
    force: boolean
  ): Promise<number> {
    const schemas = generateAllTypeSchemas(config.entities, tenantId);
    let created = 0;

    for (const schema of schemas) {
      const existing = await tx.type_schemas.findFirst({
        where: {
          tenant_id: tenantId,
          type_path: schema.type_path,
        },
      });

      if (existing) {
        if (force) {
          // Update existing schema
          await tx.type_schemas.update({
            where: { id: existing.id },
            data: {
              name: schema.name,
              description: schema.description,
              extends_type: schema.extends_type,
              properties: JSON.parse(JSON.stringify(schema.properties)),
              abstract: schema.abstract,
              updated_at: new Date(),
            },
          });

          this.emit({
            type: 'entity_type_updated',
            typeId: schema.type_path,
            name: schema.name,
          });
        } else {
          throw new Error(
            `Entity type '${schema.type_path}' already exists. Use --force to overwrite.`
          );
        }
      } else {
        // Create new schema
        await tx.type_schemas.create({
          data: {
            tenant_id: tenantId,
            type_path: schema.type_path,
            name: schema.name,
            description: schema.description,
            extends_type: schema.extends_type,
            properties: JSON.parse(JSON.stringify(schema.properties)),
            abstract: schema.abstract,
          },
        });

        this.emit({
          type: 'entity_type_created',
          typeId: schema.type_path,
          name: schema.name,
        });

        created++;
      }
    }

    return created;
  }

  /**
   * Load seed data into entities.
   */
  private async loadSeedData(
    tx: ProductLoaderDbTx,
    config: ProductConfig,
    tenantId: TenantId,
    actorId: ActorId
  ): Promise<number> {
    // Check if product has seed configuration
    // For now, look for seed files in the product directory
    // This would be defined in ProductManifest.includes.seed
    const seedConfig: SeedFileConfig = { entities: [], relationships: [] };

    // TODO: Load from config.manifest.includes.seed when supported
    // const seedFiles = await loadSeedFiles(productDir, config.manifest.includes?.seed);
    // const seedConfig = mergeSeedConfigs(seedFiles);

    if (!seedConfig.entities || seedConfig.entities.length === 0) {
      return 0;
    }

    // Validate seed data
    const errors = validateSeedData(seedConfig, config.entities);
    if (errors.length > 0) {
      throw new Error(`Invalid seed data:\n${errors.join('\n')}`);
    }

    // Resolve entities
    const resolvedEntities = resolveSeedEntities(
      seedConfig,
      config.entities,
      generateEntityId
    );

    // Insert entities
    for (const entity of resolvedEntities) {
      await tx.entities.create({
        data: {
          id: entity.id,
          tenant_id: tenantId,
          type_path: entity.type,
          properties: entity.properties,
          version: 1,
          created_by: actorId,
        },
      });

      this.emit({
        type: 'entity_seeded',
        entityType: entity.type,
        id: entity.id,
      });
    }

    // Resolve and insert relationships
    const resolvedRelationships = resolveSeedRelationships(
      seedConfig,
      resolvedEntities
    );

    for (const rel of resolvedRelationships) {
      await tx.relationships.create({
        data: {
          tenant_id: tenantId,
          type: rel.type,
          from_entity: rel.from_entity,
          to_entity: rel.to_entity,
          metadata: rel.metadata,
          created_by: actorId,
        },
      });
    }

    return resolvedEntities.length;
  }

  /**
   * Ensure a tenant exists for the product.
   */
  private async ensureTenant(productId: string): Promise<TenantId> {
    // Convert product ID to tenant slug
    const slug = productId.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const existing = await this.db.tenants.findFirst({
      where: { slug },
    });

    if (existing) {
      return existing.id as TenantId;
    }

    const tenant = await this.db.tenants.create({
      data: {
        name: productId,
        slug,
        settings: {},
      },
    });

    return tenant.id as TenantId;
  }

  /**
   * Ensure a system actor exists for the tenant.
   */
  private async ensureSystemActor(tenantId: TenantId): Promise<ActorId> {
    const existing = await this.db.actors.findFirst({
      where: {
        tenant_id: tenantId,
        actor_type: 'system',
        name: 'Product Loader',
      },
    });

    if (existing) {
      return existing.id as ActorId;
    }

    const actor = await this.db.actors.create({
      data: {
        tenant_id: tenantId,
        name: 'Product Loader',
        actor_type: 'system',
        metadata: { source: 'product-loader' },
      },
    });

    return actor.id as ActorId;
  }

  /**
   * Build a LoadResult object.
   */
  private buildResult(
    success: boolean,
    productId: string,
    tenantId: TenantId,
    entityTypesCreated: number,
    relationshipTypesCreated: number,
    entitiesSeeded: number,
    errors: readonly ProductValidationError[],
    warnings: readonly ProductValidationWarning[],
    startTime: number
  ): LoadResult {
    return {
      success,
      productId,
      tenantId,
      entityTypesCreated,
      relationshipTypesCreated,
      entitiesSeeded,
      errors,
      warnings,
      durationMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a ProductLoader instance.
 */
export function createProductLoader(
  db: ProductLoaderDb,
  blockRegistry: BlockRegistry
): ProductLoader {
  return new ProductLoader(db, blockRegistry);
}
