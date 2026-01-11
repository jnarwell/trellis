/**
 * Trellis Expression Engine - Lexer
 *
 * Tokenizes expression strings for the parser.
 */

import {
  unexpectedTokenError,
  unterminatedStringError,
  invalidEscapeError,
  invalidNumberError,
  invalidUuidError,
  ExpressionError,
} from './errors.js';

// =============================================================================
// TOKEN TYPES
// =============================================================================

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',

  // Identifiers
  IDENTIFIER = 'IDENTIFIER',

  // Property references
  AT_SELF = 'AT_SELF', // @self
  AT_ENTITY = 'AT_ENTITY', // @{uuid}
  HASH = 'HASH', // #

  // Operators
  PLUS = 'PLUS', // +
  MINUS = 'MINUS', // -
  STAR = 'STAR', // *
  SLASH = 'SLASH', // /
  PERCENT = 'PERCENT', // %
  BANG = 'BANG', // !
  EQ_EQ = 'EQ_EQ', // ==
  BANG_EQ = 'BANG_EQ', // !=
  LT = 'LT', // <
  LT_EQ = 'LT_EQ', // <=
  GT = 'GT', // >
  GT_EQ = 'GT_EQ', // >=
  AND_AND = 'AND_AND', // &&
  OR_OR = 'OR_OR', // ||

  // Delimiters
  LPAREN = 'LPAREN', // (
  RPAREN = 'RPAREN', // )
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  LBRACE = 'LBRACE', // {
  RBRACE = 'RBRACE', // }
  DOT = 'DOT', // .
  COMMA = 'COMMA', // ,
  STAR_BRACKET = 'STAR_BRACKET', // [*]

  // Special
  EOF = 'EOF',
}

// =============================================================================
// TOKEN
// =============================================================================

export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

// =============================================================================
// LEXER
// =============================================================================

/**
 * UUID regex pattern.
 */
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Check if character is a digit.
 */
function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

/**
 * Check if character is a letter.
 */
function isLetter(char: string): boolean {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
}

/**
 * Check if character can start an identifier.
 */
function isIdentifierStart(char: string): boolean {
  return isLetter(char) || char === '_';
}

/**
 * Check if character can be part of an identifier.
 */
function isIdentifierPart(char: string): boolean {
  return isLetter(char) || isDigit(char) || char === '_';
}

/**
 * Check if character is whitespace.
 */
function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

/**
 * Expression lexer.
 */
