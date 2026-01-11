# Expression Engine Addendum: Proposed Extensions

## Overview

Based on cross-review with the Product Config spec, the following extensions to the Expression Engine are proposed to support real-world computed property patterns.

**Status:** Proposed (requires review)

---

## 1. Collection Filter Syntax

### Motivation

Product Config uses filter syntax in aggregations:
```yaml
expression: "count(descendants[type == 'part'])"
```

This pattern is common for:
- Counting specific types in a hierarchy
- Summing values that match criteria
- Finding min/max among filtered items

### Proposed Syntax

```
@self.relationship[* WHERE condition]
```

The `WHERE` keyword introduces a filter predicate. Within the predicate:
- `@` refers to the current item being filtered
- `@.property` accesses that item's property

### Examples

```
COUNT(@self.bom_descendants[* WHERE @.type == 'part'])
SUM(@self.line_items[* WHERE @.status == 'active'].amount)
MAX(@self.versions[* WHERE @.is_released == true].version_number)
```

### Grammar Addition

```bnf
traversal       ::= '[*]'
                  | '[*' 'WHERE' filter_expr ']'
                  | '[' integer ']'

filter_expr     ::= filter_or

filter_or       ::= filter_and ( '||' filter_and )*
filter_and      ::= filter_term ( '&&' filter_term )*
filter_term     ::= '@.' identifier filter_op literal
                  | '(' filter_expr ')'

filter_op       ::= '==' | '!=' | '<' | '>' | '<=' | '>='
```

### AST Node Addition

```typescript
type Traversal =
  | { type: 'all' }
  | { type: 'filtered'; predicate: FilterPredicate }
  | { type: 'index'; index: number };

interface FilterPredicate {
  type: 'FilterPredicate';
  expression: FilterExpression;
}

interface FilterExpression {
  type: 'FilterExpression';
  operator: '&&' | '||';
  conditions: FilterCondition[];
}

interface FilterCondition {
  property: string;  // After @.
  operator: FilterOperator;
  value: Literal;
}

type FilterOperator = '==' | '!=' | '<' | '>' | '<=' | '>=';
```

### Dependency Implications

Filter predicates do NOT add dependencies - we still depend on all items in the collection. The filter only affects runtime evaluation.

---

## 2. MAP Function (Optional)

### Motivation

Product Config uses inline calculations in aggregations:
```yaml
expression: "sum(children.weight * children.quantity)"
```

Without MAP, this requires a computed property on each child.

### Proposed Syntax

```
SUM(MAP(@self.children[*], @.weight * @.quantity))
```

The `MAP` function transforms each item before aggregation.

### Signature

```
MAP(collection, transform_expression) → collection
```

Within transform_expression:
- `@` refers to the current item
- `@.property` accesses that item's property

### Examples

```
SUM(MAP(@self.items[*], @.price * @.quantity))
AVG(MAP(@self.tests[*], @.score / @.max_score * 100))
MAX(MAP(@self.bids[*], @.amount - @.fee))
```

### Trade-off Analysis

**Pros:**
- Avoids proliferation of intermediate computed properties
- More expressive for complex calculations
- Familiar pattern from functional programming

**Cons:**
- Increases expression complexity
- Dependencies become harder to reason about (depends on N×M properties)
- May encourage overly complex expressions

### Recommendation

**Defer to V2.** For V1, require intermediate computed properties:

```yaml
# On child entity
computed:
  - name: weighted_mass
    expression: "#weight * #quantity"

# On parent entity
computed:
  - name: total_weight
    expression: "SUM(@self.children[*].weighted_mass)"
```

This is more verbose but:
- Dependencies are explicit
- Each computation is individually cacheable
- Easier to debug

---

## 3. Filter Context Clarification

### Motivation

View queries use filter expressions:
```yaml
filter: "status == 'draft'"
filter: "category == $part.category"
```

Need to clarify how these relate to Expression Engine.

### Proposed Design

**Query filters** are a simplified subset of Expression Engine syntax evaluated in a **row context**:

