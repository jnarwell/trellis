/**
 * Trellis Block Registry
 *
 * Maps block type strings to React components.
 *
 * NOTE: Container blocks (Tabs, Modal) that use BlockRenderer are lazy-loaded
 * to break the circular import: registry → TabsBlock → BlockRenderer → registry
 */

import React, { type ComponentType } from 'react';
import { TableBlock } from './table/index.js';
import { FormBlock } from './form/index.js';
import { DetailBlock } from './detail/index.js';
import { KanbanBlock } from './kanban/index.js';
import { StatsBlock } from './stats/index.js';
import { CalendarBlock } from './calendar/index.js';
import { TimelineBlock } from './timeline/index.js';
import { TreeViewBlock } from './tree/index.js';
import { ChartBlock } from './chart/index.js';
import { CommentsBlock } from './comments/index.js';
import { FileUploaderBlock } from './file-uploader/index.js';
import { FileViewerBlock } from './file-viewer/index.js';

// =============================================================================
// LAZY LOADED CONTAINER BLOCKS
// =============================================================================
// Container blocks that use BlockRenderer internally must be lazy-loaded
// to break the circular dependency cycle.

const LazyTabsBlock = React.lazy(() =>
  import('./tabs/index.js').then((m) => ({ default: m.TabsBlock }))
);
const LazyModalBlock = React.lazy(() =>
  import('./modal/index.js').then((m) => ({ default: m.ModalBlock }))
);

// =============================================================================
// TYPES
// =============================================================================

/**
 * Block component props base type.
 */
export interface BlockComponentProps {
  /** Block configuration */
  config?: Record<string, unknown>;
  /** Optional class name */
  className?: string;
}

/**
 * Block registry mapping type strings to components.
 */
export type BlockRegistryMap = Record<string, ComponentType<any>>;

// =============================================================================
// REGISTRY
// =============================================================================

/**
 * Default block registry with all built-in blocks.
 */
export const BlockRegistry: BlockRegistryMap = {
  // Short names
  table: TableBlock,
  form: FormBlock,
  detail: DetailBlock,
  kanban: KanbanBlock,
  stats: StatsBlock,
  calendar: CalendarBlock,
  timeline: TimelineBlock,
  tree: TreeViewBlock,
  tabs: LazyTabsBlock, // Lazy-loaded to break circular import
  modal: LazyModalBlock, // Lazy-loaded to break circular import
  comments: CommentsBlock,
  chart: ChartBlock,
  'file-uploader': FileUploaderBlock,
  'file-viewer': FileViewerBlock,

  // Qualified names (trellis namespace)
  'trellis.data-table': TableBlock,
  'trellis.property-editor': FormBlock,
  'trellis.detail-view': DetailBlock,
  'trellis.kanban-board': KanbanBlock,
  'trellis.stats': StatsBlock,
  'trellis.calendar': CalendarBlock,
  'trellis.timeline': TimelineBlock,
  'trellis.tree-view': TreeViewBlock,
  'trellis.tabs': LazyTabsBlock, // Lazy-loaded to break circular import
  'trellis.modal': LazyModalBlock, // Lazy-loaded to break circular import
  'trellis.comments': CommentsBlock,
  'trellis.chart': ChartBlock,
  'trellis.file-uploader': FileUploaderBlock,
  'trellis.file-viewer': FileViewerBlock,
};

/**
 * Get a block component by type.
 *
 * @param type - Block type string
 * @returns The block component or undefined if not found
 *
 * @example
 * ```tsx
 * const TableComponent = getBlockComponent('table');
 * if (TableComponent) {
 *   return <TableComponent config={config} />;
 * }
 * ```
 */
export function getBlockComponent(type: string): ComponentType<any> | undefined {
  return BlockRegistry[type];
}

/**
 * Check if a block type is registered.
 *
 * @param type - Block type string
 * @returns True if the block type is registered
 */
export function hasBlock(type: string): boolean {
  return type in BlockRegistry;
}

/**
 * Get all registered block types.
 *
 * @returns Array of registered block type strings
 */
export function getRegisteredBlockTypes(): string[] {
  return Object.keys(BlockRegistry);
}

/**
 * Register a custom block component.
 *
 * @param type - Block type string
 * @param component - React component to register
 *
 * @example
 * ```tsx
 * registerBlock('custom.my-block', MyCustomBlock);
 * ```
 */
export function registerBlock(
  type: string,
  component: ComponentType<any>
): void {
  BlockRegistry[type] = component;
}

/**
 * Unregister a block component.
 *
 * @param type - Block type string to remove
 * @returns True if the block was removed, false if it wasn't registered
 */
export function unregisterBlock(type: string): boolean {
  if (type in BlockRegistry) {
    delete BlockRegistry[type];
    return true;
  }
  return false;
}
