# Trellis Expression Engine Specification

## Overview

The Expression Engine evaluates computed properties and tracks dependencies for staleness propagation. Expressions are strings stored in JSONB that reference other properties, perform calculations, and aggregate values across relationships.

## Design Principles

1. **Static Analysis**: Dependencies extractable at parse time without runtime context
2. **Deterministic**: Same inputs always produce same outputs
3. **Fail-Safe**: Errors are captured, not thrown; stale is better than wrong
4. **Helpful Errors**: Messages guide users to fix problems
5. **Unit-Aware**: Design supports dimensional analysis (V2)

---

## 1. Expression Syntax

### 1.1 Property References

```
@self.property_name           Current entity's property
@{entity_id}.property_name    Specific entity by UUID
#property_name                Shorthand for @self.property_name
```

**Examples:**
```
@self.unit_cost               → Current entity's unit_cost
#quantity                     → Shorthand for @self.quantity
@{019467a5-7c1f-7000-8000-000000000001}.base_rate
```

### 1.2 Relationship Traversal

```
@self.relationship_type.property           Single (to-one) relationship
@self.relationship_type[*].property        Multiple (to-many), requires aggregation
@self.relationship_type[0].property        Indexed access (first item)
@self.relationship_type[*]                 Collection of entities (for COUNT, etc.)
```

**Cardinality Rules:**
- **to-one** relationships: Direct property access allowed
- **to-many** relationships: MUST use `[*]` with aggregation function or `[n]` for index
- Missing `[*]` on to-many is a parse error

**Examples:**
```
@self.supplier.name                        → Single supplier's name
@self.bom_children[*].extended_cost        → List of costs (needs SUM/AVG)
SUM(@self.bom_children[*].extended_cost)   → Total cost of children
@self.bom_children[0].name                 → First child's name
COUNT(@self.bom_children[*])               → Number of children
```

### 1.3 Chained Traversal

```
@self.rel1.rel2.property                   Chain single relationships
@self.rel1.rel2[*].property                To-many at any point needs [*]
@self.parent.category.markup_percentage    Multi-hop single traversal
```

**Examples:**
```
@self.parent.category.markup_percentage * #base_cost
SUM(@self.assemblies[*].components[*].weight)
```

### 1.4 Literals

```
Numbers:    42, 3.14, -10, 1.5e6
Strings:    "hello", 'world', "line\nbreak"
Booleans:   true, false
Null:       null
```

### 1.5 Operators

**Arithmetic** (numbers only):
```
+    Addition
-    Subtraction (binary) or negation (unary)
*    Multiplication
/    Division
%    Modulo
```

**Comparison** (returns boolean):
```
==   Equal
!=   Not equal
<    Less than
>    Greater than
<=   Less than or equal
>=   Greater than or equal
```

**Logical** (booleans only):
```
&&   Logical AND
||   Logical OR
!    Logical NOT (unary)
```

**Precedence** (highest to lowest):
1. `!` (unary), `-` (unary)
2. `*`, `/`, `%`
3. `+`, `-`
4. `<`, `>`, `<=`, `>=`
5. `==`, `!=`
6. `&&`
7. `||`

Parentheses `()` override precedence.

### 1.6 Built-in Functions

#### Aggregation Functions
Operate on lists from `[*]` traversal:

| Function | Description | Example |
|----------|-------------|---------|
| `SUM(list)` | Sum of numeric values | `SUM(@self.items[*].price)` |
| `AVG(list)` | Average of numeric values | `AVG(@self.scores[*].value)` |
| `MIN(list)` | Minimum value | `MIN(@self.bids[*].amount)` |
| `MAX(list)` | Maximum value | `MAX(@self.bids[*].amount)` |
| `COUNT(list)` | Number of items | `COUNT(@self.children[*])` |

#### Conditional Functions

| Function | Description | Example |
|----------|-------------|---------|
| `IF(cond, then, else)` | Conditional value | `IF(#qty > 100, #bulk_price, #unit_price)` |
| `COALESCE(a, b, ...)` | First non-null value | `COALESCE(#override_price, #default_price)` |

#### Math Functions

| Function | Description | Example |
|----------|-------------|---------|
| `ROUND(n)` | Round to nearest integer | `ROUND(#price * 1.1)` |
| `ROUND(n, decimals)` | Round to N decimal places | `ROUND(#rate, 2)` |
| `FLOOR(n)` | Round down | `FLOOR(#quantity)` |
| `CEIL(n)` | Round up | `CEIL(#days / 7)` |
| `ABS(n)` | Absolute value | `ABS(#delta)` |
| `POW(base, exp)` | Exponentiation | `POW(#growth_rate, #years)` |

