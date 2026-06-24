/**
 * Tests for the shared measured-value formatter used by the table and detail
 * blocks so a measured quantity renders consistently as `value ± uncertainty unit`.
 */

import { describe, it, expect } from 'vitest';
import { formatMeasuredValue, measuredMetaOf } from '../../src/blocks/measured.js';
import type { Entity } from '@trellis/kernel';

describe('formatMeasuredValue', () => {
  it('renders value ± uncertainty unit', () => {
    expect(formatMeasuredValue(84.5, { uncertainty: 0.5, unit: 'g' })).toBe('84.5 ± 0.5 g');
  });

  it('omits absent parts', () => {
    expect(formatMeasuredValue(10, { unit: 'kg' })).toBe('10 kg');
    expect(formatMeasuredValue(10, { uncertainty: 2 })).toBe('10 ± 2');
    expect(formatMeasuredValue(10)).toBe('10');
  });

  it('passes through non-numeric values', () => {
    expect(formatMeasuredValue(null)).toBe('');
    expect(formatMeasuredValue('n/a')).toBe('n/a');
  });
});

describe('measuredMetaOf', () => {
  const entity = {
    properties: {
      mass: { source: 'measured', value: { type: 'number', value: 84.5, unit: 'g' }, uncertainty: 0.5 },
      plain: { source: 'literal', value: { type: 'number', value: 3 } },
    },
  } as unknown as Entity;

  it('reads uncertainty (sibling) and unit (nested) from a measured property', () => {
    expect(measuredMetaOf(entity, 'mass')).toEqual({ uncertainty: 0.5, unit: 'g' });
  });

  it('returns null for a non-measured property', () => {
    expect(measuredMetaOf(entity, 'plain')).toBeNull();
    expect(measuredMetaOf(entity, 'missing')).toBeNull();
    expect(measuredMetaOf(undefined, 'mass')).toBeNull();
  });
});
