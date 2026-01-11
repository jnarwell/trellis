/**
 * Trellis KanbanBlock - Type Definitions
 */

import type { Entity, EntityId, PropertyName } from '@trellis/kernel';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for a Kanban column.
 */
export interface KanbanColumnConfig {
  /** Status value that maps to this column */
  value: string;
  /** Display label for the column */
  label: string;
  /** Column accent color */
  color?: string;
  /** Work-in-progress limit */
  limit?: number;
}

/**
 * Configuration for a badge on a card.
 */
export interface KanbanBadgeConfig {
  /** Property to display as badge */
  property: PropertyName;
  /** Badge display format */
  display?: 'badge' | 'text' | 'icon';
}

/**
 * Configuration for card content.
 */
export interface KanbanCardConfig {
  /** Title template (e.g., "${$entity.name}") */
  title: string;
  /** Subtitle template */
  subtitle?: string;
  /** Badges to show on card */
  badges?: KanbanBadgeConfig[];
  /** Click event name */
  onClick?: string;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for KanbanBlock component.
 */
export interface KanbanBlockProps {
  /** Entity type to query */
  source: string;
  /** Property used for column grouping */
  statusProperty: PropertyName;
  /** Column configurations */
  columns: KanbanColumnConfig[];
  /** Card display configuration */
  card: KanbanCardConfig;
  /** Additional filter criteria */
  filter?: Record<string, unknown>;
  /** Event handler */
  onEvent?: (event: KanbanBlockEvent) => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * Props for KanbanColumn component.
 */
export interface KanbanColumnProps {
  /** Column configuration */
  config: KanbanColumnConfig;
  /** Entities in this column */
  entities: readonly Entity[];
  /** Card configuration */
  cardConfig: KanbanCardConfig;
  /** Whether column is drop target */
  isDropTarget: boolean;
  /** Handle drop event */
  onDrop: (entityId: EntityId) => void;
  /** Handle drag over */
  onDragOver: (e: React.DragEvent) => void;
  /** Handle drag leave */
  onDragLeave: () => void;
  /** Handle card click */
  onCardClick?: (entity: Entity) => void;
  /** Handle drag start */
  onDragStart: (entityId: EntityId) => void;
  /** Handle drag end */
  onDragEnd: () => void;
}

/**
 * Props for KanbanCard component.
 */
export interface KanbanCardProps {
  /** Entity to display */
  entity: Entity;
  /** Card configuration */
  config: KanbanCardConfig;
  /** Whether card is being dragged */
  isDragging: boolean;
  /** Handle drag start */
  onDragStart: (e: React.DragEvent) => void;
  /** Handle drag end */
  onDragEnd: () => void;
  /** Handle click */
  onClick?: () => void;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by KanbanBlock.
 */
export type KanbanBlockEvent =
  | { type: 'cardMoved'; entityId: EntityId; fromColumn: string; toColumn: string }
  | { type: 'cardClicked'; entity: Entity }
  | { type: 'statusChanged'; entity: Entity; oldStatus: string; newStatus: string }
  | { type: 'statusChangeFailed'; entityId: EntityId; error: Error }
  | { type: 'dataLoaded'; entities: readonly Entity[] }
  | { type: 'error'; error: Error };

// =============================================================================
// DRAG AND DROP TYPES
// =============================================================================

/**
 * Drag state.
 */
export interface DragState {
  /** ID of entity being dragged */
  draggedEntityId: EntityId | null;
  /** Column currently being hovered */
  dropTargetColumn: string | null;
}

/**
 * Drag data stored in dataTransfer.
 */
export interface DragData {
  entityId: EntityId;
  fromColumn: string;
}
