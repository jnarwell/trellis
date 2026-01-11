/**
 * @trellis/shared - Debug Tracing
 *
 * Step-by-step execution tracing for expression evaluation,
 * wiring dispatch, and other operations.
 */

import type { EvaluationStep, OperationType, Trace } from './types.js';
import { getDebugConfig, shouldCaptureTraces, shouldCaptureTiming, safeSerialize } from './config.js';

// =============================================================================
// TRACE IMPLEMENTATION
// =============================================================================

/**
 * Internal trace implementation.
 */
class TraceImpl implements Trace {
  readonly id: string;
  readonly operation: OperationType;

  private readonly steps: EvaluationStep[] = [];
  private readonly startTime: number;
  private endTime?: number;
  private isComplete = false;

  constructor(operation: OperationType, id?: string) {
    this.id = id ?? generateTraceId();
    this.operation = operation;
    this.startTime = Date.now();
  }

  step(name: string, data?: Record<string, unknown>): void {
    if (this.isComplete) {
      return;
    }

    const config = getDebugConfig();

    // Respect max trace steps
    if (this.steps.length >= config.maxTraceSteps) {
      // Remove oldest step to make room
      this.steps.shift();
    }

    const step: EvaluationStep = {
      node: name,
      expression: (data?.['expression'] as string | undefined) ?? '',
      inputs: data?.['inputs'] ? (safeSerialize(data['inputs']) as readonly unknown[]) : undefined,
      output: data?.['output'] !== undefined ? safeSerialize(data['output']) : undefined,
      error: data?.['error'] as string | undefined,
      durationMs: shouldCaptureTiming() ? Date.now() - this.startTime : undefined,
    };

    this.steps.push(step);
  }

  getSteps(): readonly EvaluationStep[] {
    return [...this.steps];
  }

  getLastStep(): EvaluationStep | undefined {
    return this.steps[this.steps.length - 1];
  }

  complete(result?: unknown): void {
    if (this.isComplete) return;

    this.isComplete = true;
    this.endTime = Date.now();

    if (result !== undefined) {
      this.step('complete', { output: result });
    }
  }

  fail(error: Error): void {
    if (this.isComplete) return;

    this.isComplete = true;
    this.endTime = Date.now();

    this.step('error', { error: error.message });
  }

  getDuration(): number {
    const end = this.endTime ?? Date.now();
    return end - this.startTime;
  }
}

// =============================================================================
// NO-OP TRACE
// =============================================================================

/**
 * No-op trace for when tracing is disabled.
 * All methods are no-ops to minimize overhead.
 */
const noOpTrace: Trace = {
  id: 'noop',
  operation: 'expression.evaluate',
  step: () => {},
  getSteps: () => [],
  getLastStep: () => undefined,
  complete: () => {},
  fail: () => {},
  getDuration: () => 0,
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Create a new trace for an operation.
 * Returns a no-op trace if tracing is disabled.
 */
export function createTrace(operation: OperationType, id?: string): Trace {
  if (!shouldCaptureTraces()) {
    return noOpTrace;
  }

  return new TraceImpl(operation, id);
}

/**
 * Create a trace specifically for expression evaluation.
 */
export function createExpressionTrace(expressionSource: string): Trace {
  const trace = createTrace('expression.evaluate');
  trace.step('start', { expression: expressionSource });
  return trace;
}

/**
 * Create a trace specifically for wiring dispatch.
 */
export function createWiringTrace(fromBlock: string, event: string): Trace {
  const trace = createTrace('wiring.dispatch');
  trace.step('event_received', { expression: `${fromBlock}.${event}` });
  return trace;
}

/**
 * Create a trace specifically for property computation.
 */
export function createComputeTrace(entityId: string, propertyName: string): Trace {
  const trace = createTrace('property.compute');
  trace.step('start', { expression: `${entityId}.${propertyName}` });
  return trace;
}

// =============================================================================
// TRACE ID GENERATION
// =============================================================================

let traceCounter = 0;

/**
 * Generate a unique trace ID.
 */
function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const counter = (traceCounter++).toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 6);
  return `trace_${timestamp}_${counter}_${random}`;
}

// =============================================================================
// TRACE BUILDER
// =============================================================================

/**
 * Builder for creating complex traces with fluent API.
 */
export class TraceBuilder {
  private trace: Trace;

  constructor(operation: OperationType) {
    this.trace = createTrace(operation);
  }

  /**
   * Add a step to the trace.
   */
  step(name: string, data?: Record<string, unknown>): this {
    this.trace.step(name, data);
    return this;
  }

  /**
   * Record an input value.
   */
  input(name: string, value: unknown): this {
    this.trace.step('input', { expression: name, output: value });
    return this;
  }

  /**
   * Record an operation.
   */
  operation(name: string, inputs: unknown[], output: unknown): this {
    this.trace.step(name, { inputs, output });
    return this;
  }

  /**
   * Record an error.
   */
  error(name: string, message: string): this {
    this.trace.step(name, { error: message });
    return this;
  }

  /**
   * Get the built trace.
   */
  build(): Trace {
    return this.trace;
  }

  /**
   * Complete and return the trace.
   */
  complete(result?: unknown): Trace {
    this.trace.complete(result);
    return this.trace;
  }
}

/**
 * Create a trace builder for fluent trace construction.
 */
export function traceBuilder(operation: OperationType): TraceBuilder {
  return new TraceBuilder(operation);
}

// =============================================================================
// TRACE UTILITIES
// =============================================================================

/**
 * Merge multiple traces into one.
 */
export function mergeTraces(traces: Trace[]): EvaluationStep[] {
  const allSteps: EvaluationStep[] = [];

  for (const trace of traces) {
    allSteps.push(...trace.getSteps());
  }

  // Sort by time if timing is available
  return allSteps.sort((a: EvaluationStep, b: EvaluationStep) => (a.durationMs ?? 0) - (b.durationMs ?? 0));
}

/**
 * Find the step where an error occurred.
 */
export function findErrorStep(trace: Trace): EvaluationStep | undefined {
  const steps = trace.getSteps();
  return steps.find((step) => step.error !== undefined);
}

/**
 * Get a summary of the trace.
 */
export function summarizeTrace(trace: Trace): {
  operation: OperationType;
  stepCount: number;
  duration: number;
  success: boolean;
  errorStep?: EvaluationStep | undefined;
} {
  const errorStep = findErrorStep(trace);

  return {
    operation: trace.operation,
    stepCount: trace.getSteps().length,
    duration: trace.getDuration(),
    success: errorStep === undefined,
    errorStep,
  };
}
