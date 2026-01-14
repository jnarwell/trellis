/**
 * Trellis TreeViewBlock - Main Component
 *
 * Displays hierarchical data as an expandable tree.
 * Supports flat data (parent_id based) and nested data (children array).
 *
 * @example
 * ```tsx
 * <TreeViewBlock
 *   config={{
 *     block: 'tree',
 *     entityType: 'category',
 *     parentProperty: 'parent_id',
 *     labelProperty: 'name',
 *     selectable: true,
 *     onSelect: { action: 'navigate', view: 'category-detail' },
 *   }}
 *   onEvent={(event) => console.log(event)}
 * />
 * ```
 */

import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import type { Entity, EntityId, PropertyName, PropertyInput } from '@trellis/kernel';
import { useQuery, useUpdateEntity, useSubscription } from '../../state/hooks.js';
import { useNavigation } from '../../runtime/NavigationProvider.js';
import type {
  TreeViewBlockProps,
  TreeViewBlockEvent,
  TreeNodeData,
  TreeDragState,
  TreeDragData,
} from './types.js';
import { styles, treeTheme, injectKeyframes } from './styles.js';
import { TreeNode } from './TreeNode.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const DRAG_TYPE = 'application/x-trellis-tree-node';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract property value from entity.
 */
function getPropertyValue(entity: Entity, property: PropertyName): unknown {
  const prop = entity.properties[property];
  if (!prop) return undefined;

  switch (prop.source) {
    case 'literal':
    case 'measured': {
      const value = prop.value;
      if (value && typeof value === 'object' && 'value' in value) {
        return (value as { value: unknown }).value;
      }
      return value;
    }

    case 'inherited': {
      const inhProp = prop as {
        override?: { value?: unknown };
        resolved_value?: { value?: unknown };
      };
      const inhValue = inhProp.override ?? inhProp.resolved_value;
      if (inhValue && typeof inhValue === 'object' && 'value' in inhValue) {
        return inhValue.value;
      }
      return inhValue;
    }

    case 'computed': {
      const compProp = prop as { cached_value?: { value?: unknown } };
      const cached = compProp.cached_value;
      if (cached && typeof cached === 'object' && 'value' in cached) {
        return cached.value;
      }
      return cached;
    }

    default:
      return undefined;
  }
}

/**
 * Build tree structure from flat entity list using parent property.
 */
function buildTreeFromFlat(
  entities: readonly Entity[],
  parentProperty: string,
  maxDepth: number = Infinity
): TreeNodeData[] {
  const entityMap = new Map<EntityId, Entity>();
  const childrenMap = new Map<EntityId | null, Entity[]>();

  // Index entities by ID and group by parent
  for (const entity of entities) {
    entityMap.set(entity.id, entity);

    const parentId = getPropertyValue(entity, parentProperty as PropertyName) as EntityId | null | undefined;
    const normalizedParentId = parentId ?? null;

    if (!childrenMap.has(normalizedParentId)) {
      childrenMap.set(normalizedParentId, []);
    }
    childrenMap.get(normalizedParentId)!.push(entity);
  }

  // Recursively build tree nodes
  function buildNodes(parentId: EntityId | null, depth: number): TreeNodeData[] {
    if (depth >= maxDepth) return [];

    const children = childrenMap.get(parentId) ?? [];

    return children.map((entity) => {
      const nodeChildren = buildNodes(entity.id, depth + 1);
      return {
        id: entity.id,
        entity,
        children: nodeChildren,
        depth,
        parentId,
        hasChildren: nodeChildren.length > 0,
      };
    });
  }

  return buildNodes(null, 0);
}

/**
 * Build tree structure from nested entity data (children property).
 */
