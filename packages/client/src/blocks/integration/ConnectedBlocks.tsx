/**
 * Trellis Connected Blocks
 *
 * SDK-integrated wrappers for all additional blocks.
 * Each wrapper handles config normalization and runtime context resolution.
 */

import React, { useMemo, useCallback } from 'react';
import type { Entity, EntityId, PropertyName, TypePath } from '@trellis/kernel';
import { useOptionalBlockContext } from '../BlockProvider.js';
import { useNavigation } from '../../runtime/NavigationProvider.js';
import {
  normalizeEntityType,
  normalizeEntityId,
  type RuntimeContext,
  type BlockSpec,
} from './configNormalizer.js';

// Import all block components
import { StatsBlock } from '../stats/index.js';
import { ChartBlock } from '../chart/index.js';
import { CalendarBlock } from '../calendar/index.js';
import { TimelineBlock } from '../timeline/index.js';
import { CommentsBlock } from '../comments/index.js';
import { TreeViewBlock } from '../tree/index.js';
import { TabsBlock } from '../tabs/index.js';
import { ModalBlock } from '../modal/index.js';
import { FileUploaderBlock } from '../file-uploader/index.js';
import { FileViewerBlock } from '../file-viewer/index.js';

// Import types
import type { StatsBlockConfig, StatsBlockEvent } from '../stats/types.js';
import type { ChartBlockConfig, ChartBlockEvent } from '../chart/types.js';
import type { CalendarBlockConfig, CalendarBlockEvent } from '../calendar/types.js';
import type { TimelineBlockConfig, TimelineBlockEvent } from '../timeline/types.js';
import type { CommentsBlockConfig, CommentsBlockEvent } from '../comments/types.js';
import type { TreeViewBlockConfig, TreeViewBlockEvent } from '../tree/types.js';
import type { TabsBlockConfig, TabsBlockEvent } from '../tabs/types.js';
import type { ModalBlockConfig, ModalBlockEvent } from '../modal/types.js';
import type { FileUploaderBlockConfig, FileUploaderBlockEvent } from '../file-uploader/types.js';
import type { FileViewerBlockConfig, FileViewerBlockEvent } from '../file-viewer/types.js';

// =============================================================================
// SHARED HOOKS
// =============================================================================

/**
 * Hook to build runtime context from navigation and block context.
 */
function useRuntimeContext(): RuntimeContext {
  const blockContext = useOptionalBlockContext();
  const { state } = useNavigation();

  return useMemo(
    () => ({
      routeParams: state.params,
      scope: blockContext?.scope ?? {},
    }),
    [state.params, blockContext?.scope]
  );
}

// =============================================================================
// CONNECTED STATS BLOCK
// =============================================================================

export interface ConnectedStatsBlockProps {
  readonly config: BlockSpec;
  readonly className?: string;
  readonly onEvent?: (event: StatsBlockEvent) => void;
}

