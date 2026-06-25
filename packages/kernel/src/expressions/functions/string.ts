/**
 * Trellis Expression Engine - String Functions
 *
 * CONCAT, UPPER, LOWER, LENGTH, SUBSTRING, TRIM
 */

import type { TextValue, NumberValue, BooleanValue } from '../../types/index.js';
import type { FunctionDefinition, RuntimeValue } from './index.js';
import { typeMismatchError } from '../errors.js';

/**
 * Extract string value.
 */
function toString(v: RuntimeValue | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (v.type === 'text') return v.value;
  return null;
}

/**
 * Extract number value.
 */
function toNumber(v: RuntimeValue | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (v.type === 'number') return v.value;
  return null;
}

/**
 * Create text value.
 */
function textValue(s: string): TextValue {
  return { type: 'text', value: s };
}

/**
 * Create number value.
 */
function numberValue(n: number): NumberValue {
  return { type: 'number', value: n };
}

/**
 * Create boolean value.
 */
function booleanValue(b: boolean): BooleanValue {
  return { type: 'boolean', value: b };
}

/**
 * Convert any value to string representation for CONCAT.
 * Null becomes "null".
 */
function valueToString(v: RuntimeValue | undefined): string {
  if (v === null || v === undefined) return 'null';

  switch (v.type) {
    case 'text':
      return v.value;
    case 'number':
      return String(v.value);
    case 'boolean':
      return String(v.value);
    case 'datetime':
      return v.value;
    case 'duration':
      return v.value;
    case 'reference':
      return v.entity_id;
    case 'list':
      return '[list]';
    case 'record':
      return '[record]';
    default:
      return String(v);
  }
}

/**
 * CONCAT - Concatenate strings.
 * Null values are converted to "null" string.
 */
const CONCAT: FunctionDefinition = {
  name: 'CONCAT',
  minArgs: 1,
  // maxArgs omitted = unlimited
  argTypes: ['any'],
  returnType: 'text',
  description: 'Concatenate values as strings',
  impl: (args) => {
    const parts: string[] = [];

    for (const arg of args) {
      parts.push(valueToString(arg));
    }

    return textValue(parts.join(''));
  },
};

/**
 * UPPER - Convert string to uppercase.
 * Returns null if input is null.
 */
const UPPER: FunctionDefinition = {
  name: 'UPPER',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['text'],
  returnType: 'text',
  description: 'Convert string to uppercase',
  impl: (args) => {
    const s = toString(args[0]);
    if (s === null) return null;
    return textValue(s.toUpperCase());
  },
};

/**
 * LOWER - Convert string to lowercase.
 * Returns null if input is null.
 */
const LOWER: FunctionDefinition = {
  name: 'LOWER',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['text'],
  returnType: 'text',
  description: 'Convert string to lowercase',
  impl: (args) => {
    const s = toString(args[0]);
    if (s === null) return null;
    return textValue(s.toLowerCase());
  },
};

/**
 * LENGTH - Get string length.
 * Returns null if input is null.
 */
const LENGTH: FunctionDefinition = {
  name: 'LENGTH',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['text'],
  returnType: 'number',
  description: 'Get string length',
  impl: (args) => {
    const s = toString(args[0]);
    if (s === null) return null;
    return numberValue(s.length);
  },
};

/**
 * SUBSTRING - Extract substring.
 * SUBSTRING(s, start) - from start to end
 * SUBSTRING(s, start, len) - from start for len characters
 * Start is 0-indexed.
 */
const SUBSTRING: FunctionDefinition = {
  name: 'SUBSTRING',
  minArgs: 2,
  maxArgs: 3,
  argTypes: ['text', 'number', 'number'],
  returnType: 'text',
  description: 'Extract substring',
  impl: (args) => {
    const s = toString(args[0]);
    const start = toNumber(args[1]);

    if (s === null || start === null) return null;

    // Bounds check
    const startIdx = Math.max(0, Math.floor(start));

    if (args.length === 3) {
      const len = toNumber(args[2]);
      if (len === null) return null;
      const length = Math.max(0, Math.floor(len));
      return textValue(s.substring(startIdx, startIdx + length));
    }

    return textValue(s.substring(startIdx));
  },
};

/**
 * TRIM - Remove whitespace from both ends.
 * Returns null if input is null.
 */
const TRIM: FunctionDefinition = {
  name: 'TRIM',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['text'],
  returnType: 'text',
  description: 'Remove whitespace from both ends',
  impl: (args) => {
    const s = toString(args[0]);
    if (s === null) return null;
    return textValue(s.trim());
  },
};

/**
 * CONTAINS - Whether the first string contains the second. Null-safe.
 */
const CONTAINS: FunctionDefinition = {
  name: 'CONTAINS',
  minArgs: 2,
  maxArgs: 2,
  argTypes: ['text', 'text'],
  returnType: 'boolean',
  description: 'Whether the first string contains the second',
  impl: (args) => {
    const s = toString(args[0]);
    const needle = toString(args[1]);
    if (s === null || needle === null) return null;
    return booleanValue(s.includes(needle));
  },
};

/**
 * STARTS_WITH - Whether a string starts with a prefix. Null-safe.
 */
const STARTS_WITH: FunctionDefinition = {
  name: 'STARTS_WITH',
  minArgs: 2,
  maxArgs: 2,
  argTypes: ['text', 'text'],
  returnType: 'boolean',
  description: 'Whether a string starts with a prefix',
  impl: (args) => {
    const s = toString(args[0]);
    const prefix = toString(args[1]);
    if (s === null || prefix === null) return null;
    return booleanValue(s.startsWith(prefix));
  },
};

/**
 * ENDS_WITH - Whether a string ends with a suffix. Null-safe.
 */
const ENDS_WITH: FunctionDefinition = {
  name: 'ENDS_WITH',
  minArgs: 2,
  maxArgs: 2,
  argTypes: ['text', 'text'],
  returnType: 'boolean',
  description: 'Whether a string ends with a suffix',
  impl: (args) => {
    const s = toString(args[0]);
    const suffix = toString(args[1]);
    if (s === null || suffix === null) return null;
    return booleanValue(s.endsWith(suffix));
  },
};

/**
 * REPLACE - Replace ALL occurrences of a substring. Null-safe.
 */
const REPLACE: FunctionDefinition = {
  name: 'REPLACE',
  minArgs: 3,
  maxArgs: 3,
  argTypes: ['text', 'text', 'text'],
  returnType: 'text',
  description: 'Replace all occurrences of a substring',
  impl: (args) => {
    const s = toString(args[0]);
    const search = toString(args[1]);
    const replacement = toString(args[2]);
    if (s === null || search === null || replacement === null) return null;
    // split/join replaces all occurrences without regex-escaping surprises.
    return textValue(search === '' ? s : s.split(search).join(replacement));
  },
};

/**
 * All string functions.
 */
export const stringFunctions: readonly FunctionDefinition[] = [
  CONCAT,
  UPPER,
  LOWER,
  LENGTH,
  SUBSTRING,
  TRIM,
  CONTAINS,
  STARTS_WITH,
  ENDS_WITH,
  REPLACE,
];
