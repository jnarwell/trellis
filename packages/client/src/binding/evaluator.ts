/**
 * Trellis Data Binding - Evaluator
 *
 * Evaluates Data Binding expressions against a scope.
 */

import type {
  BindingExpr,
  LiteralNode,
  ScopeRefNode,
  FunctionCallNode,
  BinaryOpNode,
  UnaryOpNode,
  ObjectLiteralNode,
  ArrayLiteralNode,
  TemplateStringNode,
  ConditionalNode,
  MemberAccessNode,
} from './ast.js';
import type { BindingScope } from './scope.js';
import { resolveInScope, ScopeResolutionError } from './scope.js';
import type { FunctionContext } from './functions.js';
import { invokeFunction, FunctionError } from './functions.js';
import { parse, parseTemplate, DataBindingParseError } from './parser.js';
import { DataBindingLexerError } from './lexer.js';

// =============================================================================
// EVALUATOR
// =============================================================================

/**
 * Options for evaluation.
 */
export interface EvaluationOptions {
  /** Function context (for $can, $hasRole, etc.) */
  readonly functions?: FunctionContext;

  /** Strict mode: throw on undefined scope references */
  readonly strict?: boolean;
}

/**
 * Evaluation result.
 */
export interface EvaluationResult {
  readonly success: boolean;
  readonly value?: unknown;
  readonly error?: EvaluationError;
}

/**
 * Evaluate a Data Binding expression.
 */
export function evaluate(
  expr: BindingExpr,
  scope: BindingScope,
  options: EvaluationOptions = {}
): unknown {
  const ctx: EvalContext = {
    scope,
    functions: options.functions ?? {},
    strict: options.strict ?? false,
  };

  return evalNode(expr, ctx);
}

/**
 * Parse and evaluate a string expression.
 */
export function evaluateString(
  input: string,
  scope: BindingScope,
  options: EvaluationOptions = {}
): unknown {
  const ast = parse(input);
  return evaluate(ast, scope, options);
}

/**
 * Parse and evaluate a template string.
 */
export function evaluateTemplate(
  input: string,
  scope: BindingScope,
  options: EvaluationOptions = {}
): string {
  const ast = parseTemplate(input);
  const result = evaluate(ast, scope, options);
  return String(result ?? '');
}

/**
 * Try to evaluate with error handling.
 */
export function tryEvaluate(
  input: string,
  scope: BindingScope,
  options: EvaluationOptions = {}
): EvaluationResult {
  try {
    const ast = parse(input);
    const value = evaluate(ast, scope, options);
    return { success: true, value };
  } catch (error) {
    if (
      error instanceof EvaluationError ||
      error instanceof DataBindingParseError ||
      error instanceof DataBindingLexerError ||
      error instanceof ScopeResolutionError ||
      error instanceof FunctionError
    ) {
      return { success: false, error: new EvaluationError(error.message) };
    }
    throw error;
  }
}

// =============================================================================
// INTERNAL EVALUATION
// =============================================================================

interface EvalContext {
  readonly scope: BindingScope;
  readonly functions: FunctionContext;
  readonly strict: boolean;
}

function evalNode(node: BindingExpr, ctx: EvalContext): unknown {
  switch (node.kind) {
    case 'literal':
      return evalLiteral(node);

    case 'scopeRef':
      return evalScopeRef(node, ctx);

    case 'functionCall':
      return evalFunctionCall(node, ctx);

    case 'binaryOp':
      return evalBinaryOp(node, ctx);

    case 'unaryOp':
      return evalUnaryOp(node, ctx);

    case 'objectLiteral':
      return evalObjectLiteral(node, ctx);

    case 'arrayLiteral':
      return evalArrayLiteral(node, ctx);

    case 'templateString':
      return evalTemplateString(node, ctx);

    case 'conditional':
      return evalConditional(node, ctx);

    case 'memberAccess':
      return evalMemberAccess(node, ctx);

    default:
      throw new EvaluationError(`Unknown node kind: ${(node as BindingExpr).kind}`);
  }
}

