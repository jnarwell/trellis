/**
 * Trellis ConnectedKanbanBlock
 *
 * SDK-integrated wrapper for KanbanBlock that handles:
 * - Config normalization (entityType/source aliases)
 * - Proper prop passing for SDK integration
 */

import React, { useMemo, useCallback } from 'react';
import type { Entity, EntityId, PropertyName } from '@trellis/kernel';
import { KanbanBlock } from '../kanban/index.js';
import type { KanbanBlockProps, KanbanBlockEvent, KanbanColumnConfig, KanbanCardConfig } from '../kanban/types.js';
import { useOptionalBlockContext } from '../BlockProvider.js';
import { useNavigation } from '../../runtime/NavigationProvider.js';
import {
  normalizeKanbanConfig,
  type RuntimeContext,
  type BlockSpec,
} from './configNormalizer.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for ConnectedKanbanBlock.
 */
export interface ConnectedKanbanBlockProps {
  /** Block configuration (raw from YAML/config) */
  readonly config: BlockSpec;

  /** Additional CSS class */
  readonly className?: string;

  /** Event handler */
  readonly onEvent?: (event: KanbanBlockEvent) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ConnectedKanbanBlock normalizes config and delegates to KanbanBlock.
 *
 * KanbanBlock already uses useQuery internally, so this wrapper:
 * - Normalizes entityType/source property name aliases
 * - Ensures proper config shape is passed
 * - Emits events through block context
 */
export function ConnectedKanbanBlock({
  config,
  className,
  onEvent,
}: ConnectedKanbanBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();
  const { state } = useNavigation();

  // Build runtime context for value resolution
  const runtimeContext: RuntimeContext = useMemo(
    () => ({
      routeParams: state.params,
      scope: blockContext?.scope ?? {},
    }),
    [state.params, blockContext?.scope]
  );

  // Normalize config
  const normalizedConfig = useMemo(() => {
    return normalizeKanbanConfig(config, runtimeContext);
  }, [config, runtimeContext]);

  // Wrap event handler to emit through block context
  const handleEvent = useCallback(
    (event: KanbanBlockEvent) => {
      // Emit through block context
      if (blockContext) {
        blockContext.emit(event.type, event);
      }
      // Also call prop handler
      onEvent?.(event);
    },
    [blockContext, onEvent]
  );

  // Guard: Kanban requires source
  if (!normalizedConfig.source) {
    return (
      <div
        className={className}
        style={{ padding: '1rem', color: '#dc3545' }}
        data-testid="kanban-missing-source"
      >
        Error: KanbanBlock requires a source (entity type).
      </div>
    );
  }

  // Guard: Kanban requires columns
  if (!normalizedConfig.columns || normalizedConfig.columns.length === 0) {
    return (
      <div
        className={className}
        style={{ padding: '1rem', color: '#dc3545' }}
        data-testid="kanban-missing-columns"
      >
        Error: KanbanBlock requires column configuration.
      </div>
    );
  }

  // Build card config - required by KanbanBlockProps
  // Default to using entity name if not specified
  const card = (normalizedConfig.card as KanbanCardConfig | undefined) ?? { title: '${$entity.name}' };

  // Build props conditionally for exactOptionalPropertyTypes
  const props: {
    source: typeof normalizedConfig.source;
    statusProperty: PropertyName;
    columns: KanbanColumnConfig[];
    card: KanbanCardConfig;
    filter?: Record<string, unknown>;
    onEvent: typeof handleEvent;
    className?: string;
  } = {
    source: normalizedConfig.source,
    statusProperty: normalizedConfig.statusProperty as PropertyName,
    columns: normalizedConfig.columns as KanbanColumnConfig[],
    card,
    onEvent: handleEvent,
  };
  const filter = normalizedConfig.filter as Record<string, unknown> | undefined;
  if (filter !== undefined) {
    props.filter = filter;
  }
  if (className !== undefined) {
    props.className = className;
  }

  return <KanbanBlock {...props} />;
}

/**
 * Build KanbanBlock props from a generic block spec.
 * Used by BlockRenderer for config transformation.
 */
export function buildKanbanBlockProps(
  blockSpec: BlockSpec,
  context: RuntimeContext
): Omit<KanbanBlockProps, 'onEvent' | 'className'> | null {
  const normalized = normalizeKanbanConfig(blockSpec, context);

  if (!normalized.source || !normalized.columns || normalized.columns.length === 0) {
    return null;
  }

  // card is required - default to entity name if not specified
  const card = (normalized.card as KanbanCardConfig | undefined) ?? { title: '${$entity.name}' };

  const result: Omit<KanbanBlockProps, 'onEvent' | 'className'> = {
    source: normalized.source,
    statusProperty: normalized.statusProperty as PropertyName,
    columns: normalized.columns as KanbanColumnConfig[],
    card,
  };
  const filter = normalized.filter as Record<string, unknown> | undefined;
  if (filter !== undefined) {
    (result as { filter: Record<string, unknown> }).filter = filter;
  }
  return result;
}
