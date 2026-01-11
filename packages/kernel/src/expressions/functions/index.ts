/**
 * Trellis Expression Engine - Built-in Functions Registry
 *
 * Central registry for all built-in functions.
 */

import type { Value } from '../../types/index.js';
import {
  invalidFunctionError,
  invalidArgumentCountError,
  ExpressionError,
} from '../errors.js';

import { aggregationFunctions } from './aggregation.js';
import { conditionalFunctions } from './conditional.js';
import { stringFunctions } from './string.js';
import { mathFunctions } from './math.js';
import { dateFunctions } from './date.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Runtime value for function evaluation.
 * Extends Value with null for explicit null handling.
 */
export type RuntimeValue = Value | null;

/**
 * Function implementation signature.
 */
export type FunctionImpl = (
  args: readonly RuntimeValue[]
) => RuntimeValue | Promise<RuntimeValue>;

/**
 * Function definition with metadata.
 */
export interface FunctionDefinition {
  /** Function name (uppercase) */
  readonly name: string;
  /** Minimum number of arguments */
  readonly minArgs: number;
  /** Maximum number of arguments (undefined = unlimited) */
  readonly maxArgs?: number;
  /** Expected argument types (for validation) */
  readonly argTypes?: readonly string[];
  /** Return type */
  readonly returnType: string;
  /** Description */
  readonly description: string;
  /** Implementation */
  readonly impl: FunctionImpl;
}

// =============================================================================
// REGISTRY
// =============================================================================

/**
 * Map of function names to definitions.
 */
const functionRegistry = new Map<string, FunctionDefinition>();

/**
 * Register a function.
 */
export function registerFunction(def: FunctionDefinition): void {
  functionRegistry.set(def.name.toUpperCase(), def);
}

/**
 * Get a function definition by name.
 */
export function getFunction(name: string): FunctionDefinition | undefined {
  return functionRegistry.get(name.toUpperCase());
}

/**
 * Check if a function exists.
 */
export function hasFunction(name: string): boolean {
  return functionRegistry.has(name.toUpperCase());
}

/**
 * Get all registered function names.
 */
export function getAllFunctionNames(): readonly string[] {
  return [...functionRegistry.keys()];
}

/**
 * Find similar function names for suggestions.
 */
export function findSimilarFunctions(name: string): readonly string[] {
  const upper = name.toUpperCase();
  const allNames = getAllFunctionNames();

  // Exact prefix match
  const prefixMatches = allNames.filter((n) => n.startsWith(upper));
  if (prefixMatches.length > 0) {
    return prefixMatches.slice(0, 3);
  }

  // Levenshtein-like similarity (simple)
  const similar: Array<{ name: string; score: number }> = [];
  for (const funcName of allNames) {
    const score = similarity(upper, funcName);
    if (score > 0.5) {
      similar.push({ name: funcName, score });
    }
  }

  similar.sort((a, b) => b.score - a.score);
  return similar.slice(0, 3).map((s) => s.name);
}

/**
 * Simple similarity score (0-1).
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  const longerLength = longer.length;
  if (longerLength === 0) return 1;

  // Count matching characters
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    const char = shorter[i];
    if (char !== undefined && longer.includes(char)) matches++;
  }

  return matches / longerLength;
}

// =============================================================================
// FUNCTION INVOKER
// =============================================================================

/**
 * Invoke a function with arguments.
 */
export async function invokeFunction(
  name: string,
  args: readonly RuntimeValue[]
): Promise<RuntimeValue> {
  const func = getFunction(name);

  if (!func) {
    const suggestions = findSimilarFunctions(name);
    throw invalidFunctionError(name, suggestions);
  }

  // Validate argument count
  if (args.length < func.minArgs) {
    const expected =
      func.maxArgs !== undefined
        ? `${func.minArgs}-${func.maxArgs}`
        : `at least ${func.minArgs}`;
    throw invalidArgumentCountError(name, expected, args.length);
  }

  if (func.maxArgs !== undefined && args.length > func.maxArgs) {
    const expected =
      func.minArgs === func.maxArgs
        ? `${func.minArgs}`
        : `${func.minArgs}-${func.maxArgs}`;
    throw invalidArgumentCountError(name, expected, args.length);
  }

  // Invoke implementation
  return func.impl(args);
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the function registry with all built-in functions.
 */
export function initializeRegistry(): void {
  // Register aggregation functions
  for (const func of aggregationFunctions) {
    registerFunction(func);
  }

  // Register conditional functions
  for (const func of conditionalFunctions) {
    registerFunction(func);
  }

  // Register string functions
  for (const func of stringFunctions) {
    registerFunction(func);
  }

  // Register math functions
  for (const func of mathFunctions) {
    registerFunction(func);
  }

  // Register date functions
  for (const func of dateFunctions) {
    registerFunction(func);
  }
}

// Initialize on module load
initializeRegistry();
