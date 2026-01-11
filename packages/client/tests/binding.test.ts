/**
 * Data Binding Tests
 *
 * Tests for lexer, parser, evaluator, and scope management.
 */

import { describe, it, expect } from 'vitest';
import {
  // Lexer
  tokenize,
  TokenType,

  // Parser
  parse,
  tryParse,
  parseTemplate,

  // AST
  isLiteral,
  isScopeRef,
  isFunctionCall,
  isBinaryOp,
  isObjectLiteral,
  isTemplateString,

  // Scope
  createScope,
  createEventScope,
  resolveInScope,

  // Evaluator
  evaluate,
  evaluateString,
  evaluateTemplate,
  tryEvaluate,

  // Functions
  hasFunction,
  getFunctionNames,
} from '../src/binding/index.js';

// =============================================================================
// LEXER TESTS
// =============================================================================

describe('DataBindingLexer', () => {
  it('tokenizes scope reference', () => {
    const tokens = tokenize('$part.name');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.DOLLAR,
      TokenType.IDENTIFIER,
      TokenType.DOT,
      TokenType.IDENTIFIER,
      TokenType.EOF,
    ]);
  });

  it('tokenizes string literal', () => {
    const tokens = tokenize("'hello'");
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('hello');
  });

  it('tokenizes double-quoted string', () => {
    const tokens = tokenize('"world"');
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('world');
  });

  it('tokenizes number', () => {
    const tokens = tokenize('42.5');
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].value).toBe('42.5');
  });

  it('tokenizes boolean keywords', () => {
    const tokens = tokenize('true false null');
    expect(tokens[0].type).toBe(TokenType.TRUE);
    expect(tokens[1].type).toBe(TokenType.FALSE);
    expect(tokens[2].type).toBe(TokenType.NULL);
  });

  it('tokenizes comparison operators', () => {
    const tokens = tokenize('== != < <= > >=');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.EQ,
      TokenType.NEQ,
      TokenType.LT,
      TokenType.LTE,
      TokenType.GT,
      TokenType.GTE,
      TokenType.EOF,
    ]);
  });

  it('tokenizes logical operators', () => {
    const tokens = tokenize('&& || !');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.AND,
      TokenType.OR,
      TokenType.NOT,
      TokenType.EOF,
    ]);
  });

  it('tokenizes object literal', () => {
    const tokens = tokenize('{ key: value }');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.LBRACE,
      TokenType.IDENTIFIER,
      TokenType.COLON,
      TokenType.IDENTIFIER,
      TokenType.RBRACE,
      TokenType.EOF,
    ]);
  });

  it('tokenizes function call syntax', () => {
    const tokens = tokenize("$can('permission')");
    expect(tokens[0].type).toBe(TokenType.DOLLAR);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].type).toBe(TokenType.LPAREN);
    expect(tokens[3].type).toBe(TokenType.STRING);
    expect(tokens[4].type).toBe(TokenType.RPAREN);
  });
});

// =============================================================================
// PARSER TESTS
// =============================================================================

