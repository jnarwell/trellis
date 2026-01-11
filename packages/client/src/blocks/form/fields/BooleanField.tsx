/**
 * Trellis FormBlock - BooleanField Component
 *
 * Checkbox input for boolean values.
 */

import React from 'react';
import type { BaseFieldProps } from '../types.js';

/**
 * BooleanField component for boolean input (checkbox).
 *
 * @example
 * ```tsx
 * <BooleanField
 *   name="active"
 *   value={value}
 *   onChange={onChange}
 *   onBlur={onBlur}
 *   config={{ property: 'active', label: 'Is Active' }}
 * />
 * ```
 */
export function BooleanField({
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
    onChange(e.target.checked);
  };

  return (
    <input
      type="checkbox"
      id={name}
      name={name}
      checked={Boolean(value)}
      onChange={handleChange}
      onBlur={onBlur}
      disabled={disabled || config.disabled}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={className}
      data-testid={`field-${name}`}
    />
  );
}
