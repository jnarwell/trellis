/**
 * Trellis Data Binding - Public Exports
 *
 * Client-side Data Binding expression evaluator.
 * This is SEPARATE from the kernel Expression Engine.
 */

// AST types
export type {
  ASTNodeBase,
  LiteralNode,
  ScopeRefNode,
  FunctionCallNode,
  BinaryOpNode,
  UnaryOpNode,
  ObjectLiteralNode,
  ObjectProperty,
  ArrayLiteralNode,
  TemplateStringNode,
  TemplatePart,
  ConditionalNode,
  MemberAccessNode,
  BinaryOperator,
  UnaryOperator,
  BindingExpr,
} from './ast.js';

// AST constructors
export {
  literal,
  scopeRef,
  functionCall,
  binaryOp,
  unaryOp,
  objectLiteral,
  arrayLiteral,
  templateString,
  conditional,
  memberAccess,
} from './ast.js';

// AST type guards
export {
  isLiteral,
  isScopeRef,
  isFunctionCall,
  isBinaryOp,
  isUnaryOp,
  isObjectLiteral,
  isArrayLiteral,
  isTemplateString,
  isConditional,
  isMemberAccess,
} from './ast.js';

// Lexer
export {
  TokenType,
  DataBindingLexer,
  DataBindingLexerError,
  tokenize,
  type Token,
} from './lexer.js';

// Parser
export {
  DataBindingParser,
  DataBindingParseError,
  parse,
  tryParse,
  parseTemplate,
  type ParseResult,
} from './parser.js';

// Scope
export type {
  UserContext,
  TenantContext,
  RouteContext,
  EntityData,
  BindingScope,
  ScopeOptions,
} from './scope.js';

export {
  createScope,
  createEmptyScope,
  extendScope,
  createEventScope,
  resolveInScope,
  isValidScopeName,
  getScopeNames,
  ScopeResolutionError,
} from './scope.js';

// Functions
export type {
  BindingFunction,
  FunctionContext,
} from './functions.js';

export {
  registerFunction,
  getFunction,
  hasFunction,
  getFunctionNames,
  invokeFunction,
  initializeFunctions,
  FunctionError,
} from './functions.js';

// Evaluator
export type {
  EvaluationOptions,
  EvaluationResult,
} from './evaluator.js';

export {
  evaluate,
  evaluateString,
  evaluateTemplate,
  tryEvaluate,
  EvaluationError,
} from './evaluator.js';
