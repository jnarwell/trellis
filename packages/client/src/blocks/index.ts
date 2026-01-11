/**
 * Trellis Block System - Public Exports
 *
 * Exports all block components and types.
 */

// Shared types
export type {
  BlockContext,
  ActionConfig,
  FilterConfig,
  FilterOption,
  PaginationConfig,
  CellFormat,
  CellFormatOptions,
  EntityEventPayload,
  SelectionEventPayload,
  PaginationEventPayload,
  SortEventPayload,
  FilterEventPayload,
  ActionEventPayload,
} from './types.js';

// Block Registry
export {
  BlockRegistry,
  getBlockComponent,
  hasBlock,
  getRegisteredBlockTypes,
  registerBlock,
  unregisterBlock,
} from './registry.js';

export type { BlockComponentProps, BlockRegistryMap } from './registry.js';

// Block Provider
export {
  BlockProvider,
  useBlockContext,
  useOptionalBlockContext,
  useBlockEmit,
  useBlockScope,
} from './BlockProvider.js';

export type { BlockContextValue, BlockProviderProps } from './BlockProvider.js';

// Block Renderer
export {
  BlockRenderer,
  SafeBlockRenderer,
  BlockErrorBoundary,
} from './BlockRenderer.js';

export type { BlockConfig, BlockRendererProps } from './BlockRenderer.js';

// Connected Blocks (SDK-integrated)
export {
  ConnectedTableBlock,
  useTableBlockConfig,
  buildTableBlockConfig,
} from './integration/ConnectedTableBlock.js';

export type { ConnectedTableBlockProps } from './integration/ConnectedTableBlock.js';

// TableBlock
export * from './table/index.js';

// DetailBlock
export {
  DetailBlock,
  DetailSection,
  DetailField,
  DetailActions,
  detailStyles,
  detailTheme,
  getBadgeStyle as getDetailBadgeStyle,
} from './detail/index.js';

export type {
  DetailBlockProps,
  DetailSectionProps,
  DetailFieldProps,
  DetailActionsProps,
  DetailSectionConfig,
  DetailFieldConfig,
  DetailActionConfig,
  DetailBlockEvent,
  FieldFormat,
} from './detail/index.js';

// KanbanBlock
export {
  KanbanBlock,
  KanbanColumn,
  KanbanCard,
  useDragDrop,
  kanbanStyles,
  kanbanTheme,
  getColumnColor,
  getBadgeStyle as getKanbanBadgeStyle,
} from './kanban/index.js';

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
} from './kanban/index.js';

// FormBlock
export * from './form/index.js';
