/**
 * Trellis Expression Engine - Error Types
 *
 * Expression-specific errors with position information and helpful suggestions.
 */

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * Expression-specific error codes.
 */
export type ExpressionErrorCode =
  | 'PARSE_ERROR'
  | 'UNEXPECTED_TOKEN'
  | 'UNEXPECTED_END'
  | 'INVALID_NUMBER'
  | 'UNTERMINATED_STRING'
  | 'INVALID_ESCAPE'
  | 'PROPERTY_NOT_FOUND'
  | 'ENTITY_NOT_FOUND'
  | 'RELATIONSHIP_NOT_FOUND'
  | 'TYPE_MISMATCH'
  | 'CIRCULAR_DEPENDENCY'
  | 'MAX_DEPTH_EXCEEDED'
  | 'INVALID_FUNCTION'
  | 'INVALID_ARGUMENT_COUNT'
  | 'COLLECTION_WITHOUT_AGGREGATION'
  | 'DIVISION_BY_ZERO'
  | 'NULL_REFERENCE'
  | 'INDEX_OUT_OF_BOUNDS'
  | 'INVALID_UUID';

// =============================================================================
// ERROR CLASS
// =============================================================================

/**
 * Expression error with position information and suggestions.
 */
export class ExpressionError extends Error {
  readonly code: ExpressionErrorCode;
  /** Position in expression string where error occurred */
  readonly position: number | undefined;
  /** End position for ranges */
  readonly endPosition: number | undefined;
  /** Suggestions for fixing the error */
  readonly suggestions: readonly string[] | undefined;
  /** Dependency chain for circular errors */
  readonly chain: readonly string[] | undefined;

  constructor(options: {
    code: ExpressionErrorCode;
    message: string;
    position?: number;
    endPosition?: number;
    suggestions?: readonly string[];
    chain?: readonly string[];
  }) {
    super(options.message);
    this.name = 'ExpressionError';
    this.code = options.code;
    this.position = options.position;
    this.endPosition = options.endPosition;
    this.suggestions = options.suggestions;
    this.chain = options.chain;
  }

  /**
   * Create a formatted error message with position indicator.
   */
  formatWithSource(source: string): string {
    let result = `${this.code}: ${this.message}`;

    if (this.position !== undefined && this.position < source.length) {
      result += `\n\n  ${source}`;
      result += `\n  ${' '.repeat(this.position)}^`;

      if (this.endPosition !== undefined && this.endPosition > this.position) {
        const underlineLen = this.endPosition - this.position - 1;
        result += '~'.repeat(Math.max(0, underlineLen));
      }
    }

    if (this.suggestions && this.suggestions.length > 0) {
      result += `\n\nDid you mean: ${this.suggestions.join(', ')}?`;
    }

    if (this.chain && this.chain.length > 0) {
      result += `\n\nDependency chain: ${this.chain.join(' -> ')}`;
    }

    return result;
  }

  /**
   * Serialize to plain object.
   */
  toJSON(): {
    code: ExpressionErrorCode;
    message: string;
    position: number | undefined;
    endPosition: number | undefined;
    suggestions: readonly string[] | undefined;
    chain: readonly string[] | undefined;
  } {
    return {
      code: this.code,
      message: this.message,
      position: this.position,
      endPosition: this.endPosition,
      suggestions: this.suggestions,
      chain: this.chain,
    };
  }
}

// =============================================================================
// ERROR FACTORIES
// =============================================================================

/**
 * Create parse error.
 */
export function parseError(
  message: string,
  position: number,
  endPosition?: number
): ExpressionError {
  const opts: {
    code: ExpressionErrorCode;
    message: string;
    position: number;
    endPosition?: number;
  } = {
    code: 'PARSE_ERROR',
    message,
    position,
  };
  if (endPosition !== undefined) {
    opts.endPosition = endPosition;
  }
  return new ExpressionError(opts);
}

/**
 * Create unexpected token error.
 */
export function unexpectedTokenError(
  expected: string,
  got: string,
  position: number
): ExpressionError {
  return new ExpressionError({
    code: 'UNEXPECTED_TOKEN',
    message: `Expected ${expected}, got '${got}'`,
    position,
  });
}

/**
 * Create unexpected end of input error.
 */
export function unexpectedEndError(expected?: string): ExpressionError {
  return new ExpressionError({
    code: 'UNEXPECTED_END',
    message: expected
      ? `Unexpected end of expression, expected ${expected}`
      : 'Unexpected end of expression',
  });
}

/**
 * Create invalid number error.
 */
export function invalidNumberError(
  value: string,
  position: number
): ExpressionError {
  return new ExpressionError({
    code: 'INVALID_NUMBER',
    message: `Invalid number: '${value}'`,
    position,
  });
}

/**
 * Create unterminated string error.
 */
export function unterminatedStringError(position: number): ExpressionError {
  return new ExpressionError({
    code: 'UNTERMINATED_STRING',
    message: 'Unterminated string literal',
    position,
  });
}

/**
 * Create invalid escape sequence error.
 */
export function invalidEscapeError(
  char: string,
  position: number
): ExpressionError {
  return new ExpressionError({
    code: 'INVALID_ESCAPE',
    message: `Invalid escape sequence: \\${char}`,
    position,
  });
}

