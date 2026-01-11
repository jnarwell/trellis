/**
 * @trellis/shared - Debug Type Definitions
 *
 * Complete debug context types for capturing failure information
 * in a format that supports AI-assisted debugging.
 */

// =============================================================================
// OPERATION TYPES
// =============================================================================

/**
 * High-level operation types that can fail.
 */
export type OperationType =
  | 'expression.parse'
  | 'expression.evaluate'
  | 'entity.create'
  | 'entity.update'
  | 'entity.delete'
  | 'property.compute'
  | 'property.stale'
  | 'relationship.create'
  | 'relationship.delete'
  | 'wiring.dispatch'
  | 'validation.block'
  | 'validation.product'
  | 'api.request';

/**
 * Error categories for classification.
 */
export type ErrorCategory =
  | 'parse_error'
  | 'validation_error'
  | 'runtime_error'
  | 'permission_error'
  | 'not_found_error'
  | 'conflict_error'
  | 'wiring_error'
  | 'circular_error';

// =============================================================================
// ERROR INFO
// =============================================================================

/**
 * Structured error information.
 */
export interface ErrorInfo {
  /** Error code (e.g., PROPERTY_NOT_FOUND) */
  readonly code: string;

  /** Human-readable message */
  readonly message: string;

  /** Error category */
  readonly category: ErrorCategory;

  /** Stack trace (if captureStacks enabled) */
  readonly stack?: string | undefined;

  /** Underlying cause (for wrapped errors) */
  readonly cause?: ErrorInfo | undefined;
}

// =============================================================================
// ENTITY CONTEXT
// =============================================================================

/**
 * Entity-related context information.
 */
export interface EntityContext {
  /** Entity ID (if known) */
  readonly entityId?: string | undefined;

  /** Entity type path */
  readonly entityType: string;

  /** Tenant ID */
  readonly tenantId: string;

  /** Version (for optimistic locking context) */
  readonly version?: number | undefined;

  /** Expected version (for VERSION_CONFLICT) */
  readonly expectedVersion?: number | undefined;

  /** Relevant properties snapshot */
  readonly properties?: Readonly<Record<string, unknown>> | undefined;
}

// =============================================================================
// EXPRESSION CONTEXT
// =============================================================================

/**
 * A single step in expression evaluation.
 */
export interface EvaluationStep {
  /** AST node type (e.g., 'BinaryExpression', 'Identifier') */
  readonly node: string;

  /** Expression text for this step */
  readonly expression: string;

  /** Input values (for operations) */
  readonly inputs?: readonly unknown[] | undefined;

  /** Output value (if successful) */
  readonly output?: unknown;

  /** Error message (if this step failed) */
  readonly error?: string | undefined;

  /** Duration in milliseconds (if timing enabled) */
  readonly durationMs?: number | undefined;
}

/**
 * Expression-related context information.
 */
export interface ExpressionContext {
  /** Original expression source */
  readonly source: string;

  /** Parsed AST (if available) */
  readonly ast?: unknown;

  /** Step-by-step evaluation trace */
  readonly evaluationTrace: readonly EvaluationStep[];

  /** Scope variables available during evaluation */
  readonly scope: Readonly<Record<string, unknown>>;

  /** Position where evaluation failed */
  readonly failedAt?: {
    readonly node: string;
    readonly position: number;
    readonly endPosition?: number | undefined;
  } | undefined;
}

// =============================================================================
// WIRING CONTEXT
// =============================================================================

/**
 * Transform-related context for wiring.
 */
export interface TransformContext {
  /** Transform expression source */
  readonly source: string;

  /** Input payload */
  readonly input: unknown;

  /** Where in the transform expression it failed */
  readonly failedAt?: string | undefined;

  /** Transform error message */
  readonly error?: string | undefined;
}

/**
 * Wiring-related context information.
 */
export interface WiringContext {
  /** Source block instance ID */
  readonly fromBlock: string;

  /** Source block type */
  readonly fromBlockType: string;

  /** Event that was emitted */
  readonly event: string;

  /** Target block instance ID */
  readonly toBlock: string;

  /** Target block type */
  readonly toBlockType: string;

  /** Receiver method on target */
  readonly receiver: string;

  /** Event payload */
  readonly payload: unknown;

  /** Transform context (if transform was used) */
  readonly transform?: TransformContext | undefined;
}

// =============================================================================
// API CONTEXT
// =============================================================================

/**
 * API request/response context.
 */
export interface ApiContext {
  /** HTTP method */
  readonly method: string;

  /** Request path */
  readonly path: string;

  /** Request body (if any) */
  readonly requestBody?: unknown;

  /** Response status code */
  readonly responseStatus?: number | undefined;

  /** Response body (if any) */
  readonly responseBody?: unknown;