| Context | `@self` meaning | `#x` meaning |
|---------|-----------------|--------------|
| Computed property | The entity with the expression | Same entity's property |
| Query filter | The row being tested | Same row's property |

### Syntax for Query Filters

```
#property operator value
#property operator {{param}}
```

Where:
- `#property` refers to the entity being queried
- `{{param}}` is a parameter placeholder (resolved at query time, not runtime)

### Examples

```yaml
# Static filter
filter: "#status == 'draft'"

# Parameterized filter
filter: "#category == {{part.category}} && #id != {{part.id}}"

# Complex filter
filter: "#is_active == true && #quantity > 0"
```

### Implementation Notes

1. Query filters are **compiled to SQL** at query time
2. Parameters (`{{x}}`) are bound as SQL parameters (safe from injection)
3. Filter syntax is a **subset** of Expression Engine (no aggregations, no relationships)

---

## 4. Template String Consideration

### Motivation

Product Config uses template strings:
```yaml
title: "${part.part_number} - ${part.name}"
```

### Decision

**Template strings are NOT part of Expression Engine.**

Template strings are a UI concern - they produce display text, not computed values. They should remain in the Data Binding system.

If a kernel computed property needs to produce a text value, use `CONCAT`:
```yaml
expression: "CONCAT(#prefix, '-', #number)"
```

---

## 5. Object Literals

### Motivation (from Instance 3 Gap Analysis)

Product Config wiring transforms construct objects:
```yaml
transform:
  kind: expression
  expr: "{ path: '/parts/' + payload.entityId }"
```

### Decision: **NOT part of Expression Engine**

Object literals are **Data Binding syntax**, not Expression Engine syntax.

**Rationale:**
1. **Context**: Transforms only appear in wiring (UI layer), never in kernel computed properties
2. **Purpose**: They construct runtime payloads for navigation/events, not entity values
3. **Separation**: Expression Engine evaluates to `Value` types (text, number, boolean, etc.) - it does not produce arbitrary JSON objects
4. **Determinism**: Expression Engine expressions must be deterministic with static dependencies; transforms reference runtime `payload` which has no static type

**Implementation:**

Wiring transforms use **Data Binding syntax** which includes:
- Object literals: `{ key: expr, ... }`
- Scope variables: `$payload`, `$event`, `$source`
- Template strings: `'/parts/' + $payload.entityId`

```yaml
# This is Data Binding, NOT Expression Engine
wiring:
  - from: table
    event: rowSelected
    to: $navigate
    transform:
      kind: data-binding  # Explicit: this is NOT expression-engine
      expr: "{ path: '/parts/' + $payload.entityId }"
```

---

## 6. Permission Functions

### Motivation (from Instance 3 Gap Analysis)

Product Config needs permission checks:
```yaml
showWhen: $can('part.create')
actions:
  - visible: "$can('part.delete') && $part.status == 'draft'"
```

### Decision: **NOT part of Expression Engine**

Permission functions (`$can()`, `$hasRole()`) are **Data Binding functions**, not Expression Engine functions.

**Rationale:**
1. **Runtime context**: Permissions require the current user context, which is only available at UI runtime, not at kernel computation time
2. **No staleness**: Permission results don't participate in staleness propagation - they're re-evaluated on every render
3. **No dependencies**: Expression Engine extracts static dependencies; permissions are dynamic
4. **Security**: Kernel expressions run server-side with elevated privileges; permission checks are UI-layer authorization

**Implementation:**

Data Binding provides these UI-layer functions:
```typescript
// Available in Data Binding scope, NOT Expression Engine
$can(permission: string): boolean
$hasRole(role: string): boolean
$hasPermission(entityId: string, permission: string): boolean
```

**Usage:**
```yaml
# Data Binding context (views, wiring, showWhen)
showWhen: "$can('part.create')"
visible: "$hasRole('admin') || $part.status == 'draft'"

# NOT valid in Expression Engine context (computed properties, lifecycle)
# This would be an error:
computed:
  - name: can_edit
    expression: "$can('part.edit')"  # ERROR: $can is not defined
```

