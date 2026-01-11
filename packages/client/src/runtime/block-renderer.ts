/**
 * Trellis Block Runtime - Block Renderer
 *
 * Placeholder for block instantiation and rendering.
 * Actual React components will be implemented in a future phase.
 */

import type { BlockType, BlockInstanceId, BlockSpec } from '@trellis/kernel';
import type { BlockPlacement } from '@trellis/server';
import type { BindingScope } from '../binding/index.js';
import { evaluateString, evaluateTemplate } from '../binding/index.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A rendered block instance.
 */
export interface BlockInstance {
  /** Block instance ID */
  readonly id: BlockInstanceId;

  /** Block type */
  readonly type: BlockType;

  /** Resolved props (after data binding evaluation) */
  readonly props: Record<string, unknown>;

  /** Child block instances (from slots) */
  readonly children: Record<string, BlockInstance[]>;

  /** Whether block is visible (showWhen evaluated to true) */
  readonly visible: boolean;
}

/**
 * Block registry for looking up specs.
 */
export interface BlockSpecRegistry {
  getSpec(type: BlockType): BlockSpec | undefined;
}

// =============================================================================
// BLOCK RESOLUTION
// =============================================================================

/**
 * Resolve a block placement into a block instance.
 * This evaluates data bindings and prepares the block for rendering.
 */
export function resolveBlock(
  placement: BlockPlacement,
  scope: BindingScope,
  registry?: BlockSpecRegistry
): BlockInstance {
  // Generate ID if not provided
  const id = placement.id ?? (`block-${Math.random().toString(36).slice(2)}` as BlockInstanceId);

  // Evaluate showWhen
  let visible = true;
  if (placement.showWhen) {
    try {
      const result = evaluateString(placement.showWhen, scope);
      visible = Boolean(result);
    } catch {
      visible = false;
    }
  }

  // Resolve props (evaluate data bindings)
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(placement.props)) {
    props[key] = resolveValue(value, scope);
  }

  // Resolve slots
  const children: Record<string, BlockInstance[]> = {};
  if (placement.slots) {
    for (const [slotName, slotBlocks] of Object.entries(placement.slots)) {
      children[slotName] = slotBlocks.map((block) => resolveBlock(block, scope, registry));
    }
  }

  return {
    id,
    type: placement.type,
    props,
    children,
    visible,
  };
}

/**
 * Resolve a prop value, evaluating data bindings.
 */
function resolveValue(value: unknown, scope: BindingScope): unknown {
  // String starting with $ is a data binding
  if (typeof value === 'string') {
    if (value.startsWith('$')) {
      try {
        return evaluateString(value, scope);
      } catch (error) {
        console.warn(`Failed to evaluate binding: ${value}`, error);
        return undefined;
      }
    }

    // String containing ${...} is a template
    if (value.includes('${')) {
      try {
        return evaluateTemplate(value, scope);
      } catch (error) {
        console.warn(`Failed to evaluate template: ${value}`, error);
        return value;
      }
    }

    return value;
  }

  // Arrays: resolve each element
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, scope));
  }

  // Objects: resolve each value (but not if it looks like a nested block config)
  if (typeof value === 'object' && value !== null) {
    // Check if this looks like a block placement (has 'type' and 'props')
    if ('type' in value && 'props' in value) {
      // It's a nested block, don't resolve it
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = resolveValue(v, scope);
    }
    return result;
  }

  // Primitives: return as-is
  return value;
}

// =============================================================================
// BLOCK INSTANCE HELPERS
// =============================================================================

/**
 * Get all visible block instances from a tree.
 */
export function getVisibleBlocks(root: BlockInstance): BlockInstance[] {
  const result: BlockInstance[] = [];

  function traverse(instance: BlockInstance): void {
    if (!instance.visible) return;

    result.push(instance);

    for (const slotBlocks of Object.values(instance.children)) {
      for (const child of slotBlocks) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return result;
}

/**
 * Find a block instance by ID.
 */
export function findBlockById(root: BlockInstance, id: BlockInstanceId): BlockInstance | undefined {
  function search(instance: BlockInstance): BlockInstance | undefined {
    if (instance.id === id) return instance;

    for (const slotBlocks of Object.values(instance.children)) {
      for (const child of slotBlocks) {
        const found = search(child);
        if (found) return found;
      }
    }

    return undefined;
  }

  return search(root);
}

/**
 * Get all block instance IDs from a tree.
 */
export function getAllBlockIds(root: BlockInstance): BlockInstanceId[] {
  const ids: BlockInstanceId[] = [];

  function traverse(instance: BlockInstance): void {
    ids.push(instance.id);

    for (const slotBlocks of Object.values(instance.children)) {
      for (const child of slotBlocks) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return ids;
}