  /** Relevant headers */
  readonly headers?: Readonly<Record<string, string>> | undefined;

  /** Request duration in ms */
  readonly durationMs?: number | undefined;
}

// =============================================================================
// PERMISSION CONTEXT
// =============================================================================

/**
 * Permission-related context for auth failures.
 */
export interface PermissionContext {
  /** Actor (user/system) ID */
  readonly actorId: string;

  /** Actor's roles */
  readonly actorRoles?: readonly string[] | undefined;

  /** Permission that was required */
  readonly requiredPermission: string;

  /** Resource that was being accessed */
  readonly resourceId?: string | undefined;

  /** Resource type */
  readonly resourceType?: string | undefined;
}

// =============================================================================
// VALIDATION CONTEXT
// =============================================================================

/**
 * Validation-related context.
 */
export interface ValidationContext {
  /** Path to the invalid value */
  readonly path: readonly string[];

  /** The invalid value */
  readonly value: unknown;

  /** What was expected */
  readonly expected: string;

  /** Validation rule that failed */
  readonly rule?: string | undefined;
}

// =============================================================================
// STALENESS CONTEXT
// =============================================================================

/**
 * Staleness propagation context.
 */
export interface StalenessContext {
  /** Property that triggered staleness */
  readonly triggerProperty: string;

  /** Entity that owns the trigger property */
  readonly triggerEntityId: string;

  /** Full propagation path */
  readonly propagationPath: readonly string[];

  /** Properties marked stale */
  readonly affectedProperties: readonly string[];
}

// =============================================================================
// CYCLE CONTEXT
// =============================================================================

/**
 * Circular dependency context.
 */
export interface CycleContext {
  /** Type of cycle (expression, entity, computed) */
  readonly cycleType: 'expression' | 'entity' | 'computed';

  /** Full cycle path showing the loop */
  readonly cyclePath: readonly string[];
}

// =============================================================================
// ENVIRONMENT INFO
// =============================================================================

/**
 * Environment information snapshot.
 */
export interface EnvironmentInfo {
  /** Node environment */
  readonly nodeEnv: string;

  /** Application version */
  readonly version: string;

  /** Tenant ID */
  readonly tenantId: string;

  /** User ID (if authenticated) */
  readonly userId?: string | undefined;

  /** Session ID */
  readonly sessionId?: string | undefined;
}

// =============================================================================
// DEBUG CONTEXT
// =============================================================================

/**
 * Complete debug context for any failure.
 * Designed for AI-assisted debugging.
 */
export interface DebugContext {
  /** Unique identifier for this debug session */
  readonly id: string;

  /** When the error occurred (ISO 8601) */
  readonly timestamp: string;

  /** High-level operation that failed */
  readonly operation: OperationType;

  /** The error that triggered capture */
  readonly error: ErrorInfo;

  /** Entity context (if applicable) */
  readonly entity?: EntityContext | undefined;

  /** Expression context (if expression evaluation) */
  readonly expression?: ExpressionContext | undefined;

  /** Wiring context (if event dispatch) */
  readonly wiring?: WiringContext | undefined;

  /** API context (if HTTP request) */
  readonly api?: ApiContext | undefined;

  /** Permission context (if auth failure) */
  readonly permission?: PermissionContext | undefined;

  /** Validation context (if validation failure) */
  readonly validation?: ValidationContext | undefined;

  /** Staleness context (if staleness propagation issue) */
  readonly staleness?: StalenessContext | undefined;

  /** Cycle context (if circular dependency) */
  readonly cycle?: CycleContext | undefined;

  /** Suggestions for fixing the issue */
  readonly suggestions: readonly string[];

  /** Links to relevant documentation */
  readonly docs?: readonly string[] | undefined;

  /** Environment snapshot */
  readonly environment: EnvironmentInfo;
}

// =============================================================================
// DEBUG REPORTER
// =============================================================================

/**
 * Reporter interface for handling debug contexts.
 */
export interface DebugReporter {
  /** Reporter name */
  readonly name: string;

  /** Called when a debug context is captured */
  report(context: DebugContext): void | Promise<void>;
}

// =============================================================================
// TRACE TYPES
// =============================================================================

/**
 * Trace interface for capturing step-by-step execution.
 */
export interface Trace {
  /** Trace ID */
  readonly id: string;

  /** Operation being traced */
  readonly operation: OperationType;

  /** Record a step in the trace */
  step(name: string, data?: Record<string, unknown>): void;

  /** Get all recorded steps */
  getSteps(): readonly EvaluationStep[];

  /** Get the last step */
  getLastStep(): EvaluationStep | undefined;

  /** Mark trace as complete */
  complete(result?: unknown): void;

  /** Mark trace as failed */
  fail(error: Error): void;

  /** Get timing information */
  getDuration(): number;
}
