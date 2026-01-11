/**
 * @trellis/shared - Debug Context Capture
 *
 * Functions for creating and capturing debug contexts.
 */

import type {
  DebugContext,
  ErrorInfo,
  EntityContext,
  ExpressionContext,
  WiringContext,
  ApiContext,
  PermissionContext,
  ValidationContext,
  StalenessContext,
  CycleContext,
  EnvironmentInfo,
  OperationType,
  ErrorCategory,
  Trace,
} from './types.js';
import {
  getDebugConfig,
  shouldCaptureErrors,
  shouldCaptureStacks,
  safeSerialize,
} from './config.js';

// =============================================================================
// CONTEXT ID GENERATION
// =============================================================================

let contextCounter = 0;

/**
 * Generate a unique debug context ID.
 */
function generateContextId(): string {
  const timestamp = Date.now().toString(36);
  const counter = (contextCounter++).toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 6);
  return `dbg_${timestamp}_${counter}_${random}`;
}

// =============================================================================
// ENVIRONMENT CAPTURE
// =============================================================================

/**
 * Capture current environment information.
 */
export function captureEnvironment(overrides?: Partial<EnvironmentInfo>): EnvironmentInfo {
  const config = getDebugConfig();

   
  const globalAny = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const nodeEnv = globalAny.process?.env?.['NODE_ENV'] ?? 'browser';

  const base: EnvironmentInfo = {
    nodeEnv,
    version: config.version,
    tenantId: overrides?.tenantId ?? 'unknown',
    userId: undefined,
    sessionId: undefined,
  };

  return {
    ...base,
    ...overrides,
  };
}

// =============================================================================
// ERROR CAPTURE
// =============================================================================

/**
 * Determine error category from error code or type.
 */
function categorizeError(error: Error | { code?: string }): ErrorCategory {
  const code = 'code' in error ? error.code : undefined;

  if (!code) {
    return 'runtime_error';
  }

  // Parse errors
  if (
    code.includes('PARSE') ||
    code.includes('UNEXPECTED_TOKEN') ||
    code.includes('SYNTAX')
  ) {
    return 'parse_error';
  }

  // Validation errors
  if (
    code.includes('VALIDATION') ||
    code.includes('INVALID') ||
    code.includes('TYPE_MISMATCH') ||
    code.includes('REQUIRED')
  ) {
    return 'validation_error';
  }

  // Permission errors
  if (code.includes('PERMISSION') || code.includes('UNAUTHORIZED') || code.includes('FORBIDDEN')) {
    return 'permission_error';
  }

  // Not found errors
  if (code.includes('NOT_FOUND')) {
    return 'not_found_error';
  }

  // Conflict errors
  if (code.includes('CONFLICT') || code.includes('ALREADY_EXISTS')) {
    return 'conflict_error';
  }

  // Wiring errors
  if (code.includes('WIRING') || code.includes('EVENT') || code.includes('RECEIVER')) {
    return 'wiring_error';
  }

  // Circular errors
  if (code.includes('CIRCULAR')) {
    return 'circular_error';
  }

  return 'runtime_error';
}

/**
 * Extract error info from an Error object.
 */
export function extractErrorInfo(error: Error | { code?: string; message: string }): ErrorInfo {
  const code =
    'code' in error && error.code ? String(error.code) : error.constructor.name.toUpperCase();

  return {
    code,
    message: error.message,
    category: categorizeError(error),
    stack: shouldCaptureStacks() && error instanceof Error ? error.stack : undefined,
    cause:
      error instanceof Error && error.cause instanceof Error
        ? extractErrorInfo(error.cause)
        : undefined,
  };
}

// =============================================================================
// SUGGESTION GENERATION
// =============================================================================

/**
 * Generate suggestions based on error type and context.
 */
