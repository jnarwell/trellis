/**
 * Trellis Expression Engine
 *
 * The computational heart of Trellis - evaluates computed properties,
 * tracks dependencies, and propagates staleness.
 */

// =============================================================================
// RE-EXPORTS
// =============================================================================

// AST Types and Constructors
export type {
  ASTNode,
  Expression,
  ExpressionNode,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  PropertyReference,
  Literal,
  Identifier,
  BinaryOperator,
  UnaryOperator,
  PropertyBase,
  PropertyPathSegment,
  Traversal,
  LiteralValueType,
  ASTVisitor,
} from './ast.js';

export {
  expression,
  binaryExpr,
  unaryExpr,
  callExpr,
  propertyRef,
  literal,
  identifier,
  isBinaryExpression,
  isUnaryExpression,
  isCallExpression,
  isPropertyReference,
  isLiteral,
  isIdentifier,
  isExpression,
  visitNode,
} from './ast.js';

// Lexer
export type { Token } from './lexer.js';
export { TokenType, Lexer, tokenize } from './lexer.js';

// Parser
export type { ParseResult } from './parser.js';
export { Parser, parse, tryParse, validate } from './parser.js';

// Dependencies
export type {
  ExtractedDependency,
  ResolvedDependency,
  DependencyResolutionContext,
} from './dependencies.js';

export {
  extractDependencies,
  resolveDependencies,
  hasCollectionTraversal,
  getReferencedEntityIds,
  getUsedFunctions,
} from './dependencies.js';

// Evaluator
export type { EvaluationContext, EvaluationResult } from './evaluator.js';

export { evaluate, evaluateSimple, createContext } from './evaluator.js';

// Functions
export type { RuntimeValue, FunctionImpl, FunctionDefinition } from './functions/index.js';

export {
  registerFunction,
  getFunction,
  hasFunction,
  getAllFunctionNames,
  findSimilarFunctions,
  invokeFunction,
  initializeRegistry,
} from './functions/index.js';

// Staleness
export type {
  PropertyKey,
  PropertyStaleEvent,
  StalenessDatabase,
  EventEmitter,
  StalenessContext,
} from './staleness.js';

export {
  propagateStaleness,
  batchPropagateStaleness,
  topologicalSort,
  createStalenessContext,
  withDeferredStaleness,
  recordPropertyChange,
  createMockDatabase,
  createCollectingEmitter,
} from './staleness.js';

// Errors
export type { ExpressionErrorCode } from './errors.js';

export {
  ExpressionError,
  parseError,
  unexpectedTokenError,
  unexpectedEndError,
  invalidNumberError,
  unterminatedStringError,
  invalidEscapeError,
  propertyNotFoundError,
  entityNotFoundError,
  relationshipNotFoundError,
  typeMismatchError,
  circularDependencyError,
  maxDepthExceededError,
  invalidFunctionError,
  invalidArgumentCountError,
  collectionWithoutAggregationError,
  divisionByZeroError,
  nullReferenceError,
  indexOutOfBoundsError,
  invalidUuidError,
} from './errors.js';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

import { parse as parseExpr } from './parser.js';
import { extractDependencies as extractDeps } from './dependencies.js';

/**
 * Parse an expression and extract its dependencies in one call.
 */
export function parseWithDependencies(source: string): {
  readonly ast: import('./ast.js').Expression;
  readonly dependencies: readonly import('./dependencies.js').ExtractedDependency[];
} {
  const ast = parseExpr(source);
  const dependencies = extractDeps(ast);
  return { ast, dependencies };
}
