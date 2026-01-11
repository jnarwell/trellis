/**
 * Trellis Expression Engine - Conditional Functions
 *
 * IF, COALESCE
 */

import type { FunctionDefinition, RuntimeValue } from './index.js';
import { typeMismatchError } from '../errors.js';

/**
 * Extract boolean value.
 */
function toBoolean(v: RuntimeValue | undefined): boolean | null {
  if (v === null || v === undefined) return null;
  if (v.type === 'boolean') return v.value;
  return null;
}

/**
 * IF - Conditional expression.
 * IF(condition, then_value, else_value)
 * Returns then_value if condition is true, else_value otherwise.
 * Returns null if condition is null.
 */
const IF: FunctionDefinition = {
  name: 'IF',
  minArgs: 3,
  maxArgs: 3,
  argTypes: ['boolean', 'any', 'any'],
  returnType: 'any',
  description: 'Returns then_value if condition is true, else_value otherwise',
  impl: (args) => {
    const condition = toBoolean(args[0]);

    // Null condition returns null
    if (condition === null) {
      return null;
    }

    const thenValue = args[1];
    const elseValue = args[2];
    return condition ? (thenValue ?? null) : (elseValue ?? null);
  },
};

/**
 * COALESCE - Return first non-null value.
 * COALESCE(a, b, c, ...) returns the first non-null argument.
 * Returns null if all arguments are null.
 */
const COALESCE: FunctionDefinition = {
  name: 'COALESCE',
  minArgs: 1,
  // maxArgs omitted = unlimited
  argTypes: ['any'],
  returnType: 'any',
  description: 'Returns the first non-null value',
  impl: (args) => {
    for (const arg of args) {
      if (arg !== null) {
        return arg;
      }
    }
    return null;
  },
};

/**
 * All conditional functions.
 */
export const conditionalFunctions: readonly FunctionDefinition[] = [IF, COALESCE];
