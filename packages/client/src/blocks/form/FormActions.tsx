/**
 * Trellis FormBlock - FormActions Component
 *
 * Submit and cancel action buttons.
 */

import React from 'react';
import type { FormActionsProps } from './types.js';

/**
 * FormActions component renders submit and cancel buttons.
 *
 * @example
 * ```tsx
 * <FormActions
 *   form={form}
 *   submitAction={{ type: 'submit', label: 'Save' }}
 *   cancelAction={{ type: 'cancel', label: 'Cancel' }}
 *   onCancel={() => navigate('/list')}
 * />
 * ```
 */
export function FormActions({
  form,
  submitAction,
  cancelAction,
  onCancel,
  className,
}: FormActionsProps): React.ReactElement {
  const { state, handleSubmit } = form;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Button styles based on variant
  const getButtonStyle = (
    variant: 'primary' | 'secondary' | 'danger' = 'secondary'
  ): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: 500,
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: '#0d6efd',
          color: '#fff',
        };
      case 'danger':
        return {
          ...base,
          backgroundColor: '#dc3545',
          color: '#fff',
        };
      case 'secondary':
      default:
        return {
          ...base,
          backgroundColor: '#6c757d',
          color: '#fff',
        };
    }
  };

  const disabledStyle: React.CSSProperties = {
    opacity: 0.65,
    cursor: 'not-allowed',
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: '0.75rem',
        marginTop: '1.5rem',
        justifyContent: 'flex-end',
      }}
    >
      {/* Cancel button */}
      {cancelAction && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelAction.disabled || state.isSubmitting}
          style={{
            ...getButtonStyle(cancelAction.variant ?? 'secondary'),
            ...(cancelAction.disabled || state.isSubmitting ? disabledStyle : {}),
          }}
          data-testid="form-cancel"
        >
          {cancelAction.label}
        </button>
      )}

      {/* Submit button */}
      {submitAction && (
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={
            submitAction.disabled ||
            state.isSubmitting ||
            !state.isValid
          }
          style={{
            ...getButtonStyle(submitAction.variant ?? 'primary'),
            ...(submitAction.disabled || state.isSubmitting || !state.isValid
              ? disabledStyle
              : {}),
          }}
          data-testid="form-submit"
        >
          {state.isSubmitting ? 'Saving...' : submitAction.label}
        </button>
      )}
    </div>
  );
}
