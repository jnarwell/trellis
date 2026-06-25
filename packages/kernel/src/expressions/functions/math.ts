/**
 * Trellis Expression Engine - Math Functions
 *
 * ROUND, FLOOR, CEIL, ABS, POW, SQRT
 */

import type { NumberValue } from '../../types/index.js';
import type { FunctionDefinition, RuntimeValue } from './index.js';
import { typeMismatchError } from '../errors.js';

/**
 * Extract number value.
 */
function toNumber(v: RuntimeValue | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (v.type === 'number') return v.value;
  return null;
}

/**
 * Create number value.
 */
function numberValue(n: number): NumberValue {
  return { type: 'number', value: n };
}

/**
 * ROUND - Round to nearest integer or decimal places.
 * ROUND(n) - round to nearest integer
 * ROUND(n, decimals) - round to N decimal places
 */
const ROUND: FunctionDefinition = {
  name: 'ROUND',
  minArgs: 1,
  maxArgs: 2,
  argTypes: ['number', 'number'],
  returnType: 'number',
  description: 'Round to nearest integer or decimal places',
  impl: (args) => {
    const n = toNumber(args[0]);
    if (n === null) return null;

    if (args.length === 2) {
      const decimals = toNumber(args[1]);
      if (decimals === null) return null;
      const factor = Math.pow(10, Math.floor(decimals));
      return numberValue(Math.round(n * factor) / factor);
    }

    return numberValue(Math.round(n));
  },
};

/**
 * FLOOR - Round down to nearest integer.
 */
const FLOOR: FunctionDefinition = {
  name: 'FLOOR',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['number'],
  returnType: 'number',
  description: 'Round down to nearest integer',
  impl: (args) => {
    const n = toNumber(args[0]);
    if (n === null) return null;
    return numberValue(Math.floor(n));
  },
};

/**
 * CEIL - Round up to nearest integer.
 */
const CEIL: FunctionDefinition = {
  name: 'CEIL',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['number'],
  returnType: 'number',
  description: 'Round up to nearest integer',
  impl: (args) => {
    const n = toNumber(args[0]);
    if (n === null) return null;
    return numberValue(Math.ceil(n));
  },
};

/**
 * ABS - Absolute value.
 */
const ABS: FunctionDefinition = {
  name: 'ABS',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['number'],
  returnType: 'number',
  description: 'Absolute value',
  impl: (args) => {
    const n = toNumber(args[0]);
    if (n === null) return null;
    return numberValue(Math.abs(n));
  },
};

/**
 * POW - Exponentiation.
 * POW(base, exponent)
 */
const POW: FunctionDefinition = {
  name: 'POW',
  minArgs: 2,
  maxArgs: 2,
  argTypes: ['number', 'number'],
  returnType: 'number',
  description: 'Exponentiation (base ^ exponent)',
  impl: (args) => {
    const base = toNumber(args[0]);
    const exp = toNumber(args[1]);
    if (base === null || exp === null) return null;
    return numberValue(Math.pow(base, exp));
  },
};

/**
 * SQRT - Square root.
 */
const SQRT: FunctionDefinition = {
  name: 'SQRT',
  minArgs: 1,
  maxArgs: 1,
  argTypes: ['number'],
  returnType: 'number',
  description: 'Square root',
  impl: (args) => {
    const n = toNumber(args[0]);
    if (n === null) return null;
    if (n < 0) return null; // Square root of negative returns null
    return numberValue(Math.sqrt(n));
  },
};

/**
 * MOD - Remainder of a / b. Returns null when b is 0.
 */
const MOD: FunctionDefinition = {
  name: 'MOD',
  minArgs: 2,
  maxArgs: 2,
  argTypes: ['number', 'number'],
  returnType: 'number',
  description: 'Remainder of a divided by b',
  impl: (args) => {
    const a = toNumber(args[0]);
    const b = toNumber(args[1]);
    if (a === null || b === null || b === 0) return null;
    return numberValue(a % b);
  },
};

/**
 * CLAMP - Constrain a value to the [min, max] range.
 */
const CLAMP: FunctionDefinition = {
  name: 'CLAMP',
  minArgs: 3,
  maxArgs: 3,
  argTypes: ['number', 'number', 'number'],
  returnType: 'number',
  description: 'Constrain a value to the [min, max] range',
  impl: (args) => {
    const n = toNumber(args[0]);
    const min = toNumber(args[1]);
    const max = toNumber(args[2]);
    if (n === null || min === null || max === null) return null;
    return numberValue(Math.min(Math.max(n, min), max));
  },
};

/**
 * All math functions.
 */
export const mathFunctions: readonly FunctionDefinition[] = [
  ROUND,
  FLOOR,
  CEIL,
  ABS,
  POW,
  SQRT,
  MOD,
  CLAMP,
];
