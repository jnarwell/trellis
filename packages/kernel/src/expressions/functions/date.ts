/**
 * Trellis Expression Engine - Date Functions
 *
 * NOW, DATE_DIFF, DATE_ADD
 */

import type { DateTimeValue, NumberValue } from '../../types/index.js';
import type { FunctionDefinition, RuntimeValue } from './index.js';
import { typeMismatchError } from '../errors.js';

/**
 * Extract datetime value.
 */
function toDatetime(v: RuntimeValue | undefined): Date | null {
  if (v === null || v === undefined) return null;
  if (v.type === 'datetime') {
    const d = new Date(v.value);
    if (isNaN(d.getTime())) return null;
    return d;
  }
  return null;
}

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
 * Create datetime value.
 */
function datetimeValue(d: Date): DateTimeValue {
  return { type: 'datetime', value: d.toISOString() };
}

/**
 * Create number value.
 */
function numberValue(n: number): NumberValue {
  return { type: 'number', value: n };
}

/**
 * Valid time units for date operations.
 */
type TimeUnit =
  | 'years'
  | 'months'
  | 'weeks'
  | 'days'
  | 'hours'
  | 'minutes'
  | 'seconds'
  | 'milliseconds';

/**
 * Normalize time unit string.
 */
function normalizeUnit(s: string): TimeUnit | null {
  const lower = s.toLowerCase();
  switch (lower) {
    case 'year':
    case 'years':
      return 'years';
    case 'month':
    case 'months':
      return 'months';
    case 'week':
    case 'weeks':
      return 'weeks';
    case 'day':
    case 'days':
      return 'days';
    case 'hour':
    case 'hours':
      return 'hours';
    case 'minute':
    case 'minutes':
      return 'minutes';
    case 'second':
    case 'seconds':
      return 'seconds';
    case 'millisecond':
    case 'milliseconds':
    case 'ms':
      return 'milliseconds';
    default:
      return null;
  }
}

/**
 * NOW - Current UTC timestamp.
 */
const NOW: FunctionDefinition = {
  name: 'NOW',
  minArgs: 0,
  maxArgs: 0,
  argTypes: [],
  returnType: 'datetime',
  description: 'Current UTC timestamp',
  impl: () => {
    return datetimeValue(new Date());
  },
};

/**
 * DATE_DIFF - Difference between two dates.
 * DATE_DIFF(d1, d2, unit) returns (d1 - d2) in the specified unit.
 */
const DATE_DIFF: FunctionDefinition = {
  name: 'DATE_DIFF',
  minArgs: 3,
  maxArgs: 3,
  argTypes: ['datetime', 'datetime', 'text'],
  returnType: 'number',
  description: 'Difference between two dates in specified unit',
  impl: (args) => {
    const d1 = toDatetime(args[0]);
    const d2 = toDatetime(args[1]);
    const unitStr = toString(args[2]);

    if (d1 === null || d2 === null || unitStr === null) return null;

    const unit = normalizeUnit(unitStr);
    if (unit === null) return null;

    const diffMs = d1.getTime() - d2.getTime();

    switch (unit) {
      case 'milliseconds':
        return numberValue(diffMs);
      case 'seconds':
        return numberValue(diffMs / 1000);
      case 'minutes':
        return numberValue(diffMs / (1000 * 60));
      case 'hours':
        return numberValue(diffMs / (1000 * 60 * 60));
      case 'days':
        return numberValue(diffMs / (1000 * 60 * 60 * 24));
      case 'weeks':
        return numberValue(diffMs / (1000 * 60 * 60 * 24 * 7));
      case 'months':
        // Approximate: 30.44 days per month
        return numberValue(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      case 'years':
        // Approximate: 365.25 days per year
        return numberValue(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    }
  },
};

/**
 * DATE_ADD - Add time to a date.
 * DATE_ADD(date, amount, unit)
 */
const DATE_ADD: FunctionDefinition = {
  name: 'DATE_ADD',
  minArgs: 3,
  maxArgs: 3,
  argTypes: ['datetime', 'number', 'text'],
  returnType: 'datetime',
  description: 'Add time to a date',
  impl: (args) => {
    const d = toDatetime(args[0]);
    const amount = toNumber(args[1]);
    const unitStr = toString(args[2]);

    if (d === null || amount === null || unitStr === null) return null;

    const unit = normalizeUnit(unitStr);
    if (unit === null) return null;

    const result = new Date(d.getTime());

    switch (unit) {
      case 'milliseconds':
        result.setTime(result.getTime() + amount);
        break;
      case 'seconds':
        result.setTime(result.getTime() + amount * 1000);
        break;
      case 'minutes':
        result.setTime(result.getTime() + amount * 1000 * 60);
        break;
      case 'hours':
        result.setTime(result.getTime() + amount * 1000 * 60 * 60);
        break;
      case 'days':
        result.setTime(result.getTime() + amount * 1000 * 60 * 60 * 24);
        break;
      case 'weeks':
        result.setTime(result.getTime() + amount * 1000 * 60 * 60 * 24 * 7);
        break;
      case 'months':
        result.setMonth(result.getMonth() + Math.floor(amount));
        break;
      case 'years':
        result.setFullYear(result.getFullYear() + Math.floor(amount));
        break;
    }

    return datetimeValue(result);
  },
};

/**
 * All date functions.
 */
export const dateFunctions: readonly FunctionDefinition[] = [
  NOW,
  DATE_DIFF,
  DATE_ADD,
];
