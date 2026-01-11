/**
 * Trellis FormBlock - NumberField Component
 *
 * Numeric input field with optional formatting.
 */

import React from 'react';
import type { BaseFieldProps } from '../types.js';

/**
 * NumberField component for numeric input.
 *
 * @example
 * ```tsx
 * <NumberField
 *   name="price"
 *   value={value}
 *   onChange={onChange}
 *   onBlur={onBlur}
 *   config={{ property: 'price', min: 0, step: 0.01, format: 'currency' }}
 * />
 * ```
 */
export function NumberField({
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
    const rawValue = e.target.value;

    // Allow empty string for clearing
    if (rawValue === '') {
      onChange(undefined);
      return;
    }

    // Parse as number
    const numValue = parseFloat(rawValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  // Format display value
  const displayValue = (): string => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') {
      return String(value);
    }
    return String(value);
  };

  return (
    <input
      type="number"
      id={name}
      name={name}
      value={displayValue()}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={config.placeholder}
      disabled={disabled || config.disabled}
      readOnly={config.readOnly}
      min={config.min}
      max={config.max}
      step={config.step ?? 'any'}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={className}
      data-testid={`field-${name}`}
    />
  );
}
