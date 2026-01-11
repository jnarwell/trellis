/**
 * @trellis/kernel
 *
 * Core type definitions and expression engine for the Trellis data model.
 */

// Re-export all types (canonical type definitions)
export type * from './types/index.js';

// Re-export expression engine (excluding conflicting type names)
// The types module exports the canonical ASTNode, ExpressionNode, and PropertyStaleEvent
// The expressions module has its own internal types for implementation
export {
  // AST Constructors
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
  // Lexer
  TokenType,
  Lexer,
  tokenize,
  // Parser
  Parser,
  parse,
  tryParse,
  validate,
  // Dependencies
  extractDependencies,
  resolveDependencies,
  hasCollectionTraversal,
  getReferencedEntityIds,
  getUsedFunctions,
  // Evaluator
  evaluate,
  evaluateSimple,
  createContext,
  // Functions
  registerFunction,
  getFunction,
  hasFunction,
  getAllFunctionNames,
  findSimilarFunctions,
  invokeFunction,
  initializeRegistry,
  // Staleness
  propagateStaleness,
  batchPropagateStaleness,
  topologicalSort,
  createStalenessContext,
  withDeferredStaleness,
  recordPropertyChange,
  createMockDatabase,
  createCollectingEmitter,
  // Errors
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
  // Convenience functions
  parseWithDependencies,
} from './expressions/index.js';

// Re-export expression-specific types that don't conflict
export type {
  Token,
  ParseResult,
  ExtractedDependency,
  ResolvedDependency,
  DependencyResolutionContext,
  EvaluationContext,
  EvaluationResult,
  RuntimeValue,
  FunctionImpl,
  FunctionDefinition,
  PropertyKey,
  StalenessDatabase,
  EventEmitter,
  StalenessContext,
  ExpressionErrorCode,
  // AST types unique to expression engine
  Expression,
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
} from './expressions/index.js';

// Re-export expression AST types with aliases to avoid conflict with types/expression.ts
export type {
  ASTNode as ExprASTNode,
  ExpressionNode as ExprExpressionNode,
} from './expressions/index.js';

// Re-export staleness event type with alias to avoid conflict with types/event.ts
export type { PropertyStaleEvent as ExprPropertyStaleEvent } from './expressions/index.js';

// Re-export block system
export * from './blocks/index.js';