export function ConnectedStatsBlock({
  config,
  className,
  onEvent,
}: ConnectedStatsBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();

  const handleEvent = useCallback(
    (event: StatsBlockEvent) => {
      blockContext?.emit(event.type, event);
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  // Build StatsBlockConfig with conditional properties
  const statsConfig: StatsBlockConfig = useMemo(() => {
    const base: StatsBlockConfig = { block: 'stats' as const };
    const stats = config['stats'] as StatsBlockConfig['stats'];
    const layout = config['layout'] as StatsBlockConfig['layout'];
    const columns = config['columns'] as number | undefined;
    // TypeScript exactOptionalPropertyTypes requires conditional assignment
    return {
      ...base,
      ...(stats !== undefined && { stats }),
      ...(layout !== undefined && { layout }),
      ...(columns !== undefined && { columns }),
    };
  }, [config]);

  // Build props conditionally for exactOptionalPropertyTypes
  const props: { config: StatsBlockConfig; onEvent: typeof handleEvent; className?: string } = {
    config: statsConfig,
    onEvent: handleEvent,
  };
  if (className !== undefined) {
    props.className = className;
  }

  return <StatsBlock {...props} />;
}

// =============================================================================
// CONNECTED CHART BLOCK
// =============================================================================

export interface ConnectedChartBlockProps {
  readonly config: BlockSpec;
  readonly className?: string;
  readonly onEvent?: (event: ChartBlockEvent) => void;
}

export function ConnectedChartBlock({
  config,
  className,
  onEvent,
}: ConnectedChartBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();
  const context = useRuntimeContext();

  const handleEvent = useCallback(
    (event: ChartBlockEvent) => {
      blockContext?.emit(event.type, event);
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  // Build ChartBlockConfig with normalized source
  const chartConfig: ChartBlockConfig = useMemo(() => {
    const base: ChartBlockConfig = {
      block: 'chart' as const,
      type: (config['type'] as ChartBlockConfig['type']) ?? 'bar',
    };
    const entityType = normalizeEntityType(config) || undefined;
    const data = config['data'] as ChartBlockConfig['data'];
    const labelProperty = config['labelProperty'] as PropertyName | undefined;
    const valueProperty = config['valueProperty'] as PropertyName | undefined;
    const groupProperty = config['groupProperty'] as PropertyName | undefined;
    const aggregate = config['aggregate'] as ChartBlockConfig['aggregate'];
    const title = config['title'] as string | undefined;
    const showLegend = config['showLegend'] as boolean | undefined;
    const showGrid = config['showGrid'] as boolean | undefined;
    const colors = config['colors'] as readonly string[] | undefined;
    const height = config['height'] as number | undefined;
    const entityId = normalizeEntityId(config, context);

    return {
      ...base,
      ...(entityType !== undefined && { entityType, source: entityType }),
      ...(data !== undefined && { data }),
      ...(labelProperty !== undefined && { labelProperty }),
      ...(valueProperty !== undefined && { valueProperty }),
      ...(groupProperty !== undefined && { groupProperty }),
      ...(aggregate !== undefined && { aggregate }),
      ...(title !== undefined && { title }),
      ...(showLegend !== undefined && { showLegend }),
      ...(showGrid !== undefined && { showGrid }),
      ...(colors !== undefined && { colors }),
      ...(height !== undefined && { height }),
      ...(entityId !== undefined && { entityId }),
    };
  }, [config, context]);

  // Build props conditionally
  const props: { config: ChartBlockConfig; onEvent: typeof handleEvent; className?: string } = {
    config: chartConfig,
    onEvent: handleEvent,
  };
  if (className !== undefined) {
    props.className = className;
  }

  return <ChartBlock {...props} />;
}

// =============================================================================
// CONNECTED CALENDAR BLOCK
// =============================================================================

export interface ConnectedCalendarBlockProps {
  readonly config: BlockSpec;
  readonly className?: string;
  readonly onEvent?: (event: CalendarBlockEvent) => void;
}

export function ConnectedCalendarBlock({
  config,
  className,
  onEvent,
}: ConnectedCalendarBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();

  const handleEvent = useCallback(
    (event: CalendarBlockEvent) => {
      blockContext?.emit(event.type, event);
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  // Build CalendarBlockConfig with normalized entityType
  const entityType = normalizeEntityType(config);
  const calendarConfig: CalendarBlockConfig = useMemo(() => {
    const base: CalendarBlockConfig = {
      block: 'calendar' as const,
      entityType,
      dateProperty: (config['dateProperty'] as string) ?? 'date',
      labelProperty: (config['labelProperty'] as string) ?? 'name',
    };
    const endDateProperty = config['endDateProperty'] as string | undefined;
    const colorProperty = config['colorProperty'] as string | undefined;
    const view = config['view'] as CalendarBlockConfig['view'];
    const defaultDate = config['defaultDate'] as string | undefined;
    const selectable = config['selectable'] as boolean | undefined;
    const onSelect = config['onSelect'] as CalendarBlockConfig['onSelect'];
    const onEventClick = config['onEventClick'] as CalendarBlockConfig['onEventClick'];

    return {
      ...base,
      ...(endDateProperty !== undefined && { endDateProperty }),
      ...(colorProperty !== undefined && { colorProperty }),
      ...(view !== undefined && { view }),
      ...(defaultDate !== undefined && { defaultDate }),
      ...(selectable !== undefined && { selectable }),
      ...(onSelect !== undefined && { onSelect }),
      ...(onEventClick !== undefined && { onEventClick }),
    };
  }, [config, entityType]);

  if (!calendarConfig.entityType) {
    return (
      <div className={className} style={{ padding: '1rem', color: '#dc3545' }}>
        Error: CalendarBlock requires entityType/source.
      </div>
    );
  }

  // Build props conditionally
  const props: { config: CalendarBlockConfig; onEvent: typeof handleEvent; className?: string } = {
    config: calendarConfig,
    onEvent: handleEvent,
  };
  if (className !== undefined) {
    props.className = className;
  }

  return <CalendarBlock {...props} />;
}

// =============================================================================
// CONNECTED TIMELINE BLOCK
// =============================================================================

export interface ConnectedTimelineBlockProps {
  readonly config: BlockSpec;
  readonly className?: string;
  readonly onEvent?: (event: TimelineBlockEvent) => void;
}

export function ConnectedTimelineBlock({
  config,
  className,
  onEvent,
}: ConnectedTimelineBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();
  const context = useRuntimeContext();

  const handleEvent = useCallback(
    (event: TimelineBlockEvent) => {
      blockContext?.emit(event.type, event);
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  const entityId = normalizeEntityId(config, context);

  // Build TimelineBlockConfig
  const timelineConfig: TimelineBlockConfig = useMemo(() => {
    const base: TimelineBlockConfig = {
      block: 'timeline' as const,
      source: (config['source'] as TimelineBlockConfig['source']) ?? 'entities',
    };
    const entityType = normalizeEntityType(config) || undefined;
    const timestampProperty = config['timestampProperty'] as PropertyName | undefined;
    const titleProperty = config['titleProperty'] as PropertyName | undefined;
    const descriptionProperty = config['descriptionProperty'] as PropertyName | undefined;
    const actorProperty = config['actorProperty'] as PropertyName | undefined;
    const typeProperty = config['typeProperty'] as PropertyName | undefined;
    const order = config['order'] as TimelineBlockConfig['order'];
    const limit = config['limit'] as number | undefined;
    const groupBy = config['groupBy'] as TimelineBlockConfig['groupBy'];
    const showTimestamp = config['showTimestamp'] as boolean | undefined;
    const showActor = config['showActor'] as boolean | undefined;
    const filter = config['filter'] as Record<string, unknown> | undefined;

    return {
      ...base,
      ...(entityId !== undefined && { entityId }),
      ...(entityType !== undefined && { entityType }),
      ...(timestampProperty !== undefined && { timestampProperty }),
      ...(titleProperty !== undefined && { titleProperty }),
      ...(descriptionProperty !== undefined && { descriptionProperty }),
      ...(actorProperty !== undefined && { actorProperty }),
      ...(typeProperty !== undefined && { typeProperty }),
      ...(order !== undefined && { order }),
      ...(limit !== undefined && { limit }),
      ...(groupBy !== undefined && { groupBy }),
      ...(showTimestamp !== undefined && { showTimestamp }),
      ...(showActor !== undefined && { showActor }),
      ...(filter !== undefined && { filter }),
    };
  }, [config, context, entityId]);

  // Build props conditionally
  const props: { config: TimelineBlockConfig; onEvent: typeof handleEvent; entityId?: EntityId; className?: string } = {
    config: timelineConfig,
    onEvent: handleEvent,
  };
  if (entityId !== undefined) {
    props.entityId = entityId;
  }
  if (className !== undefined) {
    props.className = className;
  }

  return <TimelineBlock {...props} />;
}

// =============================================================================
// CONNECTED COMMENTS BLOCK
// =============================================================================

export interface ConnectedCommentsBlockProps {
  readonly config: BlockSpec;
  readonly className?: string;
  readonly onEvent?: (event: CommentsBlockEvent) => void;
}

export function ConnectedCommentsBlock({
  config,
  className,
  onEvent,
}: ConnectedCommentsBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();
  const context = useRuntimeContext();

  const handleEvent = useCallback(
    (event: CommentsBlockEvent) => {
      blockContext?.emit(event.type, event);
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  const entityId = normalizeEntityId(config, context);

  // Build CommentsBlockConfig
  const commentsConfig: CommentsBlockConfig = useMemo(() => {
    const base: CommentsBlockConfig = {
      block: 'comments' as const,
    };
    const source = normalizeEntityType(config) || undefined;
    const entityType = config['entityType'] as string | undefined;
    const parentProperty = config['parentProperty'] as PropertyName | undefined;
    const sortOrder = config['sortOrder'] as CommentsBlockConfig['sortOrder'];
    const allowCreate = config['allowCreate'] as boolean | undefined;
    const allowEdit = config['allowEdit'] as boolean | undefined;
    const allowDelete = config['allowDelete'] as boolean | undefined;
    const allowReplies = config['allowReplies'] as boolean | undefined;
    const maxDepth = config['maxDepth'] as number | undefined;
    const showTimestamp = config['showTimestamp'] as boolean | undefined;
    const showAuthor = config['showAuthor'] as boolean | undefined;
    const title = config['title'] as string | undefined;

    return {
      ...base,
      ...(source !== undefined && { source }),
      ...(entityId !== undefined && { entityId }),
      ...(entityType !== undefined && { entityType }),
      ...(parentProperty !== undefined && { parentProperty }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(allowCreate !== undefined && { allowCreate }),
      ...(allowEdit !== undefined && { allowEdit }),
      ...(allowDelete !== undefined && { allowDelete }),
      ...(allowReplies !== undefined && { allowReplies }),
      ...(maxDepth !== undefined && { maxDepth }),
      ...(showTimestamp !== undefined && { showTimestamp }),
      ...(showAuthor !== undefined && { showAuthor }),
      ...(title !== undefined && { title }),
    };
  }, [config, entityId]);

  if (!entityId) {
    return (
      <div className={className} style={{ padding: '1rem', color: '#dc3545' }}>
        Error: CommentsBlock requires entityId.
      </div>
    );
  }

  // Build props conditionally
  const props: { config: CommentsBlockConfig; entityId: EntityId; onEvent: typeof handleEvent; className?: string } = {
    config: commentsConfig,
    entityId,
    onEvent: handleEvent,
  };
  if (className !== undefined) {
    props.className = className;
  }

  return <CommentsBlock {...props} />;
}

// =============================================================================
// CONNECTED TREE VIEW BLOCK
// =============================================================================

export interface ConnectedTreeViewBlockProps {
  readonly config: BlockSpec;
  readonly className?: string;
  readonly onEvent?: (event: TreeViewBlockEvent) => void;
}

export function ConnectedTreeViewBlock({
  config,
  className,
  onEvent,
}: ConnectedTreeViewBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();

  const handleEvent = useCallback(
    (event: TreeViewBlockEvent) => {
      blockContext?.emit(event.type, event);
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  const entityType = normalizeEntityType(config);

  // Build TreeViewBlockConfig with normalized entityType
  const treeConfig: TreeViewBlockConfig = useMemo(() => {
    const base: TreeViewBlockConfig = {
      block: 'tree' as const,
      entityType,
      labelProperty: (config['labelProperty'] as string) ?? 'name',
    };
    const parentProperty = config['parentProperty'] as string | undefined;
    const iconProperty = config['iconProperty'] as string | undefined;
    const childrenProperty = config['childrenProperty'] as string | undefined;
    const expandedByDefault = config['expandedByDefault'] as boolean | undefined;
    const selectable = config['selectable'] as boolean | undefined;
    const multiSelect = config['multiSelect'] as boolean | undefined;
    const draggable = config['draggable'] as boolean | undefined;
    const maxDepth = config['maxDepth'] as number | undefined;
    const onSelect = config['onSelect'] as TreeViewBlockConfig['onSelect'];
    const filter = config['filter'] as Record<string, unknown> | undefined;

    return {
      ...base,
      ...(parentProperty !== undefined && { parentProperty }),
      ...(iconProperty !== undefined && { iconProperty }),
      ...(childrenProperty !== undefined && { childrenProperty }),
      ...(expandedByDefault !== undefined && { expandedByDefault }),
      ...(selectable !== undefined && { selectable }),
      ...(multiSelect !== undefined && { multiSelect }),
      ...(draggable !== undefined && { draggable }),
      ...(maxDepth !== undefined && { maxDepth }),
      ...(onSelect !== undefined && { onSelect }),
      ...(filter !== undefined && { filter }),
    };
  }, [config, entityType]);

  if (!treeConfig.entityType) {
    return (
      <div className={className} style={{ padding: '1rem', color: '#dc3545' }}>
        Error: TreeViewBlock requires entityType/source.
      </div>
    );
  }

  // Build props conditionally
  const props: { config: TreeViewBlockConfig; onEvent: typeof handleEvent; className?: string } = {
    config: treeConfig,
    onEvent: handleEvent,
  };
  if (className !== undefined) {
    props.className = className;
  }

  return <TreeViewBlock {...props} />;
}

// =============================================================================
// CONNECTED TABS BLOCK
// =============================================================================

export interface ConnectedTabsBlockProps {
  readonly config: BlockSpec;
  readonly className?: string;
  readonly onEvent?: (event: TabsBlockEvent) => void;
}

export function ConnectedTabsBlock({
  config,
  className,
  onEvent,
}: ConnectedTabsBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();
  const context = useRuntimeContext();

  const handleEvent = useCallback(
    (event: TabsBlockEvent) => {
      blockContext?.emit(event.type, event);
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  const entityId = normalizeEntityId(config, context);

  // Build TabsBlockConfig
  const tabsConfig: TabsBlockConfig = useMemo(() => {
    const base: TabsBlockConfig = {
      block: 'tabs' as const,
      tabs: (config['tabs'] ?? []) as TabsBlockConfig['tabs'],
    };
    const defaultTab = config['defaultTab'] as string | undefined;
    const variant = config['variant'] as TabsBlockConfig['variant'];
    const position = config['position'] as TabsBlockConfig['position'];

    return {
      ...base,
      ...(defaultTab !== undefined && { defaultTab }),
      ...(variant !== undefined && { variant }),
      ...(position !== undefined && { position }),
    };
  }, [config]);

  // Build props conditionally
  const props: { config: TabsBlockConfig; onEvent: typeof handleEvent; entityId?: EntityId; className?: string } = {
    config: tabsConfig,
    onEvent: handleEvent,
  };
  if (entityId !== undefined) {
    props.entityId = entityId;
  }
  if (className !== undefined) {
    props.className = className;
  }

  return <TabsBlock {...props} />;
}

// =============================================================================
// CONNECTED MODAL BLOCK
// =============================================================================

export interface ConnectedModalBlockProps {
  readonly config: BlockSpec;
  readonly className?: string;
  readonly onEvent?: (event: ModalBlockEvent) => void;
}

export function ConnectedModalBlock({
  config,
  className,
  onEvent,
}: ConnectedModalBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();
  const context = useRuntimeContext();

  const handleEvent = useCallback(
    (event: ModalBlockEvent) => {
      blockContext?.emit(event.type, event);
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  const entityId = normalizeEntityId(config, context);

  // Build ModalBlockConfig - trigger is required, default to 'button'
  const modalConfig: ModalBlockConfig = useMemo(() => {
    const trigger = (config['trigger'] as ModalBlockConfig['trigger']) ?? 'button';
    const base: ModalBlockConfig = {
      block: 'modal' as const,
      trigger,
      blocks: (config['blocks'] ?? []) as ModalBlockConfig['blocks'],
    };
    const title = config['title'] as string | undefined;
    const size = config['size'] as ModalBlockConfig['size'];
    const closable = config['closable'] as boolean | undefined;
    const closeOnOverlay = config['closeOnOverlay'] as boolean | undefined;
    const triggerLabel = config['triggerLabel'] as string | undefined;
    const triggerEvent = config['triggerEvent'] as string | undefined;
    const actions = config['actions'] as ModalBlockConfig['actions'];

    return {
      ...base,
      ...(title !== undefined && { title }),
      ...(size !== undefined && { size }),
      ...(closable !== undefined && { closable }),
      ...(closeOnOverlay !== undefined && { closeOnOverlay }),
      ...(triggerLabel !== undefined && { triggerLabel }),
      ...(triggerEvent !== undefined && { triggerEvent }),
      ...(actions !== undefined && { actions }),
    };
  }, [config]);

  // Build props conditionally
  const props: { config: ModalBlockConfig; onEvent: typeof handleEvent; entityId?: EntityId; className?: string } = {
    config: modalConfig,
    onEvent: handleEvent,
  };
  if (entityId !== undefined) {
    props.entityId = entityId;
  }
  if (className !== undefined) {
    props.className = className;
  }

  return <ModalBlock {...props} />;
}

// =============================================================================
// CONNECTED FILE UPLOADER BLOCK
// =============================================================================

export interface ConnectedFileUploaderBlockProps {
  readonly config: BlockSpec;
  readonly className?: string;
  readonly onEvent?: (event: FileUploaderBlockEvent) => void;
}

export function ConnectedFileUploaderBlock({
  config,
  className,
  onEvent,
}: ConnectedFileUploaderBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();
  const context = useRuntimeContext();

  const handleEvent = useCallback(
    (event: FileUploaderBlockEvent) => {
      blockContext?.emit(event.type, event);
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  const entityId = normalizeEntityId(config, context);

  // Build FileUploaderBlockConfig
  const uploaderConfig: FileUploaderBlockConfig = useMemo(() => {
    const base: FileUploaderBlockConfig = {
      block: 'file-uploader' as const,
    };
    const accept = config['accept'] as string | undefined;
    const maxSize = config['maxSize'] as number | undefined;
    const maxFiles = config['maxFiles'] as number | undefined;
    const multiple = config['multiple'] as boolean | undefined;
    const showPreview = config['showPreview'] as boolean | undefined;
    const autoUpload = config['autoUpload'] as boolean | undefined;
    const uploadEndpoint = config['uploadEndpoint'] as string | undefined;

    return {
      ...base,
      ...(entityId !== undefined && { entityId }),
      ...(accept !== undefined && { accept }),
      ...(maxSize !== undefined && { maxSize }),
      ...(maxFiles !== undefined && { maxFiles }),
      ...(multiple !== undefined && { multiple }),
      ...(showPreview !== undefined && { showPreview }),
      ...(autoUpload !== undefined && { autoUpload }),
      ...(uploadEndpoint !== undefined && { uploadEndpoint }),
    };
  }, [config, context, entityId]);

  // Build props conditionally
  const props: { config: FileUploaderBlockConfig; onEvent: typeof handleEvent; className?: string } = {
    config: uploaderConfig,
    onEvent: handleEvent,
  };
  if (className !== undefined) {
    props.className = className;
  }

  return <FileUploaderBlock {...props} />;
}

// =============================================================================
// CONNECTED FILE VIEWER BLOCK
// =============================================================================

export interface ConnectedFileViewerBlockProps {
  readonly config: BlockSpec;
  readonly className?: string;
  readonly onEvent?: (event: FileViewerBlockEvent) => void;
}

export function ConnectedFileViewerBlock({
  config,
  className,
  onEvent,
}: ConnectedFileViewerBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();
  const context = useRuntimeContext();

  const handleEvent = useCallback(
    (event: FileViewerBlockEvent) => {
      blockContext?.emit(event.type, event);
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  const entityId = normalizeEntityId(config, context);

  // Build FileViewerBlockConfig
  const viewerConfig: FileViewerBlockConfig = useMemo(() => {
    const base: FileViewerBlockConfig = {
      block: 'file-viewer' as const,
    };
    const fileProperty = config['fileProperty'] as string | undefined;
    const showToolbar = config['showToolbar'] as boolean | undefined;
    const showDownload = config['showDownload'] as boolean | undefined;
    const maxWidth = config['maxWidth'] as number | undefined;
    const maxHeight = config['maxHeight'] as number | undefined;

    return {
      ...base,
      ...(entityId !== undefined && { entityId }),
      ...(fileProperty !== undefined && { fileProperty }),
      ...(showToolbar !== undefined && { showToolbar }),
      ...(showDownload !== undefined && { showDownload }),
      ...(maxWidth !== undefined && { maxWidth }),
      ...(maxHeight !== undefined && { maxHeight }),
    };
  }, [config, context, entityId]);

  // Build props conditionally
  const props: { config: FileViewerBlockConfig; onEvent: typeof handleEvent; className?: string } = {
    config: viewerConfig,
    onEvent: handleEvent,
  };
  if (className !== undefined) {
    props.className = className;
  }

  return <FileViewerBlock {...props} />;
}
