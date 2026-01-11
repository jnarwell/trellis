/**
 * Trellis Data Binding - AST Types
 *
 * Abstract Syntax Tree node types for Data Binding expressions.
 * These are CLIENT-SIDE bindings, separate from the kernel Expression Engine.
 */

// =============================================================================
// AST NODE TYPES
// =============================================================================

/**
 * Base interface for all AST nodes.
 */
export interface ASTNodeBase {
  readonly kind: string;
}

/**
 * Literal value (string, number, boolean, null).
 */
export interface LiteralNode extends ASTNodeBase {
  readonly kind: 'literal';
  readonly value: string | number | boolean | null;
}

/**
 * Scope reference: $scopeName.property.subProperty
 */
export interface ScopeRefNode extends ASTNodeBase {
  readonly kind: 'scopeRef';
  readonly scope: string;  // e.g., "params", "query", "user", "part" (from 'as')
  readonly path: readonly string[];  // e.g., ["entityId"] or ["name", "first"]
}

/**
 * Function call: $can('permission'), $hasRole('role'), $now, $setQuery(...)
 */
export interface FunctionCallNode extends ASTNodeBase {
  readonly kind: 'functionCall';
  readonly name: string;  // e.g., "can", "hasRole", "now", "setQuery"
  readonly args: readonly BindingExpr[];
}

/**
 * Binary operation: a + b, a == b, a && b
 */
export interface BinaryOpNode extends ASTNodeBase {
  readonly kind: 'binaryOp';
  readonly operator: BinaryOperator;
  readonly left: BindingExpr;
  readonly right: BindingExpr;
}

/**
 * Unary operation: !a
 */
export interface UnaryOpNode extends ASTNodeBase {
  readonly kind: 'unaryOp';
  readonly operator: UnaryOperator;
  readonly operand: BindingExpr;
}

/**
 * Object literal: { key: expr, key2: expr2 }
 */
export interface ObjectLiteralNode extends ASTNodeBase {
  readonly kind: 'objectLiteral';
  readonly properties: readonly ObjectProperty[];
}

export interface ObjectProperty {
  readonly key: string;
  readonly value: BindingExpr;
}

/**
 * Array literal: [expr1, expr2, ...]
 */
export interface ArrayLiteralNode extends ASTNodeBase {
  readonly kind: 'arrayLiteral';
  readonly elements: readonly BindingExpr[];
}

/**
 * Template string: "${expr}" or "static ${expr} more"
 */
export interface TemplateStringNode extends ASTNodeBase {
  readonly kind: 'templateString';
  readonly parts: readonly TemplatePart[];
}

export type TemplatePart =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'expr'; readonly value: BindingExpr };

/**
 * Conditional: a ? b : c
 */
export interface ConditionalNode extends ASTNodeBase {
  readonly kind: 'conditional';
  readonly condition: BindingExpr;
  readonly consequent: BindingExpr;
  readonly alternate: BindingExpr;
}

/**
 * Member access: obj.prop or obj['prop']
 */
export interface MemberAccessNode extends ASTNodeBase {
  readonly kind: 'memberAccess';
  readonly object: BindingExpr;
  readonly property: string;
  readonly computed: boolean;  // true for obj['prop'], false for obj.prop
}

// =============================================================================
// OPERATORS
// =============================================================================

export type BinaryOperator =
  // Comparison
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='

  // Logical
  | '&&'
  | '||'

  // Arithmetic
  | '+';  // Only + for string concatenation in Data Binding

export type UnaryOperator = '!';

// =============================================================================
// EXPRESSION UNION
// =============================================================================

/**
 * Union of all binding expression node types.
 */
export type BindingExpr =
  | LiteralNode
  | ScopeRefNode
  | FunctionCallNode
  | BinaryOpNode
  | UnaryOpNode
  | ObjectLiteralNode
  | ArrayLiteralNode
  | TemplateStringNode
  | ConditionalNode
  | MemberAccessNode;

// =============================================================================
// CONSTRUCTORS
// =============================================================================

export function literal(value: string | number | boolean | null): LiteralNode {
  return { kind: 'literal', value };
}

export function scopeRef(scope: string, path: readonly string[]): ScopeRefNode {
  return { kind: 'scopeRef', scope, path };
}

export function functionCall(name: string, args: readonly BindingExpr[]): FunctionCallNode {
  return { kind: 'functionCall', name, args };
}

export function binaryOp(operator: BinaryOperator, left: BindingExpr, right: BindingExpr): BinaryOpNode {
  return { kind: 'binaryOp', operator, left, right };
}

export function unaryOp(operator: UnaryOperator, operand: BindingExpr): UnaryOpNode {
  return { kind: 'unaryOp', operator, operand };
}

export function objectLiteral(properties: readonly ObjectProperty[]): ObjectLiteralNode {
  return { kind: 'objectLiteral', properties };
}

export function arrayLiteral(elements: readonly BindingExpr[]): ArrayLiteralNode {
  return { kind: 'arrayLiteral', elements };
}

export function templateString(parts: readonly TemplatePart[]): TemplateStringNode {
  return { kind: 'templateString', parts };
}

export function conditional(condition: BindingExpr, consequent: BindingExpr, alternate: BindingExpr): ConditionalNode {
  return { kind: 'conditional', condition, consequent, alternate };
}

export function memberAccess(object: BindingExpr, property: string, computed = false): MemberAccessNode {
  return { kind: 'memberAccess', object, property, computed };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isLiteral(node: BindingExpr): node is LiteralNode {
  return node.kind === 'literal';
}

export function isScopeRef(node: BindingExpr): node is ScopeRefNode {
  return node.kind === 'scopeRef';
}

export function isFunctionCall(node: BindingExpr): node is FunctionCallNode {
  return node.kind === 'functionCall';
}

export function isBinaryOp(node: BindingExpr): node is BinaryOpNode {
  return node.kind === 'binaryOp';
}

export function isUnaryOp(node: BindingExpr): node is UnaryOpNode {
  return node.kind === 'unaryOp';
}

export function isObjectLiteral(node: BindingExpr): node is ObjectLiteralNode {
  return node.kind === 'objectLiteral';
}

export function isArrayLiteral(node: BindingExpr): node is ArrayLiteralNode {
  return node.kind === 'arrayLiteral';
}

export function isTemplateString(node: BindingExpr): node is TemplateStringNode {
  return node.kind === 'templateString';
}

export function isConditional(node: BindingExpr): node is ConditionalNode {
  return node.kind === 'conditional';
}

export function isMemberAccess(node: BindingExpr): node is MemberAccessNode {
  return node.kind === 'memberAccess';
}
