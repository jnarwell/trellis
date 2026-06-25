/**
 * Conditional cell formatting — pure rule matching for table cells.
 * The first matching rule's tone wins; no match yields null (default styling).
 */

import type { ColorRule, ColorTone } from './types.js';

function compare(value: unknown, rule: ColorRule): boolean {
  const { op, value: target } = rule;

  if (op === 'contains') {
    return String(value ?? '').toLowerCase().includes(String(target).toLowerCase());
  }

  // Numeric comparison when both sides are numbers, else string comparison.
  const numA = typeof value === 'number' ? value : Number(value);
  const numB = typeof target === 'number' ? target : Number(target);
  const numeric = isFinite(numA) && isFinite(numB);
  const a: number | string = numeric ? numA : String(value ?? '');
  const b: number | string = numeric ? numB : String(target);

  switch (op) {
    case 'lt': return a < b;
    case 'lte': return a <= b;
    case 'gt': return a > b;
    case 'gte': return a >= b;
    case 'eq': return a === b;
    case 'ne': return a !== b;
    default: return false;
  }
}

/** The tone of the first matching rule, or null if none match. */
export function matchColorTone(value: unknown, rules?: readonly ColorRule[]): ColorTone | null {
  if (!rules || rules.length === 0) return null;
  for (const rule of rules) {
    if (compare(value, rule)) return rule.tone;
  }
  return null;
}
