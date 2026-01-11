/**
 * Trellis Product Loader - Public Exports
 *
 * Re-exports all loader types, classes, and utilities.
 */

// Main loader
export {
  ProductLoader,
  createProductLoader,
} from './product-loader.js';

// Schema generator
export {
  generateTypeSchema,
  generateAllTypeSchemas,
  generateLifecycleSchema,
  convertProperty,
  convertComputedProperty,
  validateInheritance,
} from './schema-generator.js';

// Relationship loader
export {
  generateRelationshipSchema,
  generateInverseRelationshipSchema,
  generateAllRelationshipSchemas,
  validateRelationshipConfigs,
  StandardRelationships,
  type RelationshipTypeConfig,
} from './relationship-loader.js';

// Seed data
export {
  loadSeedFiles,
  mergeSeedConfigs,
  resolveSeedEntities,
  resolveSeedRelationships,
  validateSeedData,
  generateEntityId,
  convertPropertiesToDbFormat,
  buildEntityInsertSql,
  buildRelationshipInsertSql,
  type SeedFileConfig,
  type ResolvedSeedEntity,
  type ResolvedSeedRelationship,
} from './seed-data.js';

// Types
export type {
  ProductLoaderOptions,
  LoadResult,
  TypeSchemaRecord,
  PropertySchemaJson,
  OptionSchemaJson,
  RelationshipSchemaRecord,
  SeedDataConfig,
  SeedEntityConfig,
  SeedRelationshipConfig,
  LifecycleSchemaJson,
  LifecycleStateJson,
  LifecycleTransitionJson,
  LoaderEvent,
  LoaderEventHandler,
} from './types.js';