#### String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `CONCAT(a, b, ...)` | Concatenate strings | `CONCAT(#first, " ", #last)` |
| `UPPER(s)` | Uppercase | `UPPER(#code)` |
| `LOWER(s)` | Lowercase | `LOWER(#email)` |
| `LENGTH(s)` | String length | `LENGTH(#description)` |
| `SUBSTRING(s, start, len)` | Extract substring | `SUBSTRING(#sku, 0, 3)` |

#### Date Functions

| Function | Description | Example |
|----------|-------------|---------|
| `NOW()` | Current timestamp | `NOW()` |
| `DATE_DIFF(a, b, unit)` | Difference in units | `DATE_DIFF(#due_date, NOW(), "days")` |
| `DATE_ADD(d, n, unit)` | Add to date | `DATE_ADD(#start, 30, "days")` |

### 1.7 Unit Annotations (V2)

Future support for dimensional analysis:

```
#weight_kg * 2.205 lb/kg                   Unit conversion
10 kg + 500 g                              Auto-convert compatible units
#force_n / #area_m2                        Derived unit (pressure)
```

**V1 Implementation:** Units stored as metadata on NumberValue but not validated in expressions. Arithmetic operates on raw numeric values.

---

## 2. Grammar (BNF)

```bnf
expression      ::= logical_or

logical_or      ::= logical_and ( '||' logical_and )*
logical_and     ::= equality ( '&&' equality )*
equality        ::= comparison ( ( '==' | '!=' ) comparison )*
comparison      ::= additive ( ( '<' | '>' | '<=' | '>=' ) additive )*
additive        ::= multiplicative ( ( '+' | '-' ) multiplicative )*
multiplicative  ::= unary ( ( '*' | '/' | '%' ) unary )*
unary           ::= ( '!' | '-' ) unary | call
call            ::= primary ( '(' arguments? ')' )?
primary         ::= property_ref | literal | '(' expression ')'

property_ref    ::= '@self' property_path
                  | '@{' uuid '}' property_path
                  | '#' identifier

property_path   ::= ( '.' identifier traversal? )*
traversal       ::= '[*]' | '[' integer ']'

arguments       ::= expression ( ',' expression )*

literal         ::= number | string | boolean | 'null'
number          ::= integer | decimal | scientific
integer         ::= '-'? digit+
decimal         ::= '-'? digit+ '.' digit+
scientific      ::= decimal ( 'e' | 'E' ) ( '+' | '-' )? digit+
string          ::= '"' char* '"' | "'" char* "'"
boolean         ::= 'true' | 'false'

identifier      ::= ( letter | '_' ) ( letter | digit | '_' )*
uuid            ::= hex{8} '-' hex{4} '-' hex{4} '-' hex{4} '-' hex{12}

letter          ::= 'a'..'z' | 'A'..'Z'
digit           ::= '0'..'9'
hex             ::= digit | 'a'..'f' | 'A'..'F'
```

---

## 3. AST Node Types

```typescript
/**
 * Base AST node with source location for error reporting.
 */
interface ASTNode {
  type: string;
  /** Start position in source string */
  start: number;
  /** End position in source string */
  end: number;
}

/**
 * Root expression node.
 */
interface Expression extends ASTNode {
  type: 'Expression';
  body: ExpressionNode;
}

type ExpressionNode =
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | PropertyReference
  | Literal
  | Identifier;

/**
 * Binary operation: a + b, a && b, a == b
 */
interface BinaryExpression extends ASTNode {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

type BinaryOperator =
  | '+' | '-' | '*' | '/' | '%'           // Arithmetic
  | '==' | '!=' | '<' | '>' | '<=' | '>=' // Comparison
  | '&&' | '||';                           // Logical

/**
 * Unary operation: !a, -a
 */
interface UnaryExpression extends ASTNode {
  type: 'UnaryExpression';
  operator: '!' | '-';
  argument: ExpressionNode;
}

/**
 * Function call: SUM(x), IF(a, b, c)
 */
interface CallExpression extends ASTNode {
  type: 'CallExpression';
  callee: string;  // Function name (uppercase)
  arguments: ExpressionNode[];
}

/**
 * Property reference with traversal path.
 */
interface PropertyReference extends ASTNode {
  type: 'PropertyReference';
  base: PropertyBase;
  path: PropertyPathSegment[];
}

type PropertyBase =
  | { type: 'self' }
  | { type: 'entity'; id: string };

interface PropertyPathSegment {
  property: string;
  traversal?: Traversal;
}

type Traversal =
  | { type: 'all' }           // [*]
  | { type: 'index'; index: number };  // [0], [1], etc.

/**
 * Literal values.
 */
interface Literal extends ASTNode {
  type: 'Literal';
  value: number | string | boolean | null;
  valueType: 'number' | 'string' | 'boolean' | 'null';
}

/**
 * Shorthand property reference: #property_name
 */
interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
}
```

