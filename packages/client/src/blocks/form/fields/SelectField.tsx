/**
 * Trellis FormBlock - SelectField Component
 *
 * Dropdown select input field.
 */

import React from 'react';
import type { BaseFieldProps } from '../types.js';

/**
 * SelectField component for dropdown selection.
 *
 * @example
 * ```tsx
 * <SelectField
 *   name="status"
 *   value={value}
 *   onChange={onChange}
 *   onBlur={onBlur}
 *   config={{
 *     property: 'status',
 *     options: [
 *       { value: 'active', label: 'Active' },
 *       { value: 'inactive', label: 'Inactive' },
 *     ],
 *   }}
 * />
 * ```
 */
export function SelectField({
  name,
  value,
  onChange,
  onBlur,
  config,
  error,
  disabled,
  className,
}: BaseFieldProps): React.ReactElement {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rawValue = e.target.value;

    // Convert to appropriate type based on options
    const option = config.options?.find((opt) => String(opt.value) === rawValue);
    if (option) {
      onChange(option.value);
    } else {
      onChange(rawValue);
    }
  };

  return (
    <select
      id={name}
      name={name}
      value={value !== undefined && value !== null ? String(value) : ''}
      onChange={handleChange}
      onBlur={onBlur}
      disabled={disabled || config.disabled}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={className}
      data-testid={`field-${name}`}
    >
      {/* Empty option for placeholder */}
      {config.placeholder && (
        <option value="" disabled>
          {config.placeholder}
        </option>
      )}
      {!config.placeholder && !config.required && <option value="">--</option>}

      {/* Options */}
      {config.options?.map((option) => (
        <option
          key={String(option.value)}
          value={String(option.value)}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