---

## 7. Scope Variables and `payload`

### Motivation

Instance 3 identified scope variables (`$params`, `$user`, `$payload`) as a gap.

### Decision: **Scope variables are Data Binding only**

The Expression Engine does NOT support scope variables. These are **Data Binding** constructs.

| Variable | System | Available In |
|----------|--------|--------------|
| `$params` | Data Binding | View props, showWhen |
| `$query` | Data Binding | View props, showWhen |
| `$user` | Data Binding | View props, showWhen, wiring |
| `$event` / `$payload` | Data Binding | Wiring transforms only |
| `$part` (fetched entity) | Data Binding | View props, showWhen |
| `@self` | Expression Engine | Computed properties, lifecycle |
| `#property` | Expression Engine | Computed properties, lifecycle |

### `payload` Specifically

The `payload` variable in wiring transforms is **Data Binding scope**, not Expression Engine:

```yaml
wiring:
  - from: table
    event: rowSelected
    transform:
      # $payload is the event payload - Data Binding scope
      expr: "{ path: '/parts/' + $payload.entityId }"
```

`$payload` is:
- An alias for `$event` in wiring context
- Contains the event payload emitted by the source block
- Only available in wiring transforms (not computed properties, not lifecycle conditions)
- Typed based on the source block's event schema

---

## 8. Response to Instance 3 Gap Analysis

### Summary of Positions

| Gap | Instance 3 Recommendation | Kernel Designer Position |
|-----|---------------------------|--------------------------|
| GAP-1: Scope variables | Add to Expression Engine | **Disagree** - Data Binding |
| GAP-2: Object literals | Add to Expression Engine | **Disagree** - Data Binding |
| GAP-3: String concat `+` | Add to Expression Engine | Use `CONCAT()` - already supported |
| GAP-4: Permission funcs | Add to Expression Engine | **Disagree** - Data Binding |
| GAP-5: Self-reference syntax | Align to `@self`/`#` | **Agree** - Product Config fix |
| GAP-6: Collection `.length` | Document `COUNT()` | **Agree** - use `COUNT()` |

### Key Disagreement: Two Systems vs One

Instance 3 proposes extending Expression Engine to cover all use cases.
Kernel Designer proposes maintaining **two separate systems**:

| Concern | Expression Engine | Data Binding |
|---------|-------------------|--------------|
| Purpose | Kernel computed values | UI rendering |
| Evaluated | Server (kernel) | Client (UI runtime) |
| Dependencies | Static, tracked | Dynamic, runtime |
| Staleness | Yes (propagated) | No (reactive) |
| Scope | Entity context only | View/event context |

**Why two systems is better:**

1. **Separation of concerns**: Kernel expressions are for data computation; UI expressions are for rendering
2. **Static analysis**: Expression Engine dependencies must be extractable at parse time for staleness propagation
3. **Security**: Kernel expressions run with elevated privileges; UI expressions run in user context
4. **Caching**: Kernel values are cached and invalidated; UI values are computed on demand
5. **Complexity**: Keeping Expression Engine focused makes it simpler to reason about

---

## Summary

| Feature | Status | System | Version |
|---------|--------|--------|---------|
| Collection filter `[* WHERE ...]` | Proposed | Expression Engine | V1.1 |
| MAP function | Deferred | Expression Engine | V2 |
| Query filter syntax | Proposed | Expression Engine | V1 |
| Template strings | Rejected | Data Binding | N/A |
| Object literals | Rejected | Data Binding | N/A |
| Permission functions | Rejected | Data Binding | N/A |
| Scope variables (`$x`) | Rejected | Data Binding | N/A |

---

## Version

Expression Engine Addendum v0.2.0 (Proposed)

**Changelog:**
- v0.2.0: Added sections 5-8 addressing Instance 3 gap analysis
- v0.1.0: Initial proposal with filter syntax and MAP function