---

## 4. Dependency Extraction

Dependencies are extracted statically from the AST at parse time.

### 4.1 Algorithm

```typescript
interface ExtractedDependency {
  /** Source entity: 'self' or entity UUID */
  entityRef: 'self' | string;
  /** Property name on source entity */
  propertyName: string;
  /** Full path for multi-hop (e.g., "supplier.region.tax_rate") */
  path: string;
  /** Whether this traverses a to-many relationship */
  isCollection: boolean;
  /** Relationship types traversed */
  relationships: string[];
}

function extractDependencies(ast: Expression): ExtractedDependency[] {
  const deps: ExtractedDependency[] = [];

  function visit(node: ExpressionNode): void {
    switch (node.type) {
      case 'PropertyReference':
        deps.push(extractFromPropertyRef(node));
        break;
      case 'Identifier':
        // #property_name → @self.property_name
        deps.push({
          entityRef: 'self',
          propertyName: node.name,
          path: node.name,
          isCollection: false,
          relationships: []
        });
        break;
      case 'BinaryExpression':
        visit(node.left);
        visit(node.right);
        break;
      case 'UnaryExpression':
        visit(node.argument);
        break;
      case 'CallExpression':
        node.arguments.forEach(visit);
        break;
    }
  }

  visit(ast.body);
  return deps;
}
```

### 4.2 Dependency Resolution

At save time, dependencies are resolved to concrete entity IDs:

1. Parse expression → AST
2. Extract dependencies from AST
3. For each dependency:
   - If `entityRef === 'self'`: Use current entity ID
   - If relationship traversal: Query relationships to find target entities
   - Store in `property_dependencies` table

### 4.3 Multi-Entity Dependencies

For relationship traversals, a single computed property may depend on multiple entities:

```
SUM(@self.bom_children[*].cost)
```

This creates N dependency records, one for each child entity's `cost` property. When any child's cost changes, this property becomes stale.

**Dependency Update Strategy:**
- On expression save: Delete old dependencies, insert new
- On relationship change: Re-resolve affected expressions

---

## 5. Evaluation

### 5.1 Evaluation Context

```typescript
interface EvaluationContext {
  /** Tenant for data access */
  tenantId: TenantId;

  /** Entity being evaluated */
  currentEntity: Entity;

  /** Pre-loaded entities (for batching) */
  entityCache: Map<EntityId, Entity>;

  /** Pre-loaded relationships */
  relationshipCache: Map<EntityId, Map<RelationshipType, EntityId[]>>;

  /** Stack for circular detection */
  evaluationStack: Set<string>;  // "entityId.propertyName"

  /** Maximum evaluation depth */
  maxDepth: number;  // Default: 50

  /** Current depth */
  currentDepth: number;
}
```

### 5.2 Evaluation Algorithm

```typescript
interface EvaluationResult {
  success: boolean;
  value?: Value;
  error?: ExpressionError;
}

async function evaluate(
  expression: Expression,
  ctx: EvaluationContext
): Promise<EvaluationResult> {
  try {
    // Check depth limit
    if (ctx.currentDepth > ctx.maxDepth) {
      return {
        success: false,
        error: {
          code: 'MAX_DEPTH_EXCEEDED',
          message: `Expression evaluation exceeded maximum depth of ${ctx.maxDepth}`,
          position: expression.start
        }
      };
    }

    const value = await evaluateNode(expression.body, ctx);
    return { success: true, value };
  } catch (e) {
    if (e instanceof ExpressionError) {
      return { success: false, error: e };
    }
    throw e;
  }
}

async function evaluateNode(
  node: ExpressionNode,
  ctx: EvaluationContext
): Promise<Value> {
  switch (node.type) {
    case 'Literal':
      return literalToValue(node);

    case 'Identifier':
      return resolveProperty(ctx.currentEntity, node.name, ctx);

    case 'PropertyReference':
      return resolvePropertyReference(node, ctx);

    case 'BinaryExpression':
      return evaluateBinary(node, ctx);

    case 'UnaryExpression':
      return evaluateUnary(node, ctx);

    case 'CallExpression':
      return evaluateCall(node, ctx);
  }
}
```

