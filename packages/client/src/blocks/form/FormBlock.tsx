/**
 * Trellis FormBlock - Main Component
 *
 * Form block for creating and editing entities.
 */

import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import type { Entity, PropertyName, PropertyInput } from '@trellis/kernel';
import { useEntity, useCreateEntity, useUpdateEntity } from '../../state/hooks.js';
import { useNavigation } from '../../runtime/NavigationProvider.js';
import type { FormBlockProps } from './types.js';
import { entityToValues, valuesToProperties } from './types.js';
import { useForm } from './hooks.js';
import { FormField } from './FormField.js';
import { FormActions } from './FormActions.js';
import { ConflictDialog } from './ConflictDialog.js';

/**
 * FormBlock component for creating and editing entities.
 *
 * @example
 * ```tsx
 * // Create mode
 * <FormBlock
 *   config={{
 *     block: 'form',
 *     source: 'product',
 *     mode: 'create',
 *     fields: [
 *       { property: 'name', required: true },
 *       { property: 'price', type: 'number', min: 0 },
 *     ],
 *   }}
 *   onSubmit={(entity) => navigate(`/products/${entity.id}`)}
 * />
 *
 * // Edit mode
 * <FormBlock
 *   config={{
 *     block: 'form',
 *     source: 'product',
 *     mode: 'edit',
 *     entityId: 'ent_123',
 *     fields: [...],
 *   }}
 *   entityId="ent_123"
 *   onSubmit={(entity) => console.log('Saved:', entity)}
 * />
 * ```
 */
export function FormBlock({
  config,
  entityId: propEntityId,
  mode: propMode,
  onSubmit,
  onCancel,
  className,
}: FormBlockProps): React.ReactElement {
  // Navigation
  const { toView, back } = useNavigation();

  // Determine mode and entity ID
  const mode = propMode ?? config.mode;
  const entityId = propEntityId ?? config.entityId;
  const isEditMode = mode === 'edit' && entityId;

  // Fetch entity for edit mode
  const {
    data: entity,
    loading: entityLoading,
    error: entityError,
    refetch,
  } = useEntity(isEditMode ? entityId : null);

  // Force fresh fetch on mount for edit mode to avoid stale cache
  useEffect(() => {
    if (isEditMode && entityId) {
      void refetch();
    }
  }, [entityId]); // Only on mount/entityId change, not on refetch change

  // Mutations
  const createMutation = useCreateEntity();
  const updateMutation = useUpdateEntity();

  // Use ref to track current entity for use in callbacks (avoids stale closure)
  const entityRef = useRef<Entity | null>(null);
  entityRef.current = entity;

  // Track the current version for optimistic locking
  // Update on every render when entity version changes to avoid stale version
  const versionRef = useRef<number | undefined>(undefined);
  if (entity?.version !== undefined && entity.version !== versionRef.current) {
    versionRef.current = entity.version;
  }

  // Extract initial values from entity
  const initialValues = useMemo(() => {
    if (!isEditMode || !entity) {
      return {};
    }
    return entityToValues(entity, config.fields);
  }, [isEditMode, entity, config.fields]);

  // Form hook
  const form = useForm({
    defaultValues: initialValues,
    ...(entity?.version !== undefined ? { version: entity.version } : {}),
    validationMode: 'onBlur',
    onSubmit: async (values) => {
      const properties = valuesToProperties(
        values as Record<string, unknown>,
        config.fields
      );

      // Use ref to get current entity (avoids stale closure)
      const currentEntity = entityRef.current;

      if (isEditMode && currentEntity && versionRef.current !== undefined) {
        // Update existing entity - use versionRef for accurate version tracking
        const updatedEntity = await updateMutation.mutate({
          id: currentEntity.id,
          expected_version: versionRef.current,
          set_properties: properties as Record<PropertyName, PropertyInput>,
        });
        onSubmit?.(updatedEntity);
        // Navigate back to detail page after successful save
        back();
      } else if (!isEditMode) {
        // Create new entity
        const newEntity = await createMutation.mutate({
          type: config.source,
          properties: properties as Record<PropertyName, PropertyInput>,
        });
        onSubmit?.(newEntity);
      } else {
        console.error('[FormBlock] Cannot update: entity not loaded');
      }
    },
    onError: (error) => {
      console.error('Form submission error:', error);
    },
  });

  // Reset form when entity changes
  useEffect(() => {
    // Only reset if we have a valid entity with properties
    if (entity?.id && entity?.properties) {
      const values = entityToValues(entity, config.fields);
      // Only reset if we actually extracted values (don't reset with empty object)
      if (Object.keys(values).length > 0) {
        // Pass entity version to ensure form tracks current version for optimistic locking
        form.reset(values, entity.version);
        // Update version ref for use in onSubmit callback
        versionRef.current = entity.version;
      }
    }
  }, [entity?.id, entity?.version]);

  // Handle cancel - navigate to target view or go back
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else if (isEditMode) {
      // In edit mode, go back to where we came from (usually detail page)
      back();
    } else if (config.actions?.cancel?.target) {
      // In create mode, navigate to the target view
      toView(config.actions.cancel.target);
    } else {
      // Fall back to browser back
      back();
    }
  }, [onCancel, isEditMode, config.actions?.cancel?.target, toView, back]);

  // Loading state for edit mode
  if (isEditMode && entityLoading) {
    return (
      <div
        className={className}
        style={{ padding: '1rem', textAlign: 'center' }}
        data-testid="form-loading"
      >
        Loading...
      </div>
    );
  }

  // Error state for edit mode
  if (isEditMode && entityError) {
    return (
      <div
        className={className}
        style={{ padding: '1rem', color: '#dc3545' }}
        data-testid="form-error"
      >
        Error loading entity: {entityError.message}
      </div>
    );
  }

  // Entity not found for edit mode
  if (isEditMode && !entity && !entityLoading) {
    return (
      <div
        className={className}
        style={{ padding: '1rem', color: '#dc3545' }}
        data-testid="form-not-found"
      >
        Entity not found
      </div>
    );
  }

  return (
    <div className={`form-block ${className ?? ''}`} data-testid="form-block">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        noValidate
      >
        {/* Form-level error */}
        {form.state.submitError && !form.state.hasConflict && (
          <div
            role="alert"
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              color: '#721c24',
            }}
            data-testid="form-submit-error"
          >
            {form.state.submitError}
          </div>
        )}

        {/* Fields */}
        {config.fields.map((fieldConfig) => (
          <FormField
            key={fieldConfig.property}
            config={fieldConfig}
            form={form}
          />
        ))}

        {/* Actions */}
        <FormActions
          form={form}
          submitAction={config.actions?.submit ?? { type: 'submit', label: 'Save', variant: 'primary' }}
          {...(config.actions?.cancel ? { cancelAction: config.actions.cancel } : {})}
          onCancel={handleCancel}
        />
      </form>

      {/* Version conflict dialog */}
      {form.state.hasConflict && (
        <ConflictDialog
          form={form}
          fields={config.fields}
          onResolve={(useServerValues) => {
            form.resolveConflict(useServerValues);
          }}
        />
      )}
    </div>
  );
}
