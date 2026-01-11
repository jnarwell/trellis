/**
 * Trellis FormBlock - Main Component
 *
 * Form block for creating and editing entities.
 */

import React, { useEffect, useMemo } from 'react';
import type { Entity, PropertyName, PropertyInput } from '@trellis/kernel';
import { useEntity, useCreateEntity, useUpdateEntity } from '../../state/hooks.js';
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
  // Determine mode and entity ID
  const mode = propMode ?? config.mode;
  const entityId = propEntityId ?? config.entityId;
  const isEditMode = mode === 'edit' && entityId;

  // Fetch entity for edit mode
  const {
    data: entity,
    loading: entityLoading,
    error: entityError,
  } = useEntity(isEditMode ? entityId : null);

  // Mutations
  const createMutation = useCreateEntity();
  const updateMutation = useUpdateEntity();

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

      if (isEditMode && entity) {
        // Update existing entity
        const updatedEntity = await updateMutation.mutate({
          id: entity.id,
          expected_version: entity.version,
          set_properties: properties as Record<PropertyName, PropertyInput>,
        });
        onSubmit?.(updatedEntity);
      } else {
        // Create new entity
        const newEntity = await createMutation.mutate({
          type: config.source,
          properties: properties as Record<PropertyName, PropertyInput>,
        });
        onSubmit?.(newEntity);
      }
    },
    onError: (error) => {
      console.error('Form submission error:', error);
    },
  });

  // Reset form when entity changes
  useEffect(() => {
    if (entity) {
      const values = entityToValues(entity, config.fields);
      form.reset(values);
    }
  }, [entity?.id, entity?.version]);

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
    <div className={className} data-testid="form-block">
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
          {...(onCancel ? { onCancel } : {})}
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
