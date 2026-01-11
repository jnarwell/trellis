/**
 * Trellis Block System - Block Registry
 *
 * Provides in-memory registry for block specifications.
 */

import type {
  BlockSpec,
  BlockType,
  BlockCategory,
  BlockRegistry,
} from './types.js';

/**
 * In-memory implementation of BlockRegistry.
 */
export class InMemoryBlockRegistry implements BlockRegistry {
  private readonly specs = new Map<BlockType, BlockSpec>();

  /**
   * Check if a block type is registered.
   */
  hasBlock(type: BlockType): boolean {
    return this.specs.has(type);
  }

  /**
   * Get a block spec by type.
   */
  getBlock(type: BlockType): BlockSpec | undefined {
    return this.specs.get(type);
  }

  /**
   * Get all blocks, optionally filtered by category.
   */
  getBlocks(category?: BlockCategory): readonly BlockSpec[] {
    const allSpecs = Array.from(this.specs.values());
    if (category === undefined) {
      return allSpecs;
    }
    return allSpecs.filter((spec) => spec.category === category);
  }

  /**
   * Register a block spec.
   */
  registerBlock(spec: BlockSpec): void {
    if (this.specs.has(spec.type)) {
      throw new Error(`Block type '${spec.type}' is already registered`);
    }
    this.specs.set(spec.type, spec);
  }

  /**
   * Unregister a block spec (for testing).
   */
  unregisterBlock(type: BlockType): boolean {
    return this.specs.delete(type);
  }

  /**
   * Clear all registered blocks (for testing).
   */
  clear(): void {
    this.specs.clear();
  }

  /**
   * Get count of registered blocks.
   */
  get size(): number {
    return this.specs.size;
  }

  /**
   * Get all registered block types.
   */
  getBlockTypes(): readonly BlockType[] {
    return Array.from(this.specs.keys());
  }
}

/**
 * Create a new block registry.
 */
export function createBlockRegistry(): InMemoryBlockRegistry {
  return new InMemoryBlockRegistry();
}

/**
 * Helper to cast a string to BlockType.
 * In production, this should validate the format.
 */
export function asBlockType(type: string): BlockType {
  // Basic validation: should be namespace.name format
  if (!/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/.test(type)) {
    throw new Error(
      `Invalid block type format: '${type}'. Expected 'namespace.name' (e.g., 'trellis.data-table')`
    );
  }
  return type as BlockType;
}

// =============================================================================
// ENTITY SCHEMA REGISTRY
// =============================================================================

import type {
  EntitySchemaRegistry,
  PropertySchemaInfo,
  TypeSchemaInfo,
} from './types.js';
import type { TypePath, PropertyName } from '../types/entity.js';

/**
 * Schema info for registering entity types.
 */
export interface EntitySchemaInput {
  readonly type: TypePath;
  readonly name: string;
  readonly description?: string;
  readonly properties: readonly { name: PropertyName; type: string }[];
}

/**
 * In-memory implementation of EntitySchemaRegistry.
 */
export class InMemoryEntitySchemaRegistry implements EntitySchemaRegistry {
  private readonly schemas = new Map<TypePath, TypeSchemaInfo>();

  /**
   * Register an entity schema.
   */
  register(input: EntitySchemaInput): void {
    const baseSchema = {
      type: input.type,
      name: input.name,
      properties: input.properties.map((p) => ({
        name: p.name,
        valueType: p.type,
        required: true,
      })),
    };

    // Only add description if provided (exactOptionalPropertyTypes compliance)
    const schema: TypeSchemaInfo = input.description
      ? { ...baseSchema, description: input.description }
      : baseSchema;
    this.schemas.set(input.type, schema);
  }

  hasType(type: TypePath): boolean {
    return this.schemas.has(type);
  }

  getType(type: TypePath): TypeSchemaInfo | undefined {
    return this.schemas.get(type);
  }

  getTypes(pattern: string): readonly TypeSchemaInfo[] {
    if (pattern === '*') {
      return Array.from(this.schemas.values());
    }
    // Simple prefix matching
    const prefix = pattern.replace(/\*$/, '');
    return Array.from(this.schemas.values()).filter((s) =>
      s.type.startsWith(prefix)
    );
  }

  getProperties(type: TypePath): readonly PropertySchemaInfo[] {
    const schema = this.schemas.get(type);
    return schema?.properties ?? [];
  }

  hasProperty(type: TypePath, property: PropertyName): boolean {
    const schema = this.schemas.get(type);
    if (!schema) return false;
    return schema.properties.some((p) => p.name === property);
  }

  getProperty(type: TypePath, property: PropertyName): PropertySchemaInfo | undefined {
    const schema = this.schemas.get(type);
    return schema?.properties.find((p) => p.name === property);
  }

  /**
   * Clear all registered schemas (for testing).
   */
  clear(): void {
    this.schemas.clear();
  }
}

/**
 * Create a new entity schema registry.
 */
export function createEntitySchemaRegistry(): InMemoryEntitySchemaRegistry {
  return new InMemoryEntitySchemaRegistry();
}
