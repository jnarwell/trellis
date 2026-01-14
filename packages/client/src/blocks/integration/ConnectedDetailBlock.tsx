/**
 * Trellis ConnectedDetailBlock
 *
 * SDK-integrated wrapper for DetailBlock that handles:
 * - Config normalization (entityType/source aliases)
 * - Route parameter resolution ($route.params.id → actual UUID)
 * - Scope variable resolution
 */

import React, { useMemo } from 'react';
import type { Entity, EntityId } from '@trellis/kernel';
import { DetailBlock } from '../detail/index.js';
import type {
  DetailBlockProps,
  DetailSectionConfig,
  DetailActionConfig,
  DetailBlockEvent,
} from '../detail/types.js';
import { useOptionalBlockContext } from '../BlockProvider.js';
import { useNavigation } from '../../runtime/NavigationProvider.js';
import {
  normalizeDetailConfig,
  type RuntimeContext,
  type BlockSpec,
} from './configNormalizer.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for ConnectedDetailBlock.
 */
export interface ConnectedDetailBlockProps {
  /** Block configuration (raw from YAML/config) */
  readonly config: BlockSpec;

  /** Additional CSS class */
  readonly className?: string;

  /** Event handler */
  readonly onEvent?: (event: DetailBlockEvent) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ConnectedDetailBlock normalizes config and delegates to DetailBlock.
 *
 * The key difference from using DetailBlock directly:
 * - Resolves $route.params.id to actual entity ID
 * - Normalizes entityType/source property name aliases
 * - Provides clear error when entityId is missing
 */
export function ConnectedDetailBlock({
  config,
  className,
  onEvent,
}: ConnectedDetailBlockProps): React.ReactElement {
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
    return normalizeDetailConfig(config, runtimeContext);
  }, [config, runtimeContext]);

  // Guard: Detail block REQUIRES an entityId
  if (!normalizedConfig) {
    return (
      <div
        className={className}
        style={{ padding: '1rem', color: '#dc3545' }}
        data-testid="detail-missing-id"
      >
        Error: DetailBlock requires an entity ID. Check that route parameters are available.
        <br />
        <small>Expected: entityId, but received nothing after resolution.</small>
      </div>
    );
  }

  // Build props conditionally for exactOptionalPropertyTypes
  const props: {
    entityId: EntityId;
    source: typeof normalizedConfig.source;
    sections: DetailSectionConfig[];
    actions?: DetailActionConfig[];
    onEvent?: typeof onEvent;
    className?: string;
  } = {
    entityId: normalizedConfig.entityId,
    source: normalizedConfig.source,
    sections: normalizedConfig.sections as DetailSectionConfig[],
  };
  const actions = normalizedConfig.actions as DetailActionConfig[] | undefined;
  if (actions !== undefined) {
    props.actions = actions;
  }
  if (onEvent !== undefined) {
    props.onEvent = onEvent;
  }
  if (className !== undefined) {
    props.className = className;
  }

  return <DetailBlock {...props} />;
}

/**
 * Build DetailBlock props from a generic block spec.
 * Used by BlockRenderer for config transformation.
 * Returns null if entityId cannot be resolved.
 */
export function buildDetailBlockProps(
  blockSpec: BlockSpec,
  context: RuntimeContext
): Omit<DetailBlockProps, 'onEvent' | 'className'> | null {
  const normalized = normalizeDetailConfig(blockSpec, context);

  if (!normalized) {
    return null;
  }

  const result: Omit<DetailBlockProps, 'onEvent' | 'className'> = {
    entityId: normalized.entityId,
    source: normalized.source,
    sections: normalized.sections as DetailSectionConfig[],
  };
  const actions = normalized.actions as DetailActionConfig[] | undefined;
  if (actions !== undefined) {
    (result as { actions: DetailActionConfig[] }).actions = actions;
  }
  return result;
}
