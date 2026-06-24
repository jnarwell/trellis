/**
 * Dimensional analysis tests — proves the engine treats numbers as physical
 * quantities (compatibility, conversion, carry-through), not bare floats.
 */

import { describe, it, expect } from 'vitest';
import { evaluate, createContext } from './evaluator.js';
import { parse } from './parser.js';
import type { Entity, TenantId } from '../types/index.js';
import type { NumberValue, DimensionType } from '../types/value.js';
import { resolveDimension, convertValue, dimensionsCompatible } from './units.js';

const num = (value: number, dimension?: string, unit?: string): NumberValue => ({
  type: 'number',
  value,
  ...(dimension ? { dimension: dimension as DimensionType } : {}),
  ...(unit ? { unit } : {}),
});

function makeEntity(props: Record<string, NumberValue>): Entity {
  return {
    id: '00000000-0000-7000-8000-000000000001',
    tenant_id: '00000000-0000-7000-8000-0000000000aa',
    type: 'thing',
    version: 1,
    properties: Object.fromEntries(
      Object.entries(props).map(([k, v]) => [k, { source: 'literal', value: v }])
    ),
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    created_by: '00000000-0000-7000-8000-0000000000bb',
  } as unknown as Entity;
}

/** Evaluate; return the value on success, throw the ExpressionError on failure. */
async function evalVal(src: string, props: Record<string, NumberValue>): Promise<unknown> {
  const ctx = createContext(makeEntity(props), 'tenant' as TenantId);
  const result = await evaluate(parse(src), ctx);
  if (!result.success) throw result.error;
  return result.value;
}

describe('units registry helpers', () => {
  it('resolves dimension from explicit field or unit', () => {
    expect(resolveDimension(num(5, 'length'))).toBe('length');
    expect(resolveDimension(num(5, undefined, 'mm'))).toBe('length');
    expect(resolveDimension(num(5, undefined, 'kg'))).toBe('mass');
    expect(resolveDimension(num(5))).toBeUndefined();
  });

  it('converts within a dimension', () => {
    expect(convertValue(1, 'm', 'mm')).toBe(1000);
    expect(convertValue(1000, 'mm', 'm')).toBe(1);
    expect(convertValue(1, 'kg', 'g')).toBe(1000);
    expect(convertValue(2, 'h', 's')).toBe(7200);
  });

  it('leaves value unchanged across incompatible/unknown units', () => {
    expect(convertValue(5, 'm', 'kg')).toBe(5);
    expect(convertValue(5, 'widgets', 'm')).toBe(5);
  });

  it('compatibility is permissive for dimensionless operands', () => {
    expect(dimensionsCompatible(num(1, undefined, 'm'), num(1, undefined, 'mm'))).toBe(true);
    expect(dimensionsCompatible(num(1, undefined, 'm'), num(1))).toBe(true);
    expect(dimensionsCompatible(num(1, undefined, 'm'), num(1, undefined, 'kg'))).toBe(false);
  });
});

describe('dimension-aware arithmetic', () => {
  it('REFUTED-CLAIM FIX: adding incompatible dimensions throws', async () => {
    await expect(evalVal('@self.len + @self.dur', { len: num(5, undefined, 'm'), dur: num(3, undefined, 's') }))
      .rejects.toThrow(/incompatible dimensions/i);
  });

  it('subtracting incompatible dimensions throws', async () => {
    await expect(evalVal('@self.len - @self.dur', { len: num(5, undefined, 'm'), dur: num(3, undefined, 's') }))
      .rejects.toThrow(/incompatible dimensions/i);
  });

  it('comparing incompatible dimensions throws', async () => {
    await expect(evalVal('@self.mass > @self.len', { mass: num(5, undefined, 'kg'), len: num(3, undefined, 'm') }))
      .rejects.toThrow(/incompatible dimensions/i);
  });

  it('adds compatible units after converting to the left unit', async () => {
    // 1 m + 300 mm = 1.3 m
    expect(await evalVal('@self.a + @self.b', { a: num(1, undefined, 'm'), b: num(300, undefined, 'mm') }))
      .toMatchObject({ type: 'number', value: 1.3, unit: 'm', dimension: 'length' });
  });

  it('carries the dimension/unit through addition', async () => {
    expect(await evalVal('@self.a + @self.b', { a: num(2, undefined, 'kg'), b: num(3, undefined, 'kg') }))
      .toMatchObject({ value: 5, unit: 'kg', dimension: 'mass' });
  });

  it('compares compatible units after conversion', async () => {
    expect(await evalVal('@self.a > @self.b', { a: num(1, undefined, 'm'), b: num(900, undefined, 'mm') }))
      .toEqual({ type: 'boolean', value: true });
  });

  it('scaling by a dimensionless number preserves the unit', async () => {
    expect(await evalVal('@self.mass * @self.qty', { mass: num(5, undefined, 'kg'), qty: num(3) }))
      .toMatchObject({ value: 15, unit: 'kg', dimension: 'mass' });
  });

  it('same-dimension division yields a dimensionless ratio', async () => {
    expect(await evalVal('@self.a / @self.b', { a: num(10, undefined, 'm'), b: num(2, undefined, 'm') }))
      .toEqual({ type: 'number', value: 5 });
  });

  it('plain (dimensionless) arithmetic is unchanged', async () => {
    expect(await evalVal('@self.a + @self.b', { a: num(5), b: num(3) })).toEqual({ type: 'number', value: 8 });
    expect(await evalVal('@self.a * @self.b', { a: num(5), b: num(3) })).toEqual({ type: 'number', value: 15 });
  });

  it('a dimensionless operand does not block addition (permissive)', async () => {
    expect(await evalVal('@self.a + @self.b', { a: num(5, undefined, 'kg'), b: num(3) }))
      .toMatchObject({ value: 8, unit: 'kg' });
  });
});
