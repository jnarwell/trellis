/**
 * Trellis Data Binding - Built-in Functions
 *
 * Provides $can(), $hasRole(), $now, $setQuery(), etc.
 */

import type { BindingScope, UserContext } from './scope.js';

// =============================================================================
// FUNCTION TYPES
// =============================================================================

/**
 * A Data Binding function implementation.
 */
export type BindingFunction = (
  args: readonly unknown[],
  scope: BindingScope,
  context: FunctionContext
) => unknown;

/**
 * Context provided to function implementations.
 */
export interface FunctionContext {
  /** Permission checker (provided by application) */
  readonly checkPermission?: (permission: string, user: UserContext) => boolean;

  /** Role checker (provided by application) */
  readonly checkRole?: (role: string, user: UserContext) => boolean;

  /** Query parameter updater (provided by application) */
  readonly updateQuery?: (updates: Record<string, unknown>) => void;
}

/**
 * Function registry.
 */
const functions = new Map<string, BindingFunction>();

// =============================================================================
// BUILT-IN FUNCTIONS
// =============================================================================

/**
 * $can('permission') - Check if user has permission.
 */
function canFunction(
  args: readonly unknown[],
  scope: BindingScope,
  context: FunctionContext
): boolean {
  if (args.length !== 1) {
    throw new FunctionError('$can() requires exactly 1 argument');
  }

  const permission = args[0];
  if (typeof permission !== 'string') {
    throw new FunctionError('$can() argument must be a string');
  }

  // Use provided checker or fall back to checking user.permissions
  if (context.checkPermission) {
    return context.checkPermission(permission, scope.user);
  }

  // Default implementation: check user.permissions array
  const permissions = scope.user.permissions ?? [];
  return permissions.includes(permission);
}

/**
 * $hasRole('role') - Check if user has role.
 */
function hasRoleFunction(
  args: readonly unknown[],
  scope: BindingScope,
  context: FunctionContext
): boolean {
  if (args.length !== 1) {
    throw new FunctionError('$hasRole() requires exactly 1 argument');
  }

  const role = args[0];
  if (typeof role !== 'string') {
    throw new FunctionError('$hasRole() argument must be a string');
  }

  // Use provided checker or fall back to checking user.roles
  if (context.checkRole) {
    return context.checkRole(role, scope.user);
  }

  // Default implementation: check user.role or user.roles
  if (scope.user.role === role) {
    return true;
  }

  const roles = scope.user.roles ?? [];
  return roles.includes(role);
}

/**
 * $now - Get current timestamp as ISO string.
 */
function nowFunction(
  args: readonly unknown[],
  _scope: BindingScope,
  _context: FunctionContext
): string {
  if (args.length !== 0) {
    throw new FunctionError('$now takes no arguments');
  }

  return new Date().toISOString();
}

/**
 * $setQuery({ key: value }) - Update query parameters.
 * Returns undefined (side effect only).
 */
function setQueryFunction(
  args: readonly unknown[],
  _scope: BindingScope,
  context: FunctionContext
): undefined {
  if (args.length !== 1) {
    throw new FunctionError('$setQuery() requires exactly 1 argument');
  }

  const updates = args[0];
  if (typeof updates !== 'object' || updates === null || Array.isArray(updates)) {
    throw new FunctionError('$setQuery() argument must be an object');
  }

  if (context.updateQuery) {
    context.updateQuery(updates as Record<string, unknown>);
  }

  return undefined;
}

/**
 * $inferDetailView(entityType) - Infer detail view from entity type.
 * e.g., 'part' -> 'part-detail'
 */
function inferDetailViewFunction(
  args: readonly unknown[],
  _scope: BindingScope,
  _context: FunctionContext
): string {
  if (args.length !== 1) {
    throw new FunctionError('$inferDetailView() requires exactly 1 argument');
  }

  const entityType = args[0];
  if (typeof entityType !== 'string') {
    throw new FunctionError('$inferDetailView() argument must be a string');
  }

  return `${entityType}-detail`;
}

// =============================================================================
// FUNCTION REGISTRY
// =============================================================================

/**
 * Register a function.
 */
export function registerFunction(name: string, fn: BindingFunction): void {
  functions.set(name, fn);
}

/**
 * Get a function by name.
 */
export function getFunction(name: string): BindingFunction | undefined {
  return functions.get(name);
}

/**
 * Check if a function exists.
 */
export function hasFunction(name: string): boolean {
  return functions.has(name);
}

/**
 * Get all function names.
 */
export function getFunctionNames(): string[] {
  return Array.from(functions.keys());
}

/**
 * Invoke a function.
 */
export function invokeFunction(
  name: string,
  args: readonly unknown[],
  scope: BindingScope,
  context: FunctionContext
): unknown {
  const fn = functions.get(name);
  if (!fn) {
    throw new FunctionError(`Unknown function '$${name}'`);
  }

  return fn(args, scope, context);
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the function registry with built-in functions.
 */
export function initializeFunctions(): void {
  registerFunction('can', canFunction);
  registerFunction('hasRole', hasRoleFunction);
  registerFunction('now', nowFunction);
  registerFunction('setQuery', setQueryFunction);
  registerFunction('inferDetailView', inferDetailViewFunction);
}

// Initialize on module load
initializeFunctions();

// =============================================================================
// ERROR
// =============================================================================

/**
 * Error thrown by function execution.
 */
export class FunctionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FunctionError';
  }
}
