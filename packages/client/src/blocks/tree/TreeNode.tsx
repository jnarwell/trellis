/**
 * Trellis TreeNode - Individual Tree Node Component
 *
 * Renders a single node in the tree with expand/collapse, selection, and drag-drop support.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Entity, EntityId, PropertyName } from '@trellis/kernel';
import type { TreeNodeProps, TreeNodeData } from './types.js';
import { styles } from './styles.js';

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

// =============================================================================
// ICONS
// =============================================================================

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4.5 2.5L8 6L4.5 9.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.5 4.5L6 8L9.5 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FolderIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1.75 3.5C1.75 2.80964 2.30964 2.25 3 2.25H5.25L6.5 3.5H11C11.6904 3.5 12.25 4.05964 12.25 4.75V10.5C12.25 11.1904 11.6904 11.75 11 11.75H3C2.30964 11.75 1.75 11.1904 1.75 10.5V3.5Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FileIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.25 1.75H3.5C2.80964 1.75 2.25 2.30964 2.25 3V11C2.25 11.6904 2.80964 12.25 3.5 12.25H10.5C11.1904 12.25 11.75 11.6904 11.75 11V5.25M8.25 1.75L11.75 5.25M8.25 1.75V5.25H11.75"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// =============================================================================
// TREE NODE COMPONENT
// =============================================================================

/**
 * TreeNode renders a single node with its children recursively.
 */
export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  config,
  selectedIds,
  expandedIds,
  onToggleExpand,
  onSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  dragTargetId,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Derived state
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedIds.has(node.id);
  const isDragTarget = dragTargetId === node.id;
  const isDraggable = config.draggable ?? false;
  const selectable = config.selectable ?? true;
  const maxDepth = config.maxDepth ?? Infinity;

  // Get label from entity
  const label = useMemo(() => {
    const labelProp = config.labelProperty as PropertyName;
    const value = getPropertyValue(node.entity, labelProp);
    return value !== undefined && value !== null ? String(value) : 'Untitled';
  }, [node.entity, config.labelProperty]);

  // Get icon from entity (if configured)
  const icon = useMemo(() => {
    if (!config.iconProperty) return null;
    const iconProp = config.iconProperty as PropertyName;
    const value = getPropertyValue(node.entity, iconProp);
    return value !== undefined && value !== null ? String(value) : null;
  }, [node.entity, config.iconProperty]);

  // Calculate indent based on depth
  const indent = useMemo(() => {
    return `calc(${node.depth} * var(--tree-indent, 1.5rem))`;
  }, [node.depth]);

  // Check if we should render children
  const shouldRenderChildren = node.hasChildren && isExpanded && node.depth < maxDepth;

  // Event handlers
  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(node.id);
    },
    [node.id, onToggleExpand]
  );

  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      if (selectable) {
        onSelect(node, e);
      }
    },
    [node, selectable, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (selectable) {
          onSelect(node, e as unknown as React.MouseEvent);
        }
      } else if (e.key === 'ArrowRight' && node.hasChildren && !isExpanded) {
        e.preventDefault();
        onToggleExpand(node.id);
      } else if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault();
        onToggleExpand(node.id);
      }
    },
    [node, selectable, isExpanded, onSelect, onToggleExpand]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (isDraggable && onDragStart) {
        onDragStart(e, node);
      }
    },
    [isDraggable, node, onDragStart]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (isDraggable && onDragOver) {
        onDragOver(e, node);
      }
    },
    [isDraggable, node, onDragOver]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (isDraggable && onDragLeave) {
        onDragLeave(e, node);
      }
    },
    [isDraggable, node, onDragLeave]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (isDraggable && onDrop) {
        onDrop(e, node);
      }
    },
    [isDraggable, node, onDrop]
  );

  // Compute row styles
  const rowStyle: React.CSSProperties = {
    ...styles['nodeRow'],
    paddingLeft: `calc(0.75rem + ${indent})`,
    ...(isHovered ? styles['nodeRowHover'] : {}),
    ...(isSelected ? styles['nodeRowSelected'] : {}),
    ...(isDragTarget ? styles['nodeRowDropTarget'] : {}),
  };

  return (
    <div className="tree-node" style={styles['node']} data-node-id={node.id}>
      {/* Node row */}
      <div
        className={`tree-node__row ${isSelected ? 'tree-node__row--selected' : ''}`}
        style={rowStyle}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={onDragEnd}
        tabIndex={selectable ? 0 : -1}
        role="treeitem"
        aria-expanded={node.hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        data-testid={`tree-node-${node.id}`}
      >
        {/* Expand/collapse button */}
        {node.hasChildren ? (
          <button
            type="button"
            className="tree-node__expand"
            style={styles['expandButton']}
            onClick={handleExpandClick}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            tabIndex={-1}
          >
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </button>
        ) : (
          <span style={styles['expandButtonPlaceholder']} />
        )}

        {/* Icon */}
        <span className="tree-node__icon" style={styles['nodeIcon']}>
          {icon ? (
            <span>{icon}</span>
          ) : node.hasChildren ? (
            <FolderIcon />
          ) : (
            <FileIcon />
          )}
        </span>

        {/* Label */}
        <span
          className="tree-node__label"
          style={{
            ...styles['nodeLabel'],
            ...(isSelected ? styles['nodeLabelSelected'] : {}),
          }}
        >
          {label}
        </span>
      </div>

      {/* Children */}
      {shouldRenderChildren && (
        <div
          className="tree-node__children"
          style={styles['nodeChildren']}
          role="group"
        >
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              config={config}
              selectedIds={selectedIds}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              dragTargetId={dragTargetId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
