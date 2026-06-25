/**
 * Read-time property inheritance resolver tests.
 *
 * Round D fix: `inherited` properties used to always resolve to null (the
 * resolveInherited read option was a no-op). These prove the resolver follows
 * from_entity/from_property to the source's effective value, handles inherited
 * chains, honours overrides, and flags missing sources + cycles.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveInheritance,
  effectiveValue,
  memoizeEntityLoader,
  type EntityLoader,
} from '../../src/services/inheritance-resolver.js';
import { vi } from 'vitest';
import type { Entity, Property, Value } from '@trellis/kernel';

function entity(id: string, properties: Record<string, Property>): Entity {
  return {
    id,
    tenant_id: '00000000-0000-7000-8000-0000000000aa',
    type: 'thing',
    version: 1,
    properties: properties as Entity['properties'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    created_by: '00000000-0000-7000-8000-0000000000bb',
  } as unknown as Entity;
}

const literal = (name: string, value: Value): Property =>
  ({ source: 'literal', name, value } as unknown as Property);

const inherited = (
  name: string,
  from_entity: string,
  extra: Partial<{ from_property: string; override: Value }> = {}
): Property =>
  ({
    source: 'inherited',
    name,
    from_entity,
    computation_status: 'pending',
    ...extra,
  } as unknown as Property);

const text = (v: string): Value => ({ type: 'text', value: v } as Value);

/** Build a loader over a fixed set of entities. */
function loaderFor(...entities: Entity[]): EntityLoader {
  const map = new Map(entities.map((e) => [e.id, e]));
  return async (id) => map.get(id) ?? null;
}

function prop(e: Entity, name: string) {
  return e.properties[name as keyof typeof e.properties] as Property & {
    resolved_value?: Value;
    computation_status?: string;
    computation_error?: string;
  };
}

describe('effectiveValue', () => {
  it('merges measured uncertainty onto the number value', () => {
    const measured = {
      source: 'measured',
      name: 'mass',
      value: { type: 'number', value: 10, unit: 'g' },
      uncertainty: 0.5,
    } as unknown as Property;
    expect(effectiveValue(measured)).toEqual({ type: 'number', value: 10, unit: 'g', uncertainty: 0.5 });
  });

  it('returns a computed property cached value only when valid', () => {
    const make = (status: string) =>
      ({
        source: 'computed',
        name: 'x',
        expression: '1+1',
        dependencies: [],
        computation_status: status,
        cached_value: { type: 'number', value: 2 },
      } as unknown as Property);
    expect(effectiveValue(make('valid'))).toEqual({ type: 'number', value: 2 });
    // Stale/pending/error caches must NOT be surfaced as authoritative values.
    expect(effectiveValue(make('stale'))).toBeNull();
    expect(effectiveValue(make('pending'))).toBeNull();
    expect(effectiveValue(make('error'))).toBeNull();
  });
});

describe('memoizeEntityLoader', () => {
  it('fetches each id at most once and caches the result', async () => {
    const e = entity('x', {});
    const raw = vi.fn(async (_id: string) => e);
    const load = memoizeEntityLoader(raw as unknown as EntityLoader);

    const [a, b, c] = await Promise.all([load('x' as never), load('x' as never), load('y' as never)]);
    expect(a).toBe(e);
    expect(b).toBe(e);
    expect(c).toBe(e);
    // 'x' loaded once (deduped), 'y' once.
    expect(raw).toHaveBeenCalledTimes(2);
  });
});