describe('DataBindingParser', () => {
  it('parses scope reference', () => {
    const ast = parse('$part.name');
    expect(isScopeRef(ast)).toBe(true);
    if (isScopeRef(ast)) {
      expect(ast.scope).toBe('part');
      expect(ast.path).toEqual(['name']);
    }
  });

  it('parses nested scope reference', () => {
    const ast = parse('$user.profile.name');
    expect(isScopeRef(ast)).toBe(true);
    if (isScopeRef(ast)) {
      expect(ast.scope).toBe('user');
      expect(ast.path).toEqual(['profile', 'name']);
    }
  });

  it('parses string literal', () => {
    const ast = parse("'hello'");
    expect(isLiteral(ast)).toBe(true);
    if (isLiteral(ast)) {
      expect(ast.value).toBe('hello');
    }
  });

  it('parses number literal', () => {
    const ast = parse('42');
    expect(isLiteral(ast)).toBe(true);
    if (isLiteral(ast)) {
      expect(ast.value).toBe(42);
    }
  });

  it('parses boolean literals', () => {
    expect(parse('true')).toEqual({ kind: 'literal', value: true });
    expect(parse('false')).toEqual({ kind: 'literal', value: false });
    expect(parse('null')).toEqual({ kind: 'literal', value: null });
  });

  it('parses function call', () => {
    const ast = parse("$can('part.edit')");
    expect(isFunctionCall(ast)).toBe(true);
    if (isFunctionCall(ast)) {
      expect(ast.name).toBe('can');
      expect(ast.args.length).toBe(1);
      expect(isLiteral(ast.args[0])).toBe(true);
    }
  });

  it('parses equality comparison', () => {
    const ast = parse("$part.status == 'draft'");
    expect(isBinaryOp(ast)).toBe(true);
    if (isBinaryOp(ast)) {
      expect(ast.operator).toBe('==');
      expect(isScopeRef(ast.left)).toBe(true);
      expect(isLiteral(ast.right)).toBe(true);
    }
  });

  it('parses string concatenation', () => {
    const ast = parse("'/parts/' + $event.id");
    expect(isBinaryOp(ast)).toBe(true);
    if (isBinaryOp(ast)) {
      expect(ast.operator).toBe('+');
    }
  });

  it('parses object literal', () => {
    const ast = parse("{ path: '/parts/' + $event.id }");
    expect(isObjectLiteral(ast)).toBe(true);
    if (isObjectLiteral(ast)) {
      expect(ast.properties.length).toBe(1);
      expect(ast.properties[0].key).toBe('path');
    }
  });

  it('parses logical expressions', () => {
    const ast = parse("$part.status == 'draft' && $can('part.edit')");
    expect(isBinaryOp(ast)).toBe(true);
    if (isBinaryOp(ast)) {
      expect(ast.operator).toBe('&&');
    }
  });

  it('handles parse errors gracefully', () => {
    const result = tryParse('$');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('parseTemplate', () => {
  it('parses simple template', () => {
    const ast = parseTemplate('${$part.name}');
    // Should evaluate to just the expression
    expect(isScopeRef(ast) || isTemplateString(ast)).toBe(true);
  });

  it('parses template with static text', () => {
    const ast = parseTemplate('Hello ${$part.name}!');
    expect(isTemplateString(ast)).toBe(true);
    if (isTemplateString(ast)) {
      expect(ast.parts.length).toBe(3);
      expect(ast.parts[0]).toEqual({ kind: 'text', value: 'Hello ' });
      expect(ast.parts[2]).toEqual({ kind: 'text', value: '!' });
    }
  });
});

// =============================================================================
// SCOPE TESTS
// =============================================================================

describe('BindingScope', () => {
  const scope = createScope({
    params: { entityId: '123' },
    query: { tab: 'details' },
    user: { id: 'user1', role: 'admin', permissions: ['part.view', 'part.edit'] },
    tenant: { id: 'tenant1' },
    route: { path: '/parts/123' },
    entities: {
      part: { id: '123', type: 'part', name: 'Widget', status: 'draft' },
    },
  });

  it('resolves params', () => {
    expect(resolveInScope(scope, 'params', ['entityId'])).toBe('123');
  });

  it('resolves query', () => {
    expect(resolveInScope(scope, 'query', ['tab'])).toBe('details');
  });

  it('resolves user', () => {
    expect(resolveInScope(scope, 'user', ['id'])).toBe('user1');
    expect(resolveInScope(scope, 'user', ['role'])).toBe('admin');
  });

  it('resolves entity by alias', () => {
    expect(resolveInScope(scope, 'part', ['name'])).toBe('Widget');
    expect(resolveInScope(scope, 'part', ['status'])).toBe('draft');
  });

  it('returns undefined for missing path', () => {
    expect(resolveInScope(scope, 'part', ['nonexistent'])).toBeUndefined();
  });

  it('throws for unknown scope', () => {
    expect(() => resolveInScope(scope, 'unknown', [])).toThrow();
  });
});

describe('createEventScope', () => {
  it('adds event and payload to scope', () => {
    const base = createScope({
      params: { entityId: '123' },
    });

    const eventPayload = { entityId: '456', entityType: 'part' };
    const eventScope = createEventScope(base, eventPayload);

    expect(eventScope.event).toEqual(eventPayload);
    expect(eventScope.payload).toEqual(eventPayload);
  });
});

// =============================================================================
// EVALUATOR TESTS
// =============================================================================

describe('evaluate', () => {
  const scope = createScope({
    params: { entityId: '123' },
    query: { tab: 'details' },
    user: { id: 'user1', role: 'admin', permissions: ['part.view', 'part.edit'] },
    tenant: { id: 'tenant1' },
    route: { path: '/parts/123' },
    entities: {
      part: { id: '123', type: 'part', name: 'Widget', status: 'draft' },
    },
  });

  it('evaluates scope reference', () => {
    const ast = parse('$part.name');
    expect(evaluate(ast, scope)).toBe('Widget');
  });

  it('evaluates nested scope reference', () => {
    const ast = parse('$params.entityId');
    expect(evaluate(ast, scope)).toBe('123');
  });

  it('evaluates string literal', () => {
    const ast = parse("'hello'");
    expect(evaluate(ast, scope)).toBe('hello');
  });

  it('evaluates number literal', () => {
    const ast = parse('42');
    expect(evaluate(ast, scope)).toBe(42);
  });

  it('evaluates boolean comparison', () => {
    const ast = parse("$part.status == 'draft'");
    expect(evaluate(ast, scope)).toBe(true);
  });

  it('evaluates string concatenation', () => {
    const ast = parse("'/parts/' + $part.id");
    expect(evaluate(ast, scope)).toBe('/parts/123');
  });

  it('evaluates object literal', () => {
    const ast = parse("{ path: '/parts/' + $part.id }");
    expect(evaluate(ast, scope)).toEqual({ path: '/parts/123' });
  });

  it('evaluates $can() function', () => {
    const ast = parse("$can('part.edit')");
    expect(evaluate(ast, scope)).toBe(true);
  });

  it('evaluates $can() for missing permission', () => {
    const ast = parse("$can('part.delete')");
    expect(evaluate(ast, scope)).toBe(false);
  });

  it('evaluates $hasRole() function', () => {
    const ast = parse("$hasRole('admin')");
    expect(evaluate(ast, scope)).toBe(true);
  });

  it('evaluates logical AND', () => {
    const ast = parse("$part.status == 'draft' && $can('part.edit')");
    expect(evaluate(ast, scope)).toBe(true);
  });

  it('evaluates logical OR', () => {
    const ast = parse("$part.status == 'released' || $part.status == 'draft'");
    expect(evaluate(ast, scope)).toBe(true);
  });

  it('evaluates logical NOT', () => {
    const ast = parse("!($part.status == 'released')");
    expect(evaluate(ast, scope)).toBe(true);
  });

  it('short-circuits AND', () => {
    const ast = parse("false && $nonexistent.prop");
    expect(evaluate(ast, scope)).toBe(false);
  });

  it('short-circuits OR', () => {
    const ast = parse("true || $nonexistent.prop");
    expect(evaluate(ast, scope)).toBe(true);
  });
});

describe('evaluateString', () => {
  const scope = createScope({
    entities: {
      part: { id: '123', type: 'part', name: 'Widget' },
    },
  });

  it('parses and evaluates', () => {
    expect(evaluateString('$part.name', scope)).toBe('Widget');
  });
});

describe('evaluateTemplate', () => {
  const scope = createScope({
    entities: {
      part: { id: '123', type: 'part', name: 'Widget', part_number: 'WDG-001' },
    },
  });

  it('evaluates template with expression', () => {
    expect(evaluateTemplate('${$part.name}', scope)).toBe('Widget');
  });

  it('evaluates template with static text', () => {
    expect(evaluateTemplate('Part: ${$part.name}', scope)).toBe('Part: Widget');
  });

  it('evaluates template with multiple expressions', () => {
    expect(evaluateTemplate('${$part.part_number} - ${$part.name}', scope)).toBe('WDG-001 - Widget');
  });
});

describe('tryEvaluate', () => {
  const scope = createScope({});

  it('returns success for valid expression', () => {
    const result = tryEvaluate("'hello'", scope);
    expect(result.success).toBe(true);
    expect(result.value).toBe('hello');
  });

  it('returns error for invalid expression', () => {
    const result = tryEvaluate('$', scope);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// =============================================================================
// FUNCTION TESTS
// =============================================================================

describe('Built-in Functions', () => {
  it('registers built-in functions', () => {
    expect(hasFunction('can')).toBe(true);
    expect(hasFunction('hasRole')).toBe(true);
    expect(hasFunction('now')).toBe(true);
    expect(hasFunction('setQuery')).toBe(true);
    expect(hasFunction('inferDetailView')).toBe(true);
  });

  it('lists all function names', () => {
    const names = getFunctionNames();
    expect(names).toContain('can');
    expect(names).toContain('hasRole');
    expect(names).toContain('now');
  });

  it('$now returns ISO timestamp', () => {
    const scope = createScope({});
    const result = evaluateString('$now()', scope);
    expect(typeof result).toBe('string');
    expect(() => new Date(result as string)).not.toThrow();
  });

  it('$inferDetailView returns view name', () => {
    const scope = createScope({});
    const result = evaluateString("$inferDetailView('part')", scope);
    expect(result).toBe('part-detail');
  });
});
