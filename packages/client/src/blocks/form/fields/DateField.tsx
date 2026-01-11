/**
 * Trellis FormBlock - DateField Component
 *
 * Date/datetime input field.
 */

import React from 'react';
import type { BaseFieldProps } from '../types.js';

/**
 * DateField component for date/datetime input.
 *
 * @example
 * ```tsx
 * <DateField
 *   name="created_at"
 *   value={value}
 *   onChange={onChange}
 *   onBlur={onBlur}
 *   config={{ property: 'created_at', type: 'datetime' }}
 * />
 * ```
 */
export function DateField({
  name,
  value,
  onChange,
  onBlur,
  config,
  error,
  disabled,
  className,
}: BaseFieldProps): React.ReactElement {
  const isDateTime = config.type === 'datetime';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    if (!rawValue) {
      onChange(undefined);
      return;
    }

    // Convert to ISO string
    if (isDateTime) {
      // datetime-local returns "YYYY-MM-DDTHH:mm"
      onChange(new Date(rawValue).toISOString());
    } else {
      // date returns "YYYY-MM-DD"
      onChange(rawValue);
    }
  };

  // Format value for input
  const formatValue = (): string => {
    if (!value) return '';

    const strValue = String(value);
    try {
      const date = new Date(strValue);
      if (isNaN(date.getTime())) return '';

      if (isDateTime) {
        // datetime-local needs "YYYY-MM-DDTHH:mm"
        return date.toISOString().slice(0, 16);
      } else {
        // date needs "YYYY-MM-DD"
        return date.toISOString().slice(0, 10);
      }
    } catch {
      return '';
    }
  };

  return (
    <input
      type={isDateTime ? 'datetime-local' : 'date'}
      id={name}
      name={name}
      value={formatValue()}
      onChange={handleChange}
      onBlur={onBlur}
      disabled={disabled || config.disabled}
      readOnly={config.readOnly}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={className}
      data-testid={`field-${name}`}
    />
  );
}
