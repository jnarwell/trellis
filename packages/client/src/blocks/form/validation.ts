/**
 * Trellis FormBlock - Validation
 *
 * Field validation functions.
 */

import type { FieldConfig } from './types.js';

/**
 * Validate a single field value against its configuration.
 *
 * @returns Error message string or null if valid
 */
export function validateField(value: unknown, config: FieldConfig): string | null {
  // Required validation
  if (config.required) {
    if (value === undefined || value === null || value === '') {
      return 'This field is required';
    }
    if (Array.isArray(value) && value.length === 0) {
      return 'This field is required';
    }
  }

  // Skip other validations if empty and not required
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // Type-specific validations
  let typeError: string | null = null;
  switch (config.type) {
    case 'text':
    case 'textarea':
      typeError = validateText(value, config);
      break;

    case 'number':
      typeError = validateNumber(value, config);
      break;

    case 'date':
    case 'datetime':
      typeError = validateDate(value, config);
      break;

    case 'boolean':
      typeError = validateBoolean(value);
      break;

    case 'select':
      typeError = validateSelect(value, config);
      break;

    case 'relation':
      typeError = validateRelation(value, config);
      break;
  }

  // Return type error if found
  if (typeError) {
    return typeError;
  }

  // Custom validation
  if (config.validate) {
    return config.validate(value);
  }

  return null;
}

/**
 * Validate text field.
 */
function validateText(value: unknown, config: FieldConfig): string | null {
  if (typeof value !== 'string') {
    return 'Must be text';
  }

  if (config.minLength !== undefined && value.length < config.minLength) {
    return `Must be at least ${config.minLength} characters`;
  }

  if (config.maxLength !== undefined && value.length > config.maxLength) {
    return `Must be at most ${config.maxLength} characters`;
  }

  if (config.pattern) {
    const regex = new RegExp(config.pattern);
    if (!regex.test(value)) {
      return 'Invalid format';
    }
  }

  return null;
}

/**
 * Validate number field.
 */
function validateNumber(value: unknown, config: FieldConfig): string | null {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || isNaN(num)) {
    return 'Must be a number';
  }

  if (config.min !== undefined && num < config.min) {
    return `Must be at least ${config.min}`;
  }

  if (config.max !== undefined && num > config.max) {
    return `Must be at most ${config.max}`;
  }

  return null;
}

/**
 * Validate date field.
 */
function validateDate(value: unknown, config: FieldConfig): string | null {
  if (typeof value !== 'string') {
    return 'Must be a date';
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return null;
}

/**
 * Validate boolean field.
 */
function validateBoolean(value: unknown): string | null {
  if (typeof value !== 'boolean') {
    return 'Must be true or false';
  }

  return null;
}

/**
 * Validate select field.
 */
function validateSelect(value: unknown, config: FieldConfig): string | null {
  if (!config.options) {
    return null;
  }

  const validValues = config.options.map((opt) => opt.value);
  if (!validValues.includes(value as string | number)) {
    return 'Invalid selection';
  }

  return null;
}

/**
 * Validate relation field.
 */
function validateRelation(value: unknown, config: FieldConfig): string | null {
  if (config.multiple) {
    if (!Array.isArray(value)) {
      return 'Must be a list of references';
    }
    // Each item should be a valid entity ID (string)
    for (const item of value) {
      if (typeof item !== 'string') {
        return 'Invalid reference';
      }
    }
  } else {
    if (typeof value !== 'string') {
      return 'Invalid reference';
    }
  }

  return null;
}

/**
 * Validate all form values.
 *
 * @returns Record of field name to error message (empty if all valid)
 */
export function validateForm(
  values: Record<string, unknown>,
  fields: readonly FieldConfig[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = values[field.property];
    const error = validateField(value, field);
    if (error) {
      errors[field.property] = error;
    }
  }

  return errors;
}
