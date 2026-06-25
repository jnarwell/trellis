/**
 * Conditional cell formatting — pure rule matching.
 */

import { describe, it, expect } from 'vitest';
import { matchColorTone } from '../../src/blocks/table/color-rules.js';
import type { ColorRule } from '../../src/blocks/table/types.js';

const rules: ColorRule[] = [
  { op: 'lte', value: 0, tone: 'danger' },
  { op: 'lt', value: 20, tone: 'warning' },
  { op: 'gte', value: 20, tone: 'positive' },
];

describe('matchColorTone', () => {
  it('returns the first matching rule tone (order matters)', () => {
    expect(matchColorTone(0, rules)).toBe('danger');
    expect(matchColorTone(5, rules)).toBe('warning');
    expect(matchColorTone(50, rules)).toBe('positive');
  });

  it('coerces string numerics for numeric comparisons', () => {
    expect(matchColorTone('5', rules)).toBe('warning');
  });

  it('supports string contains/eq', () => {
    expect(matchColorTone('overdue', [{ op: 'contains', value: 'over', tone: 'danger' }])).toBe('danger');
    expect(matchColorTone('open', [{ op: 'eq', value: 'open', tone: 'progress' }])).toBe('progress');
    expect(matchColorTone('closed', [{ op: 'eq', value: 'open', tone: 'progress' }])).toBeNull();
  });

  it('returns null when no rule matches or none provided', () => {
    expect(matchColorTone(10, [{ op: 'gt', value: 100, tone: 'danger' }])).toBeNull();
    expect(matchColorTone(10, [])).toBeNull();
    expect(matchColorTone(10, undefined)).toBeNull();
  });
});