function evalLiteral(node: LiteralNode): unknown {
  return node.value;
}

function evalScopeRef(node: ScopeRefNode, ctx: EvalContext): unknown {
  try {
    return resolveInScope(ctx.scope, node.scope, node.path);
  } catch (error) {
    if (ctx.strict) {
      throw error;
    }
    return undefined;
  }
}

function evalFunctionCall(node: FunctionCallNode, ctx: EvalContext): unknown {
  // Evaluate arguments
  const args = node.args.map((arg) => evalNode(arg, ctx));

  // Invoke function
  return invokeFunction(node.name, args, ctx.scope, ctx.functions);
}

function evalBinaryOp(node: BinaryOpNode, ctx: EvalContext): unknown {
  // Short-circuit for logical operators
  if (node.operator === '&&') {
    const left = evalNode(node.left, ctx);
    if (!isTruthy(left)) return left;
    return evalNode(node.right, ctx);
  }

  if (node.operator === '||') {
    const left = evalNode(node.left, ctx);
    if (isTruthy(left)) return left;
    return evalNode(node.right, ctx);
  }

  // Evaluate both operands
  const left = evalNode(node.left, ctx);
  const right = evalNode(node.right, ctx);

  switch (node.operator) {
    case '+':
      // String concatenation
      return String(left ?? '') + String(right ?? '');

    case '==':
      return left === right;

    case '!=':
      return left !== right;

    case '<':
      return (left as number) < (right as number);

    case '<=':
      return (left as number) <= (right as number);

    case '>':
      return (left as number) > (right as number);

    case '>=':
      return (left as number) >= (right as number);

    default:
      throw new EvaluationError(`Unknown operator: ${node.operator}`);
  }
}

function evalUnaryOp(node: UnaryOpNode, ctx: EvalContext): unknown {
  const operand = evalNode(node.operand, ctx);

  switch (node.operator) {
    case '!':
      return !isTruthy(operand);

    default:
      throw new EvaluationError(`Unknown unary operator: ${node.operator}`);
  }
}

function evalObjectLiteral(node: ObjectLiteralNode, ctx: EvalContext): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const prop of node.properties) {
    result[prop.key] = evalNode(prop.value, ctx);
  }

  return result;
}

function evalArrayLiteral(node: ArrayLiteralNode, ctx: EvalContext): unknown[] {
  return node.elements.map((el) => evalNode(el, ctx));
}

function evalTemplateString(node: TemplateStringNode, ctx: EvalContext): string {
  let result = '';

  for (const part of node.parts) {
    if (part.kind === 'text') {
      result += part.value;
    } else {
      const value = evalNode(part.value, ctx);
      result += String(value ?? '');
    }
  }

  return result;
}

function evalConditional(node: ConditionalNode, ctx: EvalContext): unknown {
  const condition = evalNode(node.condition, ctx);

  if (isTruthy(condition)) {
    return evalNode(node.consequent, ctx);
  } else {
    return evalNode(node.alternate, ctx);
  }
}

function evalMemberAccess(node: MemberAccessNode, ctx: EvalContext): unknown {
  const obj = evalNode(node.object, ctx);

  if (obj === null || obj === undefined) {
    if (ctx.strict) {
      throw new EvaluationError(`Cannot access property '${node.property}' of ${obj}`);
    }
    return undefined;
  }

  if (typeof obj !== 'object') {
    if (ctx.strict) {
      throw new EvaluationError(`Cannot access property '${node.property}' on non-object`);
    }
    return undefined;
  }

  return (obj as Record<string, unknown>)[node.property];
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if a value is truthy.
 */
function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  return true;
}

// =============================================================================
// ERROR
// =============================================================================

/**
 * Error thrown during evaluation.
 */
export class EvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationError';
  }
}
