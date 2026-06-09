/**
 * Trellis BlockRenderer
 *
 * Renders blocks from configuration objects using Connected wrappers
 * that handle config normalization and runtime context resolution.
 */

import React, { useMemo, Suspense } from 'react';
import type { BlockInstanceId } from '@trellis/kernel';
import type { WiringManager } from '../runtime/wiring.js';
import type { BindingScope } from '../binding/index.js';
import { getBlockComponent, hasBlock } from './registry.js';
import { BlockProvider } from './BlockProvider.js';

// Import Connected wrappers
import { ConnectedTableBlock, buildTableBlockConfig } from './integration/ConnectedTableBlock.js';
import { ConnectedFormBlock } from './integration/ConnectedFormBlock.js';
import { ConnectedDetailBlock } from './integration/ConnectedDetailBlock.js';
import { ConnectedKanbanBlock } from './integration/ConnectedKanbanBlock.js';
import {
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

// =============================================================================
// TYPES
// =============================================================================

/**
 * Block configuration from ProductConfig or view definition.
 */
export interface BlockConfig {
  /** Block type (e.g., 'table', 'form', 'detail', 'kanban') */
  readonly block: string;

  /** Optional block instance ID */
  readonly id?: string | undefined;

  /** Block-specific configuration */
  readonly [key: string]: unknown;
}

/**
 * Props for BlockRenderer.
 */
export interface BlockRendererProps {
  /** Block configuration */
  readonly config: BlockConfig;

  /** Wiring manager for event routing */
  readonly wiring: WiringManager;

  /** Data binding scope */
  readonly scope: BindingScope;

  /** Additional CSS class */
  readonly className?: string | undefined;
}

/**
 * Props for UnknownBlock fallback component.
 */
interface UnknownBlockProps {
  readonly type: string;
}

// =============================================================================
// FALLBACK COMPONENTS
// =============================================================================

/**
 * Fallback component for unknown block types.
 */
function UnknownBlock({ type }: UnknownBlockProps): React.ReactElement {
  return (
    <div
      style={{
        padding: '1rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        backgroundColor: '#fef3c7',
        color: '#92400e',
      }}
    >
      <strong>Unknown block type:</strong> {type}
      <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
        This block type is not registered. Check that the block is properly imported.
      </p>
    </div>
  );
}

/**
 * Fallback component for block rendering errors.
 */
function BlockError({
  error,
  blockType,
}: {
  error: Error;
  blockType: string;
}): React.ReactElement {
  return (
    <div
      style={{
        padding: '1rem',
        border: '1px solid #fecaca',
        borderRadius: '0.375rem',
        backgroundColor: '#fee2e2',
        color: '#991b1b',
      }}
    >
      <strong>Error rendering block:</strong> {blockType}
      <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
        {error.message}
      </p>
    </div>
  );
}

/**
 * Loading fallback for lazy-loaded blocks.
 */
function BlockLoading(): React.ReactElement {
  return (
    <div
      style={{
        padding: '1rem',
        textAlign: 'center',
        color: '#6b7280',
      }}
    >
      Loading...
    </div>
  );
}

// =============================================================================
// CONNECTED BLOCK RENDERER
// =============================================================================

/**
 * Get the Connected wrapper component for a block type.
 * Returns null if no connected wrapper exists.
 */
function getConnectedBlock(blockType: string): React.ComponentType<{ config: Record<string, unknown>; className?: string }> | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyConnected = React.ComponentType<any>;

  switch (blockType) {
    // Core blocks
    case 'table':
    case 'trellis.data-table':
      return ConnectedTableBlock as AnyConnected;

    case 'form':
    case 'trellis.form':
    case 'trellis.property-editor':
      return ConnectedFormBlock as AnyConnected;

    case 'detail':
    case 'trellis.detail':
    case 'trellis.detail-view':
      return ConnectedDetailBlock as AnyConnected;

    case 'kanban':
    case 'trellis.kanban':
    case 'trellis.kanban-board':
      return ConnectedKanbanBlock as AnyConnected;

    // Stats and visualization
    case 'stats':
    case 'trellis.stats':
      return ConnectedStatsBlock as AnyConnected;

    case 'chart':
    case 'trellis.chart':
      return ConnectedChartBlock as AnyConnected;

    // Calendar and timeline
    case 'calendar':
    case 'trellis.calendar':
      return ConnectedCalendarBlock as AnyConnected;

    case 'timeline':
    case 'trellis.timeline':
      return ConnectedTimelineBlock as AnyConnected;

    // Collaboration
    case 'comments':
    case 'trellis.comments':
      return ConnectedCommentsBlock as AnyConnected;

    // Hierarchical
    case 'tree':
    case 'trellis.tree-view':
      return ConnectedTreeViewBlock as AnyConnected;

    // Container blocks
    case 'tabs':
    case 'trellis.tabs':
      return ConnectedTabsBlock as AnyConnected;

    case 'modal':
    case 'trellis.modal':
      return ConnectedModalBlock as AnyConnected;

    // File handling
    case 'file-uploader':
    case 'trellis.file-uploader':
      return ConnectedFileUploaderBlock as AnyConnected;

    case 'file-viewer':
    case 'trellis.file-viewer':
      return ConnectedFileViewerBlock as AnyConnected;

    default:
      return null;
  }
}

