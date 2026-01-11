/**
 * Trellis Expression Engine - AST Types
 *
 * Abstract Syntax Tree node types matching the spec in 06-expressions.md.
 */

// =============================================================================
// BASE NODE
// =============================================================================

/**
 * Base interface for all AST nodes with source location.
 */
export interface ASTNode {
  /** Node type discriminator */
  readonly type: string;
  /** Start position in source string */
  readonly start: number;
  /** End position in source string */
  readonly end: number;
}

// =============================================================================
// EXPRESSION ROOT
// =============================================================================

/**
 * Root expression node.
 */
export interface Expression extends ASTNode {
  readonly type: 'Expression';
  readonly body: ExpressionNode;
}

// =============================================================================
// EXPRESSION NODES
// =============================================================================

/**
 * Union of all expression AST node types.
 */
export type ExpressionNode =
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | PropertyReference
  | Literal
  | Identifier;

/**
 * Binary operators.
 */
export type BinaryOperator =
  | '+' | '-' | '*' | '/' | '%'           // Arithmetic
  | '==' | '!=' | '<' | '>' | '<=' | '>=' // Comparison
  | '&&' | '||';                           // Logical

/**
 * Binary operation: a + b, a && b, a == b
 */
export interface BinaryExpression extends ASTNode {
  readonly type: 'BinaryExpression';
  readonly operator: BinaryOperator;
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
}

/**
 * Unary operators.
 */
export type UnaryOperator = '!' | '-';

/**
 * Unary operation: !a, -a
 */
export interface UnaryExpression extends ASTNode {
  readonly type: 'UnaryExpression';
  readonly operator: UnaryOperator;
  readonly argument: ExpressionNode;
}

/**
 * Function call: SUM(x), IF(a, b, c)
 */
export interface CallExpression extends ASTNode {
  readonly type: 'CallExpression';
  /** Function name (uppercase) */
  readonly callee: string;
  /** Function arguments */
  readonly arguments: readonly ExpressionNode[];
}

/**
 * Property reference base types.
 */
export type PropertyBase =
  | { readonly type: 'self' }
  | { readonly type: 'entity'; readonly id: string };

/**
 * Traversal types for property paths.
 */
export type Traversal =
  | { readonly type: 'all' }                    // [*]
  | { readonly type: 'index'; readonly index: number };  // [0], [1], etc.

/**
 * Segment in a property path.
 */
export interface PropertyPathSegment {
  readonly property: string;
  readonly traversal?: Traversal;
}

/**
 * Property reference: @self.x, @{uuid}.x
 */
export interface PropertyReference extends ASTNode {
  readonly type: 'PropertyReference';
  readonly base: PropertyBase;
  readonly path: readonly PropertyPathSegment[];
}

/**
 * Literal value types for AST.
 */
export type LiteralValueType = 'number' | 'string' | 'boolean' | 'null';

/**
 * Literal values: 42, "hello", true, null
 */
export interface Literal extends ASTNode {
  readonly type: 'Literal';
  readonly value: number | string | boolean | null;
  readonly valueType: LiteralValueType;
}

/**
 * Shorthand property reference: #property_name
 * Equivalent to @self.property_name
 */
export interface Identifier extends ASTNode {
  readonly type: 'Identifier';
  readonly name: string;
}

// =============================================================================
// NODE CONSTRUCTORS
// =============================================================================

/**
 * Create a root Expression node.
 */
export function expression(
  body: ExpressionNode,
  start: number,
  end: number
): Expression {
  return { type: 'Expression', body, start, end };
}

/**
 * Create a BinaryExpression node.
 */
export function binaryExpr(
  operator: BinaryOperator,
  left: ExpressionNode,
  right: ExpressionNode,
  start: number,
  end: number
): BinaryExpression {
  return { type: 'BinaryExpression', operator, left, right, start, end };
}

/**
 * Create a UnaryExpression node.
 */
export function unaryExpr(
  operator: UnaryOperator,
  argument: ExpressionNode,
  start: number,
  end: number
): UnaryExpression {
  return { type: 'UnaryExpression', operator, argument, start, end };
}

/**
 * Create a CallExpression node.
 */
export function callExpr(
  callee: string,
  args: readonly ExpressionNode[],
  start: number,
  end: number
): CallExpression {
  return { type: 'CallExpression', callee, arguments: args, start, end };
}

/**
 * Create a PropertyReference node.
 */
export function propertyRef(
  base: PropertyBase,
  path: readonly PropertyPathSegment[],
  start: number,
  end: number
): PropertyReference {
  return { type: 'PropertyReference', base, path, start, end };
}

/**
 * Create a Literal node.
 */
export function literal(
  value: number | string | boolean | null,
  valueType: LiteralValueType,
  start: number,
  end: number
): Literal {
  return { type: 'Literal', value, valueType, start, end };
}

/**
 * Create an Identifier node.
 */
export function identifier(
  name: string,
  start: number,
  end: number
): Identifier {
  return { type: 'Identifier', name, start, end };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if node is a BinaryExpression.
 */
export function isBinaryExpression(node: ASTNode): node is BinaryExpression {
  return node.type === 'BinaryExpression';
}

/**
 * Check if node is a UnaryExpression.
 */
export function isUnaryExpression(node: ASTNode): node is UnaryExpression {
  return node.type === 'UnaryExpression';
}

/**
 * Check if node is a CallExpression.
 */
export function isCallExpression(node: ASTNode): node is CallExpression {
  return node.type === 'CallExpression';
}

/**
 * Check if node is a PropertyReference.
 */
export function isPropertyReference(node: ASTNode): node is PropertyReference {
  return node.type === 'PropertyReference';
}

/**
 * Check if node is a Literal.
 */
export function isLiteral(node: ASTNode): node is Literal {
  return node.type === 'Literal';
}

/**
 * Check if node is an Identifier.
 */
export function isIdentifier(node: ASTNode): node is Identifier {
  return node.type === 'Identifier';
}

/**
 * Check if node is an Expression (root).
 */
export function isExpression(node: ASTNode): node is Expression {
  return node.type === 'Expression';
}

// =============================================================================
// VISITOR PATTERN
// =============================================================================

/**
 * Visitor interface for AST traversal.
 */
export interface ASTVisitor<T> {
  visitExpression?(node: Expression): T;
  visitBinaryExpression?(node: BinaryExpression): T;
  visitUnaryExpression?(node: UnaryExpression): T;
  visitCallExpression?(node: CallExpression): T;
  visitPropertyReference?(node: PropertyReference): T;
  visitLiteral?(node: Literal): T;
  visitIdentifier?(node: Identifier): T;
}

/**
 * Walk an AST node with a visitor.
 */
export function visitNode<T>(node: ExpressionNode, visitor: ASTVisitor<T>): T | undefined {
  switch (node.type) {
    case 'BinaryExpression':
      return visitor.visitBinaryExpression?.(node);
    case 'UnaryExpression':
      return visitor.visitUnaryExpression?.(node);
    case 'CallExpression':
      return visitor.visitCallExpression?.(node);
    case 'PropertyReference':
      return visitor.visitPropertyReference?.(node);
    case 'Literal':
      return visitor.visitLiteral?.(node);
    case 'Identifier':
      return visitor.visitIdentifier?.(node);
  }
}