function buildTreeFromNested(
  entities: readonly Entity[],
  childrenProperty: string,
  maxDepth: number = Infinity
): TreeNodeData[] {
  function buildNode(entity: Entity, depth: number, parentId: EntityId | null): TreeNodeData {
    if (depth >= maxDepth) {
      return {
        id: entity.id,
        entity,
        children: [],
        depth,
        parentId,
        hasChildren: false,
      };
    }

    const childEntities = getPropertyValue(entity, childrenProperty as PropertyName) as Entity[] | undefined;
    const children = (childEntities ?? []).map((child) => buildNode(child, depth + 1, entity.id));

    return {
      id: entity.id,
      entity,
      children,
      depth,
      parentId,
      hasChildren: children.length > 0,
    };
  }

  return entities.map((entity) => buildNode(entity, 0, null));
}

/**
 * Collect all node IDs in a tree (for expand all).
 */
function collectAllNodeIds(nodes: TreeNodeData[]): EntityId[] {
  const ids: EntityId[] = [];

  function collect(nodeList: TreeNodeData[]) {
    for (const node of nodeList) {
      if (node.hasChildren) {
        ids.push(node.id);
        collect(node.children);
      }
    }
  }

  collect(nodes);
  return ids;
}

/**
 * Find a node by ID in the tree.
 */
function findNodeById(nodes: TreeNodeData[], id: EntityId): TreeNodeData | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children.length > 0) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// =============================================================================
// STATE COMPONENTS
// =============================================================================

const TreeLoading: React.FC = () => (
  <div
    className="tree-block tree-block--loading"
    style={{ ...treeTheme, ...styles['container'], ...styles['loading'] }}
    data-testid="tree-loading"
  >
    <div style={styles['loadingSpinner']} />
    <span>Loading...</span>
  </div>
);

const TreeError: React.FC<{ error: Error }> = ({ error }) => (
  <div
    className="tree-block tree-block--error"
    style={{ ...treeTheme, ...styles['container'], ...styles['error'] }}
    data-testid="tree-error"
  >
    <span>Error: {error.message}</span>
  </div>
);

