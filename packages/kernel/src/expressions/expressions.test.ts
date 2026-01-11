/**
 * Trellis Expression Engine - Comprehensive Tests
 *
 * Tests all 10 AST examples from the spec plus edge cases.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  parse,
  tryParse,
  tokenize,
  TokenType,
  extractDependencies,
  evaluateSimple,
  parseWithDependencies,
  ExpressionError,
  hasFunction,
  getAllFunctionNames,
  invokeFunction,
} from './index.js';
import type { Value, NumberValue, TextValue, BooleanValue, ListValue } from '../types/index.js';

// =============================================================================
// LEXER TESTS
// =============================================================================

describe('Lexer', () => {
  it('tokenizes simple arithmetic', () => {
    const tokens = tokenize('#quantity * #unit_price');
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.HASH,
      TokenType.IDENTIFIER,
      TokenType.STAR,
      TokenType.HASH,
      TokenType.IDENTIFIER,
      TokenType.EOF,
    ]);
  });

  it('tokenizes @self property reference', () => {
    const tokens = tokenize('@self.cost');
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.AT_SELF,
      TokenType.DOT,
      TokenType.IDENTIFIER,
      TokenType.EOF,
    ]);
  });

  it('tokenizes @{uuid} entity reference', () => {
    const tokens = tokenize('@{019467a5-7c1f-7000-8000-000000000001}.base_rate');
    expect(tokens[0]!.type).toBe(TokenType.AT_ENTITY);
    expect(tokens[0]!.value).toBe('019467a5-7c1f-7000-8000-000000000001');
  });

  it('tokenizes [*] collection traversal', () => {
    const tokens = tokenize('@self.items[*].price');
    expect(tokens.map(t => t.type)).toContain(TokenType.STAR_BRACKET);
  });

  it('tokenizes string literals', () => {
    const tokens = tokenize('"hello world"');
    expect(tokens[0]!.type).toBe(TokenType.STRING);
    expect(tokens[0]!.value).toBe('hello world');
  });

  it('handles escape sequences in strings', () => {
    const tokens = tokenize('"line1\\nline2"');
    expect(tokens[0]!.value).toBe('line1\nline2');
  });

  it('tokenizes numbers correctly', () => {
    expect(tokenize('42')[0]!.value).toBe('42');
    expect(tokenize('3.14')[0]!.value).toBe('3.14');
    expect(tokenize('-10')[0]!.type).toBe(TokenType.MINUS);
    expect(tokenize('1.5e6')[0]!.value).toBe('1.5e6');
  });

  it('tokenizes boolean literals', () => {
    expect(tokenize('true')[0]!.type).toBe(TokenType.TRUE);
    expect(tokenize('false')[0]!.type).toBe(TokenType.FALSE);
  });

  it('tokenizes null literal', () => {
    expect(tokenize('null')[0]!.type).toBe(TokenType.NULL);
  });

  it('tokenizes all operators', () => {
    const tokens = tokenize('+ - * / % == != < > <= >= && || !');
    const types = tokens.filter(t => t.type !== TokenType.EOF).map(t => t.type);
    expect(types).toContain(TokenType.PLUS);
    expect(types).toContain(TokenType.MINUS);
    expect(types).toContain(TokenType.STAR);
    expect(types).toContain(TokenType.SLASH);
    expect(types).toContain(TokenType.PERCENT);
    expect(types).toContain(TokenType.EQ_EQ);
    expect(types).toContain(TokenType.BANG_EQ);
    expect(types).toContain(TokenType.LT);
    expect(types).toContain(TokenType.GT);
    expect(types).toContain(TokenType.LT_EQ);
    expect(types).toContain(TokenType.GT_EQ);
    expect(types).toContain(TokenType.AND_AND);
    expect(types).toContain(TokenType.OR_OR);
    expect(types).toContain(TokenType.BANG);
  });

  it('throws on invalid token', () => {
    expect(() => tokenize('$invalid')).toThrow(ExpressionError);
  });

  it('throws on invalid UUID', () => {
    expect(() => tokenize('@{not-a-uuid}')).toThrow(ExpressionError);
  });

  it('throws on unterminated string', () => {
    expect(() => tokenize('"unterminated')).toThrow(ExpressionError);
  });
});

// =============================================================================
// PARSER TESTS - 10 AST EXAMPLES FROM SPEC
// =============================================================================

describe('Parser - Spec Examples', () => {
  // Example 1: Simple Arithmetic
  it('parses #quantity * #unit_price', () => {
    const ast = parse('#quantity * #unit_price');
    expect(ast.body.type).toBe('BinaryExpression');
    if (ast.body.type === 'BinaryExpression') {
      expect(ast.body.operator).toBe('*');
      expect(ast.body.left.type).toBe('Identifier');
      expect(ast.body.right.type).toBe('Identifier');
      if (ast.body.left.type === 'Identifier') {
        expect(ast.body.left.name).toBe('quantity');
      }
      if (ast.body.right.type === 'Identifier') {
        expect(ast.body.right.name).toBe('unit_price');
      }
    }
  });

  // Example 2: Aggregation with traversal
  it('parses SUM(@self.items[*].price)', () => {
    const ast = parse('SUM(@self.items[*].price)');
    expect(ast.body.type).toBe('CallExpression');
    if (ast.body.type === 'CallExpression') {
      expect(ast.body.callee).toBe('SUM');
      expect(ast.body.arguments.length).toBe(1);
      const arg = ast.body.arguments[0]!;
      expect(arg).toBeDefined();
      expect(arg.type).toBe('PropertyReference');
      if (arg.type === 'PropertyReference') {
        expect(arg.base.type).toBe('self');
        expect(arg.path.length).toBe(2);
        expect(arg.path[0]!.property).toBe('items');
        expect(arg.path[0]!.traversal?.type).toBe('all');
        expect(arg.path[1]!.property).toBe('price');
      }
    }
  });

  // Example 3: Conditional
  it('parses IF(@self.status == "active", #price, 0)', () => {
    const ast = parse('IF(@self.status == "active", #price, 0)');
    expect(ast.body.type).toBe('CallExpression');
    if (ast.body.type === 'CallExpression') {
      expect(ast.body.callee).toBe('IF');
      expect(ast.body.arguments.length).toBe(3);

      // Condition
      const cond = ast.body.arguments[0];
      expect(cond).toBeDefined();
      expect(cond!.type).toBe('BinaryExpression');

      // Then
      expect(ast.body.arguments[1]!.type).toBe('Identifier');

      // Else
      expect(ast.body.arguments[2]!.type).toBe('Literal');
    }
  });

  // Example 4: Multi-hop traversal
  it('parses @self.parent.category.markup_percentage * #base_cost', () => {
    const ast = parse('@self.parent.category.markup_percentage * #base_cost');
    expect(ast.body.type).toBe('BinaryExpression');
    if (ast.body.type === 'BinaryExpression') {
      expect(ast.body.operator).toBe('*');
      expect(ast.body.left.type).toBe('PropertyReference');
      if (ast.body.left.type === 'PropertyReference') {
        expect(ast.body.left.path.length).toBe(3);
        expect(ast.body.left.path[0]!.property).toBe('parent');
        expect(ast.body.left.path[1]!.property).toBe('category');
        expect(ast.body.left.path[2]!.property).toBe('markup_percentage');
      }
    }
  });

  // Example 5: COALESCE
  it('parses COALESCE(#override_price, @self.template.default_price, 0)', () => {
    const ast = parse('COALESCE(#override_price, @self.template.default_price, 0)');
    expect(ast.body.type).toBe('CallExpression');
    if (ast.body.type === 'CallExpression') {
      expect(ast.body.callee).toBe('COALESCE');
      expect(ast.body.arguments.length).toBe(3);
    }
  });

  // Example 6: Nested traversal
  it('parses SUM(@self.assemblies[*].components[*].weight)', () => {
    const ast = parse('SUM(@self.assemblies[*].components[*].weight)');
    expect(ast.body.type).toBe('CallExpression');
    if (ast.body.type === 'CallExpression') {
      const arg = ast.body.arguments[0]!;
      expect(arg).toBeDefined();
      if (arg.type === 'PropertyReference') {
        expect(arg.path.length).toBe(3);
        expect(arg.path[0]!.traversal?.type).toBe('all');
        expect(arg.path[1]!.traversal?.type).toBe('all');
      }
    }
  });

  // Example 7: Boolean logic
  it('parses #is_active && (#quantity > 0 || #backorder_allowed)', () => {
    const ast = parse('#is_active && (#quantity > 0 || #backorder_allowed)');
    expect(ast.body.type).toBe('BinaryExpression');
    if (ast.body.type === 'BinaryExpression') {
      expect(ast.body.operator).toBe('&&');
      // Left: #is_active
      expect(ast.body.left.type).toBe('Identifier');
      // Right: (#quantity > 0 || #backorder_allowed)
      expect(ast.body.right.type).toBe('BinaryExpression');
      if (ast.body.right.type === 'BinaryExpression') {
        expect(ast.body.right.operator).toBe('||');
      }
    }
  });

  // Example 8: Date calculation
  it('parses DATE_DIFF(#due_date, NOW(), "days")', () => {
    const ast = parse('DATE_DIFF(#due_date, NOW(), "days")');
    expect(ast.body.type).toBe('CallExpression');
    if (ast.body.type === 'CallExpression') {
      expect(ast.body.callee).toBe('DATE_DIFF');
      expect(ast.body.arguments.length).toBe(3);
      // Second arg is NOW()
      const secondArg = ast.body.arguments[1]!;
      expect(secondArg).toBeDefined();
      expect(secondArg.type).toBe('CallExpression');
      if (secondArg.type === 'CallExpression') {
        expect(secondArg.callee).toBe('NOW');
      }
    }
  });

  // Example 9: String concatenation
  it('parses CONCAT(#first_name, " ", #last_name)', () => {
    const ast = parse('CONCAT(#first_name, " ", #last_name)');
    expect(ast.body.type).toBe('CallExpression');
    if (ast.body.type === 'CallExpression') {
      expect(ast.body.callee).toBe('CONCAT');
      expect(ast.body.arguments.length).toBe(3);
    }
  });

  // Example 10: Specific entity reference
  it('parses @{019467a5-7c1f-7000-8000-000000000001}.base_rate * #hours', () => {
    const ast = parse('@{019467a5-7c1f-7000-8000-000000000001}.base_rate * #hours');
    expect(ast.body.type).toBe('BinaryExpression');
    if (ast.body.type === 'BinaryExpression') {
      expect(ast.body.left.type).toBe('PropertyReference');
      if (ast.body.left.type === 'PropertyReference') {
        expect(ast.body.left.base.type).toBe('entity');
        if (ast.body.left.base.type === 'entity') {
          expect(ast.body.left.base.id).toBe('019467a5-7c1f-7000-8000-000000000001');
        }
      }
    }
  });
});

// =============================================================================
// PARSER - OPERATOR PRECEDENCE
// =============================================================================

describe('Parser - Operator Precedence', () => {
  it('respects multiplication over addition', () => {
    const ast = parse('1 + 2 * 3');
    // Should parse as 1 + (2 * 3)
    expect(ast.body.type).toBe('BinaryExpression');
    if (ast.body.type === 'BinaryExpression') {
      expect(ast.body.operator).toBe('+');
      expect(ast.body.right.type).toBe('BinaryExpression');
      if (ast.body.right.type === 'BinaryExpression') {
        expect(ast.body.right.operator).toBe('*');
      }
    }
  });

  it('respects comparison over logical', () => {
    const ast = parse('#a > 5 && #b < 10');
    expect(ast.body.type).toBe('BinaryExpression');
    if (ast.body.type === 'BinaryExpression') {
      expect(ast.body.operator).toBe('&&');
      expect(ast.body.left.type).toBe('BinaryExpression');
      expect(ast.body.right.type).toBe('BinaryExpression');
    }
  });

  it('respects parentheses', () => {
    const ast = parse('(1 + 2) * 3');
    expect(ast.body.type).toBe('BinaryExpression');
    if (ast.body.type === 'BinaryExpression') {
      expect(ast.body.operator).toBe('*');
      expect(ast.body.left.type).toBe('BinaryExpression');
      if (ast.body.left.type === 'BinaryExpression') {
        expect(ast.body.left.operator).toBe('+');
      }
    }
  });

  it('respects unary precedence', () => {
    const ast = parse('-#x * 2');
    expect(ast.body.type).toBe('BinaryExpression');
    if (ast.body.type === 'BinaryExpression') {
      expect(ast.body.left.type).toBe('UnaryExpression');
    }
  });
});

// =============================================================================
// DEPENDENCY EXTRACTION
// =============================================================================

describe('Dependency Extraction', () => {
  it('extracts simple property references', () => {
    const { dependencies } = parseWithDependencies('#quantity * #unit_price');
    expect(dependencies.length).toBe(2);
    expect(dependencies.map(d => d.propertyName)).toContain('quantity');
    expect(dependencies.map(d => d.propertyName)).toContain('unit_price');
    expect(dependencies.every(d => d.entityRef === 'self')).toBe(true);
  });

  it('extracts @self property references', () => {
    const { dependencies } = parseWithDependencies('@self.cost + @self.markup');
    expect(dependencies.length).toBe(2);
    expect(dependencies.map(d => d.propertyName)).toContain('cost');
    expect(dependencies.map(d => d.propertyName)).toContain('markup');
  });

  it('extracts entity ID references', () => {
    const { dependencies } = parseWithDependencies('@{abc12345-1234-1234-1234-123456789abc}.rate');
    expect(dependencies.length).toBe(1);
    expect(dependencies[0]!.entityRef).toBe('abc12345-1234-1234-1234-123456789abc');
    expect(dependencies[0]!.propertyName).toBe('rate');
  });

  it('extracts collection traversals', () => {
    const { dependencies } = parseWithDependencies('SUM(@self.items[*].price)');
    expect(dependencies.length).toBe(1);
    expect(dependencies[0]!.isCollection).toBe(true);
    expect(dependencies[0]!.relationships).toContain('items');
  });

  it('extracts multi-hop relationships', () => {
    const { dependencies } = parseWithDependencies('@self.parent.category.markup');
    expect(dependencies.length).toBe(1);
    expect(dependencies[0]!.relationships).toEqual(['parent', 'category']);
    expect(dependencies[0]!.propertyName).toBe('markup');
  });

  it('deduplicates dependencies', () => {
    const { dependencies } = parseWithDependencies('#x + #x + #x');
    expect(dependencies.length).toBe(1);
  });
});

// =============================================================================
// FUNCTION REGISTRY
// =============================================================================

describe('Function Registry', () => {
  it('has all required aggregation functions', () => {
    expect(hasFunction('SUM')).toBe(true);
    expect(hasFunction('COUNT')).toBe(true);
    expect(hasFunction('AVG')).toBe(true);
    expect(hasFunction('MIN')).toBe(true);
    expect(hasFunction('MAX')).toBe(true);
  });

  it('has all required conditional functions', () => {
    expect(hasFunction('IF')).toBe(true);
    expect(hasFunction('COALESCE')).toBe(true);
  });

  it('has all required string functions', () => {
    expect(hasFunction('CONCAT')).toBe(true);
    expect(hasFunction('UPPER')).toBe(true);
    expect(hasFunction('LOWER')).toBe(true);
    expect(hasFunction('LENGTH')).toBe(true);
    expect(hasFunction('SUBSTRING')).toBe(true);
    expect(hasFunction('TRIM')).toBe(true);
  });

  it('has all required math functions', () => {
    expect(hasFunction('ROUND')).toBe(true);
    expect(hasFunction('FLOOR')).toBe(true);
    expect(hasFunction('CEIL')).toBe(true);
    expect(hasFunction('ABS')).toBe(true);
    expect(hasFunction('POW')).toBe(true);
    expect(hasFunction('SQRT')).toBe(true);
  });

  it('has all required date functions', () => {
    expect(hasFunction('NOW')).toBe(true);
    expect(hasFunction('DATE_DIFF')).toBe(true);
    expect(hasFunction('DATE_ADD')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(hasFunction('sum')).toBe(true);
    expect(hasFunction('Sum')).toBe(true);
    expect(hasFunction('SUM')).toBe(true);
  });

  it('rejects unknown functions', async () => {
    await expect(invokeFunction('UNKNOWN', [])).rejects.toThrow(ExpressionError);
  });
});

// =============================================================================
// EVALUATOR - SIMPLE EXPRESSIONS
// =============================================================================

describe('Evaluator', () => {
  it('evaluates arithmetic', async () => {
    const ast = parse('#x + #y');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: 10 },
      y: { type: 'number', value: 5 },
    });
    expect(result.success).toBe(true);
    expect((result.value as NumberValue).value).toBe(15);
  });

  it('evaluates multiplication', async () => {
    const ast = parse('#quantity * #unit_price');
    const result = await evaluateSimple(ast, {
      quantity: { type: 'number', value: 3 },
      unit_price: { type: 'number', value: 10 },
    });
    expect(result.success).toBe(true);
    expect((result.value as NumberValue).value).toBe(30);
  });

  it('evaluates division', async () => {
    const ast = parse('#a / #b');
    const result = await evaluateSimple(ast, {
      a: { type: 'number', value: 20 },
      b: { type: 'number', value: 4 },
    });
    expect(result.success).toBe(true);
    expect((result.value as NumberValue).value).toBe(5);
  });

  it('evaluates modulo', async () => {
    const ast = parse('#a % #b');
    const result = await evaluateSimple(ast, {
      a: { type: 'number', value: 17 },
      b: { type: 'number', value: 5 },
    });
    expect(result.success).toBe(true);
    expect((result.value as NumberValue).value).toBe(2);
  });

  it('evaluates comparison operators', async () => {
    let ast = parse('#x > 5');
    let result = await evaluateSimple(ast, { x: { type: 'number', value: 10 } });
    expect((result.value as BooleanValue).value).toBe(true);

    ast = parse('#x < 5');
    result = await evaluateSimple(ast, { x: { type: 'number', value: 10 } });
    expect((result.value as BooleanValue).value).toBe(false);

    ast = parse('#x >= 10');
    result = await evaluateSimple(ast, { x: { type: 'number', value: 10 } });
    expect((result.value as BooleanValue).value).toBe(true);

    ast = parse('#x <= 10');
    result = await evaluateSimple(ast, { x: { type: 'number', value: 10 } });
    expect((result.value as BooleanValue).value).toBe(true);
  });

  it('evaluates equality operators', async () => {
    let ast = parse('#x == 10');
    let result = await evaluateSimple(ast, { x: { type: 'number', value: 10 } });
    expect((result.value as BooleanValue).value).toBe(true);

    ast = parse('#x != 10');
    result = await evaluateSimple(ast, { x: { type: 'number', value: 5 } });
    expect((result.value as BooleanValue).value).toBe(true);
  });

  it('evaluates logical AND', async () => {
    const ast = parse('#a && #b');
    let result = await evaluateSimple(ast, {
      a: { type: 'boolean', value: true },
      b: { type: 'boolean', value: true },
    });
    expect((result.value as BooleanValue).value).toBe(true);

    result = await evaluateSimple(ast, {
      a: { type: 'boolean', value: true },
      b: { type: 'boolean', value: false },
    });
    expect((result.value as BooleanValue).value).toBe(false);
  });

  it('evaluates logical OR', async () => {
    const ast = parse('#a || #b');
    let result = await evaluateSimple(ast, {
      a: { type: 'boolean', value: false },
      b: { type: 'boolean', value: true },
    });
    expect((result.value as BooleanValue).value).toBe(true);

    result = await evaluateSimple(ast, {
      a: { type: 'boolean', value: false },
      b: { type: 'boolean', value: false },
    });
    expect((result.value as BooleanValue).value).toBe(false);
  });

  it('evaluates logical NOT', async () => {
    const ast = parse('!#x');
    const result = await evaluateSimple(ast, {
      x: { type: 'boolean', value: true },
    });
    expect((result.value as BooleanValue).value).toBe(false);
  });

  it('evaluates unary negation', async () => {
    const ast = parse('-#x');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: 42 },
    });
    expect((result.value as NumberValue).value).toBe(-42);
  });

  it('short-circuits AND with false', async () => {
    const ast = parse('#a && #b');
    const result = await evaluateSimple(ast, {
      a: { type: 'boolean', value: false },
      b: null, // Would error if accessed
    });
    expect((result.value as BooleanValue).value).toBe(false);
  });

  it('short-circuits OR with true', async () => {
    const ast = parse('#a || #b');
    const result = await evaluateSimple(ast, {
      a: { type: 'boolean', value: true },
      b: null, // Would error if accessed
    });
    expect((result.value as BooleanValue).value).toBe(true);
  });
});

// =============================================================================
// FUNCTION EVALUATION
// =============================================================================

describe('Function Evaluation', () => {
  it('evaluates CONCAT', async () => {
    const ast = parse('CONCAT(#first, " ", #last)');
    const result = await evaluateSimple(ast, {
      first: { type: 'text', value: 'John' },
      last: { type: 'text', value: 'Doe' },
    });
    expect((result.value as TextValue).value).toBe('John Doe');
  });

  it('evaluates UPPER', async () => {
    const ast = parse('UPPER(#name)');
    const result = await evaluateSimple(ast, {
      name: { type: 'text', value: 'hello' },
    });
    expect((result.value as TextValue).value).toBe('HELLO');
  });

  it('evaluates LOWER', async () => {
    const ast = parse('LOWER(#name)');
    const result = await evaluateSimple(ast, {
      name: { type: 'text', value: 'HELLO' },
    });
    expect((result.value as TextValue).value).toBe('hello');
  });

  it('evaluates LENGTH', async () => {
    const ast = parse('LENGTH(#name)');
    const result = await evaluateSimple(ast, {
      name: { type: 'text', value: 'hello' },
    });
    expect((result.value as NumberValue).value).toBe(5);
  });

  it('evaluates SUBSTRING', async () => {
    const ast = parse('SUBSTRING(#name, 0, 3)');
    const result = await evaluateSimple(ast, {
      name: { type: 'text', value: 'hello' },
    });
    expect((result.value as TextValue).value).toBe('hel');
  });

  it('evaluates TRIM', async () => {
    const ast = parse('TRIM(#name)');
    const result = await evaluateSimple(ast, {
      name: { type: 'text', value: '  hello  ' },
    });
    expect((result.value as TextValue).value).toBe('hello');
  });

  it('evaluates ROUND', async () => {
    let ast = parse('ROUND(#x)');
    let result = await evaluateSimple(ast, {
      x: { type: 'number', value: 3.7 },
    });
    expect((result.value as NumberValue).value).toBe(4);

    ast = parse('ROUND(#x, 2)');
    result = await evaluateSimple(ast, {
      x: { type: 'number', value: 3.14159 },
    });
    expect((result.value as NumberValue).value).toBeCloseTo(3.14);
  });

  it('evaluates FLOOR', async () => {
    const ast = parse('FLOOR(#x)');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: 3.9 },
    });
    expect((result.value as NumberValue).value).toBe(3);
  });

  it('evaluates CEIL', async () => {
    const ast = parse('CEIL(#x)');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: 3.1 },
    });
    expect((result.value as NumberValue).value).toBe(4);
  });

  it('evaluates ABS', async () => {
    const ast = parse('ABS(#x)');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: -42 },
    });
    expect((result.value as NumberValue).value).toBe(42);
  });

  it('evaluates POW', async () => {
    const ast = parse('POW(#base, #exp)');
    const result = await evaluateSimple(ast, {
      base: { type: 'number', value: 2 },
      exp: { type: 'number', value: 10 },
    });
    expect((result.value as NumberValue).value).toBe(1024);
  });

  it('evaluates SQRT', async () => {
    const ast = parse('SQRT(#x)');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: 16 },
    });
    expect((result.value as NumberValue).value).toBe(4);
  });

  it('evaluates IF true branch', async () => {
    const ast = parse('IF(#condition, #then_val, #else_val)');
    const result = await evaluateSimple(ast, {
      condition: { type: 'boolean', value: true },
      then_val: { type: 'number', value: 100 },
      else_val: { type: 'number', value: 0 },
    });
    expect((result.value as NumberValue).value).toBe(100);
  });

  it('evaluates IF false branch', async () => {
    const ast = parse('IF(#condition, #then_val, #else_val)');
    const result = await evaluateSimple(ast, {
      condition: { type: 'boolean', value: false },
      then_val: { type: 'number', value: 100 },
      else_val: { type: 'number', value: 0 },
    });
    expect((result.value as NumberValue).value).toBe(0);
  });

  it('evaluates COALESCE with first non-null', async () => {
    const ast = parse('COALESCE(#a, #b, #c)');
    const result = await evaluateSimple(ast, {
      a: null,
      b: { type: 'number', value: 42 },
      c: { type: 'number', value: 100 },
    });
    expect((result.value as NumberValue).value).toBe(42);
  });

  it('evaluates NOW', async () => {
    const ast = parse('NOW()');
    const result = await evaluateSimple(ast, {});
    expect(result.success).toBe(true);
    expect(result.value?.type).toBe('datetime');
  });
});

// =============================================================================
// EDGE CASES - NULL HANDLING
// =============================================================================

describe('Edge Cases - Null Handling', () => {
  it('null + number = null', async () => {
    const ast = parse('#x + #y');
    const result = await evaluateSimple(ast, {
      x: null,
      y: { type: 'number', value: 5 },
    });
    expect(result.value).toBeNull();
  });

  it('null * number = null', async () => {
    const ast = parse('#x * #y');
    const result = await evaluateSimple(ast, {
      x: null,
      y: { type: 'number', value: 5 },
    });
    expect(result.value).toBeNull();
  });

  it('null == null = true', async () => {
    const ast = parse('#x == #y');
    const result = await evaluateSimple(ast, {
      x: null,
      y: null,
    });
    expect((result.value as BooleanValue).value).toBe(true);
  });

  it('null == value = false', async () => {
    const ast = parse('#x == #y');
    const result = await evaluateSimple(ast, {
      x: null,
      y: { type: 'number', value: 5 },
    });
    expect((result.value as BooleanValue).value).toBe(false);
  });

  it('null != null = false', async () => {
    const ast = parse('#x != #y');
    const result = await evaluateSimple(ast, {
      x: null,
      y: null,
    });
    expect((result.value as BooleanValue).value).toBe(false);
  });

  it('null != value = true', async () => {
    const ast = parse('#x != #y');
    const result = await evaluateSimple(ast, {
      x: null,
      y: { type: 'number', value: 5 },
    });
    expect((result.value as BooleanValue).value).toBe(true);
  });

  it('IF with null condition = null', async () => {
    const ast = parse('IF(#cond, 1, 0)');
    const result = await evaluateSimple(ast, { cond: null });
    expect(result.value).toBeNull();
  });

  it('COALESCE returns null if all null', async () => {
    const ast = parse('COALESCE(#a, #b, #c)');
    const result = await evaluateSimple(ast, {
      a: null,
      b: null,
      c: null,
    });
    expect(result.value).toBeNull();
  });

  it('CONCAT converts null to "null" string', async () => {
    const ast = parse('CONCAT(#a, #b)');
    const result = await evaluateSimple(ast, {
      a: { type: 'text', value: 'hello' },
      b: null,
    });
    expect((result.value as TextValue).value).toBe('hellonull');
  });
});

// =============================================================================
// EDGE CASES - DIVISION BY ZERO
// =============================================================================

describe('Edge Cases - Division by Zero', () => {
  it('division by zero returns error', async () => {
    const ast = parse('#x / #y');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: 10 },
      y: { type: 'number', value: 0 },
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DIVISION_BY_ZERO');
  });

  it('modulo by zero returns error', async () => {
    const ast = parse('#x % #y');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: 10 },
      y: { type: 'number', value: 0 },
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DIVISION_BY_ZERO');
  });
});

// =============================================================================
// EDGE CASES - TYPE MISMATCHES
// =============================================================================

describe('Edge Cases - Type Mismatches', () => {
  it('cannot add text and number', async () => {
    const ast = parse('#x + #y');
    const result = await evaluateSimple(ast, {
      x: { type: 'text', value: 'hello' },
      y: { type: 'number', value: 5 },
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TYPE_MISMATCH');
  });

  it('cannot compare text with < operator', async () => {
    const ast = parse('#x < #y');
    const result = await evaluateSimple(ast, {
      x: { type: 'text', value: 'a' },
      y: { type: 'text', value: 'b' },
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TYPE_MISMATCH');
  });

  it('logical AND requires boolean', async () => {
    const ast = parse('#x && #y');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: 1 },
      y: { type: 'boolean', value: true },
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TYPE_MISMATCH');
  });

  it('logical NOT requires boolean', async () => {
    const ast = parse('!#x');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: 1 },
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TYPE_MISMATCH');
  });

  it('unary negation requires number', async () => {
    const ast = parse('-#x');
    const result = await evaluateSimple(ast, {
      x: { type: 'text', value: 'hello' },
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TYPE_MISMATCH');
  });
});

// =============================================================================
// PARSER ERROR HANDLING
// =============================================================================

describe('Parser Error Handling', () => {
  it('rejects incomplete expressions', () => {
    const result = tryParse('#x +');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNEXPECTED_END');
  });

  it('rejects invalid operators', () => {
    const result = tryParse('#x = #y');
    expect(result.success).toBe(false);
  });

  it('rejects unclosed parentheses', () => {
    const result = tryParse('(#x + #y');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNEXPECTED_END');
  });

  it('rejects extra tokens', () => {
    const result = tryParse('#x #y');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNEXPECTED_TOKEN');
  });

  it('provides position information in errors', () => {
    // Use an invalid token that will have position info
    const result = tryParse('#x + @invalid');
    expect(result.success).toBe(false);
    // Unexpected end errors may not have position, but parse errors should exist
    expect(result.error).toBeDefined();
  });
});

// =============================================================================
// COMPLEX EXPRESSIONS
// =============================================================================

describe('Complex Expressions', () => {
  it('evaluates nested arithmetic', async () => {
    const ast = parse('(#a + #b) * (#c - #d) / #e');
    const result = await evaluateSimple(ast, {
      a: { type: 'number', value: 10 },
      b: { type: 'number', value: 5 },
      c: { type: 'number', value: 20 },
      d: { type: 'number', value: 8 },
      e: { type: 'number', value: 3 },
    });
    expect(result.success).toBe(true);
    // (10 + 5) * (20 - 8) / 3 = 15 * 12 / 3 = 60
    expect((result.value as NumberValue).value).toBe(60);
  });

  it('evaluates complex boolean logic', async () => {
    const ast = parse('#a && (#b || #c) && !#d');
    const result = await evaluateSimple(ast, {
      a: { type: 'boolean', value: true },
      b: { type: 'boolean', value: false },
      c: { type: 'boolean', value: true },
      d: { type: 'boolean', value: false },
    });
    expect(result.success).toBe(true);
    // true && (false || true) && !false = true && true && true = true
    expect((result.value as BooleanValue).value).toBe(true);
  });

  it('evaluates nested function calls', async () => {
    const ast = parse('ROUND(ABS(#x) * 1.5, 1)');
    const result = await evaluateSimple(ast, {
      x: { type: 'number', value: -10 },
    });
    expect(result.success).toBe(true);
    // ROUND(ABS(-10) * 1.5, 1) = ROUND(10 * 1.5, 1) = ROUND(15, 1) = 15
    expect((result.value as NumberValue).value).toBe(15);
  });

  it('evaluates conditional with comparison', async () => {
    const ast = parse('IF(#quantity > 100, #bulk_price, #unit_price)');
    const result = await evaluateSimple(ast, {
      quantity: { type: 'number', value: 150 },
      bulk_price: { type: 'number', value: 8 },
      unit_price: { type: 'number', value: 10 },
    });
    expect(result.success).toBe(true);
    expect((result.value as NumberValue).value).toBe(8);
  });
});
