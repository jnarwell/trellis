/**
 * Trellis Block Integration Layer
 *
 * Connected block wrappers that handle:
 * - Config normalization (entityType/source/entity aliases)
 * - Route parameter resolution ($route.params.id → UUID)
 * - Scope variable resolution ($scope.selectedId → value)
 * - Event emission through block context
 */

// Config normalization utilities
export {
  normalizeEntityType,
  normalizeEntityId,
  normalizeDataConfig,
  normalizeFormConfig,
  normalizeDetailConfig,
  normalizeKanbanConfig,
  normalizeTableConfig,
  normalizeStatsConfig,
  normalizeChartConfig,
  normalizeCalendarConfig,
  normalizeTimelineConfig,
  normalizeCommentsConfig,
  normalizeTreeConfig,
  isRouteParamValue,
  isScopeRefValue,
  resolveRouteParam,
  resolveScopeRef,
  resolveValue,
  type RuntimeContext,
  type BlockSpec,
  type NormalizedDataConfig,
  type NormalizedFormConfig,
  type NormalizedDetailConfig,
  type NormalizedKanbanConfig,
  type NormalizedTableConfig,
  type NormalizedStatsConfig,
  type NormalizedChartConfig,
  type NormalizedCalendarConfig,
  type NormalizedTimelineConfig,
  type NormalizedCommentsConfig,
  type NormalizedTreeConfig,
} from './configNormalizer.js';

// Core connected blocks
export {
  ConnectedTableBlock,
  buildTableBlockConfig,
  useTableBlockConfig,
  type ConnectedTableBlockProps,
} from './ConnectedTableBlock.js';

export {
  ConnectedFormBlock,
  buildFormBlockConfig,
  type ConnectedFormBlockProps,
} from './ConnectedFormBlock.js';

export {
  ConnectedDetailBlock,
  buildDetailBlockProps,
  type ConnectedDetailBlockProps,
} from './ConnectedDetailBlock.js';

export {
  ConnectedKanbanBlock,
  buildKanbanBlockProps,
  type ConnectedKanbanBlockProps,
} from './ConnectedKanbanBlock.js';

// Additional connected blocks
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
  type ConnectedStatsBlockProps,
  type ConnectedChartBlockProps,
  type ConnectedCalendarBlockProps,
  type ConnectedTimelineBlockProps,
  type ConnectedCommentsBlockProps,
  type ConnectedTreeViewBlockProps,
  type ConnectedTabsBlockProps,
  type ConnectedModalBlockProps,
  type ConnectedFileUploaderBlockProps,
  type ConnectedFileViewerBlockProps,
} from './ConnectedBlocks.js';