### 5.3 Property Resolution

```typescript
async function resolveProperty(
  entity: Entity,
  propertyName: string,
  ctx: EvaluationContext
): Promise<Value> {
  const key = `${entity.id}.${propertyName}`;

  // Circular detection
  if (ctx.evaluationStack.has(key)) {
    throw new ExpressionError({
      code: 'CIRCULAR_DEPENDENCY',
      message: `Circular dependency detected: ${[...ctx.evaluationStack, key].join(' → ')}`,
      position: 0
    });
  }

  const property = entity.properties[propertyName];
  if (!property) {
    throw new ExpressionError({
      code: 'PROPERTY_NOT_FOUND',
      message: `Property '${propertyName}' not found on entity type '${entity.type}'`,
      position: 0,
      suggestions: Object.keys(entity.properties)
    });
  }

  // Get resolved value based on source
  switch (property.source) {
    case 'literal':
      return property.value;

    case 'measured':
      return property.value;

    case 'inherited':
      if (property.override) return property.override;
      if (property.computation_status === 'valid' && property.resolved_value) {
        return property.resolved_value;
      }
      // Resolve from source
      return resolveInheritedProperty(property, ctx);

    case 'computed':
      if (property.computation_status === 'valid' && property.cached_value) {
        return property.cached_value;
      }
      // Evaluate expression
      ctx.evaluationStack.add(key);
      ctx.currentDepth++;
      try {
        const ast = parse(property.expression);
        const result = await evaluate(ast, {
          ...ctx,
          currentEntity: entity
        });
        if (!result.success) throw result.error;
        return result.value!;
      } finally {
        ctx.evaluationStack.delete(key);
        ctx.currentDepth--;
      }
  }
}
```

### 5.4 Handling Null/Missing Values

| Scenario | Behavior |
|----------|----------|
| Property doesn't exist | Error: `PROPERTY_NOT_FOUND` |
| Property value is null | Propagate null |
| Null in arithmetic | Result is null |
| Null in comparison | `null == null` is true; `null == x` is false |
| Null in aggregation | Ignored (like SQL) |
| Empty collection | `SUM([])` = 0, `AVG([])` = null, `COUNT([])` = 0 |

### 5.5 Type Coercion

**Strict typing - no implicit coercion:**

| Operation | Allowed Types | Error on Mismatch |
|-----------|---------------|-------------------|
| `+`, `-`, `*`, `/`, `%` | number, number | `TYPE_MISMATCH: Cannot add text and number` |
| `<`, `>`, `<=`, `>=` | number, number | `TYPE_MISMATCH: Cannot compare text and number` |
| `==`, `!=` | any, any (same type) | Works, but different types always `!=` |
| `&&`, `\|\|`, `!` | boolean | `TYPE_MISMATCH: Expected boolean` |
| `CONCAT` | text, text, ... | `TYPE_MISMATCH: CONCAT requires text arguments` |

---

## 6. Staleness Propagation

### 6.1 Algorithm

When a property value changes:

```typescript
async function propagateStaleness(
  tenantId: TenantId,
  entityId: EntityId,
  propertyName: PropertyName
): Promise<PropertyStaleEvent[]> {
  const events: PropertyStaleEvent[] = [];
  const queue: Array<{ entityId: EntityId; propertyName: PropertyName }> = [];
  const processed = new Set<string>();

  // Find direct dependents
  const dependents = await db.query(`
    SELECT dependent_entity_id, dependent_property_name
    FROM property_dependencies
    WHERE tenant_id = $1
      AND source_entity_id = $2
      AND source_property_name = $3
  `, [tenantId, entityId, propertyName]);

  queue.push(...dependents);

  // BFS through dependency graph
  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.entityId}.${current.propertyName}`;

    if (processed.has(key)) continue;
    processed.add(key);

    // Mark property as stale
    await db.query(`
      UPDATE entities
      SET properties = jsonb_set(
        properties,
        ARRAY[$2, 'computation_status'],
        '"stale"'
      ),
      updated_at = NOW()
      WHERE id = $1
    `, [current.entityId, current.propertyName]);

    // Also update computed_cache
    await db.query(`
      UPDATE computed_cache
      SET status = 'stale'
      WHERE entity_id = $1 AND property_name = $2
    `, [current.entityId, current.propertyName]);

    // Create event
    events.push({
      id: generateEventId(),
      tenant_id: tenantId,
      event_type: 'property_stale',
      entity_id: current.entityId,
      actor_id: systemActorId,
      occurred_at: new Date().toISOString(),
      payload: {
        property_name: current.propertyName,
        caused_by: { entityId, propertyName }
      }
    });

    // Find dependents of this property
    const nextDependents = await db.query(`
      SELECT dependent_entity_id, dependent_property_name
      FROM property_dependencies
      WHERE source_entity_id = $1 AND source_property_name = $2
    `, [current.entityId, current.propertyName]);

    queue.push(...nextDependents);
  }

  // Emit all events
  await emitEvents(events);

  return events;
}
```

### 6.2 Batch Propagation

For bulk operations, defer propagation:

```typescript
interface StalenessContext {
  deferred: boolean;
  changedProperties: Array<{ entityId: EntityId; propertyName: PropertyName }>;
}

