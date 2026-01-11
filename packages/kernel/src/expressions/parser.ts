/**
 * Trellis Expression Engine - Parser
 *
 * Parses tokenized expressions into an AST following the BNF grammar.
 * See specs/kernel/06-expressions.md for the grammar specification.
 */

import type { Token } from './lexer.js';
import { TokenType, tokenize } from './lexer.js';
import type {
  Expression,
  ExpressionNode,
  BinaryOperator,
  UnaryOperator,
  PropertyBase,
  PropertyPathSegment,
  Traversal,
} from './ast.js';
import {
  expression,
  binaryExpr,
  unaryExpr,
  callExpr,
  propertyRef,
  literal,
  identifier,
} from './ast.js';
import {
  ExpressionError,
  unexpectedTokenError,
  unexpectedEndError,
  parseError,
} from './errors.js';

// =============================================================================
// PARSER
// =============================================================================

/**
 * Expression parser implementing the BNF grammar.
 *
 * Grammar (from spec):
 * expression      ::= logical_or
 * logical_or      ::= logical_and ( '||' logical_and )*
 * logical_and     ::= equality ( '&&' equality )*
 * equality        ::= comparison ( ( '==' | '!=' ) comparison )*
 * comparison      ::= additive ( ( '<' | '>' | '<=' | '>=' ) additive )*
 * additive        ::= multiplicative ( ( '+' | '-' ) multiplicative )*
 * multiplicative  ::= unary ( ( '*' | '/' | '%' ) unary )*
 * unary           ::= ( '!' | '-' ) unary | call
 * call            ::= primary ( '(' arguments? ')' )?
 * primary         ::= property_ref | literal | '(' expression ')'
 */
export class Parser {
  private readonly tokens: readonly Token[];
  private readonly source: string;
  private position: number = 0;

  constructor(tokens: readonly Token[], source: string) {
    this.tokens = tokens;
    this.source = source;
  }

  /**
   * Parse the expression into an AST.
   */
  parse(): Expression {
    const start = this.current().start;
    const body = this.parseExpression();
    const end = this.previous().end;

    // Ensure we consumed all tokens (except EOF)
    if (!this.isAtEnd()) {
      throw unexpectedTokenError(
        'end of expression',
        this.current().value,
        this.current().start
      );
    }

    return expression(body, start, end);
  }

  // ==========================================================================
  // EXPRESSION PARSING
  // ==========================================================================

  /**
   * expression ::= logical_or
   */
  private parseExpression(): ExpressionNode {
    return this.parseLogicalOr();
  }

  /**
   * logical_or ::= logical_and ( '||' logical_and )*
   */
  private parseLogicalOr(): ExpressionNode {
    let left = this.parseLogicalAnd();

    while (this.match(TokenType.OR_OR)) {
      const operator: BinaryOperator = '||';
      const right = this.parseLogicalAnd();
      left = binaryExpr(operator, left, right, left.start, right.end);
    }

    return left;
  }

  /**
   * logical_and ::= equality ( '&&' equality )*
   */
  private parseLogicalAnd(): ExpressionNode {
    let left = this.parseEquality();

    while (this.match(TokenType.AND_AND)) {
      const operator: BinaryOperator = '&&';
      const right = this.parseEquality();
      left = binaryExpr(operator, left, right, left.start, right.end);
    }

    return left;
  }

  /**
   * equality ::= comparison ( ( '==' | '!=' ) comparison )*
   */
  private parseEquality(): ExpressionNode {
    let left = this.parseComparison();

    while (this.check(TokenType.EQ_EQ) || this.check(TokenType.BANG_EQ)) {
      const operator: BinaryOperator = this.advance().type === TokenType.EQ_EQ ? '==' : '!=';
      const right = this.parseComparison();
      left = binaryExpr(operator, left, right, left.start, right.end);
    }

    return left;
  }

