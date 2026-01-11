/**
 * Trellis Query Engine - Property Path Translation
 *
 * Translates API property paths to PostgreSQL JSONB accessors.
 *
 * Property structure in database:
 * properties = {
 *   name: {
 *     source: 'literal',
 *     name: 'name',
 *     value: { type: 'text', value: 'Widget' }
 *   }
 * }
 *
 * Access pattern: properties->'name'->'value'->>'value'
 */

/**
 * Valid property path pattern.
 * Alphanumeric with underscores, dot-separated for nesting.
 */
const VALID_PATH_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

/**
 * Value type for SQL casting.
 */
export type SQLValueType = 'text' | 'numeric' | 'boolean' | 'jsonb';

/**
 * Validate a property path for safety.
 * Prevents SQL injection through path manipulation.
 */
export function validatePropertyPath(path: string): boolean {
  return VALID_PATH_PATTERN.test(path);
}

/**
 * Escape a property name for safe use in JSONB path.
 * Uses double quotes for PostgreSQL identifier quoting.
 */
function escapePropertyName(name: string): string {
  // Replace any quotes with escaped quotes
  return name.replace(/'/g, "''");
}

/**
 * Translate a property path to a PostgreSQL JSONB accessor.
 *
 * @param path - The property path (e.g., "name", "metadata.category")
 * @param valueType - The expected value type for casting
 * @returns SQL fragment for accessing the property value
 *
 * @example
 * propertyPathToSQL("name", "text")
 * // Returns: properties->'name'->'value'->>'value'
 *
 * @example
 * propertyPathToSQL("price", "numeric")
 * // Returns: (properties->'price'->'value'->>'value')::numeric
 *
 * @example
 * propertyPathToSQL("metadata.tags", "jsonb")
 * // Returns: properties->'metadata'->'value'->'tags'
 */
export function propertyPathToSQL(
  path: string,
  valueType: SQLValueType = 'text'
): string {
  if (!validatePropertyPath(path)) {
    throw new Error(`Invalid property path: ${path}`);
  }

  const parts = path.split('.');
  const firstPart = parts[0];
  if (!firstPart) {
    throw new Error(`Invalid property path: ${path}`);
  }
  const propertyName = escapePropertyName(firstPart);

  // Start with the property name and navigate to its value
  let sql = `properties->'${propertyName}'->'value'`;

  // Handle nested paths within the value
  for (let i = 1; i < parts.length; i++) {
    const partName = parts[i];
    if (!partName) continue;
    const part = escapePropertyName(partName);
    sql = `${sql}->'${part}'`;
  }

  // Final accessor and casting based on value type
  switch (valueType) {
    case 'numeric':
      return `(${sql}->>'value')::numeric`;
    case 'boolean':
      return `(${sql}->>'value')::boolean`;
    case 'jsonb':
      // Return as JSONB for array operations
      return `${sql}->'value'`;
    case 'text':
    default:
      return `${sql}->>'value'`;
  }
}

/**
 * Build a JSONB key existence check.
 * Used for the 'exists' filter operator.
 *
 * @param propertyName - The top-level property name to check
 * @returns SQL fragment for checking if property exists
 */
export function propertyExistsSQL(propertyName: string): string {
  if (!validatePropertyPath(propertyName)) {
    throw new Error(`Invalid property name: ${propertyName}`);
  }

  // Only check top-level property name, not nested paths
  const topLevel = propertyName.split('.')[0];
  if (!topLevel) {
    throw new Error(`Invalid property name: ${propertyName}`);
  }
  return `properties ? '${escapePropertyName(topLevel)}'`;
}

/**
 * Determine the SQL value type based on the filter value.
 */
export function inferSQLValueType(value: unknown): SQLValueType {
  if (typeof value === 'number') {
    return 'numeric';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (Array.isArray(value)) {
    return 'jsonb';
  }
  return 'text';
}
