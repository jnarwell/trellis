/**
 * Tests for the newly added expression functions (string predicates + REPLACE,
 * MOD, CLAMP). Exercised through the same FunctionDefinition.impl the engine calls.
 */

import { describe, it, expect } from 'vitest';
import { stringFunctions } from './string.js';
import { mathFunctions } from './math.js';
import type { Value } from '../../types/value.js';
import type { RuntimeValue } from './index.js';

const fn = (name: string) =>
  [...stringFunctions, ...mathFunctions].find((f) => f.name === name)!;
const text = (s: string): Value => ({ type: 'text', value: s });
const num = (n: number): Value => ({ type: 'number', value: n });
const call = (name: string, ...args: RuntimeValue[]) => fn(name).impl(args) as RuntimeValue;

describe('string predicates', () => {
  it('CONTAINS', () => {
    expect(call('CONTAINS', text('hello world'), text('world'))).toEqual({ type: 'boolean', value: true });
    expect(call('CONTAINS', text('hello'), text('zzz'))).toEqual({ type: 'boolean', value: false });
    expect(call('CONTAINS', null, text('x'))).toBeNull();
  });

  it('STARTS_WITH / ENDS_WITH', () => {
    expect(call('STARTS_WITH', text('PN-1042'), text('PN-'))).toEqual({ type: 'boolean', value: true });
    expect(call('STARTS_WITH', text('PN-1042'), text('XX'))).toEqual({ type: 'boolean', value: false });
    expect(call('ENDS_WITH', text('report.pdf'), text('.pdf'))).toEqual({ type: 'boolean', value: true });
    expect(call('ENDS_WITH', text('report.pdf'), text('.csv'))).toEqual({ type: 'boolean', value: false });
  });
});

describe('REPLACE', () => {
  it('replaces all occurrences', () => {
    expect(call('REPLACE', text('a-b-c'), text('-'), text('_'))).toEqual({ type: 'text', value: 'a_b_c' });
  });
  it('is null-safe and handles empty search', () => {
    expect(call('REPLACE', null, text('-'), text('_'))).toBeNull();
    expect(call('REPLACE', text('abc'), text(''), text('_'))).toEqual({ type: 'text', value: 'abc' });
  });
});

describe('MOD', () => {
  it('returns the remainder', () => {
    expect(call('MOD', num(10), num(3))).toEqual({ type: 'number', value: 1 });
  });
  it('returns null on divide-by-zero', () => {
    expect(call('MOD', num(10), num(0))).toBeNull();
  });
});

describe('CLAMP', () => {
  it('constrains to the range', () => {
    expect(call('CLAMP', num(5), num(0), num(10))).toEqual({ type: 'number', value: 5 });
    expect(call('CLAMP', num(-3), num(0), num(10))).toEqual({ type: 'number', value: 0 });
    expect(call('CLAMP', num(99), num(0), num(10))).toEqual({ type: 'number', value: 10 });
  });
});
