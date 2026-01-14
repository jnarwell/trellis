/**
 * Trellis ConnectedFormBlock
 *
 * SDK-integrated wrapper for FormBlock that handles:
 * - Config normalization (entityType/source aliases)
 * - Route parameter resolution ($route.params.id → actual UUID)
 * - Scope variable resolution
 */

import React, { useMemo } from 'react';
import type { Entity, EntityId, TypePath } from '@trellis/kernel';
import { FormBlock } from '../form/index.js';
import type { FormBlockConfig, FieldConfig, FormAction } from '../form/types.js';
import { useOptionalBlockContext } from '../BlockProvider.js';
import { useNavigation } from '../../runtime/NavigationProvider.js';
import {
  normalizeFormConfig,
  type RuntimeContext,
  type BlockSpec,
} from './configNormalizer.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for ConnectedFormBlock.
 */
export interface ConnectedFormBlockProps {
  /** Block configuration (raw from YAML/config) */
  readonly config: BlockSpec;

  /** Additional CSS class */
  readonly className?: string;

  /** Callback when form is submitted successfully */
  readonly onSubmit?: (entity: Entity) => void;

  /** Callback when form is cancelled */
  readonly onCancel?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ConnectedFormBlock normalizes config and delegates to FormBlock.
 *
 * The key difference from using FormBlock directly:
 * - Resolves $route.params.id to actual entity ID
 * - Normalizes entityType/source property name aliases
 * - Determines mode automatically based on presence of entityId
 */
export function ConnectedFormBlock({
  config,
  className,
  onSubmit,
  onCancel,
}: ConnectedFormBlockProps): React.ReactElement {
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
    return normalizeFormConfig(config, runtimeContext);
  }, [config, runtimeContext]);

  // Build FormBlockConfig with conditional properties for exactOptionalPropertyTypes
  const formConfig: FormBlockConfig = useMemo(() => {
    const base: FormBlockConfig = {
      block: 'form' as const,
      source: normalizedConfig.source,
      mode: normalizedConfig.mode,
      fields: normalizedConfig.fields as readonly FieldConfig[],
    };
    const entityId = normalizedConfig.entityId;
    const actions = normalizedConfig.actions as {
      submit?: FormAction;
      cancel?: FormAction;
    } | undefined;

    return {
      ...base,
      ...(entityId !== undefined && { entityId }),
      ...(actions !== undefined && { actions }),
    };
  }, [normalizedConfig]);

  // Guard: Check if edit mode but no resolved entityId
  if (normalizedConfig.mode === 'edit' && !normalizedConfig.entityId) {
    return (
      <div
        className={className}
        style={{ padding: '1rem', color: '#dc3545' }}
        data-testid="form-missing-id"
      >
        Error: Edit mode requires an entity ID. Check that route parameters are available.
      </div>
    );
  }

  // Build props conditionally for exactOptionalPropertyTypes
  const props: {
    config: FormBlockConfig;
    mode: 'create' | 'edit';
    entityId?: EntityId;
    onSubmit?: typeof onSubmit;
    onCancel?: typeof onCancel;
    className?: string;
  } = {
    config: formConfig,
    mode: normalizedConfig.mode,
  };
  if (normalizedConfig.entityId !== undefined) {
    props.entityId = normalizedConfig.entityId;
  }
  if (onSubmit !== undefined) {
    props.onSubmit = onSubmit;
  }
  if (onCancel !== undefined) {
    props.onCancel = onCancel;
  }
  if (className !== undefined) {
    props.className = className;
  }

  return <FormBlock {...props} />;
}

/**
 * Build a FormBlockConfig from a generic block spec.
 * Used by BlockRenderer for config transformation.
 */
export function buildFormBlockConfig(
  blockSpec: BlockSpec,
  context: RuntimeContext
): FormBlockConfig {
  const normalized = normalizeFormConfig(blockSpec, context);

  const base: FormBlockConfig = {
    block: 'form',
    source: normalized.source,
    mode: normalized.mode,
    fields: normalized.fields as readonly FieldConfig[],
  };

  const entityId = normalized.entityId;
  const actions = normalized.actions as {
    submit?: FormAction;
    cancel?: FormAction;
  } | undefined;

  return {
    ...base,
    ...(entityId !== undefined && { entityId }),
    ...(actions !== undefined && { actions }),
  };
}
