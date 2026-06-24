/**
 * Aggregation unit-carrying tests — SUM/AVG/MIN/MAX should propagate the
 * (common) dimension/unit of their inputs and convert to a common unit before
 * combining, mirroring the unit-carrying binary operators.
 */

import { describe, it, expect } from 'vitest';
import { aggregationFunctions } from './aggregation.js';
import type { NumberValue, ListValue, Value, DimensionType } from '../../types/value.js';
import type { RuntimeValue } from './index.js';

const fn = (name: string) => aggregationFunctions.find((f) => f.name === name)!;
const num = (value: number, unit?: string, dimension?: string): NumberValue => ({
  type: 'number',
  value,
  ...(unit ? { unit } : {}),
  ...(dimension ? { dimension: dimension as DimensionType } : {}),
});
const list = (...values: Value[]): ListValue =>
  ({ type: 'list', values, element_type: 'number' } as unknown as ListValue);
const call = (name: string, l: ListValue): RuntimeValue => fn(name).impl([l]) as RuntimeValue;

describe('aggregation carries units', () => {
  it('SUM carries the common unit', () => {
    expect(call('SUM', list(num(2, 'kg'), num(3, 'kg')))).toMatchObject({ value: 5, unit: 'kg', dimension: 'mass' });
  });

  it('SUM converts mixed units of one dimension to the first unit', () => {
    // 1 m + 500 mm + 2 m = 3.5 m
    const r = call('SUM', list(num(1, 'm'), num(500, 'mm'), num(2, 'm'))) as NumberValue;
    expect(r.value).toBeCloseTo(3.5, 9);
    expect(r.unit).toBe('m');
  });

  it('AVG carries the unit', () => {
    expect(call('AVG', list(num(10, 'g'), num(20, 'g')))).toMatchObject({ value: 15, unit: 'g' });
  });

  it('MIN/MAX carry the unit and compare on a common scale', () => {
    // 1 m vs 900 mm → min 0.9 m, max 1 m
    expect((call('MIN', list(num(1, 'm'), num(900, 'mm'))) as NumberValue).value).toBeCloseTo(0.9, 9);
    expect((call('MAX', list(num(1, 'm'), num(900, 'mm'))) as NumberValue).value).toBeCloseTo(1, 9);
  });

  it('mixed dimensions stay unitless (no mislabeling)', () => {
    const r = call('SUM', list(num(2, 'kg'), num(3, 'm'))) as NumberValue;
    expect(r.unit).toBeUndefined();
    expect(r.dimension).toBeUndefined();
  });

  it('plain (unitless) lists are unchanged', () => {
    expect(call('SUM', list(num(2), num(3)))).toEqual({ type: 'number', value: 5 });
  });
});
