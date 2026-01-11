/**
 * Trellis FormBlock - TextField Component
 *
 * Single-line text input field.
 */

import React from 'react';
import type { BaseFieldProps } from '../types.js';

/**
 * TextField component for single-line text input.
 *
 * @example
 * ```tsx
 * <TextField
 *   name="name"
 *   value={value}
 *   onChange={onChange}
 *   onBlur={onBlur}
 *   config={{ property: 'name', placeholder: 'Enter name' }}
 * />
 * ```
 */
export function TextField({
  name,
  value,
  onChange,
  onBlur,
  config,
  error,
  disabled,
  className,
}: BaseFieldProps): React.ReactElement {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      type="text"
      id={name}
      name={name}
      value={(value as string) ?? ''}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={config.placeholder}
      disabled={disabled || config.disabled}
      readOnly={config.readOnly}
      maxLength={config.maxLength}
      minLength={config.minLength}
      pattern={config.pattern}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={className}
      data-testid={`field-${name}`}
    />
  );
}