async function withDeferredStaleness<T>(
  fn: (ctx: StalenessContext) => Promise<T>
): Promise<T> {
  const ctx: StalenessContext = { deferred: true, changedProperties: [] };

  try {
    const result = await fn(ctx);

    // Propagate all at once
    const allAffected = new Set<string>();
    for (const { entityId, propertyName } of ctx.changedProperties) {
      const events = await propagateStaleness(tenantId, entityId, propertyName);
      events.forEach(e => allAffected.add(`${e.entity_id}.${e.payload.property_name}`));
    }

    return result;
  } finally {
    ctx.deferred = false;
  }
}
```

---

## 7. Recomputation

### 7.1 Strategy Recommendation

**Hybrid Lazy + Eager:**

| Strategy | When Used | Rationale |
|----------|-----------|-----------|
| **Lazy** (default) | Most properties | Minimal write overhead; compute on read |
| **Eager** | Properties marked `eager: true` | Real-time dashboards, alerts |
| **Batched** | Bulk operations | Efficiency; single propagation pass |

### 7.2 Lazy Recomputation

On read, if status is `stale` or `pending`:

```typescript
async function getPropertyValue(
  entity: Entity,
  propertyName: PropertyName,
  ctx: EvaluationContext
): Promise<Value | null> {
  const property = entity.properties[propertyName];
  if (!property) return null;

  if (property.source !== 'computed' && property.source !== 'inherited') {
    return getDirectValue(property);
  }

  // Check if recomputation needed
  if (property.computation_status === 'valid') {
    return property.source === 'computed'
      ? property.cached_value
      : property.resolved_value;
  }

  // Recompute
  return recomputeProperty(entity, propertyName, property, ctx);
}
```

### 7.3 Batch Recomputation

For recomputing multiple stale properties efficiently:

```typescript
async function batchRecompute(
  tenantId: TenantId,
  limit: number = 100
): Promise<number> {
  // Find stale properties in topological order
  const staleProperties = await db.query(`
    WITH RECURSIVE ordered AS (
      -- Start with properties that have no stale dependencies
      SELECT e.id, p.key as property_name, 0 as depth
      FROM entities e,
           jsonb_each(e.properties) p
      WHERE e.tenant_id = $1
        AND p.value->>'computation_status' = 'stale'
        AND NOT EXISTS (
          SELECT 1 FROM property_dependencies pd
          JOIN entities dep ON dep.id = pd.source_entity_id
          WHERE pd.dependent_entity_id = e.id
            AND pd.dependent_property_name = p.key
            AND dep.properties->pd.source_property_name->>'computation_status' = 'stale'
        )

      UNION ALL

      -- Add properties whose dependencies are now computed
      SELECT e.id, p.key, o.depth + 1
      FROM entities e,
           jsonb_each(e.properties) p,
           ordered o
      WHERE e.tenant_id = $1
        AND p.value->>'computation_status' = 'stale'
        AND o.depth < 50
        -- ... dependency resolution
    )
    SELECT DISTINCT id, property_name
    FROM ordered
    ORDER BY depth
    LIMIT $2
  `, [tenantId, limit]);

  let recomputed = 0;
  for (const { id, property_name } of staleProperties) {
    await recomputeProperty(id, property_name);
    recomputed++;
  }

  return recomputed;
}
```

### 7.4 Topological Sort

For computing properties in correct order:

```typescript
function topologicalSort(
  properties: Array<{ entityId: EntityId; propertyName: PropertyName }>,
  dependencies: Map<string, string[]>  // key → [dependency keys]
): Array<{ entityId: EntityId; propertyName: PropertyName }> {
  const result: typeof properties = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  function visit(key: string): void {
    if (visited.has(key)) return;
    if (temp.has(key)) {
      throw new Error(`Circular dependency detected: ${key}`);
    }

    temp.add(key);

    const deps = dependencies.get(key) || [];
    for (const dep of deps) {
      visit(dep);
    }

    temp.delete(key);
    visited.add(key);

    const [entityId, propertyName] = key.split('.');
    result.push({ entityId: entityId as EntityId, propertyName: propertyName as PropertyName });
  }

  for (const { entityId, propertyName } of properties) {
    visit(`${entityId}.${propertyName}`);
  }

  return result;
}
```

---

## 8. TypeScript Interfaces

```typescript
// =============================================================================
// EXPRESSION TYPES
// =============================================================================

