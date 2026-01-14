/**
 * Trellis Block System - Public Exports
 *
 * Exports all block components, types, and Connected wrappers.
 */

// =============================================================================
// SHARED TYPES
// =============================================================================

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

// =============================================================================
// BLOCK REGISTRY
// =============================================================================

export {
  BlockRegistry,
  getBlockComponent,
  hasBlock,
  getRegisteredBlockTypes,
  registerBlock,
  unregisterBlock,
} from './registry.js';

export type { BlockComponentProps, BlockRegistryMap } from './registry.js';

// =============================================================================
// BLOCK PROVIDER
// =============================================================================

export {
  BlockProvider,
  useBlockContext,
  useOptionalBlockContext,
  useBlockEmit,
  useBlockScope,
} from './BlockProvider.js';

export type { BlockContextValue, BlockProviderProps } from './BlockProvider.js';

// =============================================================================
// BLOCK RENDERER
// =============================================================================

export {
  BlockRenderer,
  SafeBlockRenderer,
  BlockErrorBoundary,
} from './BlockRenderer.js';

export type { BlockConfig, BlockRendererProps } from './BlockRenderer.js';

// =============================================================================
// INTEGRATION LAYER - Connected Wrappers
// =============================================================================

// Config normalization utilities
export {
  normalizeEntityType,
  normalizeEntityId,
  normalizeDataConfig,
  normalizeFormConfig,
  normalizeDetailConfig,
  normalizeKanbanConfig,
  normalizeTableConfig,
  isRouteParamValue,
  isScopeRefValue,
  resolveRouteParam,
  resolveScopeRef,
  resolveValue,
} from './integration/index.js';

export type {
  RuntimeContext,
  BlockSpec,
  NormalizedDataConfig,
  NormalizedFormConfig,
  NormalizedDetailConfig,
  NormalizedKanbanConfig,
  NormalizedTableConfig,
} from './integration/index.js';

// Core Connected wrappers
export {
  ConnectedTableBlock,
  useTableBlockConfig,
  buildTableBlockConfig,
} from './integration/ConnectedTableBlock.js';

export type { ConnectedTableBlockProps } from './integration/ConnectedTableBlock.js';

export { ConnectedFormBlock, buildFormBlockConfig } from './integration/ConnectedFormBlock.js';
export type { ConnectedFormBlockProps } from './integration/ConnectedFormBlock.js';

export { ConnectedDetailBlock, buildDetailBlockProps } from './integration/ConnectedDetailBlock.js';
export type { ConnectedDetailBlockProps } from './integration/ConnectedDetailBlock.js';

export { ConnectedKanbanBlock, buildKanbanBlockProps } from './integration/ConnectedKanbanBlock.js';
export type { ConnectedKanbanBlockProps } from './integration/ConnectedKanbanBlock.js';

// Additional Connected wrappers
export {
  ConnectedStatsBlock,
  ConnectedChartBlock,
  ConnectedCalendarBlock,
  ConnectedTimelineBlock,
  ConnectedCommentsBlock,
  ConnectedTreeViewBlock,
  ConnectedTabsBlock,
  ConnectedModalBlock,
  ConnectedFileUploaderBlock,
  ConnectedFileViewerBlock,
} from './integration/ConnectedBlocks.js';

export type {
  ConnectedStatsBlockProps,
  ConnectedChartBlockProps,
  ConnectedCalendarBlockProps,
  ConnectedTimelineBlockProps,
  ConnectedCommentsBlockProps,
  ConnectedTreeViewBlockProps,
  ConnectedTabsBlockProps,
  ConnectedModalBlockProps,
  ConnectedFileUploaderBlockProps,
  ConnectedFileViewerBlockProps,
} from './integration/ConnectedBlocks.js';

// =============================================================================
// CORE BLOCKS
// =============================================================================

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

// =============================================================================
// ADDITIONAL BLOCKS
// =============================================================================

// StatsBlock
export { StatsBlock, StatCard } from './stats/index.js';
export type {
  StatsBlockProps,
  StatsBlockConfig,
  StatConfig,
  StatCardProps,
  StatsBlockEvent,
} from './stats/types.js';

// ChartBlock
export { ChartBlock, BarChart, LineChart, AreaChart, PieChart, DoughnutChart } from './chart/index.js';
export type {
  ChartBlockProps,
  ChartBlockConfig,
  ChartType,
  ChartDataPoint,
  AggregateFunction,
  ChartBlockEvent,
} from './chart/types.js';

// CalendarBlock
export { CalendarBlock, CalendarDay, CalendarEvent, MonthView } from './calendar/index.js';
export type {
  CalendarBlockProps,
  CalendarBlockConfig,
  CalendarBlockEvent,
  CalendarDayData,
} from './calendar/types.js';

// TimelineBlock
export { TimelineBlock, TimelineEvent, TimelineDateGroup } from './timeline/index.js';
export type {
  TimelineBlockProps,
  TimelineBlockConfig,
  TimelineItem,
  TimelineBlockEvent,
} from './timeline/types.js';

// CommentsBlock
export { CommentsBlock, CommentCard, CommentInput } from './comments/index.js';
export type {
  CommentsBlockProps,
  CommentsBlockConfig,
  CommentsBlockEvent,
} from './comments/types.js';

// TreeViewBlock
export { TreeViewBlock, TreeNode } from './tree/index.js';
export type {
  TreeViewBlockProps,
  TreeViewBlockConfig,
  TreeNodeData,
  TreeViewBlockEvent,
} from './tree/types.js';

// TabsBlock (lazy-loaded through registry)
export type {
  TabsBlockProps,
  TabsBlockConfig,
  TabConfig,
  TabsBlockEvent,
} from './tabs/types.js';

// ModalBlock (lazy-loaded through registry)
export type {
  ModalBlockProps,
  ModalBlockConfig,
  ModalAction,
  ModalBlockEvent,
} from './modal/types.js';

// FileUploaderBlock
export { FileUploaderBlock } from './file-uploader/index.js';
export type {
  FileUploaderBlockProps,
  FileUploaderBlockConfig,
  FileUploaderBlockEvent,
} from './file-uploader/types.js';

// FileViewerBlock
export { FileViewerBlock } from './file-viewer/index.js';
export type {
  FileViewerBlockProps,
  FileViewerBlockConfig,
  FileViewerBlockEvent,
} from './file-viewer/types.js';