/**
 * Create property not found error.
 */
export function propertyNotFoundError(
  propertyName: string,
  entityType: string,
  suggestions?: readonly string[]
): ExpressionError {
  const opts: {
    code: ExpressionErrorCode;
    message: string;
    suggestions?: readonly string[];
  } = {
    code: 'PROPERTY_NOT_FOUND',
    message: `Property '${propertyName}' not found on entity type '${entityType}'`,
  };
  if (suggestions !== undefined) {
    opts.suggestions = suggestions;
  }
  return new ExpressionError(opts);
}

/**
 * Create entity not found error.
 */
export function entityNotFoundError(entityId: string): ExpressionError {
  return new ExpressionError({
    code: 'ENTITY_NOT_FOUND',
    message: `Entity not found: ${entityId}`,
  });
}

/**
 * Create relationship not found error.
 */
export function relationshipNotFoundError(
  relationshipType: string,
  entityType: string
): ExpressionError {
  return new ExpressionError({
    code: 'RELATIONSHIP_NOT_FOUND',
    message: `Relationship '${relationshipType}' not found on entity type '${entityType}'`,
  });
}

/**
 * Create type mismatch error.
 */
export function typeMismatchError(
  operation: string,
  expected: string,
  got: string,
  position?: number
): ExpressionError {
  const opts: {
    code: ExpressionErrorCode;
    message: string;
    position?: number;
  } = {
    code: 'TYPE_MISMATCH',
    message: `${operation}: expected ${expected}, got ${got}`,
  };
  if (position !== undefined) {
    opts.position = position;
  }
  return new ExpressionError(opts);
}

/**
 * Create circular dependency error.
 */
export function circularDependencyError(
  chain: readonly string[]
): ExpressionError {
  return new ExpressionError({
    code: 'CIRCULAR_DEPENDENCY',
    message: 'Circular dependency detected',
    chain,
  });
}

/**
 * Create max depth exceeded error.
 */
export function maxDepthExceededError(maxDepth: number): ExpressionError {
  return new ExpressionError({
    code: 'MAX_DEPTH_EXCEEDED',
    message: `Expression evaluation exceeded maximum depth of ${maxDepth}`,
  });
}

/**
 * Create invalid function error.
 */
export function invalidFunctionError(
  name: string,
  suggestions?: readonly string[]
): ExpressionError {
  const opts: {
    code: ExpressionErrorCode;
    message: string;
    suggestions?: readonly string[];
  } = {
    code: 'INVALID_FUNCTION',
    message: `Unknown function '${name}'`,
  };
  if (suggestions !== undefined) {
    opts.suggestions = suggestions;
  }
  return new ExpressionError(opts);
}

/**
 * Create invalid argument count error.
 */
export function invalidArgumentCountError(
  name: string,
  expected: string,
  got: number
): ExpressionError {
  return new ExpressionError({
    code: 'INVALID_ARGUMENT_COUNT',
    message: `Function ${name} requires ${expected} arguments, got ${got}`,
  });
}

/**
 * Create collection without aggregation error.
 */
export function collectionWithoutAggregationError(
  relationshipType: string,
  position?: number
): ExpressionError {
  const opts: {
    code: ExpressionErrorCode;
    message: string;
    position?: number;
  } = {
    code: 'COLLECTION_WITHOUT_AGGREGATION',
    message: `Relationship '${relationshipType}' is to-many. Use [*] with an aggregation function: SUM(@self.${relationshipType}[*].property)`,
  };
  if (position !== undefined) {
    opts.position = position;
  }
  return new ExpressionError(opts);
}

/**
 * Create division by zero error.
 */
export function divisionByZeroError(position?: number): ExpressionError {
  const opts: {
    code: ExpressionErrorCode;
    message: string;
    position?: number;
  } = {
    code: 'DIVISION_BY_ZERO',
    message: 'Division by zero',
  };
  if (position !== undefined) {
    opts.position = position;
  }
  return new ExpressionError(opts);
}

/**
 * Create null reference error.
 */
export function nullReferenceError(
  path: string,
  position?: number
): ExpressionError {
  const opts: {
    code: ExpressionErrorCode;
    message: string;
    position?: number;
  } = {
    code: 'NULL_REFERENCE',
    message: `Cannot access property on null: ${path}`,
  };
  if (position !== undefined) {
    opts.position = position;
  }
  return new ExpressionError(opts);
}

/**
 * Create index out of bounds error.
 */
export function indexOutOfBoundsError(
  index: number,
  length: number,
  position?: number
): ExpressionError {
  const opts: {
    code: ExpressionErrorCode;
    message: string;
    position?: number;
  } = {
    code: 'INDEX_OUT_OF_BOUNDS',
    message: `Index ${index} out of bounds for collection of length ${length}`,
  };
  if (position !== undefined) {
    opts.position = position;
  }
  return new ExpressionError(opts);
}

/**
 * Create invalid UUID error.
 */
export function invalidUuidError(
  value: string,
  position: number
): ExpressionError {
  return new ExpressionError({
    code: 'INVALID_UUID',
    message: `Invalid UUID: '${value}'`,
    position,
  });
}
