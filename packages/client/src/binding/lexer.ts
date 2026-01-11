/**
 * Trellis Data Binding - Lexer
 *
 * Tokenizes Data Binding expressions for parsing.
 */

// =============================================================================
// TOKEN TYPES
// =============================================================================

export enum TokenType {
  // Literals
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',

  // Identifiers and scope
  IDENTIFIER = 'IDENTIFIER',
  DOLLAR = 'DOLLAR',  // $

  // Punctuation
  DOT = 'DOT',
  COMMA = 'COMMA',
  COLON = 'COLON',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  QUESTION = 'QUESTION',

  // Operators
  PLUS = 'PLUS',
  EQ = 'EQ',        // ==
  NEQ = 'NEQ',      // !=
  LT = 'LT',
  LTE = 'LTE',
  GT = 'GT',
  GTE = 'GTE',
  AND = 'AND',      // &&
  OR = 'OR',        // ||
  NOT = 'NOT',      // !

  // Template
  TEMPLATE_START = 'TEMPLATE_START',  // ${
  TEMPLATE_END = 'TEMPLATE_END',      // }

  // End
  EOF = 'EOF',
}

export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly position: number;
  readonly line: number;
  readonly column: number;
}

// =============================================================================
// LEXER
// =============================================================================

export class DataBindingLexer {
  private readonly input: string;
  private position = 0;
  private line = 1;
  private column = 1;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the entire input.
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (!this.isAtEnd()) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }
    tokens.push(this.makeToken(TokenType.EOF, ''));
    return tokens;
  }

  /**
   * Get the next token.
   */
  private nextToken(): Token | null {
    this.skipWhitespace();

    if (this.isAtEnd()) {
      return null;
    }

    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;

    const ch = this.peek();

    // String literals
    if (ch === '"' || ch === "'") {
      return this.readString(ch);
    }

    // Numbers
    if (this.isDigit(ch)) {
      return this.readNumber();
    }

    // Identifiers and keywords
    if (this.isIdentifierStart(ch)) {
      return this.readIdentifier();
    }

    // Single/multi-character tokens
    switch (ch) {
      case '$':
        this.advance();
        // Check for template expression ${
        if (this.peek() === '{') {
          this.advance();
          return this.makeTokenAt(TokenType.TEMPLATE_START, '${', startPos, startLine, startCol);
        }
        return this.makeTokenAt(TokenType.DOLLAR, '$', startPos, startLine, startCol);

      case '.':
        this.advance();
        return this.makeTokenAt(TokenType.DOT, '.', startPos, startLine, startCol);

      case ',':
        this.advance();
        return this.makeTokenAt(TokenType.COMMA, ',', startPos, startLine, startCol);

      case ':':
        this.advance();
        return this.makeTokenAt(TokenType.COLON, ':', startPos, startLine, startCol);

      case '(':
        this.advance();
        return this.makeTokenAt(TokenType.LPAREN, '(', startPos, startLine, startCol);

      case ')':
        this.advance();
        return this.makeTokenAt(TokenType.RPAREN, ')', startPos, startLine, startCol);

      case '{':
        this.advance();
        return this.makeTokenAt(TokenType.LBRACE, '{', startPos, startLine, startCol);

      case '}':
        this.advance();
        return this.makeTokenAt(TokenType.RBRACE, '}', startPos, startLine, startCol);

      case '[':
        this.advance();
        return this.makeTokenAt(TokenType.LBRACKET, '[', startPos, startLine, startCol);

      case ']':
        this.advance();
        return this.makeTokenAt(TokenType.RBRACKET, ']', startPos, startLine, startCol);

      case '?':
        this.advance();
        return this.makeTokenAt(TokenType.QUESTION, '?', startPos, startLine, startCol);

      case '+':
        this.advance();
        return this.makeTokenAt(TokenType.PLUS, '+', startPos, startLine, startCol);

      case '=':
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return this.makeTokenAt(TokenType.EQ, '==', startPos, startLine, startCol);
        }
        throw this.error(`Unexpected character '='. Did you mean '=='?`);

      case '!':
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return this.makeTokenAt(TokenType.NEQ, '!=', startPos, startLine, startCol);
        }
        return this.makeTokenAt(TokenType.NOT, '!', startPos, startLine, startCol);

      case '<':
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return this.makeTokenAt(TokenType.LTE, '<=', startPos, startLine, startCol);
        }
        return this.makeTokenAt(TokenType.LT, '<', startPos, startLine, startCol);

      case '>':
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return this.makeTokenAt(TokenType.GTE, '>=', startPos, startLine, startCol);
        }
        return this.makeTokenAt(TokenType.GT, '>', startPos, startLine, startCol);

      case '&':
        this.advance();
        if (this.peek() === '&') {
          this.advance();
          return this.makeTokenAt(TokenType.AND, '&&', startPos, startLine, startCol);
        }
        throw this.error(`Unexpected character '&'. Did you mean '&&'?`);

      case '|':
        this.advance();
        if (this.peek() === '|') {
          this.advance();
          return this.makeTokenAt(TokenType.OR, '||', startPos, startLine, startCol);
        }
        throw this.error(`Unexpected character '|'. Did you mean '||'?`);

      default:
        throw this.error(`Unexpected character '${ch}'`);
    }
  }

  /**
   * Read a string literal.
   */
  private readString(quote: string): Token {
    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;

    this.advance(); // consume opening quote
    let value = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        if (this.isAtEnd()) {
          throw this.error('Unterminated string');
        }
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case "'": value += "'"; break;
          case '"': value += '"'; break;
          default: value += escaped;
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw this.error('Unterminated string');
    }

    this.advance(); // consume closing quote
    return this.makeTokenAt(TokenType.STRING, value, startPos, startLine, startCol);
  }

  /**
   * Read a number literal.
   */
  private readNumber(): Token {
    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // .
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    return this.makeTokenAt(TokenType.NUMBER, value, startPos, startLine, startCol);
  }

  /**
   * Read an identifier or keyword.
   */
  private readIdentifier(): Token {
    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    while (!this.isAtEnd() && this.isIdentifierChar(this.peek())) {
      value += this.advance();
    }

    // Check for keywords
    switch (value) {
      case 'true':
        return this.makeTokenAt(TokenType.TRUE, value, startPos, startLine, startCol);
      case 'false':
        return this.makeTokenAt(TokenType.FALSE, value, startPos, startLine, startCol);
      case 'null':
        return this.makeTokenAt(TokenType.NULL, value, startPos, startLine, startCol);
      default:
        return this.makeTokenAt(TokenType.IDENTIFIER, value, startPos, startLine, startCol);
    }
  }

  /**
   * Skip whitespace and comments.
   */
  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
      } else if (ch === '\n') {
        this.advance();
        this.line++;
        this.column = 1;
      } else {
        break;
      }
    }
  }

  // =============================================================================
  // HELPERS
  // =============================================================================

  private peek(): string {
    return this.input[this.position] ?? '\0';
  }

  private peekNext(): string {
    return this.input[this.position + 1] ?? '\0';
  }

  private advance(): string {
    const ch = this.input[this.position] ?? '';
    this.position++;
    this.column++;
    return ch;
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isIdentifierStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') ||
           (ch >= 'A' && ch <= 'Z') ||
           ch === '_';
  }

  private isIdentifierChar(ch: string): boolean {
    return this.isIdentifierStart(ch) || this.isDigit(ch);
  }

  private makeToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      position: this.position,
      line: this.line,
      column: this.column,
    };
  }

  private makeTokenAt(
    type: TokenType,
    value: string,
    position: number,
    line: number,
    column: number
  ): Token {
    return { type, value, position, line, column };
  }

  private error(message: string): Error {
    return new DataBindingLexerError(
      message,
      this.position,
      this.line,
      this.column
    );
  }
}

/**
 * Lexer error.
 */
export class DataBindingLexerError extends Error {
  constructor(
    message: string,
    public readonly position: number,
    public readonly line: number,
    public readonly column: number
  ) {
    super(`Lexer error at line ${line}, column ${column}: ${message}`);
    this.name = 'DataBindingLexerError';
  }
}

/**
 * Convenience function to tokenize an expression.
 */
export function tokenize(input: string): Token[] {
  return new DataBindingLexer(input).tokenize();
}
