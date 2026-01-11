/**
 * Trellis BlockRenderer
 *
 * Renders blocks from configuration objects.
 */

import React, { useMemo } from 'react';
import type { BlockInstanceId } from '@trellis/kernel';
import type { WiringManager } from '../runtime/wiring.js';
import type { BindingScope } from '../binding/index.js';
import { getBlockComponent, hasBlock } from './registry.js';
import { BlockProvider } from './BlockProvider.js';
import { ConnectedTableBlock } from './integration/ConnectedTableBlock.js';
import { buildTableBlockConfig } from './integration/ConnectedTableBlock.js';

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
// UNKNOWN BLOCK FALLBACK
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

// =============================================================================
// BLOCK RENDERER
// =============================================================================

/**
 * Generate a unique block instance ID.
 */
function generateBlockId(): BlockInstanceId {
  return `block-${Math.random().toString(36).slice(2, 11)}` as BlockInstanceId;
}

/**
 * BlockRenderer renders a block component from its configuration.
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

  // Check if block type is registered
  if (!hasBlock(blockType)) {
    return <UnknownBlock type={blockType} />;
  }

  // Special handling for table blocks - use SDK-connected version
  if (blockType === 'table' || blockType === 'trellis.data-table') {
    // Build TableBlockConfig from the generic config
    const tableConfig = buildTableBlockConfig(config as Record<string, unknown>);

    // Build props, only including defined values
    const connectedProps: {
      config: typeof tableConfig;
      instanceId: BlockInstanceId;
      className?: string;
    } = {
      config: tableConfig,
      instanceId,
    };

    if (className !== undefined) {
      connectedProps.className = className;
    }

    return (
      <BlockProvider instanceId={instanceId} wiring={wiring} scope={scope}>
        <ConnectedTableBlock {...connectedProps} />
      </BlockProvider>
    );
  }

  // Get block component from registry
  const BlockComponent = getBlockComponent(blockType);
  if (!BlockComponent) {
    return <UnknownBlock type={blockType} />;
  }

  // Build props for the block component
  // Exclude 'block' and 'id' from props passed to component
  const { block: _block, id: _id, ...blockProps } = config;

  return (
    <BlockProvider instanceId={instanceId} wiring={wiring} scope={scope}>
      <BlockComponent
        {...blockProps}
        config={blockProps}
        instanceId={instanceId}
        className={className}
      />
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
