/**
 * Trellis Expression Engine - Aggregation Functions
 *
 * SUM, COUNT, AVG, MIN, MAX
 */

import type { Value, ListValue, NumberValue } from '../../types/index.js';
import type { FunctionDefinition, RuntimeValue } from './index.js';
import { typeMismatchError } from '../errors.js';

/**
 * Extract number value from a Value.
 */
function toNumber(v: RuntimeValue | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (v.type === 'number') return v.value;
  return null;
}

/**
 * Extract list from a Value.
 */
function toList(v: RuntimeValue | undefined): readonly RuntimeValue[] | null {
  if (v === null || v === undefined) return null;
  if (v.type === 'list') return v.values;
  return null;
}

/**
 * Create number value.
 */
function numberValue(n: number): NumberValue {
  return { type: 'number', value: n };
}

/**
 * SUM - Sum of numeric values in a list.
 * Null items are skipped. Empty list returns 0.
 */
const SUM: FunctionDefinition = {
  name: 'SUM',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['list'],
  returnType: 'number',
  description: 'Sum of numeric values in a list',
  impl: (args) => {
    const list = toList(args[0]);
    if (list === null) return null;

    let sum = 0;
    for (const item of list) {
      const n = toNumber(item);
      if (n !== null) {
        sum += n;
      }
    }

    return numberValue(sum);
  },
};

/**
 * COUNT - Count of non-null items in a list.
 * Empty list returns 0.
 */
const COUNT: FunctionDefinition = {
  name: 'COUNT',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['list'],
  returnType: 'number',
  description: 'Count of non-null items in a list',
  impl: (args) => {
    const list = toList(args[0]);
    if (list === null) return null;

    let count = 0;
    for (const item of list) {
      if (item !== null) {
        count++;
      }
    }

    return numberValue(count);
  },
};

/**
 * AVG - Average of numeric values in a list.
 * Null items are skipped. Empty list returns null.
 */
const AVG: FunctionDefinition = {
  name: 'AVG',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['list'],
  returnType: 'number',
  description: 'Average of numeric values in a list',
  impl: (args) => {
    const list = toList(args[0]);
    if (list === null) return null;

    let sum = 0;
    let count = 0;

    for (const item of list) {
      const n = toNumber(item);
      if (n !== null) {
        sum += n;
        count++;
      }
    }

    if (count === 0) return null;
    return numberValue(sum / count);
  },
};

/**
 * MIN - Minimum numeric value in a list.
 * Null items are skipped. Empty list returns null.
 */
const MIN: FunctionDefinition = {
  name: 'MIN',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['list'],
  returnType: 'number',
  description: 'Minimum numeric value in a list',
  impl: (args) => {
    const list = toList(args[0]);
    if (list === null) return null;

    let min: number | null = null;

    for (const item of list) {
      const n = toNumber(item);
      if (n !== null) {
        if (min === null || n < min) {
          min = n;
        }
      }
    }

    if (min === null) return null;
    return numberValue(min);
  },
};

/**
 * MAX - Maximum numeric value in a list.
 * Null items are skipped. Empty list returns null.
 */
const MAX: FunctionDefinition = {
  name: 'MAX',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['list'],
  returnType: 'number',
  description: 'Maximum numeric value in a list',
  impl: (args) => {
    const list = toList(args[0]);
    if (list === null) return null;

    let max: number | null = null;

    for (const item of list) {
      const n = toNumber(item);
      if (n !== null) {
        if (max === null || n > max) {
          max = n;
        }
      }
    }

    if (max === null) return null;
    return numberValue(max);
  },
};

/**
 * All aggregation functions.
 */
export const aggregationFunctions: readonly FunctionDefinition[] = [
  SUM,
  COUNT,
  AVG,
  MIN,
  MAX,
];
