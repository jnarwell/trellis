/**
 * Trellis TreeViewBlock - Type Definitions
 *
 * Hierarchical tree display for BOM structures, folder trees, category hierarchies, org charts.
 */

import type { Entity, EntityId, PropertyName } from '@trellis/kernel';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for TreeViewBlock (from YAML).
 */
export interface TreeViewBlockConfig {
  /** Block type identifier */
  readonly block: 'tree';

  /** Entity type to query */
  readonly entityType: string;

  /** Property linking to parent (default: 'parent_id') */
  readonly parentProperty?: string;

  /** Property to display as node label */
  readonly labelProperty: string;

  /** Property for node icon (optional) */
  readonly iconProperty?: string;

  /** For embedded children (vs. relational) */
  readonly childrenProperty?: string;

  /** Start expanded or collapsed (default: false) */
  readonly expandedByDefault?: boolean;

  /** Can select nodes (default: true) */
  readonly selectable?: boolean;

  /** Allow multiple selection (default: false) */
  readonly multiSelect?: boolean;

  /** Enable drag to reorder/reparent (default: false) */
  readonly draggable?: boolean;

  /** Limit nesting depth */
  readonly maxDepth?: number;

  /** Selection action config */
  readonly onSelect?: {
    action: 'navigate' | 'emit';
    view?: string;
    event?: string;
  };

  /** Optional filter for query */
  readonly filter?: Record<string, unknown>;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for TreeViewBlock component.
 */
export interface TreeViewBlockProps {
  /** Block configuration */
  readonly config: TreeViewBlockConfig;

  /** External entities data (for Storybook or parent-provided data) */
  readonly entities?: readonly Entity[];

  /** Event handler callback */
  readonly onEvent?: (event: TreeViewBlockEvent) => void;

  /** Additional CSS class */
  readonly className?: string;
}

/**
 * Props for TreeNode component.
 */
export interface TreeNodeProps {
  /** The tree node data */
  readonly node: TreeNodeData;

  /** Tree view config */
  readonly config: TreeViewBlockConfig;

  /** Currently selected node IDs */
  readonly selectedIds: Set<EntityId>;

  /** Expanded node IDs */
  readonly expandedIds: Set<EntityId>;

  /** Toggle node expansion */
  readonly onToggleExpand: (nodeId: EntityId) => void;

  /** Handle node selection */
  readonly onSelect: (node: TreeNodeData, event: React.MouseEvent) => void;

  /** Handle drag start (if draggable) */
  readonly onDragStart?: ((e: React.DragEvent, node: TreeNodeData) => void) | undefined;

  /** Handle drag over */
  readonly onDragOver?: ((e: React.DragEvent, node: TreeNodeData) => void) | undefined;

  /** Handle drag leave */
  readonly onDragLeave?: ((e: React.DragEvent, node: TreeNodeData) => void) | undefined;

  /** Handle drop */
  readonly onDrop?: ((e: React.DragEvent, node: TreeNodeData) => void) | undefined;

  /** Handle drag end */
  readonly onDragEnd?: (() => void) | undefined;

  /** Current drag target node ID */
  readonly dragTargetId?: EntityId | null | undefined;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by TreeViewBlock.
 */
export type TreeViewBlockEvent =
  | { type: 'dataLoaded'; entities: readonly Entity[] }
  | { type: 'nodeSelected'; node: TreeNodeData; entity: Entity }
  | { type: 'nodeDeselected'; node: TreeNodeData; entity: Entity }
  | { type: 'selectionChanged'; selectedIds: EntityId[]; selectedNodes: TreeNodeData[] }
  | { type: 'nodeExpanded'; node: TreeNodeData }
  | { type: 'nodeCollapsed'; node: TreeNodeData }
  | { type: 'nodeMoved'; entityId: EntityId; oldParentId: EntityId | null; newParentId: EntityId | null }
  | { type: 'nodeMoveFailed'; entityId: EntityId; error: Error }
  | { type: 'error'; error: Error };

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Internal tree node structure.
 */
export interface TreeNodeData {
  /** Node ID (entity ID) */
  readonly id: EntityId;

  /** The source entity */
  readonly entity: Entity;

  /** Child nodes */
  readonly children: TreeNodeData[];

  /** Depth in tree (0 = root) */
  readonly depth: number;

  /** Parent node ID (null for roots) */
  readonly parentId: EntityId | null;

  /** Whether this node has children */
  readonly hasChildren: boolean;
}

/**
 * Drag state for tree drag-and-drop.
 */
export interface TreeDragState {
  /** Currently dragged node ID */
  readonly draggedNodeId: EntityId | null;

  /** Current drop target node ID */
  readonly dropTargetNodeId: EntityId | null;

  /** Original parent ID of dragged node */
  readonly originalParentId: EntityId | null;
}

/**
 * Drag data transferred during drag-and-drop.
 */
export interface TreeDragData {
  readonly nodeId: EntityId;
  readonly parentId: EntityId | null;
}