// =============================================================================
// BLOCK RENDERER
// =============================================================================

/**
 * Generate a unique block instance ID.
 */
function generateBlockId(): BlockInstanceId {
  return `block-${Math.random().toString(36).slice(2, 11)}` as BlockInstanceId;
}

// Layout types that should be delegated to LayoutRenderer
const LAYOUT_TYPES = new Set(['split', 'stack', 'tabs', 'grid', 'single']);

/**
 * Check if a block type is actually a layout type.
 */
function isLayoutType(type: string): boolean {
  return LAYOUT_TYPES.has(type);
}

/**
 * Lazy import LayoutRenderer to avoid circular dependency.
 */
const LazyLayoutRenderer = React.lazy(() =>
  import('../runtime/LayoutRenderer.js').then((m) => ({ default: m.LayoutRenderer }))
);

/**
 * Normalize a raw layout config (from YAML) to the format expected by LayoutRenderer.
 * Converts `children` to `panels` for splits, `blocks` for stacks, etc.
 */
function normalizeLayoutConfig(config: Record<string, unknown>): Record<string, unknown> {
  const type = config['type'] as string;
  const children = config['children'] as readonly Record<string, unknown>[] | undefined;

  switch (type) {
    case 'split': {
      // Convert children to panels
      const panels = children?.map((child) => {
        const childType = child['type'] as string | undefined;
        // Check if child is a nested layout
        if (childType && LAYOUT_TYPES.has(childType)) {
          return { layout: normalizeLayoutConfig(child) };
        }
        // Otherwise it's a block - wrap in blocks array
        return { blocks: [normalizeBlockPlacement(child)] };
      }) ?? [];

      return {
        type: 'split',
        direction: config['direction'] ?? 'horizontal',
        sizes: config['sizes'],
        panels,
      };
    }

    case 'stack': {
      // Convert children to blocks (normalizing each)
      const blocks = children?.map((child) => normalizeBlockPlacement(child)) ?? [];

      return {
        type: 'stack',
        direction: config['direction'] ?? 'vertical',
        gap: config['gap'],
        blocks,
      };
    }

    case 'tabs': {
      // Tabs config might have tabs array directly
      return config;
    }

    case 'grid': {
      // Normalize grid rows and cells
      const rows = config['rows'] as readonly Record<string, unknown>[] | undefined;
      const normalizedRows = rows?.map((row) => {
        const cells = row['cells'] as readonly Record<string, unknown>[] | undefined;
        const normalizedCells = cells?.map((cell) => {
          const cellBlock = cell['block'] as Record<string, unknown> | undefined;
          const cellLayout = cell['layout'] as Record<string, unknown> | undefined;

          if (cellLayout) {
            return {
              ...cell,
              layout: normalizeLayoutConfig(cellLayout),
            };
          }
          if (cellBlock) {
            return {
              ...cell,
              block: normalizeBlockPlacement(cellBlock),
            };
          }
          return cell;
        }) ?? [];

        return {
          ...row,
          cells: normalizedCells,
        };
      }) ?? [];

      return {
        type: 'grid',
        columns: config['columns'] ?? 2,
        gap: config['gap'],
        rows: normalizedRows,
      };
    }

    case 'single': {
      const block = children?.[0] ? normalizeBlockPlacement(children[0]) : { type: 'unknown', props: {} };
      return {
        type: 'single',
        block,
      };
    }

    default:
      return config;
  }
}

/**
 * Normalize a block placement from YAML format.
 * Handles both formats:
 * - Block format: { type, id, props: {...} }
 * - Layout format: { type, columns, gap, rows, children, ... } (properties at top level)
 */