import { EntityId, TenantId, PropertyName, Value, Entity } from './01-types';

/**
 * Parsed expression ready for evaluation.
 */
export interface ParsedExpression {
  /** Original expression string */
  source: string;
  /** Abstract syntax tree */
  ast: Expression;
  /** Extracted dependencies */
  dependencies: ExtractedDependency[];
  /** Parse timestamp */
  parsed_at: string;
}

/**
 * Dependency extracted from expression.
 */
export interface ExtractedDependency {
  /** 'self' or entity UUID */
  entityRef: 'self' | string;
  /** Property name */
  propertyName: string;
  /** Full traversal path */
  path: string;
  /** Uses [*] collection traversal */
  isCollection: boolean;
  /** Relationship types in path */
  relationships: string[];
}

/**
 * Context for expression evaluation.
 */
export interface EvaluationContext {
  tenantId: TenantId;
  currentEntity: Entity;
  entityCache: Map<EntityId, Entity>;
  relationshipCache: Map<EntityId, Map<string, EntityId[]>>;
  evaluationStack: Set<string>;
  maxDepth: number;
  currentDepth: number;
}

/**
 * Result of expression evaluation.
 */
export interface EvaluationResult {
  success: boolean;
  value?: Value;
  error?: ExpressionError;
  /** Entities accessed during evaluation (for caching) */
  accessedEntities?: EntityId[];
  /** Evaluation duration in ms */
  durationMs?: number;
}

/**
 * Expression error with helpful context.
 */
export interface ExpressionError {
  code: ExpressionErrorCode;
  message: string;
  /** Position in expression string */
  position?: number;
  /** End position for ranges */
  endPosition?: number;
  /** Suggestions for fixing */
  suggestions?: string[];
  /** Dependency chain for circular errors */
  chain?: string[];
}

export type ExpressionErrorCode =
  | 'PARSE_ERROR'
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
  | 'NULL_REFERENCE';

/**
 * Parser interface.
 */
export interface ExpressionParser {
  parse(expression: string): ParsedExpression;
  validate(expression: string): ExpressionError[];
  extractDependencies(expression: string): ExtractedDependency[];
}

/**
 * Evaluator interface.
 */
export interface ExpressionEvaluator {
  evaluate(expression: ParsedExpression, ctx: EvaluationContext): Promise<EvaluationResult>;
  createContext(entity: Entity, tenantId: TenantId): EvaluationContext;
}

/**
 * Staleness propagator interface.
 */
export interface StalenessPropagator {
  propagate(
    tenantId: TenantId,
    entityId: EntityId,
    propertyName: PropertyName
  ): Promise<PropertyStaleEvent[]>;

  batchPropagate(
    tenantId: TenantId,
    changes: Array<{ entityId: EntityId; propertyName: PropertyName }>
  ): Promise<PropertyStaleEvent[]>;
}

/**
 * Event emitted when a property becomes stale.
 */