  /**
   * comparison ::= additive ( ( '<' | '>' | '<=' | '>=' ) additive )*
   */
  private parseComparison(): ExpressionNode {
    let left = this.parseAdditive();

    while (
      this.check(TokenType.LT) ||
      this.check(TokenType.GT) ||
      this.check(TokenType.LT_EQ) ||
      this.check(TokenType.GT_EQ)
    ) {
      const token = this.advance();
      const operator: BinaryOperator =
        token.type === TokenType.LT
          ? '<'
          : token.type === TokenType.GT
            ? '>'
            : token.type === TokenType.LT_EQ
              ? '<='
              : '>=';
      const right = this.parseAdditive();
      left = binaryExpr(operator, left, right, left.start, right.end);
    }

    return left;
  }

  /**
   * additive ::= multiplicative ( ( '+' | '-' ) multiplicative )*
   */
  private parseAdditive(): ExpressionNode {
    let left = this.parseMultiplicative();

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const operator: BinaryOperator = this.advance().type === TokenType.PLUS ? '+' : '-';
      const right = this.parseMultiplicative();
      left = binaryExpr(operator, left, right, left.start, right.end);
    }

    return left;
  }

  /**
   * multiplicative ::= unary ( ( '*' | '/' | '%' ) unary )*
   */
  private parseMultiplicative(): ExpressionNode {
    let left = this.parseUnary();

    while (
      this.check(TokenType.STAR) ||
      this.check(TokenType.SLASH) ||
      this.check(TokenType.PERCENT)
    ) {
      const token = this.advance();
      const operator: BinaryOperator =
        token.type === TokenType.STAR
          ? '*'
          : token.type === TokenType.SLASH
            ? '/'
            : '%';
      const right = this.parseUnary();
      left = binaryExpr(operator, left, right, left.start, right.end);
    }

    return left;
  }

  /**
   * unary ::= ( '!' | '-' ) unary | call
   */
  private parseUnary(): ExpressionNode {
    if (this.check(TokenType.BANG) || this.check(TokenType.MINUS)) {
      const token = this.advance();
      const operator: UnaryOperator = token.type === TokenType.BANG ? '!' : '-';
      const argument = this.parseUnary();
      return unaryExpr(operator, argument, token.start, argument.end);
    }

    return this.parseCall();
  }

  /**
   * call ::= primary ( '(' arguments? ')' )?
   */
  private parseCall(): ExpressionNode {
    const expr = this.parsePrimary();

    // Check if this is a function call
    if (this.check(TokenType.LPAREN) && expr.type === 'Identifier') {
      // It's a function call: IDENTIFIER(args)
      this.advance(); // consume (
      const args = this.parseArguments();
      const closeToken = this.consume(TokenType.RPAREN, "')'");
      return callExpr(expr.name, args, expr.start, closeToken.end);
    }

    return expr;
  }

  /**
   * arguments ::= expression ( ',' expression )*
   */
  private parseArguments(): readonly ExpressionNode[] {
    const args: ExpressionNode[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    return args;
  }

  /**
   * primary ::= property_ref | literal | '(' expression ')'
   */
  private parsePrimary(): ExpressionNode {
    // Grouped expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, "')'");
      return expr;
    }

    // Property reference: @self... or @{uuid}...
    if (this.check(TokenType.AT_SELF) || this.check(TokenType.AT_ENTITY)) {
      return this.parsePropertyReference();
    }

    // Shorthand property: #name
    if (this.check(TokenType.HASH)) {
      const hashToken = this.advance();
      const nameToken = this.consume(TokenType.IDENTIFIER, 'property name');
      return identifier(nameToken.value, hashToken.start, nameToken.end);
    }

    // Literals
    if (this.check(TokenType.NUMBER)) {
      const token = this.advance();
      const value = parseFloat(token.value);
      return literal(value, 'number', token.start, token.end);
    }

    if (this.check(TokenType.STRING)) {
      const token = this.advance();
      return literal(token.value, 'string', token.start, token.end);
    }

    if (this.match(TokenType.TRUE)) {
      const token = this.previous();
      return literal(true, 'boolean', token.start, token.end);
    }

    if (this.match(TokenType.FALSE)) {
      const token = this.previous();
      return literal(false, 'boolean', token.start, token.end);
    }

    if (this.match(TokenType.NULL)) {
      const token = this.previous();
      return literal(null, 'null', token.start, token.end);
    }

    // Identifier (could be a function name or variable)
    if (this.check(TokenType.IDENTIFIER)) {
      const token = this.advance();
      return identifier(token.value, token.start, token.end);
    }

    // Error: unexpected token
    if (this.isAtEnd()) {
      throw unexpectedEndError('expression');
    }

    throw unexpectedTokenError(
      'expression',
      this.current().value,
      this.current().start
    );
  }

  /**
   * property_ref ::= '@self' property_path | '@{' uuid '}' property_path
   */
  private parsePropertyReference(): ExpressionNode {
    const startToken = this.advance(); // @self or @{uuid}
    let base: PropertyBase;

    if (startToken.type === TokenType.AT_SELF) {
      base = { type: 'self' };
    } else {
      // AT_ENTITY - value contains the UUID
      base = { type: 'entity', id: startToken.value };
    }

    // Parse property path
    const path = this.parsePropertyPath();

    const endPos = path.length > 0
      ? this.previous().end
      : startToken.end;

    return propertyRef(base, path, startToken.start, endPos);
  }

  /**
   * property_path ::= ( '.' identifier traversal? )*
   */
  private parsePropertyPath(): readonly PropertyPathSegment[] {
    const segments: PropertyPathSegment[] = [];

    while (this.match(TokenType.DOT)) {
      const nameToken = this.consume(TokenType.IDENTIFIER, 'property name');
      const property = nameToken.value;

      // Check for traversal
      let traversal: Traversal | undefined;

      if (this.match(TokenType.STAR_BRACKET)) {
        // [*] - all items
        traversal = { type: 'all' };
      } else if (this.match(TokenType.LBRACKET)) {
        // [n] - indexed access
        const indexToken = this.consume(TokenType.NUMBER, 'index');
        const index = parseInt(indexToken.value, 10);
        if (!Number.isInteger(index) || index < 0) {
          throw parseError(
            `Invalid index: ${indexToken.value}`,
            indexToken.start,
            indexToken.end
          );
        }
        this.consume(TokenType.RBRACKET, "']'");
        traversal = { type: 'index', index };
      }

      const segment: PropertyPathSegment = traversal
        ? { property, traversal }
        : { property };
      segments.push(segment);
    }

    return segments;
  }

  // ==========================================================================
  // TOKEN HELPERS
  // ==========================================================================

  /**
   * Check if at end of tokens.
   */
  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }

  /**
   * Get current token.
   */
  private current(): Token {
    return this.tokens[this.position] ?? {
      type: TokenType.EOF,
      value: '',
      start: this.source.length,
      end: this.source.length,
    };
  }

  /**
   * Get previous token.
   */
  private previous(): Token {
    return this.tokens[this.position - 1] ?? this.current();
  }

  /**
   * Check if current token matches type.
   */
  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  /**
   * Advance and return previous token.
   */
  private advance(): Token {
    if (!this.isAtEnd()) {
      this.position++;
    }
    return this.previous();
  }

  /**
   * Check and advance if match.
   */
  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * Consume expected token or throw error.
   */
  private consume(type: TokenType, expected: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    if (this.isAtEnd()) {
      throw unexpectedEndError(expected);
    }

    throw unexpectedTokenError(expected, this.current().value, this.current().start);
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Parse an expression string into an AST.
 */
export function parse(source: string): Expression {
  const tokens = tokenize(source);
  const parser = new Parser(tokens, source);
  return parser.parse();
}

/**
 * Parse result with potential errors.
 */
export interface ParseResult {
  readonly success: boolean;
  readonly ast?: Expression;
  readonly error?: ExpressionError;
}

/**
 * Try to parse an expression, returning result instead of throwing.
 */
export function tryParse(source: string): ParseResult {
  try {
    const ast = parse(source);
    return { success: true, ast };
  } catch (e) {
    if (e instanceof ExpressionError) {
      return { success: false, error: e };
    }
    throw e;
  }
}

/**
 * Validate an expression without returning AST.
 */
export function validate(source: string): readonly ExpressionError[] {
  const result = tryParse(source);
  if (!result.success && result.error) {
    return [result.error];
  }
  return [];
}