describe('resolveInheritance', () => {
  it('resolves an inherited literal from the source entity', async () => {
    const parent = entity('parent', { color: literal('color', text('red')) });
    const child = entity('child', { color: inherited('color', 'parent') });

    const { entity: result, changed } = await resolveInheritance(child, loaderFor(parent));

    expect(changed).toBe(true);
    expect(prop(result, 'color').resolved_value).toEqual(text('red'));
    expect(prop(result, 'color').computation_status).toBe('valid');
  });

  it('maps from_property when the source name differs', async () => {
    const parent = entity('parent', { base_color: literal('base_color', text('blue')) });
    const child = entity('child', { color: inherited('color', 'parent', { from_property: 'base_color' }) });

    const { entity: result } = await resolveInheritance(child, loaderFor(parent));
    expect(prop(result, 'color').resolved_value).toEqual(text('blue'));
  });

  it('an override wins without any source lookup', async () => {
    const child = entity('child', {
      color: inherited('color', 'missing-parent', { override: text('green') }),
    });
    let loads = 0;
    const loader: EntityLoader = async (id) => {
      loads++;
      return null;
    };
    const { entity: result, changed } = await resolveInheritance(child, loader);
    expect(loads).toBe(0);
    expect(changed).toBe(false);
    expect(prop(result, 'color').resolved_value).toBeUndefined();
  });

  it('flags a missing source entity', async () => {
    const child = entity('child', { color: inherited('color', 'ghost') });
    const { entity: result } = await resolveInheritance(child, loaderFor());
    expect(prop(result, 'color').computation_status).toBe('error');
    expect(prop(result, 'color').computation_error).toMatch(/not found/i);
  });

  it('flags a missing source property', async () => {
    const parent = entity('parent', { other: literal('other', text('x')) });
    const child = entity('child', { color: inherited('color', 'parent') });
    const { entity: result } = await resolveInheritance(child, loaderFor(parent));
    expect(prop(result, 'color').computation_status).toBe('error');
    expect(prop(result, 'color').computation_error).toMatch(/property 'color' not found/i);
  });

  it('resolves an inheritance chain (grandchild ← child ← parent)', async () => {
    const parent = entity('parent', { color: literal('color', text('red')) });
    const child = entity('child', { color: inherited('color', 'parent') });
    const grandchild = entity('grandchild', { color: inherited('color', 'child') });

    const { entity: result } = await resolveInheritance(grandchild, loaderFor(parent, child));
    expect(prop(result, 'color').resolved_value).toEqual(text('red'));
    expect(prop(result, 'color').computation_status).toBe('valid');
  });

  it('detects an inheritance cycle', async () => {
    // a.x inherits from b.x, b.x inherits from a.x → circular.
    const a = entity('a', { x: inherited('x', 'b') });
    const b = entity('b', { x: inherited('x', 'a') });
    const { entity: result } = await resolveInheritance(a, loaderFor(a, b));
    expect(prop(result, 'x').computation_status).toBe('circular');
  });

  it('REGRESSION: diamond inheritance does NOT trigger a false cycle', async () => {
    // C.p and C.q both inherit through S.v (which itself inherits from G.v).
    // The old shared visited-set flagged the second branch as circular.
    const g = entity('g', { v: literal('v', text('gold')) });
    const s = entity('s', { v: inherited('v', 'g') });
    const c = entity('c', {
      p: inherited('p', 's', { from_property: 'v' }),
      q: inherited('q', 's', { from_property: 'v' }),
    });
    const { entity: result } = await resolveInheritance(c, loaderFor(g, s));
    expect(prop(result, 'p').computation_status).toBe('valid');
    expect(prop(result, 'q').computation_status).toBe('valid');
    expect(prop(result, 'p').resolved_value).toEqual(text('gold'));
    expect(prop(result, 'q').resolved_value).toEqual(text('gold'));
  });

  it('a stale computed source is inherited as null, not the stale cache', async () => {
    const src = entity('src', {
      total: {
        source: 'computed',
        name: 'total',
        expression: 'x',
        dependencies: [],
        computation_status: 'stale',
        cached_value: { type: 'number', value: 99 },
      } as unknown as Property,
    });
    const child = entity('child', { total: inherited('total', 'src') });
    const { entity: result } = await resolveInheritance(child, loaderFor(src));
    expect(prop(result, 'total').computation_status).toBe('valid');
    expect(prop(result, 'total').resolved_value).toBeUndefined();
  });

  it('leaves a non-inheriting entity untouched', async () => {
    const e = entity('e', { color: literal('color', text('red')) });
    const { entity: result, changed } = await resolveInheritance(e, loaderFor());
    expect(changed).toBe(false);
    expect(result).toBe(e);
  });
});
