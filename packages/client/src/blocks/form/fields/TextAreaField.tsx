/**
 * Trellis FormBlock - TextAreaField Component
 *
 * Multi-line text input field.
 */

import React from 'react';
import type { BaseFieldProps } from '../types.js';

/**
 * TextAreaField component for multi-line text input.
 *
 * @example
 * ```tsx
 * <TextAreaField
 *   name="description"
 *   value={value}
 *   onChange={onChange}
 *   onBlur={onBlur}
 *   config={{ property: 'description', rows: 4 }}
 * />
 * ```
 */
export function TextAreaField({
  name,
  value,
  onChange,
  onBlur,
  config,
  error,
  disabled,
  className,
}: BaseFieldProps): React.ReactElement {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <textarea
      id={name}
      name={name}
      value={(value as string) ?? ''}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={config.placeholder}
      disabled={disabled || config.disabled}
      readOnly={config.readOnly}
      maxLength={config.maxLength}
      rows={config.rows ?? 3}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={className}
      data-testid={`field-${name}`}
    />
  );
}