export interface PropertyStaleEvent {
  id: string;
  tenant_id: TenantId;
  event_type: 'property_stale';
  entity_id: EntityId;
  actor_id: string;
  occurred_at: string;
  payload: {
    property_name: PropertyName;
    caused_by: {
      entityId: EntityId;
      propertyName: PropertyName;
    };
  };
}
```

---

## 9. Error Messages

Errors must be actionable. Format:

```typescript
{
  code: 'PROPERTY_NOT_FOUND',
  message: "Property 'cost' not found on entity type 'part'",
  position: 6,
  suggestions: ['unit_cost', 'extended_cost', 'total_cost']
}
```

### Error Examples

| Error | Message |
|-------|---------|
| Unknown property | `Property 'cost' not found on entity type 'part'. Available: unit_cost, extended_cost, total_cost` |
| Circular dependency | `Circular dependency detected: part.total → part.subtotal → part.total` |
| Type mismatch | `Cannot add text and number at position 15. Left side is text ("hello"), right side is number (42)` |
| Missing aggregation | `Relationship 'bom_children' is to-many. Use [*] with an aggregation function: SUM(@self.bom_children[*].cost)` |
| Unknown function | `Unknown function 'AVERAGE'. Did you mean 'AVG'?` |
| Wrong arg count | `Function IF requires 3 arguments (condition, then, else), got 2` |

---

## 10. Examples

### Example 1: Simple Arithmetic

**Expression:** `#quantity * #unit_cost`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "BinaryExpression",
    "operator": "*",
    "left": { "type": "Identifier", "name": "quantity" },
    "right": { "type": "Identifier", "name": "unit_cost" }
  }
}
```

**Dependencies:**
```json
[
  { "entityRef": "self", "propertyName": "quantity", "path": "quantity", "isCollection": false },
  { "entityRef": "self", "propertyName": "unit_cost", "path": "unit_cost", "isCollection": false }
]
```

---

### Example 2: Aggregation Over Children

**Expression:** `SUM(@self.bom_children[*].extended_cost)`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "CallExpression",
    "callee": "SUM",
    "arguments": [{
      "type": "PropertyReference",
      "base": { "type": "self" },
      "path": [
        { "property": "bom_children", "traversal": { "type": "all" } },
        { "property": "extended_cost" }
      ]
    }]
  }
}
```

**Dependencies:** One per child entity's `extended_cost`.

---

### Example 3: Conditional

**Expression:** `IF(@self.status == "active", #price, 0)`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "CallExpression",
    "callee": "IF",
    "arguments": [
      {
        "type": "BinaryExpression",
        "operator": "==",
        "left": {
          "type": "PropertyReference",
          "base": { "type": "self" },
          "path": [{ "property": "status" }]
        },
        "right": { "type": "Literal", "value": "active", "valueType": "string" }
      },
      { "type": "Identifier", "name": "price" },
      { "type": "Literal", "value": 0, "valueType": "number" }
    ]
  }
}
```

---

### Example 4: Multi-hop Traversal

**Expression:** `@self.parent.category.markup_percentage * #base_cost`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "BinaryExpression",
    "operator": "*",
    "left": {
      "type": "PropertyReference",
      "base": { "type": "self" },
      "path": [
        { "property": "parent" },
        { "property": "category" },
        { "property": "markup_percentage" }
      ]
    },
    "right": { "type": "Identifier", "name": "base_cost" }
  }
}
```

---

### Example 5: Coalesce with Default

**Expression:** `COALESCE(#override_price, @self.template.default_price, 0)`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "CallExpression",
    "callee": "COALESCE",
    "arguments": [
      { "type": "Identifier", "name": "override_price" },
      {
        "type": "PropertyReference",
        "base": { "type": "self" },
        "path": [
          { "property": "template" },
          { "property": "default_price" }
        ]
      },
      { "type": "Literal", "value": 0, "valueType": "number" }
    ]
  }
}
```

---

### Example 6: Nested Aggregation

**Expression:** `SUM(@self.assemblies[*].components[*].weight)`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "CallExpression",
    "callee": "SUM",
    "arguments": [{
      "type": "PropertyReference",
      "base": { "type": "self" },
      "path": [
        { "property": "assemblies", "traversal": { "type": "all" } },
        { "property": "components", "traversal": { "type": "all" } },
        { "property": "weight" }
      ]
    }]
  }
}
```

---

### Example 7: Complex Boolean Logic

