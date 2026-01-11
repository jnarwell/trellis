/**
 * @trellis/shared/debug
 *
 * Debug infrastructure for AI-assisted error diagnosis.
 *
 * This module provides:
 * - Type-safe debug context capture
 * - Step-by-step execution tracing
 * - AI-friendly error formatting
 * - Configurable debug modes
 *
 * ## Usage
 *
 * ### Basic Error Capture
 * ```typescript
 * import { captureError, formatForAI } from '@trellis/shared/debug';
 *
 * try {
 *   evaluate(expression, context);
 * } catch (error) {
 *   const debugCtx = captureError('expression.evaluate', error, {
 *     expression: createExpressionContext({
 *       source: expression.source,
 *       trace: myTrace,
 *       scope: context.scope
 *     })
 *   });
 *
 *   console.log(formatForAI(debugCtx));
 * }
 * ```
 *
 * ### Tracing
 * ```typescript
 * import { createTrace } from '@trellis/shared/debug';
 *
 * const trace = createTrace('expression.evaluate');
 * trace.step('start', { expression: source });
 *
 * // During evaluation...
 * trace.step('BinaryExpression', {
 *   expression: 'a + b',
 *   inputs: [1, 2],
 *   output: 3
 * });
 *
 * trace.complete(result);
 * ```
 *
 * ### Configuration
 * ```typescript
 * import { configureDebug } from '@trellis/shared/debug';
 *
 * configureDebug({
 *   mode: 'trace',
 *   captureStacks: true,
 *   timing: true
 * });
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Core types
  DebugContext,
  OperationType,
  ErrorCategory,
  ErrorInfo,

  // Context types
  EntityContext,
  ExpressionContext,
  WiringContext,
  ApiContext,
  PermissionContext,
  ValidationContext,
  StalenessContext,
  CycleContext,
  TransformContext,
  EnvironmentInfo,

  // Trace types
  EvaluationStep,
  Trace,
  DebugReporter,
} from './types.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

export type { DebugMode, DebugConfig } from './config.js';

export {
  // Config getters/setters
  getDebugConfig,
  configureDebug,
  resetDebugConfig,

  // Reporter management
  addReporter,
  removeReporter,
  clearReporters,

  // Mode checks
  isDebugEnabled,
  shouldCaptureErrors,
  shouldCaptureVerbose,
  shouldCaptureTraces,
  shouldCaptureStacks,
  shouldCaptureTiming,

  // Serialization
  safeSerialize,

  // Default configs
  productionConfig,
  developmentConfig,
  testConfig,
} from './config.js';

// =============================================================================
// TRACING
// =============================================================================

export {
  // Trace creation
  createTrace,
  createExpressionTrace,
  createWiringTrace,
  createComputeTrace,

  // Trace builder
  TraceBuilder,
  traceBuilder,

  // Trace utilities
  mergeTraces,
  findErrorStep,
  summarizeTrace,
} from './trace.js';

// =============================================================================
// CONTEXT CAPTURE
// =============================================================================

export {
  // Main capture function
  captureError,

  // Context retrieval
  getCapturedContexts,
  getLastContext,
  clearCapturedContexts,

  // Environment capture
  captureEnvironment,

  // Error extraction
  extractErrorInfo,

  // Suggestion generation
  generateSuggestions,
  getRelevantDocs,

  // Context builders
  createEntityContext,
  createExpressionContext,
  createWiringContext,
  createApiContext,
  createPermissionContext,
  createValidationContext,
  createStalenessContext,
  createCycleContext,
} from './context.js';

// =============================================================================
// FORMATTING
// =============================================================================

export {
  // Main formatters
  formatForAI,
  formatForConsole,
  formatAsJSON,
  formatAsCompactJSON,

  // Summary formatters
  formatSummary,
  formatReport,
} from './format.js';
