/**
 * Trellis Expression Engine - Aggregation Functions
 *
 * SUM, COUNT, AVG, MIN, MAX
 */

import type { Value, ListValue, NumberValue, DimensionType } from '../../types/index.js';
import type { FunctionDefinition, RuntimeValue } from './index.js';
import { typeMismatchError } from '../errors.js';
import { resolveDimension, effectiveUnit, convertValue, numberWithUnit } from '../units.js';

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
 * The dimension/unit a numeric aggregate should carry. Units are carried only
 * when every numeric item shares the same resolved dimension; a mixed or
 * partly-dimensionless list stays unitless rather than being mislabeled.
 */
function commonUnit(items: readonly RuntimeValue[]): { dimension?: DimensionType; unit?: string } {
  const nums = items.filter((i): i is NumberValue => !!i && i.type === 'number');
  const first = nums[0];
  if (!first) return {};
  const dim = resolveDimension(first);
  for (const n of nums) {
    if (resolveDimension(n) !== dim) return {};
  }
  const out: { dimension?: DimensionType; unit?: string } = {};
  if (dim) out.dimension = dim;
  if (first.unit) out.unit = first.unit;
  return out;
}

/** An item's numeric value converted into `targetUnit` (else its raw value). */
function valueIn(item: RuntimeValue, targetUnit?: string): number | null {
  if (!item || item.type !== 'number') return null;
  if (!targetUnit) return item.value;
  const eu = effectiveUnit(item);
  return eu ? convertValue(item.value, eu, targetUnit) : item.value;
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

    const target = commonUnit(list);
    let sum = 0;
    for (const item of list) {
      const n = valueIn(item, target.unit);
      if (n !== null) sum += n;
    }

    return numberWithUnit(sum, target.dimension, target.unit);
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

    const target = commonUnit(list);
    let sum = 0;
    let count = 0;

    for (const item of list) {
      const n = valueIn(item, target.unit);
      if (n !== null) {
        sum += n;
        count++;
      }
    }

    if (count === 0) return null;
    return numberWithUnit(sum / count, target.dimension, target.unit);
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

    const target = commonUnit(list);
    let min: number | null = null;

    for (const item of list) {
      const n = valueIn(item, target.unit);
      if (n !== null) {
        if (min === null || n < min) {
          min = n;
        }
      }
    }

    if (min === null) return null;
    return numberWithUnit(min, target.dimension, target.unit);
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

    const target = commonUnit(list);
    let max: number | null = null;

    for (const item of list) {
      const n = valueIn(item, target.unit);
      if (n !== null) {
        if (max === null || n > max) {
          max = n;
        }
      }
    }

    if (max === null) return null;
    return numberWithUnit(max, target.dimension, target.unit);
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
