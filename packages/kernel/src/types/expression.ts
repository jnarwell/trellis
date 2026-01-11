/**
 * Trellis Kernel - Expression AST Type Definitions
 *
 * Defines the Abstract Syntax Tree (AST) node types for the Trellis Expression Engine.
 * See specs/kernel/06-expressions.md for full expression syntax documentation.
 *
 * Note: This is a minimal placeholder. Instance 6 (Expression Engine) will expand
 * these types as needed during implementation.
 */

import type { ValueType } from './value.js';

// =============================================================================
// AST NODE TYPES
// =============================================================================

/**
 * Base interface for all AST nodes.
 */
export interface ASTNode {
  readonly kind: string;
}

/**
 * Literal value node.
 */
export interface LiteralNode extends ASTNode {
  readonly kind: 'literal';
  readonly value: unknown;
  readonly value_type: ValueType;
}

/**
 * Property reference node.
 * Syntax: @self.property or #shorthand
 */
export interface PropertyRefNode extends ASTNode {
  readonly kind: 'property_ref';
  /** The entity reference (e.g., "@self", "@parent", entity ID) */
  readonly entity_ref: string;
  /** The property name */
  readonly property: string;
}

/**
 * Function call node.
 * Syntax: FUNCTION_NAME(arg1, arg2, ...)
 */
export interface FunctionCallNode extends ASTNode {
  readonly kind: 'function_call';
  /** Function name (always uppercase: SUM, COUNT, IF, etc.) */
  readonly name: string;
  /** Function arguments */
  readonly arguments: readonly ExpressionNode[];
}

/**
 * Binary operation node.
 * Syntax: left + right, left * right, etc.
 */
export interface BinaryOpNode extends ASTNode {
  readonly kind: 'binary_op';
  /** Operator symbol (+, -, *, /, =, !=, <, >, <=, >=, AND, OR) */
  readonly operator: string;
  /** Left operand */
  readonly left: ExpressionNode;
  /** Right operand */
  readonly right: ExpressionNode;
}

/**
 * Unary operation node.
 * Syntax: -x, NOT x
 */
export interface UnaryOpNode extends ASTNode {
  readonly kind: 'unary_op';
  /** Operator symbol (-, NOT) */
  readonly operator: string;
  /** Operand */
  readonly operand: ExpressionNode;
}

/**
 * Conditional expression node.
 * Syntax: IF(condition, then_value, else_value)
 */
export interface ConditionalNode extends ASTNode {
  readonly kind: 'conditional';
  /** Condition expression */
  readonly condition: ExpressionNode;
  /** Value if condition is true */
  readonly then_branch: ExpressionNode;
  /** Value if condition is false */
  readonly else_branch: ExpressionNode;
}

/**
 * Union of all expression AST node types.
 */
export type ExpressionNode =
  | LiteralNode
  | PropertyRefNode
  | FunctionCallNode
  | BinaryOpNode
  | UnaryOpNode
  | ConditionalNode;

// =============================================================================
// PARSED EXPRESSION
// =============================================================================

/**
 * A fully parsed expression with its AST and metadata.
 */
export interface ParsedExpression {
  /** The original expression string */
  readonly source: string;
  /** The root AST node */
  readonly ast: ExpressionNode;
  /** Property paths this expression depends on */
  readonly dependencies: readonly string[];
  /** The expected return type (if determinable) */
  readonly return_type?: ValueType;
}
