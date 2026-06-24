/**
 * detectCircularDependencies — identifies computed properties caught in a
 * dependency cycle so they can be flagged 'circular' rather than silently stale.
 */

import { describe, it, expect } from 'vitest';
import { detectCircularDependencies } from './staleness.js';

const deps = (m: Record<string, string[]>) => new Map(Object.entries(m));

describe('detectCircularDependencies', () => {
  it('returns nothing for an acyclic graph', () => {
    expect(detectCircularDependencies(['a', 'b', 'c'], deps({ a: ['b'], b: ['c'], c: [] }))).toEqual([]);
  });

  it('finds both nodes of a 2-cycle', () => {
    const cyc = detectCircularDependencies(['a', 'b'], deps({ a: ['b'], b: ['a'] }));
    expect(cyc.sort()).toEqual(['a', 'b']);
  });

  it('finds a 3-cycle', () => {
    const cyc = detectCircularDependencies(['a', 'b', 'c'], deps({ a: ['b'], b: ['c'], c: ['a'] }));
    expect(cyc.sort()).toEqual(['a', 'b', 'c']);
  });

  it('detects a self-cycle', () => {
    expect(detectCircularDependencies(['a'], deps({ a: ['a'] }))).toEqual(['a']);
  });

  it('a diamond (shared dependency, no cycle) is NOT flagged', () => {
    // a→b, a→c, b→d, c→d
    expect(detectCircularDependencies(['a', 'b', 'c', 'd'], deps({ a: ['b', 'c'], b: ['d'], c: ['d'], d: [] }))).toEqual([]);
  });

  it('isolates the cyclic subset, leaving acyclic nodes out', () => {
    // a→b→a is a cycle; c→a is not part of the cycle
    const cyc = detectCircularDependencies(['a', 'b', 'c'], deps({ a: ['b'], b: ['a'], c: ['a'] }));
    expect(cyc.sort()).toEqual(['a', 'b']);
  });
});