export class Lexer {
  private readonly source: string;
  private position: number = 0;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Tokenize the entire expression.
   */
  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      start: this.position,
      end: this.position,
    });

    return this.tokens;
  }

  /**
   * Check if at end of source.
   */
  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  /**
   * Get current character.
   */
  private current(): string {
    return this.source[this.position] ?? '';
  }

  /**
   * Peek at next character.
   */
  private peek(offset: number = 1): string {
    return this.source[this.position + offset] ?? '';
  }

  /**
   * Advance and return current character.
   */
  private advance(): string {
    return this.source[this.position++] ?? '';
  }

  /**
   * Check if current matches expected and advance.
   */
  private match(expected: string): boolean {
    if (this.current() === expected) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * Add a token.
   */
  private addToken(type: TokenType, start: number, value?: string): void {
    this.tokens.push({
      type,
      value: value ?? this.source.slice(start, this.position),
      start,
      end: this.position,
    });
  }

  /**
   * Scan a single token.
   */
  private scanToken(): void {
    // Skip whitespace
    while (isWhitespace(this.current())) {
      this.advance();
    }

    if (this.isAtEnd()) return;

    const start = this.position;
    const char = this.advance();

    switch (char) {
      // Single-character tokens
      case '(':
        this.addToken(TokenType.LPAREN, start);
        break;
      case ')':
        this.addToken(TokenType.RPAREN, start);
        break;
      case '{':
        this.addToken(TokenType.LBRACE, start);
        break;
      case '}':
        this.addToken(TokenType.RBRACE, start);
        break;
      case '.':
        this.addToken(TokenType.DOT, start);
        break;
      case ',':
        this.addToken(TokenType.COMMA, start);
        break;
      case '+':
        this.addToken(TokenType.PLUS, start);
        break;
      case '-':
        this.addToken(TokenType.MINUS, start);
        break;
      case '*':
        this.addToken(TokenType.STAR, start);
        break;
      case '/':
        this.addToken(TokenType.SLASH, start);
        break;
      case '%':
        this.addToken(TokenType.PERCENT, start);
        break;

      // [*] or [
      case '[':
        if (this.current() === '*' && this.peek() === ']') {
          this.advance(); // consume *
          this.advance(); // consume ]
          this.addToken(TokenType.STAR_BRACKET, start);
        } else {
          this.addToken(TokenType.LBRACKET, start);
        }
        break;
      case ']':
        this.addToken(TokenType.RBRACKET, start);
        break;

      // Two-character tokens
      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.BANG_EQ, start);
        } else {
          this.addToken(TokenType.BANG, start);
        }
        break;
      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQ_EQ, start);
        } else {
          throw unexpectedTokenError("'=='", "'='", start);
        }
        break;
      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LT_EQ, start);
        } else {
          this.addToken(TokenType.LT, start);
        }
        break;
      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GT_EQ, start);
        } else {
          this.addToken(TokenType.GT, start);
        }
        break;
      case '&':
        if (this.match('&')) {
          this.addToken(TokenType.AND_AND, start);
        } else {
          throw unexpectedTokenError("'&&'", "'&'", start);
        }
        break;
      case '|':
        if (this.match('|')) {
          this.addToken(TokenType.OR_OR, start);
        } else {
          throw unexpectedTokenError("'||'", "'|'", start);
        }
        break;

      // @ - property reference
      case '@':
        this.scanAtReference(start);
        break;

      // # - shorthand property reference
      case '#':
        this.addToken(TokenType.HASH, start);
        break;

      // String literals
      case '"':
      case "'":
        this.scanString(char, start);
        break;

      default:
        // Numbers
        if (isDigit(char)) {
          this.scanNumber(start);
        }
        // Identifiers and keywords
        else if (isIdentifierStart(char)) {
          this.scanIdentifier(start);
        } else {
          throw unexpectedTokenError('valid character', char, start);
        }
    }
  }

  /**
   * Scan @ reference (@self or @{uuid}).
   */
  private scanAtReference(start: number): void {
    // Check for @self
    if (
      this.source.slice(this.position, this.position + 4) === 'self' &&
      !isIdentifierPart(this.source[this.position + 4] ?? '')
    ) {
      this.position += 4;
      this.addToken(TokenType.AT_SELF, start);
      return;
    }

    // Check for @{uuid}
    if (this.current() === '{') {
      this.advance(); // consume {
      const uuidStart = this.position;

      // Read until }
      while (!this.isAtEnd() && this.current() !== '}') {
        this.advance();
      }

      if (this.isAtEnd()) {
        throw unexpectedTokenError("'}'", 'end of expression', start);
      }

      const uuid = this.source.slice(uuidStart, this.position);
      this.advance(); // consume }

      // Validate UUID format
      if (!UUID_PATTERN.test(uuid)) {
        throw invalidUuidError(uuid, uuidStart);
      }

      this.addToken(TokenType.AT_ENTITY, start, uuid);
      return;
    }

    throw unexpectedTokenError("'self' or '{'", this.current(), this.position);
  }

  /**
   * Scan a string literal.
   */
  private scanString(quote: string, start: number): void {
    let value = '';

    while (!this.isAtEnd() && this.current() !== quote) {
      if (this.current() === '\\') {
        this.advance(); // consume backslash
        if (this.isAtEnd()) {
          throw unterminatedStringError(start);
        }
        const escaped = this.advance();
        switch (escaped) {
          case 'n':
            value += '\n';
            break;
          case 'r':
            value += '\r';
            break;
          case 't':
            value += '\t';
            break;
          case '\\':
            value += '\\';
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          default:
            throw invalidEscapeError(escaped, this.position - 1);
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw unterminatedStringError(start);
    }

    this.advance(); // consume closing quote
    this.addToken(TokenType.STRING, start, value);
  }

  /**
   * Scan a number literal.
   */
  private scanNumber(start: number): void {
    // Integer part
    while (isDigit(this.current())) {
      this.advance();
    }

    // Decimal part
    if (this.current() === '.' && isDigit(this.peek())) {
      this.advance(); // consume .
      while (isDigit(this.current())) {
        this.advance();
      }
    }

    // Scientific notation
    if (this.current() === 'e' || this.current() === 'E') {
      const expStart = this.position;
      this.advance(); // consume e/E

      if (this.current() === '+' || this.current() === '-') {
        this.advance();
      }

      if (!isDigit(this.current())) {
        throw invalidNumberError(
          this.source.slice(start, this.position),
          expStart
        );
      }

      while (isDigit(this.current())) {
        this.advance();
      }
    }

    this.addToken(TokenType.NUMBER, start);
  }

  /**
   * Scan an identifier or keyword.
   */
  private scanIdentifier(start: number): void {
    while (isIdentifierPart(this.current())) {
      this.advance();
    }

    const value = this.source.slice(start, this.position);

    // Check for keywords
    switch (value) {
      case 'true':
        this.addToken(TokenType.TRUE, start);
        break;
      case 'false':
        this.addToken(TokenType.FALSE, start);
        break;
      case 'null':
        this.addToken(TokenType.NULL, start);
        break;
      default:
        this.addToken(TokenType.IDENTIFIER, start);
    }
  }
}

/**
 * Tokenize an expression string.
 */
export function tokenize(source: string): Token[] {
  return new Lexer(source).tokenize();
}
