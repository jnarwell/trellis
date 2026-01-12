/**
 * Trellis FormBlock - FormField Component
 *
 * Wrapper component for form fields with label and error display.
 */

import React from 'react';
import type { FormFieldProps } from './types.js';
import { useField } from './hooks.js';
import { getFieldComponent } from './fields/index.js';

/**
 * FormField component wraps field inputs with label, help text, and error display.
 *
 * @example
 * ```tsx
 * <FormField
 *   config={{ property: 'name', label: 'Product Name', required: true }}
 *   form={form}
 * />
 * ```
 */
export function FormField({
  config,
  form,
  className,
}: FormFieldProps): React.ReactElement {
  const { field, label, showError } = useField({
    name: config.property,
    config,
    form,
  });

  // Determine field type (use config type or default to 'text')
  const fieldType = config.type ?? 'text';
  const FieldComponent = getFieldComponent(fieldType);

  // For boolean fields, render checkbox with label inline
  const isBoolean = fieldType === 'boolean';

  return (
    <div
      className={`form-field ${className ?? ''}`}
      data-field={config.property}
    >
      {/* Label (before input for non-boolean fields) */}
      {!isBoolean && (
        <label htmlFor={config.property}>
          {label}
          {config.required && <span className="required">*</span>}
        </label>
      )}

      {/* Field input */}
      <div
        style={{
          display: isBoolean ? 'flex' : 'block',
          alignItems: isBoolean ? 'center' : undefined,
          gap: isBoolean ? '0.5rem' : undefined,
        }}
      >
        <FieldComponent
          name={config.property}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          config={config}
          error={field.error}
        />

        {/* Label (after input for boolean fields) */}
        {isBoolean && (
          <label htmlFor={config.property}>
            {label}
            {config.required && <span className="required">*</span>}
          </label>
        )}
      </div>

      {/* Help text */}
      {config.helpText && !showError && (
        <div className="help-text">{config.helpText}</div>
      )}

      {/* Error message */}
      {showError && field.error && (
        <div
          id={`${config.property}-error`}
          role="alert"
          className="error-message"
        >
          {field.error}
        </div>
      )}
    </div>
  );
}
