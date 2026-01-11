/**
 * Block System Tests
 *
 * Tests for block spec validation, registry, and type checking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Registry
  createBlockRegistry,
  createEntitySchemaRegistry,
  type BlockRegistry,
  type EntitySchemaRegistry,

  // Types
  type BlockSpec,
  type BlockConfig,
  type PropSpec,
  type BlockType,
  type BlockInstanceId,
  type SlotSpec,

  // Validator
  validateBlockConfig,

  // Errors
  findSimilar,
  formatPropType,
} from '../src/blocks/index.js';

import type { TypePath, PropertyName, TenantId } from '../src/types/entity.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

// Create a sample block spec for testing
const headerBlockSpec: BlockSpec = {
  type: 'trellis.entity-header' as BlockType,
  version: '1.0.0',
  name: 'Entity Header',
  description: 'Displays entity header information',
  category: 'content',
  props: {
    entityType: {
      type: { kind: 'entityType' },
      required: true,
      description: 'The entity type to display',
    },
    showIcon: {
      type: { kind: 'boolean' },
      required: false,
      default: true,
      description: 'Whether to show the entity icon',
    },
    titleProperty: {
      type: { kind: 'entityProperty', ofType: 'self' },
      required: false,
      description: 'Property to use as title',
    },
  },
  emits: {
    click: {
      description: 'Emitted when header is clicked',
      payload: {
        kind: 'record',
        fields: {
          entityId: { type: { kind: 'primitive', type: 'string' }, required: true },
        },
      },
      emittedWhen: 'User clicks the header',
    },
  },
  receives: {
    refresh: {
      description: 'Refresh the header display',
      payload: { kind: 'void' },
      behavior: 'Refetches entity data and re-renders',
    },
  },
  slots: {},
};

const formBlockSpec: BlockSpec = {
  type: 'trellis.entity-form' as BlockType,
  version: '1.0.0',
  name: 'Entity Form',
  description: 'Form for editing entities',
  category: 'input',
  props: {
    entityType: {
      type: { kind: 'entityType' },
      required: true,
      description: 'The entity type to edit',
    },
    fields: {
      type: {
        kind: 'list',
        element: { kind: 'entityProperty', ofType: 'self' },
      },
      required: true,
      description: 'Fields to include in form',
    },
    mode: {
      type: { kind: 'enum', values: ['create', 'edit', 'view'] },
      required: false,
      default: 'edit',
      description: 'Form mode',
    },
  },
  emits: {
    submit: {
      description: 'Form submitted',
      payload: {
        kind: 'record',
        fields: {
          entityId: { type: { kind: 'primitive', type: 'string' }, required: true },
          values: { type: { kind: 'record', fields: {} }, required: true },
        },
      },
      emittedWhen: 'User submits the form',
    },
  },
  receives: {
    reset: {
      description: 'Reset form',
      payload: { kind: 'void' },
      behavior: 'Resets form to initial values',
    },
    startEdit: {
      description: 'Enter edit mode',
      payload: { kind: 'void' },
      behavior: 'Switches form to edit mode',
    },
  },
  slots: {},
};

const layoutBlockSpec: BlockSpec = {
  type: 'trellis.layout-panel' as BlockType,
  version: '1.0.0',
  name: 'Layout Panel',
  description: 'Container for other blocks',
  category: 'layout',
  props: {
    title: {
      type: { kind: 'text' },
      required: false,
      description: 'Panel title',
    },
    padding: {
      type: { kind: 'number', min: 0, max: 64 },
      required: false,
      default: 16,
      description: 'Padding in pixels',
    },
  },
  emits: {},
  receives: {},
  slots: {
    content: {
      description: 'Panel content',
      cardinality: 'many',
    },
    header: {
      description: 'Custom header',
      cardinality: 'one',
      accepts: ['trellis.entity-header' as BlockType],
    },
  },
};

// Sample entity schema
const partSchema = {
  type: 'product.part' as TypePath,
  name: 'Part',
  properties: [
    { name: 'name' as PropertyName, type: 'text' },
    { name: 'part_number' as PropertyName, type: 'text' },
    { name: 'revision' as PropertyName, type: 'text' },
    { name: 'status' as PropertyName, type: 'text' },
  ],
};

// =============================================================================
// REGISTRY TESTS
// =============================================================================

describe('BlockRegistry', () => {
  let registry: BlockRegistry;

  beforeEach(() => {
    registry = createBlockRegistry();
  });

  it('registers a block', () => {
    registry.registerBlock(headerBlockSpec);
    expect(registry.hasBlock(headerBlockSpec.type)).toBe(true);
  });

  it('retrieves a block by type', () => {
    registry.registerBlock(headerBlockSpec);
    const spec = registry.getBlock(headerBlockSpec.type);
    expect(spec).toBe(headerBlockSpec);
  });

  it('returns undefined for unknown block', () => {
    const spec = registry.getBlock('unknown.block' as BlockType);
    expect(spec).toBeUndefined();
  });

  it('lists all blocks', () => {
    registry.registerBlock(headerBlockSpec);
    registry.registerBlock(formBlockSpec);
    const blocks = registry.getBlocks();
    expect(blocks).toHaveLength(2);
  });

  it('filters blocks by category', () => {
    registry.registerBlock(headerBlockSpec);
    registry.registerBlock(formBlockSpec);
    registry.registerBlock(layoutBlockSpec);

    const contentBlocks = registry.getBlocks('content');
    expect(contentBlocks).toHaveLength(1);
    expect(contentBlocks[0].type).toBe('trellis.entity-header');

    const layoutBlocks = registry.getBlocks('layout');
    expect(layoutBlocks).toHaveLength(1);
  });
});

describe('EntitySchemaRegistry', () => {
  let registry: EntitySchemaRegistry;

  beforeEach(() => {
    registry = createEntitySchemaRegistry();
    registry.register(partSchema);
  });

  it('checks type existence', () => {
    expect(registry.hasType('product.part' as TypePath)).toBe(true);
    expect(registry.hasType('unknown.type' as TypePath)).toBe(false);
  });

  it('gets all types', () => {
    const types = registry.getTypes('*');
    expect(types).toHaveLength(1);
    expect(types[0].type).toBe('product.part');
  });

  it('checks property existence', () => {
    expect(
      registry.hasProperty('product.part' as TypePath, 'name' as PropertyName)
    ).toBe(true);
    expect(
      registry.hasProperty(
        'product.part' as TypePath,
        'unknown' as PropertyName
      )
    ).toBe(false);
  });

  it('gets properties for type', () => {
    const props = registry.getProperties('product.part' as TypePath);
    expect(props).toHaveLength(4);
    expect(props.map((p) => p.name)).toContain('name');
    expect(props.map((p) => p.name)).toContain('part_number');
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('validateBlockConfig', () => {
  let blockRegistry: BlockRegistry;
  let entityRegistry: EntitySchemaRegistry;
  const tenantId = 'tenant-1' as TenantId;

  beforeEach(() => {
    blockRegistry = createBlockRegistry();
    blockRegistry.registerBlock(headerBlockSpec);
    blockRegistry.registerBlock(formBlockSpec);
    blockRegistry.registerBlock(layoutBlockSpec);

    entityRegistry = createEntitySchemaRegistry();
    entityRegistry.register(partSchema);
  });

  it('validates a correct config', () => {
    const config: BlockConfig = {
      id: 'header-1' as BlockInstanceId,
      type: 'trellis.entity-header' as BlockType,
      props: {
        entityType: 'product.part',
        showIcon: true,
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects unknown block type', () => {
    const config: BlockConfig = {
      id: 'test-1' as BlockInstanceId,
      type: 'unknown.block' as BlockType,
      props: {},
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('BLOCK_TYPE_NOT_FOUND');
  });

  it('suggests similar block types', () => {
    const config: BlockConfig = {
      id: 'test-1' as BlockInstanceId,
      type: 'trellis.entity-heade' as BlockType, // typo
      props: {},
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].suggestions).toContain('trellis.entity-header');
  });

  it('detects missing required prop', () => {
    const config: BlockConfig = {
      id: 'header-1' as BlockInstanceId,
      type: 'trellis.entity-header' as BlockType,
      props: {
        // entityType is missing
        showIcon: true,
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('REQUIRED_PROP_MISSING');
    expect(result.errors[0].path).toContain('entityType');
  });

  it('detects unknown prop', () => {
    const config: BlockConfig = {
      id: 'header-1' as BlockInstanceId,
      type: 'trellis.entity-header' as BlockType,
      props: {
        entityType: 'product.part',
        unknownProp: 'value',
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('UNKNOWN_PROP');
  });

  it('detects type mismatch - expected string', () => {
    const config: BlockConfig = {
      id: 'header-1' as BlockInstanceId,
      type: 'trellis.entity-header' as BlockType,
      props: {
        entityType: 123, // should be string
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('EXPECTED_STRING');
  });

  it('detects type mismatch - expected boolean', () => {
    const config: BlockConfig = {
      id: 'header-1' as BlockInstanceId,
      type: 'trellis.entity-header' as BlockType,
      props: {
        entityType: 'product.part',
        showIcon: 'yes', // should be boolean
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('EXPECTED_BOOLEAN');
  });

  it('detects invalid entity type reference', () => {
    const config: BlockConfig = {
      id: 'header-1' as BlockInstanceId,
      type: 'trellis.entity-header' as BlockType,
      props: {
        entityType: 'unknown.type',
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('ENTITY_TYPE_NOT_FOUND');
  });

  it('detects invalid enum value', () => {
    const config: BlockConfig = {
      id: 'form-1' as BlockInstanceId,
      type: 'trellis.entity-form' as BlockType,
      props: {
        entityType: 'product.part',
        fields: ['name'],
        mode: 'invalid', // should be create, edit, or view
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_ENUM_VALUE');
  });

  it('validates list props', () => {
    const config: BlockConfig = {
      id: 'form-1' as BlockInstanceId,
      type: 'trellis.entity-form' as BlockType,
      props: {
        entityType: 'product.part',
        fields: 'name', // should be array
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('EXPECTED_ARRAY');
  });

  it('validates number range', () => {
    const config: BlockConfig = {
      id: 'panel-1' as BlockInstanceId,
      type: 'trellis.layout-panel' as BlockType,
      props: {
        padding: 100, // max is 64
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('VALUE_TOO_LARGE');
  });
});

// =============================================================================
// SLOT VALIDATION TESTS
// =============================================================================

describe('slot validation', () => {
  let blockRegistry: BlockRegistry;
  let entityRegistry: EntitySchemaRegistry;
  const tenantId = 'tenant-1' as TenantId;

  beforeEach(() => {
    blockRegistry = createBlockRegistry();
    blockRegistry.registerBlock(headerBlockSpec);
    blockRegistry.registerBlock(layoutBlockSpec);

    entityRegistry = createEntitySchemaRegistry();
    entityRegistry.register(partSchema);
  });

  it('validates valid slot content', () => {
    const config: BlockConfig = {
      id: 'panel-1' as BlockInstanceId,
      type: 'trellis.layout-panel' as BlockType,
      props: {},
      slots: {
        header: [
          {
            id: 'header-1' as BlockInstanceId,
            type: 'trellis.entity-header' as BlockType,
            props: { entityType: 'product.part' },
          },
        ],
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(true);
  });

  it('detects unknown slot name', () => {
    const config: BlockConfig = {
      id: 'panel-1' as BlockInstanceId,
      type: 'trellis.layout-panel' as BlockType,
      props: {},
      slots: {
        unknownSlot: [],
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('UNKNOWN_PROP');
  });

  it('detects slot cardinality violation', () => {
    const config: BlockConfig = {
      id: 'panel-1' as BlockInstanceId,
      type: 'trellis.layout-panel' as BlockType,
      props: {},
      slots: {
        header: [
          // header slot has cardinality: 'one'
          {
            id: 'header-1' as BlockInstanceId,
            type: 'trellis.entity-header' as BlockType,
            props: { entityType: 'product.part' },
          },
          {
            id: 'header-2' as BlockInstanceId,
            type: 'trellis.entity-header' as BlockType,
            props: { entityType: 'product.part' },
          },
        ],
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('CONSTRAINT_FAILED');
  });

  it('detects invalid block type in slot', () => {
    const config: BlockConfig = {
      id: 'panel-1' as BlockInstanceId,
      type: 'trellis.layout-panel' as BlockType,
      props: {},
      slots: {
        header: [
          {
            id: 'panel-nested' as BlockInstanceId,
            type: 'trellis.layout-panel' as BlockType, // not in accepts list
            props: {},
          },
        ],
      },
    };

    const result = validateBlockConfig(config, {
      blocks: blockRegistry,
      entities: entityRegistry,
      tenantId,
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('CONSTRAINT_FAILED');
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('findSimilar', () => {
  it('finds similar strings', () => {
    const candidates = ['entityType', 'entityId', 'entityName', 'showIcon'];
    const similar = findSimilar('entityTyp', candidates);
    expect(similar).toContain('entityType');
  });

  it('returns empty for no matches', () => {
    const candidates = ['alpha', 'beta', 'gamma'];
    const similar = findSimilar('xyz', candidates);
    expect(similar).toHaveLength(0);
  });

  it('limits results', () => {
    const candidates = ['test1', 'test2', 'test3', 'test4', 'test5'];
    const similar = findSimilar('test', candidates, 3);
    expect(similar.length).toBeLessThanOrEqual(3);
  });
});

describe('formatPropType', () => {
  it('formats simple types', () => {
    expect(formatPropType({ kind: 'text' })).toBe('text');
    expect(formatPropType({ kind: 'number' })).toBe('number');
    expect(formatPropType({ kind: 'boolean' })).toBe('boolean');
  });

  it('formats enum type', () => {
    const result = formatPropType({
      kind: 'enum',
      values: ['a', 'b', 'c'],
    });
    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toContain('c');
  });

  it('formats list type', () => {
    const result = formatPropType({
      kind: 'list',
      element: { kind: 'text' },
    });
    expect(result).toContain('list');
    expect(result).toContain('text');
  });
});
