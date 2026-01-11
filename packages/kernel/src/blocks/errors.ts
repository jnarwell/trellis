/**
 * Trellis Block System - Error Utilities
 *
 * Provides factory functions for creating rich validation errors.
 */

import type {
  ValidationError,
  ValidationErrorCategory,
  ValidationWarning,
  PropType,
} from './types.js';

/**
 * Create a validation error with full context.
 */
export function createValidationError(
  category: ValidationErrorCategory,
  code: string,
  message: string,
  path: readonly string[],
  value: unknown,
  expected: string,
  suggestions: readonly string[] = [],
  location?: { file: string; line: number; column: number }
): ValidationError {
  const error: ValidationError = {
    category,
    code,
    message,
    path,
    value,
    expected,
    suggestions,
  };

  // Only add location if provided (exactOptionalPropertyTypes compliance)
  if (location) {
    return { ...error, location };
  }
  return error;
}

/**
 * Create a validation warning.
 */
export function createValidationWarning(
  code: string,
  message: string,
  path: readonly string[],
  suggestion?: string
): ValidationWarning {
  const warning: ValidationWarning = {
    code,
    message,
    path,
  };

  // Only add suggestion if provided (exactOptionalPropertyTypes compliance)
  if (suggestion) {
    return { ...warning, suggestion };
  }
  return warning;
}

/**
 * Find similar strings using Levenshtein distance.
 * Returns strings sorted by similarity (most similar first).
 */
export function findSimilar(
  needle: string,
  haystack: readonly string[],
  maxResults: number = 3,
  maxDistance: number = 3
): string[] {
  const scored = haystack
    .map((s) => ({ value: s, distance: levenshteinDistance(needle.toLowerCase(), s.toLowerCase()) }))
    .filter((s) => s.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);

  return scored.slice(0, maxResults).map((s) => s.value);
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Initialize matrix with proper dimensions
  const matrix: number[][] = Array.from({ length: b.length + 1 }, () =>
    Array.from({ length: a.length + 1 }, () => 0)
  );

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i]![0] = i;
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    const row = matrix[i]!;
    const prevRow = matrix[i - 1]!;
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        row[j] = prevRow[j - 1]!;
      } else {
        row[j] = Math.min(
          prevRow[j - 1]! + 1, // substitution
          row[j - 1]! + 1,     // insertion
          prevRow[j]! + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Format a PropType for human-readable error messages.
 */
export function formatPropType(type: PropType): string {
  switch (type.kind) {
    case 'text':
      if (type.maxLength) return `text (max ${type.maxLength} chars)`;
      return 'text';

    case 'number':
      const parts: string[] = ['number'];
      if (type.integer) parts.push('(integer)');
      if (type.min !== undefined && type.max !== undefined) {
        parts.push(`[${type.min}-${type.max}]`);
      } else if (type.min !== undefined) {
        parts.push(`(>= ${type.min})`);
      } else if (type.max !== undefined) {
        parts.push(`(<= ${type.max})`);
      }
      return parts.join(' ');

    case 'boolean':
      return 'boolean';

    case 'datetime':
      return 'datetime (ISO 8601)';

    case 'entityType':
      return 'entity type path';

    case 'entityProperty':
      return type.ofType === 'self'
        ? 'property name on the configured entity type'
        : `property name on ${type.ofType}`;

    case 'entityReference':
      return type.ofType ? `reference to ${type.ofType}` : 'entity reference';

    case 'blockReference':
      return type.ofType ? `reference to ${type.ofType} block` : 'block reference';

    case 'enum':
      return `one of: ${type.values.join(', ')}`;

    case 'list':
      const elementType = formatPropType(type.element);
      if (type.minLength !== undefined && type.maxLength !== undefined) {
        return `list of ${elementType} (${type.minLength}-${type.maxLength} items)`;
      } else if (type.minLength !== undefined) {
        return `list of ${elementType} (min ${type.minLength} items)`;
      } else if (type.maxLength !== undefined) {
        return `list of ${elementType} (max ${type.maxLength} items)`;
      }
      return `list of ${elementType}`;

    case 'record':
      const fields = Object.keys(type.fields).join(', ');
      return `record { ${fields} }`;

    case 'union':
      return type.variants.map(formatPropType).join(' | ');

    case 'expression':
      return 'Trellis expression';

    case 'template':
      return 'template string';

    case 'style':
      return 'style object';

    case 'icon':
      return 'icon name';

    case 'color':
      return 'color value';

    default:
      return 'unknown';
  }
}

/**
 * Common error codes.
 */
export const ErrorCodes = {
  // Type mismatches
  TYPE_MISMATCH: 'TYPE_MISMATCH',
  EXPECTED_STRING: 'EXPECTED_STRING',
  EXPECTED_NUMBER: 'EXPECTED_NUMBER',
  EXPECTED_BOOLEAN: 'EXPECTED_BOOLEAN',
  EXPECTED_ARRAY: 'EXPECTED_ARRAY',
  EXPECTED_OBJECT: 'EXPECTED_OBJECT',

  // Required/unknown
  REQUIRED_PROP_MISSING: 'REQUIRED_PROP_MISSING',
  UNKNOWN_PROP: 'UNKNOWN_PROP',

  // References
  ENTITY_TYPE_NOT_FOUND: 'ENTITY_TYPE_NOT_FOUND',
  PROPERTY_NOT_FOUND: 'PROPERTY_NOT_FOUND',
  BLOCK_TYPE_NOT_FOUND: 'BLOCK_TYPE_NOT_FOUND',
  ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',

  // Validation
  INVALID_ENUM_VALUE: 'INVALID_ENUM_VALUE',
  VALUE_TOO_SHORT: 'VALUE_TOO_SHORT',
  VALUE_TOO_LONG: 'VALUE_TOO_LONG',
  VALUE_TOO_SMALL: 'VALUE_TOO_SMALL',
  VALUE_TOO_LARGE: 'VALUE_TOO_LARGE',
  PATTERN_MISMATCH: 'PATTERN_MISMATCH',
  LIST_TOO_SHORT: 'LIST_TOO_SHORT',
  LIST_TOO_LONG: 'LIST_TOO_LONG',

  // Wiring
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  RECEIVER_NOT_FOUND: 'RECEIVER_NOT_FOUND',
  PAYLOAD_INCOMPATIBLE: 'PAYLOAD_INCOMPATIBLE',
  BLOCK_NOT_FOUND: 'BLOCK_NOT_FOUND',

  // Expressions
  EXPRESSION_SYNTAX_ERROR: 'EXPRESSION_SYNTAX_ERROR',
  TEMPLATE_SYNTAX_ERROR: 'TEMPLATE_SYNTAX_ERROR',

  // Constraints
  CONSTRAINT_FAILED: 'CONSTRAINT_FAILED',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
