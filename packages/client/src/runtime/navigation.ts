/**
 * Trellis Block Runtime - Navigation
 *
 * Route handling and navigation state management.
 */

import type { ViewId } from '@trellis/server';
import type { NavigationActions } from './wiring.js';

// =============================================================================
// ROUTE MATCHING
// =============================================================================

/**
 * A parsed route pattern.
 */
export interface ParsedRoute {
  /** The original pattern */
  readonly pattern: string;

  /** Static segments */
  readonly segments: readonly RouteSegment[];

  /** Parameter names in order */
  readonly paramNames: readonly string[];

  /** Regex for matching */
  readonly regex: RegExp;
}

/**
 * A route segment.
 */
export type RouteSegment =
  | { readonly type: 'static'; readonly value: string }
  | { readonly type: 'param'; readonly name: string; readonly optional: boolean };

/**
 * Result of matching a route.
 */
export interface RouteMatch {
  readonly matched: boolean;
  readonly params: Record<string, string>;
  readonly query: Record<string, string>;
}

/**
 * Parse a route pattern into segments.
 */
export function parseRoutePattern(pattern: string): ParsedRoute {
  const segments: RouteSegment[] = [];
  const paramNames: string[] = [];

  const parts = pattern.split('/').filter((p) => p.length > 0);

  for (const part of parts) {
    if (part.startsWith(':')) {
      const optional = part.endsWith('?');
      const name = optional ? part.slice(1, -1) : part.slice(1);
      segments.push({ type: 'param', name, optional });
      paramNames.push(name);
    } else {
      segments.push({ type: 'static', value: part });
    }
  }

  // Build regex
  let regexStr = '^';
  for (const seg of segments) {
    if (seg.type === 'static') {
      regexStr += '/' + escapeRegex(seg.value);
    } else {
      if (seg.optional) {
        regexStr += '(?:/([^/]+))?';
      } else {
        regexStr += '/([^/]+)';
      }
    }
  }
  regexStr += '/?$';

  return {
    pattern,
    segments,
    paramNames,
    regex: new RegExp(regexStr),
  };
}

/**
 * Match a path against a parsed route.
 */
export function matchRoute(route: ParsedRoute, path: string): RouteMatch | null {
  const match = route.regex.exec(path);

  if (!match) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < route.paramNames.length; i++) {
    const paramName = route.paramNames[i];
    const value = match[i + 1];
    if (paramName !== undefined && value !== undefined) {
      params[paramName] = decodeURIComponent(value);
    }
  }

  return {
    matched: true,
    params,
    query: {},
  };
}

/**
 * Build a path from a route and params.
 */
export function buildPath(pattern: string, params: Record<string, string>): string {
  let path = pattern;

  for (const [key, value] of Object.entries(params)) {
    // Replace :param or :param?
    path = path.replace(new RegExp(`:${key}\\??`, 'g'), encodeURIComponent(value));
  }

  // Remove any remaining optional params
  path = path.replace(/\/:[^/]+\?/g, '');

  return path;
}

/**
 * Parse query string into object.
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const query: Record<string, string> = {};

  if (!queryString || queryString === '?') {
    return query;
  }

  const str = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  const pairs = str.split('&');

  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key) {
      query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  }

  return query;
}

/**
 * Build query string from object.
 */
export function buildQueryString(query: Record<string, string | undefined>): string {
  const pairs: string[] = [];

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }

  return pairs.length > 0 ? '?' + pairs.join('&') : '';
}

// =============================================================================
// NAVIGATION MANAGER
// =============================================================================

/**
 * Navigation state.
 */
export interface NavigationState {
  readonly path: string;
  readonly params: Record<string, string>;
  readonly query: Record<string, string>;
  readonly viewId?: ViewId;
}

/**
 * Navigation change listener.
 */
export type NavigationListener = (state: NavigationState) => void;

/**
 * Manages navigation state.
 */
export class NavigationManager implements NavigationActions {
  private state: NavigationState;
  private readonly listeners: Set<NavigationListener> = new Set();
  private readonly routes: Map<ViewId, ParsedRoute> = new Map();
  private readonly viewsByPattern: Map<string, ViewId> = new Map();

  constructor(initialPath = '/') {
    this.state = {
      path: initialPath,
      params: {},
      query: parseQueryString(typeof window !== 'undefined' ? window.location.search : ''),
    };
  }

  /**
   * Register a view route.
   */
  registerRoute(viewId: ViewId, pattern: string): void {
    const parsed = parseRoutePattern(pattern);
    this.routes.set(viewId, parsed);
    this.viewsByPattern.set(pattern, viewId);
  }

  /**
   * Get current navigation state.
   */
  getState(): NavigationState {
    return this.state;
  }

  /**
   * Subscribe to navigation changes.
   */
  subscribe(listener: NavigationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Match current path to a view.
   */
  matchPath(path: string): { viewId: ViewId; params: Record<string, string> } | null {
    for (const [viewId, route] of this.routes) {
      const match = matchRoute(route, path);
      if (match) {
        return { viewId, params: match.params };
      }
    }
    return null;
  }

  /**
   * Navigate to a new path.
   */
  push(params: { path: string; query?: Record<string, string> }): void {
    this.navigate(params, 'push');
  }

  /**
   * Replace current path.
   */
  replace(params: { path: string; query?: Record<string, string> }): void {
    this.navigate(params, 'replace');
  }

  /**
   * Go back in history.
   */
  back(): void {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }

  /**
   * Go forward in history.
   */
  forward(): void {
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  }

  /**
   * Navigate to a view by ID.
   */
  toView(params: {
    view: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
  }): void {
    const viewId = params.view as ViewId;
    const route = this.routes.get(viewId);

    if (!route) {
      console.warn(`No route found for view: ${viewId}`);
      return;
    }

    const path = buildPath(route.pattern, params.params ?? {});
    const pushParams = params.query ? { path, query: params.query } : { path };
    this.push(pushParams);
  }

  /**
   * Internal navigate implementation.
   */
  private navigate(
    params: { path: string; query?: Record<string, string> },
    mode: 'push' | 'replace'
  ): void {
    const match = this.matchPath(params.path);

    const baseState = {
      path: params.path,
      params: match?.params ?? {},
      query: params.query ?? {},
    };

    const newState: NavigationState = match?.viewId
      ? { ...baseState, viewId: match.viewId }
      : baseState;

    this.state = newState;

    // Update browser history
    if (typeof window !== 'undefined') {
      const url = params.path + buildQueryString(params.query ?? {});
      if (mode === 'push') {
        window.history.pushState(newState, '', url);
      } else {
        window.history.replaceState(newState, '', url);
      }
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(newState);
      } catch (error) {
        console.error('Navigation listener threw:', error);
      }
    }
  }

  /**
   * Handle browser popstate event.
   */
  handlePopState(event: PopStateEvent): void {
    const state = event.state as NavigationState | null;

    if (state) {
      this.state = state;
    } else {
      // Fallback: parse current URL
      const path = window.location.pathname;
      const match = this.matchPath(path);
      const baseState = {
        path,
        params: match?.params ?? {},
        query: parseQueryString(window.location.search),
      };
      this.state = match?.viewId
        ? { ...baseState, viewId: match.viewId }
        : baseState;
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Navigation listener threw:', error);
      }
    }
  }
}

/**
 * Create a navigation manager.
 */
export function createNavigationManager(initialPath?: string): NavigationManager {
  return new NavigationManager(initialPath);
}

// =============================================================================
// HELPERS
// =============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