function normalizeBlockPlacement(block: Record<string, unknown>): { type: string; id?: string; props: Record<string, unknown> } {
  const blockType = block['type'] as string | undefined;
  const explicitProps = (block['props'] as Record<string, unknown>) ?? {};
  const id = block['id'] as string | undefined;

  // Gather all top-level properties except reserved keys
  const reservedKeys = new Set(['type', 'id', 'props']);
  const topLevelProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(block)) {
    if (!reservedKeys.has(key)) {
      topLevelProps[key] = value;
    }
  }

  // Merge: explicit props take precedence over top-level props
  const finalProps = { ...topLevelProps, ...explicitProps };

  return {
    type: blockType ?? 'unknown',
    ...(id !== undefined && { id }),
    props: finalProps,
  };
}

/**
 * BlockRenderer renders a block component from its configuration.
 *
 * All blocks are rendered through Connected wrappers that:
 * - Normalize config property names (entityType/source/entity)
 * - Resolve route parameters ($route.params.id → actual UUID)
 * - Resolve scope variables ($scope.selectedId → value)
 * - Emit events through block context
 */
export function BlockRenderer({
  config,
  wiring,
  scope,
  className,
}: BlockRendererProps): React.ReactElement {
  // Generate or use provided instance ID
  const instanceId = useMemo(
    () => (config.id as BlockInstanceId | undefined) ?? generateBlockId(),
    [config.id]
  );

  // Extract block type
  const blockType = config.block;

  // Handle layout types by delegating to LayoutRenderer
  if (isLayoutType(blockType)) {
    // Convert BlockConfig back to LayoutConfig format and normalize
    const { block: _block, id: _id, ...rest } = config;
    const rawLayoutConfig = {
      type: blockType,
      ...rest,
    };
    const layoutConfig = normalizeLayoutConfig(rawLayoutConfig);

    return (
      <Suspense fallback={<BlockLoading />}>
        <LazyLayoutRenderer
          layout={layoutConfig as unknown as Parameters<typeof LazyLayoutRenderer>[0]['layout']}
          wiring={wiring}
          scope={scope}
          safeMode={true}
          {...(className !== undefined && { className })}
        />
      </Suspense>
    );
  }

  // Check for Connected wrapper
  const ConnectedBlock = getConnectedBlock(blockType);
  if (ConnectedBlock) {
    // Build props, conditionally including className to handle exactOptionalPropertyTypes
    const connectedProps: { config: Record<string, unknown>; className?: string } = {
      config: config as Record<string, unknown>,
    };
    if (className !== undefined) {
      connectedProps.className = className;
    }

    return (
      <BlockProvider instanceId={instanceId} wiring={wiring} scope={scope}>
        <Suspense fallback={<BlockLoading />}>
          <ConnectedBlock {...connectedProps} />
        </Suspense>
      </BlockProvider>
    );
  }

  // Check if block type is registered in the registry (for custom blocks)
  if (!hasBlock(blockType)) {
    return <UnknownBlock type={blockType} />;
  }

  // Get block component from registry (fallback for custom blocks)
  const BlockComponent = getBlockComponent(blockType);
  if (!BlockComponent) {
    return <UnknownBlock type={blockType} />;
  }

  // Build props for the block component
  // Exclude 'block' and 'id' from props passed to component
  const { block: _block, id: _id, ...blockProps } = config;

  return (
    <BlockProvider instanceId={instanceId} wiring={wiring} scope={scope}>
      <Suspense fallback={<BlockLoading />}>
        <BlockComponent
          {...blockProps}
          config={blockProps}
          instanceId={instanceId}
          className={className}
        />
      </Suspense>
    </BlockProvider>
  );
}

// =============================================================================
// ERROR BOUNDARY
// =============================================================================

interface BlockErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for catching block rendering errors.
 */
export class BlockErrorBoundary extends React.Component<
  { children: React.ReactNode; blockType: string },
  BlockErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; blockType: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): BlockErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Block rendering error:', error, errorInfo);
  }

  override render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <BlockError error={this.state.error} blockType={this.props.blockType} />
      );
    }
    return this.props.children;
  }
}

/**
 * BlockRenderer wrapped in an error boundary.
 */
export function SafeBlockRenderer(props: BlockRendererProps): React.ReactElement {
  return (
    <BlockErrorBoundary blockType={props.config.block}>
      <BlockRenderer {...props} />
    </BlockErrorBoundary>
  );
}
