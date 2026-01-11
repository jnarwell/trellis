/**
 * Trellis Server - Expression Evaluator
 *
 * Server-side wrapper around the kernel expression evaluator.
 * Handles parsing, context building, and result formatting.
 */

import type { Pool } from 'pg';
import {
  parse,
  evaluate as kernelEvaluate,
  ExpressionError,
  type Expression,
  type EvaluationContext,
  type EvaluationResult,
  type Entity,
  type EntityId,
  type TenantId,
  type PropertyName,
  type Value,
  type ComputedProperty,
  type ComputationStatus,
} from '@trellis/kernel';
import {
  EvaluationContextBuilder,
  type ContextBuilderOptions,
} from './context-builder.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of evaluating a computed property.
 */
export interface ComputedPropertyResult {
  /** Property name */
  readonly propertyName: PropertyName;
  /** Whether evaluation succeeded */
  readonly success: boolean;
  /** Computed value (if success) */
  readonly value?: Value | null;
  /** New computation status */
  readonly status: ComputationStatus;
  /** Error message (if failed) */
  readonly error?: string;
  /** Evaluation duration in ms */
  readonly durationMs?: number;
  /** Entities accessed during evaluation */
  readonly accessedEntities?: readonly string[];
}

/**
 * Result of evaluating all computed properties on an entity.
 */
export interface EntityEvaluationResult {
  /** Entity ID */
  readonly entityId: EntityId;
  /** Results for each computed property */
  readonly properties: readonly ComputedPropertyResult[];
  /** Whether all evaluations succeeded */
  readonly allSucceeded: boolean;
  /** Total evaluation time in ms */
  readonly totalDurationMs: number;
}

/**
 * Options for property evaluation.
 */
export interface EvaluationOptions extends ContextBuilderOptions {
  /** Skip properties that are already valid */
  skipValid?: boolean;
}

// =============================================================================
// EVALUATOR
// =============================================================================

/**
 * Server-side expression evaluator.
 *
 * Wraps the kernel evaluator with:
 * - Automatic context building (pre-fetching entities/relationships)
 * - Result formatting with status updates
 * - Error handling and status transitions
 */
export class PropertyEvaluator {
  private readonly contextBuilder: EvaluationContextBuilder;

  constructor(
    private readonly pool: Pool,
    private readonly tenantId: TenantId
  ) {
    this.contextBuilder = new EvaluationContextBuilder(pool, tenantId);
  }

  /**
   * Evaluate all computed properties on an entity.
   */
  async evaluateEntity(
    entity: Entity,
    options: EvaluationOptions = {}
  ): Promise<EntityEvaluationResult> {
    const startTime = Date.now();
    const results: ComputedPropertyResult[] = [];

    // Build context once for all properties
    const context = await this.contextBuilder.buildForEntity(entity, options);

    // Evaluate each computed property
    for (const [name, prop] of Object.entries(entity.properties)) {
      if (prop.source !== 'computed') continue;

      const computedProp = prop as ComputedProperty;

      // Skip if already valid and option set
      if (options.skipValid && computedProp.computation_status === 'valid') {
        continue;
      }

      const result = await this.evaluateProperty(
        entity,
        name as PropertyName,
        computedProp,
        context
      );
      results.push(result);
    }

    return {
      entityId: entity.id,
      properties: results,
      allSucceeded: results.every((r) => r.success),
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Evaluate a single computed property.
   */
  async evaluateProperty(
    entity: Entity,
    propertyName: PropertyName,
    property: ComputedProperty,
    context?: EvaluationContext
  ): Promise<ComputedPropertyResult> {
    const startTime = Date.now();

    try {
      // Parse expression
      const ast = parse(property.expression);

      // Build context if not provided
      const ctx =
        context ??
        (await this.contextBuilder.buildForProperty(
          entity,
          propertyName,
          ast
        ));

      // Evaluate
      const result = await kernelEvaluate(ast, ctx);

      if (result.success) {
        // Build result without undefined fields for exactOptionalPropertyTypes
        const successResult: ComputedPropertyResult = {
          propertyName,
          success: true,
          status: 'valid',
          durationMs: result.durationMs ?? Date.now() - startTime,
        };
        // Only include value if defined
        if (result.value !== undefined) {
          (successResult as { value?: Value | null }).value = result.value;
        }
        // Only include accessedEntities if defined
        if (result.accessedEntities !== undefined) {
          (successResult as { accessedEntities?: readonly string[] }).accessedEntities = result.accessedEntities;
        }
        return successResult;
      } else {
        // Evaluation failed
        return this.handleEvaluationError(
          propertyName,
          result.error,
          Date.now() - startTime
        );
      }
    } catch (error) {
      // Parse or unexpected error
      return this.handleError(propertyName, error, Date.now() - startTime);
    }
  }

  /**
   * Evaluate a single expression string (for validation/preview).
   */
  async evaluateExpression(
    expression: string,
    entity: Entity
  ): Promise<EvaluationResult> {
    const ast = parse(expression);
    const context = await this.contextBuilder.buildForEntity(entity);
    return kernelEvaluate(ast, context);
  }

  /**
   * Parse and validate an expression without evaluating.
   */
  parseExpression(expression: string): Expression {
    return parse(expression);
  }

  /**
   * Handle evaluation errors from kernel.
   */
  private handleEvaluationError(
    propertyName: PropertyName,
    error: ExpressionError | undefined,
    durationMs: number
  ): ComputedPropertyResult {
    if (!error) {
      return {
        propertyName,
        success: false,
        status: 'error',
        error: 'Unknown evaluation error',
        durationMs,
      };
    }

    // Check for circular dependency
    if (error.code === 'CIRCULAR_DEPENDENCY') {
      return {
        propertyName,
        success: false,
        status: 'circular',
        error: error.message,
        durationMs,
      };
    }

    return {
      propertyName,
      success: false,
      status: 'error',
      error: error.message,
      durationMs,
    };
  }

  /**
   * Handle unexpected errors.
   */
  private handleError(
    propertyName: PropertyName,
    error: unknown,
    durationMs: number
  ): ComputedPropertyResult {
    if (error instanceof ExpressionError) {
      return this.handleEvaluationError(propertyName, error, durationMs);
    }

    const message =
      error instanceof Error ? error.message : 'Unknown error during evaluation';

    return {
      propertyName,
      success: false,
      status: 'error',
      error: message,
      durationMs,
    };
  }
}

/**
 * Create a PropertyEvaluator instance.
 */
export function createPropertyEvaluator(
  pool: Pool,
  tenantId: TenantId
): PropertyEvaluator {
  return new PropertyEvaluator(pool, tenantId);
}
