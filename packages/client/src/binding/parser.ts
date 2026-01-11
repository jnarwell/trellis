/**
 * Trellis Data Binding - Parser
 *
 * Parses Data Binding expressions into an AST.
 */

import { TokenType, DataBindingLexer, DataBindingLexerError, type Token } from './lexer.js';
import type {
  BindingExpr,
  ObjectProperty,
  TemplatePart,
} from './ast.js';
import {
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

// =============================================================================
// PARSER
// =============================================================================

export class DataBindingParser {
  private tokens: Token[] = [];
  private current = 0;

  /**
   * Parse an expression string.
   */
  parse(input: string): BindingExpr {
    const lexer = new DataBindingLexer(input);
    this.tokens = lexer.tokenize();
    this.current = 0;

    const expr = this.expression();

    if (!this.isAtEnd()) {
      throw this.error(`Unexpected token '${this.peek().value}'`);
    }

    return expr;
  }

  /**
   * Parse a template string: "static text ${expr} more text"
   */
  parseTemplate(input: string): BindingExpr {
    const parts: TemplatePart[] = [];
    let i = 0;

    while (i < input.length) {
      // Look for ${
      const exprStart = input.indexOf('${', i);

      if (exprStart === -1) {
        // No more expressions, rest is text
        if (i < input.length) {
          parts.push({ kind: 'text', value: input.slice(i) });
        }
        break;
      }

      // Add text before expression
      if (exprStart > i) {
        parts.push({ kind: 'text', value: input.slice(i, exprStart) });
      }

      // Find matching }
      let braceDepth = 1;
      let j = exprStart + 2;
      while (j < input.length && braceDepth > 0) {
        if (input[j] === '{') braceDepth++;
        else if (input[j] === '}') braceDepth--;
        j++;
      }

      if (braceDepth !== 0) {
        throw new Error(`Unterminated template expression at position ${exprStart}`);
      }

      // Parse the expression inside ${ }
      const exprStr = input.slice(exprStart + 2, j - 1);
      const expr = this.parse(exprStr);
      parts.push({ kind: 'expr', value: expr });

      i = j;
    }

    if (parts.length === 0) {
      return literal('');
    }

    if (parts.length === 1) {
      const part = parts[0]!;
      if (part.kind === 'text') {
        return literal(part.value as string);
      }
      return part.value as BindingExpr;
    }

    return templateString(parts);
  }

  // =============================================================================
  // EXPRESSION PARSING (Precedence Climbing)
  // =============================================================================

  /**
   * Parse any expression.
   */
  private expression(): BindingExpr {
    return this.ternary();
  }

  /**
   * Ternary: a ? b : c
   */
  private ternary(): BindingExpr {
    let expr = this.or();

    if (this.match(TokenType.QUESTION)) {
      const consequent = this.expression();
      this.consume(TokenType.COLON, "Expected ':' in ternary expression");
      const alternate = this.expression();
      expr = conditional(expr, consequent, alternate);
    }

    return expr;
  }

  /**
   * Logical OR: a || b
   */
  private or(): BindingExpr {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const right = this.and();
      expr = binaryOp('||', expr, right);
    }

    return expr;
  }

  /**
   * Logical AND: a && b
   */
  private and(): BindingExpr {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const right = this.equality();
      expr = binaryOp('&&', expr, right);
    }

    return expr;
  }

  /**
   * Equality: a == b, a != b
   */
  private equality(): BindingExpr {
    let expr = this.comparison();

    while (true) {
      if (this.match(TokenType.EQ)) {
        const right = this.comparison();
        expr = binaryOp('==', expr, right);
      } else if (this.match(TokenType.NEQ)) {
        const right = this.comparison();
        expr = binaryOp('!=', expr, right);
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * Comparison: a < b, a <= b, a > b, a >= b
   */
  private comparison(): BindingExpr {
    let expr = this.addition();

    while (true) {
      if (this.match(TokenType.LT)) {
        const right = this.addition();
        expr = binaryOp('<', expr, right);
      } else if (this.match(TokenType.LTE)) {
        const right = this.addition();
        expr = binaryOp('<=', expr, right);
      } else if (this.match(TokenType.GT)) {
        const right = this.addition();
        expr = binaryOp('>', expr, right);
      } else if (this.match(TokenType.GTE)) {
        const right = this.addition();
        expr = binaryOp('>=', expr, right);
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * Addition/concatenation: a + b
   */
  private addition(): BindingExpr {
    let expr = this.unary();

    while (this.match(TokenType.PLUS)) {
      const right = this.unary();
      expr = binaryOp('+', expr, right);
    }

    return expr;
  }

  /**
   * Unary: !a
   */
  private unary(): BindingExpr {
    if (this.match(TokenType.NOT)) {
      const operand = this.unary();
      return unaryOp('!', operand);
    }

    return this.postfix();
  }

  /**
   * Postfix: a.b, a['b']
   */
  private postfix(): BindingExpr {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, 'Expected property name after "."');
        expr = memberAccess(expr, name.value, false);
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.expression();
        this.consume(TokenType.RBRACKET, 'Expected "]" after index');
        if (index.kind === 'literal' && typeof index.value === 'string') {
          expr = memberAccess(expr, index.value, true);
        } else {
          // Dynamic property access
          throw this.error('Dynamic property access is not supported');
        }
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * Primary: literals, scope refs, function calls, objects, arrays
   */
  private primary(): BindingExpr {
    // Scope reference: $name or $name.prop or $name('args')
    if (this.match(TokenType.DOLLAR)) {
      const name = this.consume(TokenType.IDENTIFIER, 'Expected identifier after "$"');

      // Function call: $can('...'), $hasRole('...')
      if (this.check(TokenType.LPAREN)) {
        return this.finishCall(name.value);
      }

      // Scope reference: $params.entityId, $user.role
      const path: string[] = [];
      while (this.match(TokenType.DOT)) {
        const prop = this.consume(TokenType.IDENTIFIER, 'Expected property name after "."');
        path.push(prop.value);
      }

      return scopeRef(name.value, path);
    }

    // String literal
    if (this.match(TokenType.STRING)) {
      return literal(this.previous().value);
    }

    // Number literal
    if (this.match(TokenType.NUMBER)) {
      return literal(parseFloat(this.previous().value));
    }

    // Boolean literals
    if (this.match(TokenType.TRUE)) {
      return literal(true);
    }
    if (this.match(TokenType.FALSE)) {
      return literal(false);
    }

    // Null literal
    if (this.match(TokenType.NULL)) {
      return literal(null);
    }

    // Object literal: { key: value }
    if (this.match(TokenType.LBRACE)) {
      return this.objectLiteral();
    }

    // Array literal: [a, b, c]
    if (this.match(TokenType.LBRACKET)) {
      return this.arrayLiteral();
    }

    // Parenthesized expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, 'Expected ")" after expression');
      return expr;
    }

    // Plain identifier (error - should use $)
    if (this.check(TokenType.IDENTIFIER)) {
      const token = this.peek();
      throw this.error(
        `Unexpected identifier '${token.value}'. Did you mean '$${token.value}'?`
      );
    }

    throw this.error(`Unexpected token '${this.peek().value}'`);
  }

  /**
   * Parse function call arguments.
   */
  private finishCall(name: string): BindingExpr {
    this.consume(TokenType.LPAREN, 'Expected "(" after function name');

    const args: BindingExpr[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, 'Expected ")" after function arguments');
    return functionCall(name, args);
  }

  /**
   * Parse object literal.
   */
  private objectLiteral(): BindingExpr {
    const properties: ObjectProperty[] = [];

    if (!this.check(TokenType.RBRACE)) {
      do {
        const key = this.consume(TokenType.IDENTIFIER, 'Expected property name');
        this.consume(TokenType.COLON, 'Expected ":" after property name');
        const value = this.expression();
        properties.push({ key: key.value, value });
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RBRACE, 'Expected "}" after object literal');
    return objectLiteral(properties);
  }

  /**
   * Parse array literal.
   */
  private arrayLiteral(): BindingExpr {
    const elements: BindingExpr[] = [];

    if (!this.check(TokenType.RBRACKET)) {
      do {
        elements.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RBRACKET, 'Expected "]" after array literal');
    return arrayLiteral(elements);
  }

  // =============================================================================
  // HELPERS
  // =============================================================================

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(message);
  }

  private error(message: string): DataBindingParseError {
    const token = this.peek();
    return new DataBindingParseError(message, token.position, token.line, token.column);
  }
}

/**
 * Parse error.
 */
export class DataBindingParseError extends Error {
  constructor(
    message: string,
    public readonly position: number,
    public readonly line: number,
    public readonly column: number
  ) {
    super(`Parse error at line ${line}, column ${column}: ${message}`);
    this.name = 'DataBindingParseError';
  }
}

/**
 * Parse result.
 */
export interface ParseResult {
  readonly success: boolean;
  readonly ast?: BindingExpr;
  readonly error?: DataBindingParseError | DataBindingLexerError;
}

/**
 * Convenience function to parse an expression.
 */
export function parse(input: string): BindingExpr {
  return new DataBindingParser().parse(input);
}

/**
 * Parse with error handling.
 */
export function tryParse(input: string): ParseResult {
  try {
    const ast = parse(input);
    return { success: true, ast };
  } catch (error) {
    if (error instanceof DataBindingParseError || error instanceof DataBindingLexerError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Parse a template string.
 */
export function parseTemplate(input: string): BindingExpr {
  return new DataBindingParser().parseTemplate(input);
}