**Expression:** `#is_active && (#quantity > 0 || #backorder_allowed)`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "BinaryExpression",
    "operator": "&&",
    "left": { "type": "Identifier", "name": "is_active" },
    "right": {
      "type": "BinaryExpression",
      "operator": "||",
      "left": {
        "type": "BinaryExpression",
        "operator": ">",
        "left": { "type": "Identifier", "name": "quantity" },
        "right": { "type": "Literal", "value": 0, "valueType": "number" }
      },
      "right": { "type": "Identifier", "name": "backorder_allowed" }
    }
  }
}
```

---

### Example 8: Date Calculation

**Expression:** `DATE_DIFF(#due_date, NOW(), "days")`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "CallExpression",
    "callee": "DATE_DIFF",
    "arguments": [
      { "type": "Identifier", "name": "due_date" },
      { "type": "CallExpression", "callee": "NOW", "arguments": [] },
      { "type": "Literal", "value": "days", "valueType": "string" }
    ]
  }
}
```

---

### Example 9: String Concatenation

**Expression:** `CONCAT(#first_name, " ", #last_name)`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "CallExpression",
    "callee": "CONCAT",
    "arguments": [
      { "type": "Identifier", "name": "first_name" },
      { "type": "Literal", "value": " ", "valueType": "string" },
      { "type": "Identifier", "name": "last_name" }
    ]
  }
}
```

---

### Example 10: Specific Entity Reference

**Expression:** `@{019467a5-7c1f-7000-8000-000000000001}.base_rate * #hours`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "BinaryExpression",
    "operator": "*",
    "left": {
      "type": "PropertyReference",
      "base": { "type": "entity", "id": "019467a5-7c1f-7000-8000-000000000001" },
      "path": [{ "property": "base_rate" }]
    },
    "right": { "type": "Identifier", "name": "hours" }
  }
}
```

---

### Example 11: Percentage with Rounding

**Expression:** `ROUND(#subtotal * (1 + #tax_rate / 100), 2)`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "CallExpression",
    "callee": "ROUND",
    "arguments": [
      {
        "type": "BinaryExpression",
        "operator": "*",
        "left": { "type": "Identifier", "name": "subtotal" },
        "right": {
          "type": "BinaryExpression",
          "operator": "+",
          "left": { "type": "Literal", "value": 1, "valueType": "number" },
          "right": {
            "type": "BinaryExpression",
            "operator": "/",
            "left": { "type": "Identifier", "name": "tax_rate" },
            "right": { "type": "Literal", "value": 100, "valueType": "number" }
          }
        }
      },
      { "type": "Literal", "value": 2, "valueType": "number" }
    ]
  }
}
```

---

### Example 12: Count with Filter Condition

**Expression:** `COUNT(@self.items[*]) - COUNT(@self.completed_items[*])`

**AST:**
```json
{
  "type": "Expression",
  "body": {
    "type": "BinaryExpression",
    "operator": "-",
    "left": {
      "type": "CallExpression",
      "callee": "COUNT",
      "arguments": [{
        "type": "PropertyReference",
        "base": { "type": "self" },
        "path": [{ "property": "items", "traversal": { "type": "all" } }]
      }]
    },
    "right": {
      "type": "CallExpression",
      "callee": "COUNT",
      "arguments": [{
        "type": "PropertyReference",
        "base": { "type": "self" },
        "path": [{ "property": "completed_items", "traversal": { "type": "all" } }]
      }]
    }
  }
}
```

---

## Open Questions Resolution

### Q1: User-defined functions?

**Recommendation: No for V1.**

Built-in functions cover 95%+ of use cases. User-defined functions add:
- Security concerns (code execution)
- Versioning complexity
- Debugging difficulty

**V2 consideration:** Tenant-scoped, sandboxed JavaScript functions with explicit capability grants.

### Q2: Async data loading strategy?

**Recommendation: Option A - Pre-fetch all dependencies.**

Rationale:
- Simpler mental model (all data available at evaluation start)
- Enables batching (fetch all entities in one query)
- Avoids partial evaluation states
- Better error reporting (know all missing data upfront)

Implementation:
```typescript
async function prefetchDependencies(
  expression: ParsedExpression,
  ctx: EvaluationContext
): Promise<void> {
  const entityIds = new Set<EntityId>();

  for (const dep of expression.dependencies) {
    if (dep.entityRef !== 'self') {
      entityIds.add(dep.entityRef as EntityId);
    }
    // Resolve relationship traversals to entity IDs
    if (dep.relationships.length > 0) {
      const related = await resolveRelationshipPath(ctx.currentEntity.id, dep.relationships);
      related.forEach(id => entityIds.add(id));
    }
  }

  // Batch fetch
  const entities = await fetchEntities([...entityIds]);
  entities.forEach(e => ctx.entityCache.set(e.id, e));
}
```

### Q3: Recomputation strategy?

**Recommendation: Hybrid (Lazy default + Eager opt-in + Batched for bulk).**

| Mode | Configuration | Use Case |
|------|---------------|----------|
| Lazy | Default | Most properties |
| Eager | `"recompute": "eager"` in property schema | Real-time dashboards |
| Batched | `withDeferredStaleness()` wrapper | Bulk imports, migrations |

Rationale:
- Lazy minimizes write latency (important for user experience)
- Eager available for critical real-time needs
- Batched prevents thundering herd on bulk operations

---

## Version

Expression Engine Specification v1.0.0