const TreeEmpty: React.FC = () => (
  <div
    className="tree-block tree-block--empty"
    style={{ ...treeTheme, ...styles['container'], ...styles['empty'] }}
    data-testid="tree-empty"
  >
    <span style={styles['emptyIcon']}>🌲</span>
    <span>No items found</span>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TreeViewBlock: React.FC<TreeViewBlockProps> = ({
  config,
  entities: externalEntities,
  onEvent,
  className,
}) => {
  // Inject keyframes for spinner animation
  useEffect(() => {
    injectKeyframes();
  }, []);

  // Navigation
  const navigation = useNavigation();

  // Config with defaults
  const entityType = config.entityType;
  const parentProperty = config.parentProperty ?? 'parent_id';
  const childrenProperty = config.childrenProperty;
  const expandedByDefault = config.expandedByDefault ?? false;
  const multiSelect = config.multiSelect ?? false;
  const draggable = config.draggable ?? false;
  const maxDepth = config.maxDepth ?? Infinity;

  // Track whether we've initialized expanded state
  const hasInitializedExpandedRef = useRef(false);

  // State
  const [selectedIds, setSelectedIds] = useState<Set<EntityId>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<EntityId>>(new Set());
  const [dragState, setDragState] = useState<TreeDragState>({
    draggedNodeId: null,
    dropTargetNodeId: null,
    originalParentId: null,
  });

  // Query entities (skip if external data provided)
  const queryOptions = config.filter ? { filter: config.filter, includeTotal: false } : { includeTotal: false };
  const {
    data: queriedEntities,
    loading,
    error,
    refetch,
  } = useQuery(entityType, {
    ...queryOptions,
    skip: !!externalEntities,
  });

  // Use external entities if provided, otherwise use queried
  const entities = externalEntities ?? queriedEntities;

  // Update mutation (for drag-drop reparenting)
  const { mutate: updateEntity } = useUpdateEntity();

  // Subscribe to real-time updates
  useSubscription({ entityType }, () => {
    if (!externalEntities) {
      refetch();
    }
  });

  // Build tree structure
  const treeNodes = useMemo(() => {
    if (!entities || entities.length === 0) return [];

    if (childrenProperty) {
      return buildTreeFromNested(entities, childrenProperty, maxDepth);
    }
    return buildTreeFromFlat(entities, parentProperty, maxDepth);
  }, [entities, parentProperty, childrenProperty, maxDepth]);

  // Initialize expanded state when data loads (only once)
  useEffect(() => {
    if (treeNodes.length > 0 && expandedByDefault && !hasInitializedExpandedRef.current) {
      hasInitializedExpandedRef.current = true;
      const allIds = collectAllNodeIds(treeNodes);
      setExpandedIds(new Set(allIds));
    }
  }, [treeNodes, expandedByDefault]);

  // Emit dataLoaded event
  useEffect(() => {
    if (entities && entities.length > 0 && onEvent) {
      onEvent({ type: 'dataLoaded', entities });
    }
  }, [entities, onEvent]);

  // Emit error event
  useEffect(() => {
    if (error && onEvent) {
      onEvent({ type: 'error', error: new Error(error.message ?? 'Unknown error') });
    }
  }, [error, onEvent]);

  // Toggle node expansion
  const handleToggleExpand = useCallback(
    (nodeId: EntityId) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
          const node = findNodeById(treeNodes, nodeId);
          if (node) {
            onEvent?.({ type: 'nodeCollapsed', node });
          }
        } else {
          next.add(nodeId);
          const node = findNodeById(treeNodes, nodeId);
          if (node) {
            onEvent?.({ type: 'nodeExpanded', node });
          }
        }
        return next;
      });
    },
    [treeNodes, onEvent]
  );

  // Expand all nodes
  const handleExpandAll = useCallback(() => {
    const allIds = collectAllNodeIds(treeNodes);
    setExpandedIds(new Set(allIds));
  }, [treeNodes]);

  // Collapse all nodes
  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // Handle node selection
  const handleSelect = useCallback(
    (node: TreeNodeData, event: React.MouseEvent) => {
      const isSelected = selectedIds.has(node.id);

      if (multiSelect && (event.ctrlKey || event.metaKey)) {
        // Toggle selection with Ctrl/Cmd
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (isSelected) {
            next.delete(node.id);
            onEvent?.({ type: 'nodeDeselected', node, entity: node.entity });
          } else {
            next.add(node.id);
            onEvent?.({ type: 'nodeSelected', node, entity: node.entity });
          }

          // Emit selection changed
          const selectedNodes = Array.from(next)
            .map((id) => findNodeById(treeNodes, id))
            .filter((n): n is TreeNodeData => n !== null);
          onEvent?.({
            type: 'selectionChanged',
            selectedIds: Array.from(next),
            selectedNodes,
          });

          return next;
        });
      } else {
        // Single selection (replace)
        if (isSelected && selectedIds.size === 1) {
          // Deselect if already selected and it's the only selection
          setSelectedIds(new Set());
          onEvent?.({ type: 'nodeDeselected', node, entity: node.entity });
          onEvent?.({ type: 'selectionChanged', selectedIds: [], selectedNodes: [] });
        } else {
          setSelectedIds(new Set([node.id]));
          onEvent?.({ type: 'nodeSelected', node, entity: node.entity });
          onEvent?.({
            type: 'selectionChanged',
            selectedIds: [node.id],
            selectedNodes: [node],
          });

          // Handle navigation action
          if (config.onSelect?.action === 'navigate' && config.onSelect.view) {
            navigation.push(config.onSelect.view, { entityId: node.id });
          }
        }
      }
    },
    [selectedIds, multiSelect, treeNodes, config.onSelect, navigation, onEvent]
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, node: TreeNodeData) => {
      const data: TreeDragData = {
        nodeId: node.id,
        parentId: node.parentId,
      };
      e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(data));
      e.dataTransfer.effectAllowed = 'move';

      setDragState({
        draggedNodeId: node.id,
        dropTargetNodeId: null,
        originalParentId: node.parentId,
      });
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, node: TreeNodeData) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;

      // Prevent dropping on self or own descendants
      if (dragState.draggedNodeId === node.id) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      setDragState((prev) => ({
        ...prev,
        dropTargetNodeId: node.id,
      }));
    },
    [dragState.draggedNodeId]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent, node: TreeNodeData) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (relatedTarget) {
        const nodeElement = (e.currentTarget as HTMLElement).closest('[data-node-id]');
        if (nodeElement?.contains(relatedTarget)) {
          return;
        }
      }

      setDragState((prev) => {
        if (prev.dropTargetNodeId !== node.id) return prev;
        return { ...prev, dropTargetNodeId: null };
      });
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetNode: TreeNodeData) => {
      e.preventDefault();

      const dataStr = e.dataTransfer.getData(DRAG_TYPE);
      if (!dataStr) return;

      try {
        const data: TreeDragData = JSON.parse(dataStr);

        // Don't move to same parent
        if (data.parentId === targetNode.id) {
          handleDragEnd();
          return;
        }

        // Find the dragged entity
        const draggedEntity = entities?.find((e) => e.id === data.nodeId);
        if (!draggedEntity) {
          handleDragEnd();
          return;
        }

        // Update parent reference
        try {
          await updateEntity({
            id: data.nodeId,
            expected_version: draggedEntity.version,
            set_properties: {
              [parentProperty as PropertyName]: {
                source: 'literal' as const,
                value: { type: 'reference' as const, value: targetNode.id },
              },
            } as unknown as Record<PropertyName, PropertyInput>,
          });

          onEvent?.({
            type: 'nodeMoved',
            entityId: data.nodeId,
            oldParentId: data.parentId,
            newParentId: targetNode.id,
          });

          // Refetch to update tree
          refetch();
        } catch (err) {
          console.error('Failed to move node:', err);
          onEvent?.({
            type: 'nodeMoveFailed',
            entityId: data.nodeId,
            error: err instanceof Error ? err : new Error('Move failed'),
          });
        }
      } catch (err) {
        console.error('Failed to parse drag data:', err);
      }

      handleDragEnd();
    },
    [entities, parentProperty, updateEntity, refetch, onEvent]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({
      draggedNodeId: null,
      dropTargetNodeId: null,
      originalParentId: null,
    });
  }, []);

  // ==========================================================================
  // RENDER GUARDS
  // ==========================================================================

  // GUARD: Loading state
  if (loading && (!entities || entities.length === 0)) {
    return <TreeLoading />;
  }

  // GUARD: Error state
  if (error) {
    return <TreeError error={new Error(error.message ?? 'Failed to load')} />;
  }

  // GUARD: Empty state
  if (!entities || entities.length === 0) {
    return <TreeEmpty />;
  }

  // GUARD: No tree nodes (all entities might be orphaned children)
  if (treeNodes.length === 0) {
    return <TreeEmpty />;
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div
      className={`tree-block ${className ?? ''}`}
      style={{ ...treeTheme, ...styles['container'] }}
      data-testid="tree-block"
      data-entity-type={entityType}
      role="tree"
      aria-label="Tree view"
    >
      {/* Header with expand/collapse all */}
      <div style={styles['header']}>
        <span style={styles['headerTitle']}>
          {entities.length} item{entities.length !== 1 ? 's' : ''}
        </span>
        <div style={styles['headerActions']}>
          <button
            type="button"
            style={{ ...styles['button'], ...styles['buttonSecondary'] }}
            onClick={handleExpandAll}
            aria-label="Expand all"
          >
            Expand All
          </button>
          <button
            type="button"
            style={{ ...styles['button'], ...styles['buttonSecondary'] }}
            onClick={handleCollapseAll}
            aria-label="Collapse all"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree content */}
      <div style={styles['treeList']} role="group">
        {treeNodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            config={config}
            selectedIds={selectedIds}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            onSelect={handleSelect}
            onDragStart={draggable ? handleDragStart : undefined}
            onDragOver={draggable ? handleDragOver : undefined}
            onDragLeave={draggable ? handleDragLeave : undefined}
            onDrop={draggable ? handleDrop : undefined}
            onDragEnd={draggable ? handleDragEnd : undefined}
            dragTargetId={dragState.dropTargetNodeId}
          />
        ))}
      </div>
    </div>
  );
};

export default TreeViewBlock;