export function generateSuggestions(
  error: ErrorInfo,
  context: Partial<DebugContext>
): string[] {
  const suggestions: string[] = [];

  // Expression errors
  if (error.code === 'PROPERTY_NOT_FOUND' && context.expression?.scope) {
    const availableProps = Object.keys(context.expression.scope);
    if (availableProps.length > 0) {
      suggestions.push(`Available properties: ${availableProps.slice(0, 5).join(', ')}`);
    }
  }

  if (error.code === 'INVALID_FUNCTION') {
    suggestions.push('Use uppercase function names: SUM(), COUNT(), AVG(), IF(), COALESCE()');
  }

  if (error.code === 'TYPE_MISMATCH') {
    suggestions.push('Check that operands have compatible types');
    suggestions.push('Use explicit type conversion if needed');
  }

  if (error.code === 'CIRCULAR_DEPENDENCY' && context.cycle) {
    suggestions.push(`Break the cycle by removing one dependency in: ${context.cycle.cyclePath.join(' -> ')}`);
  }

  // Wiring errors
  if (error.code === 'RECEIVER_NOT_FOUND') {
    suggestions.push('Check receiver name in wiring configuration');
  }

  if (error.code === 'PAYLOAD_INCOMPATIBLE') {
    suggestions.push('Add a transform to convert the payload format');
  }

  // Validation errors
  if (error.code === 'REQUIRED_PROP_MISSING' && context.validation) {
    suggestions.push(`Add the required property at: ${context.validation.path.join('.')}`);
  }

  // Permission errors
  if (error.category === 'permission_error' && context.permission) {
    suggestions.push(`Required permission: ${context.permission.requiredPermission}`);
    if (context.permission.actorRoles) {
      suggestions.push(`Current roles: ${context.permission.actorRoles.join(', ')}`);
    }
  }

  return suggestions;
}

// =============================================================================
// DOC LINKS
// =============================================================================

const DOC_LINKS: Record<string, string> = {
  expression: 'specs/kernel/06-expressions.md',
  wiring: 'specs/blocks/block-system-design.md#4-event-system--wiring',
  validation: 'specs/blocks/block-system-design.md#5-validationerror-type--examples',
  entity: 'specs/kernel/01-types.ts',
  api: 'specs/kernel/03-api.md',
};

/**
 * Get relevant documentation links based on operation.
 */
export function getRelevantDocs(operation: OperationType): string[] {
  const docs: string[] = [];

  if (operation.startsWith('expression')) {
    const link = DOC_LINKS['expression'];
    if (link) docs.push(link);
  }

  if (operation.startsWith('wiring')) {
    const link = DOC_LINKS['wiring'];
    if (link) docs.push(link);
  }

  if (operation.startsWith('validation')) {
    const link = DOC_LINKS['validation'];
    if (link) docs.push(link);
  }

  if (operation.startsWith('entity') || operation.startsWith('relationship')) {
    const link = DOC_LINKS['entity'];
    if (link) docs.push(link);
  }

  if (operation.startsWith('api')) {
    const link = DOC_LINKS['api'];
    if (link) docs.push(link);
  }

  return docs;
}

// =============================================================================
// CONTEXT BUILDERS
// =============================================================================

/**
 * Create an entity context.
 */
export function createEntityContext(options: {
  entityId?: string;
  entityType: string;
  tenantId: string;
  version?: number;
  expectedVersion?: number;
  properties?: Record<string, unknown>;
}): EntityContext {
  return {
    entityId: options.entityId,
    entityType: options.entityType,
    tenantId: options.tenantId,
    version: options.version,
    expectedVersion: options.expectedVersion,
    properties: options.properties ? (safeSerialize(options.properties) as Record<string, unknown>) : undefined,
  };
}

/**
 * Create an expression context from a trace.
 */
export function createExpressionContext(options: {
  source: string;
  trace?: Trace;
  scope?: Record<string, unknown>;
  failedAt?: { node: string; position: number; endPosition?: number };
}): ExpressionContext {
  return {
    source: options.source,
    evaluationTrace: options.trace?.getSteps() ?? [],
    scope: options.scope ? (safeSerialize(options.scope) as Record<string, unknown>) : {},
    failedAt: options.failedAt,
  };
}

/**
 * Create a wiring context.
 */
export function createWiringContext(options: {
  fromBlock: string;
  fromBlockType: string;
  event: string;
  toBlock: string;
  toBlockType: string;
  receiver: string;
  payload: unknown;
  transform?: {
    source: string;
    input: unknown;
    failedAt?: string;
    error?: string;
  };
}): WiringContext {
  return {
    fromBlock: options.fromBlock,
    fromBlockType: options.fromBlockType,
    event: options.event,
    toBlock: options.toBlock,
    toBlockType: options.toBlockType,
    receiver: options.receiver,
    payload: safeSerialize(options.payload),
    transform: options.transform
      ? {
          source: options.transform.source,
          input: safeSerialize(options.transform.input),
          failedAt: options.transform.failedAt,
          error: options.transform.error,
        }
      : undefined,
  };
}

/**
 * Create an API context.
 */
