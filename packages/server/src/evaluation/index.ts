/**
 * Trellis Server - Evaluation Module
 *
 * Provides computed property evaluation infrastructure.
 * Wires the kernel expression engine into the server lifecycle.
 */

// Context Builder
export {
  EvaluationContextBuilder,
  createContextBuilder,
  type ContextBuilderOptions,
} from './context-builder.js';

// Property Evaluator
export {
  PropertyEvaluator,
  createPropertyEvaluator,
  type ComputedPropertyResult,
  type EntityEvaluationResult,
  type EvaluationOptions,
} from './evaluator.js';

// Computation Service
export {
  ComputationService,
  createComputationService,
  type ComputationResult,
  type ComputeOptions,
} from './computation-service.js';

// Recalculation Handler
export {
  RecalculationHandler,
  createRecalculationHandler,
  registerRecalculationHandler,
  type RecalculationConfig,
} from './recalculation-handler.js';
