/**
 * Trellis Data Binding - Scope Management
 *
 * Manages the scope context for Data Binding evaluation.
 */

// =============================================================================
// USER CONTEXT
// =============================================================================

/**
 * Current user context.
 */
export interface UserContext {
  readonly id: string;
  readonly email?: string;
  readonly name?: string;
  readonly role?: string;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
  readonly [key: string]: unknown;
}

/**
 * Current tenant context.
 */
export interface TenantContext {
  readonly id: string;
  readonly name?: string;
  readonly [key: string]: unknown;
}

/**
 * Route information.
 */
export interface RouteContext {
  readonly path: string;
  readonly viewId?: string;
  readonly [key: string]: unknown;
}

// =============================================================================
// ENTITY DATA
// =============================================================================

/**
 * Entity data for scope bindings.
 */
export interface EntityData {
  readonly id: string;
  readonly type: string;
  readonly [key: string]: unknown;
}

// =============================================================================
// BINDING SCOPE
// =============================================================================

/**
 * The binding scope provides all variables available to Data Binding expressions.
 */
export interface BindingScope {
  /**
   * Route parameters (from URL path).
   * e.g., /parts/:entityId -> $params.entityId
   */
  readonly params: Readonly<Record<string, unknown>>;

  /**
   * Query parameters (from URL query string).
   * e.g., ?tab=details -> $query.tab
   */
  readonly query: Readonly<Record<string, unknown>>;

  /**
   * Current authenticated user.
   */
  readonly user: UserContext;

  /**
   * Current tenant.
   */
  readonly tenant: TenantContext;

  /**
   * Current route information.
   */
  readonly route: RouteContext;

  /**
   * Event payload (only available in event handlers).
   */
  readonly event?: unknown;

  /**
   * Alias for event payload (for wiring transforms).
   */
  readonly payload?: unknown;

  /**
   * Fetched entities (keyed by 'as' alias from view data config).
   * e.g., { as: 'part' } -> $part.name
   */
  readonly [entityAlias: string]: unknown;
}

// =============================================================================
// SCOPE BUILDER
// =============================================================================

/**
 * Options for creating a binding scope.
 */
export interface ScopeOptions {
  /** Route parameters */
  params?: Record<string, unknown>;

  /** Query parameters */
  query?: Record<string, unknown>;

  /** Current user */
  user?: UserContext;

  /** Current tenant */
  tenant?: TenantContext;

  /** Route info */
  route?: RouteContext;

  /** Event payload (for event handlers) */
  event?: unknown;

  /** Fetched entities (keyed by alias) */
  entities?: Record<string, EntityData>;
}

/**
 * Create a binding scope from options.
 */
export function createScope(options: ScopeOptions = {}): BindingScope {
  const scope: Record<string, unknown> = {
    params: options.params ?? {},
    query: options.query ?? {},
    user: options.user ?? { id: '', permissions: [] },
    tenant: options.tenant ?? { id: '' },
    route: options.route ?? { path: '' },
  };

  // Add event/payload if provided
  if (options.event !== undefined) {
    scope['event'] = options.event;
    scope['payload'] = options.event; // Alias
  }

  // Add entity aliases
  if (options.entities) {
    for (const [alias, entity] of Object.entries(options.entities)) {
      scope[alias] = entity;
    }
  }

  return scope as BindingScope;
}

/**
 * Create an empty scope for testing.
 */
export function createEmptyScope(): BindingScope {
  return createScope();
}

/**
 * Extend a scope with additional entities.
 */
export function extendScope(
  base: BindingScope,
  extensions: Record<string, unknown>
): BindingScope {
  return { ...base, ...extensions };
}

/**
 * Create a scope for event handling.
 */
export function createEventScope(
  base: BindingScope,
  event: unknown
): BindingScope {
  return {
    ...base,
    event,
    payload: event,
  };
}

// =============================================================================
// SCOPE RESOLUTION
// =============================================================================

/**
 * Resolve a path within a scope.
 */
export function resolveInScope(
  scope: BindingScope,
  scopeName: string,
  path: readonly string[]
): unknown {
  // Get the root object for the scope name
  let current: unknown = scope[scopeName];

  if (current === undefined) {
    throw new ScopeResolutionError(
      `Unknown scope '${scopeName}'. Available: ${Object.keys(scope).filter(k => k !== 'event').join(', ')}`
    );
  }

  // Navigate the path
  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      throw new ScopeResolutionError(
        `Cannot access property '${segment}' on non-object value`
      );
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Error thrown when scope resolution fails.
 */
export class ScopeResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScopeResolutionError';
  }
}

// =============================================================================
// SCOPE VALIDATION
// =============================================================================

/**
 * Check if a scope name is valid (exists in scope).
 */
export function isValidScopeName(scope: BindingScope, name: string): boolean {
  return name in scope;
}

/**
 * Get all available scope names.
 */
export function getScopeNames(scope: BindingScope): string[] {
  return Object.keys(scope);
}