export function createApiContext(options: {
  method: string;
  path: string;
  requestBody?: unknown;
  responseStatus?: number;
  responseBody?: unknown;
  headers?: Record<string, string>;
  durationMs?: number;
}): ApiContext {
  return {
    method: options.method,
    path: options.path,
    requestBody: options.requestBody ? safeSerialize(options.requestBody) : undefined,
    responseStatus: options.responseStatus,
    responseBody: options.responseBody ? safeSerialize(options.responseBody) : undefined,
    headers: options.headers,
    durationMs: options.durationMs,
  };
}

/**
 * Create a permission context.
 */
export function createPermissionContext(options: {
  actorId: string;
  actorRoles?: string[];
  requiredPermission: string;
  resourceId?: string;
  resourceType?: string;
}): PermissionContext {
  return {
    actorId: options.actorId,
    actorRoles: options.actorRoles,
    requiredPermission: options.requiredPermission,
    resourceId: options.resourceId,
    resourceType: options.resourceType,
  };
}

/**
 * Create a validation context.
 */
export function createValidationContext(options: {
  path: string[];
  value: unknown;
  expected: string;
  rule?: string;
}): ValidationContext {
  return {
    path: options.path,
    value: safeSerialize(options.value),
    expected: options.expected,
    rule: options.rule,
  };
}

/**
 * Create a staleness context.
 */
export function createStalenessContext(options: {
  triggerProperty: string;
  triggerEntityId: string;
  propagationPath: string[];
  affectedProperties: string[];
}): StalenessContext {
  return {
    triggerProperty: options.triggerProperty,
    triggerEntityId: options.triggerEntityId,
    propagationPath: options.propagationPath,
    affectedProperties: options.affectedProperties,
  };
}

/**
 * Create a cycle context.
 */
export function createCycleContext(options: {
  cycleType: 'expression' | 'entity' | 'computed';
  cyclePath: string[];
}): CycleContext {
  return {
    cycleType: options.cycleType,
    cyclePath: options.cyclePath,
  };
}

// =============================================================================
// MAIN CAPTURE FUNCTION
// =============================================================================

/**
 * Captured contexts for retrieval (useful for testing).
 */
const capturedContexts: DebugContext[] = [];
const MAX_CAPTURED_CONTEXTS = 100;

/**
 * Capture a debug context when an error occurs.
 */
export function captureError(
  operation: OperationType,
  error: Error | { code?: string; message: string },
  options?: {
    entity?: EntityContext;
    expression?: ExpressionContext;
    wiring?: WiringContext;
    api?: ApiContext;
    permission?: PermissionContext;
    validation?: ValidationContext;
    staleness?: StalenessContext;
    cycle?: CycleContext;
    environment?: Partial<EnvironmentInfo>;
  }
): DebugContext | null {
  if (!shouldCaptureErrors()) {
    return null;
  }

  const errorInfo = extractErrorInfo(error);

  const partialContext: Partial<DebugContext> = {
    entity: options?.entity,
    expression: options?.expression,
    wiring: options?.wiring,
    api: options?.api,
    permission: options?.permission,
    validation: options?.validation,
    staleness: options?.staleness,
    cycle: options?.cycle,
  };

  const context: DebugContext = {
    id: generateContextId(),
    timestamp: new Date().toISOString(),
    operation,
    error: errorInfo,
    entity: options?.entity,
    expression: options?.expression,
    wiring: options?.wiring,
    api: options?.api,
    permission: options?.permission,
    validation: options?.validation,
    staleness: options?.staleness,
    cycle: options?.cycle,
    suggestions: generateSuggestions(errorInfo, partialContext),
    docs: getRelevantDocs(operation),
    environment: captureEnvironment(options?.environment),
  };

  // Store for retrieval
  capturedContexts.push(context);
  if (capturedContexts.length > MAX_CAPTURED_CONTEXTS) {
    capturedContexts.shift();
  }

  // Notify reporters
  const config = getDebugConfig();
  for (const reporter of config.reporters) {
    try {
      reporter.report(context);
    } catch {
      // Ignore reporter errors
    }
  }

  return context;
}

/**
 * Get all captured debug contexts.
 */
export function getCapturedContexts(): readonly DebugContext[] {
  return [...capturedContexts];
}

/**
 * Get the most recent debug context.
 */
export function getLastContext(): DebugContext | undefined {
  return capturedContexts[capturedContexts.length - 1];
}

/**
 * Clear captured contexts.
 */
export function clearCapturedContexts(): void {
  capturedContexts.length = 0;
}
