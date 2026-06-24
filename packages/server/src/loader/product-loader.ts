/**
 * Trellis Product Loader - Main Orchestrator
 *
 * Loads a complete product definition from YAML into the database.
 */

import { dirname, basename, resolve, join, extname } from 'node:path';
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
  relationship_schemas: DbTable;
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
  generateEntityId,
  loadEntitySeedFiles,
} from './seed-data.js';

// =============================================================================
// ERROR FORMATTING
// =============================================================================

/**
 * Produce a human-readable message from any thrown value. AggregateError
 * (e.g. pg connection failures across multiple addresses) has an EMPTY
 * `message` - unwrap its causes so load failures are diagnosable.
 */
function describeLoadError(error: unknown): string {
  if (error instanceof AggregateError) {
    const parts = error.errors.map((e) =>
      e instanceof Error ? e.message : String(e)
    );
    return [error.message, ...parts].filter(Boolean).join('; ') || 'AggregateError';
  }
  if (error instanceof Error) {
    return error.message || error.name;
  }
  return String(error);
}

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

      // 2. Validate configuration first. Validation never needs a real
      // tenant, so dry runs (trellis validate) work without a database.
      const validationTenantId =
        options.tenantId ?? ('00000000-0000-0000-0000-000000000000' as TenantId);
      const validation = validateProduct(config, this.blockRegistry, validationTenantId);

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
          validationTenantId,
          0,
          0,
          0,
          allErrors,
          validation.warnings,
          startTime
        );
      }

      // 3. Dry run - return success without touching the database
      if (options.dryRun) {
        return this.buildResult(
          true,
          config.manifest.id,
          validationTenantId,
          Object.keys(config.entities).length,
          0, // Would be relationships count
          0,
          [],
          validation.warnings,
          startTime
        );
      }

      // 4. Ensure tenant and system actor exist (first database access)
      const tenantId = options.tenantId ?? await this.ensureTenant(config.manifest.id);
      const actorId = options.actorId ?? await this.ensureSystemActor(tenantId);

      // 5. Execute in transaction. The optional `seed/` folder may live beside
      // the product YAML (directory products: `<dir>/seed`) or under a sibling
      // folder named for a flat product file (`<dir>/<file-stem>/seed`).
      const productDir = dirname(absolutePath);
      const fileStem = basename(absolutePath, extname(absolutePath));
      const seedDirs = [join(productDir, 'seed'), join(productDir, fileStem, 'seed')];
      const result = await this.executeLoad(
        config,
        tenantId,
        actorId,
        options,
        validation.warnings,
        startTime,
        seedDirs
      );

      this.emit({
        type: 'load_complete',
        success: result.success,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      const message = describeLoadError(error);
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
    startTime: number,
    seedDirs: readonly string[]
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

      // 2. Create relationship type schemas from config.relationships.
      const relationshipTypesCreated = await this.createRelationshipTypes(
        tx,
        config,
        tenantId,
        options.force ?? false
      );

      // 3. Load seed data (entities + relationships) from the seed dir.
      let entitiesSeeded = 0;
      let relationshipsSeeded = 0;
      if (!options.skipSeed) {
        const seeded = await this.loadSeedData(tx, seedDirs, tenantId, actorId, options.force ?? false);
        entitiesSeeded = seeded.entities;
        relationshipsSeeded = seeded.relationships;
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
        startTime,
        relationshipsSeeded
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
   * Create relationship type schemas from `config.relationships`.
   */
  private async createRelationshipTypes(
    tx: ProductLoaderDbTx,
    config: ProductConfig,
    tenantId: TenantId,
    force: boolean
  ): Promise<number> {
    const relConfigs = config.relationships ?? [];
    if (relConfigs.length === 0) return 0;

    const schemas = generateAllRelationshipSchemas(relConfigs as RelationshipTypeConfig[], tenantId);
    let created = 0;

    for (const schema of schemas) {
      const existing = await tx.relationship_schemas.findFirst({
        where: { tenant_id: tenantId, type: schema.type },
      });

      const data = {
        tenant_id: tenantId,
        type: schema.type,
        name: schema.name,
        description: schema.description,
        from_types: schema.from_types,
        to_types: schema.to_types,
        cardinality: schema.cardinality,
        bidirectional: schema.bidirectional,
        inverse_type: schema.inverse_type,
        metadata_schema: JSON.parse(JSON.stringify(schema.metadata_schema)),
      };

      if (existing) {
        if (!force) {
          throw new Error(
            `Relationship type '${schema.type}' already exists. Use --force to overwrite.`
          );
        }
        await tx.relationship_schemas.update({ where: { id: existing.id }, data });
        this.emit({ type: 'relationship_type_created', relType: schema.type, name: schema.name });
        continue;
      }

      await tx.relationship_schemas.create({ data });
      this.emit({ type: 'relationship_type_created', relType: schema.type, name: schema.name });
      created++;
    }

    return created;
  }

  /**
   * Load seed data (entities + relationships) from a product's `seed/*.json`.
   * These are pre-resolved full-entity records — the same files the demo mock
   * API consumes — so a single seed format works for both.
   *
   * Idempotent: an existing entity/relationship is skipped (or updated when
   * `force`), so re-running `serve`/`load` never hits a primary-key violation.
   * Fixture `created_at`/`updated_at` are preserved so seeded history keeps its
   * dates. Seeding is optional; an absent directory seeds nothing.
   *
   * @returns counts of entities and relationships actually inserted.
   */
  private async loadSeedData(
    tx: ProductLoaderDbTx,
    seedDirs: readonly string[],
    tenantId: TenantId,
    actorId: ActorId,
    force: boolean
  ): Promise<{ entities: number; relationships: number }> {
    // Try each candidate seed directory; the first non-empty one wins (handles
    // both directory products `<dir>/seed` and flat products `<dir>/<id>/seed`).
    let bundle = { entities: [] as Awaited<ReturnType<typeof loadEntitySeedFiles>>['entities'], relationships: [] as Awaited<ReturnType<typeof loadEntitySeedFiles>>['relationships'] };
    for (const dir of seedDirs) {
      const found = await loadEntitySeedFiles(dir);
      if (found.entities.length > 0 || found.relationships.length > 0) {
        bundle = found;
        break;
      }
    }

    if (bundle.entities.length === 0 && bundle.relationships.length === 0) {
      return { entities: 0, relationships: 0 };
    }

    // Insert entities. The loaded tenant owns every seeded row, regardless of
    // any tenant_id baked into the fixture file.
    let entitiesInserted = 0;
    for (const entity of bundle.entities) {
      const id = entity.id ?? generateEntityId();
      const data: Record<string, unknown> = {
        id,
        tenant_id: tenantId,
        type_path: entity.type,
        properties: entity.properties,
        version: entity.version ?? 1,
        created_by: actorId,
        ...(entity.created_at ? { created_at: new Date(entity.created_at) } : {}),
        ...(entity.updated_at ? { updated_at: new Date(entity.updated_at) } : {}),
      };

      const existing = await tx.entities.findFirst({ where: { id, tenant_id: tenantId } });
      if (existing) {
        if (!force) continue; // already seeded — idempotent skip
        await tx.entities.update({ where: { id: existing.id }, data });
        continue;
      }

      await tx.entities.create({ data });
      entitiesInserted++;
      this.emit({ type: 'entity_seeded', entityType: entity.type, id });
    }

    // Insert relationships (natural key: tenant + type + endpoints).
    let relationshipsInserted = 0;
    for (const rel of bundle.relationships) {
      const existing = await tx.relationships.findFirst({
        where: {
          tenant_id: tenantId,
          type: rel.type,
          from_entity: rel.from_entity,
          to_entity: rel.to_entity,
        },
      });
      if (existing) continue;

      await tx.relationships.create({
        data: {
          tenant_id: tenantId,
          type: rel.type,
          from_entity: rel.from_entity,
          to_entity: rel.to_entity,
          metadata: rel.metadata ?? {},
          created_by: actorId,
        },
      });
      relationshipsInserted++;
    }

    return { entities: entitiesInserted, relationships: relationshipsInserted };
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
    startTime: number,
    relationshipsSeeded = 0
  ): LoadResult {
    return {
      success,
      productId,
      tenantId,
      entityTypesCreated,
      relationshipTypesCreated,
      entitiesSeeded,
      relationshipsSeeded,
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
