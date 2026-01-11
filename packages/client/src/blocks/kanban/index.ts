/**
 * Trellis KanbanBlock - Public Exports
 */

// Main component
export { KanbanBlock, default } from './KanbanBlock.js';

// Sub-components
export { KanbanColumn } from './KanbanColumn.js';
export { KanbanCard } from './KanbanCard.js';

// Hooks
export { useDragDrop } from './useDragDrop.js';

// Types
export type {
  KanbanBlockProps,
  KanbanColumnProps,
  KanbanCardProps,
  KanbanColumnConfig,
  KanbanCardConfig,
  KanbanBadgeConfig,
  KanbanBlockEvent,
  DragState,
  DragData,
} from './types.js';

// Styles (for customization)
export {
  styles as kanbanStyles,
  kanbanTheme,
  getColumnColor,
  getBadgeStyle,
} from './styles.js';
