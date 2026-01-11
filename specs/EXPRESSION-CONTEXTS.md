# Trellis Expression Contexts

## Overview

Trellis uses **two distinct expression systems** for different purposes:

| System | Context | Evaluated | Purpose |
|--------|---------|-----------|---------|
| **Expression Engine** | Kernel | Server | Computed properties, staleness, dependencies |
| **Data Binding** | UI | Client | View props, conditions, wiring transforms |

This separation is intentional:
- **Expression Engine** expressions are deterministic, have static dependencies, and drive the staleness propagation system
- **Data Binding** expressions are reactive, reference runtime scope, and drive UI updates

---

## 1. Expression Engine (Kernel Context)

### When to Use
- Entity computed properties (`computed:` section)
- Lifecycle transition conditions (`when:` in transitions)
- Server-side filters (query `filter:` when processed by kernel)
- Anywhere dependencies must be tracked for staleness

### Syntax Reference

| Feature | Syntax | Example |
|---------|--------|---------|
| Self property | `@self.property` | `@self.unit_cost` |
| Self shorthand | `#property` | `#quantity` |
| Entity by ID | `@{uuid}.property` | `@{019...}.base_rate` |
| Relationship (one) | `@self.rel.property` | `@self.supplier.name` |
| Relationship (many) | `@self.rel[*].property` | `@self.children[*].cost` |
| Aggregation | `FUNC(list)` | `SUM(@self.items[*].price)` |
| Conditional | `IF(cond, then, else)` | `IF(#qty > 10, #bulk, #unit)` |
| Null handling | `COALESCE(a, b, ...)` | `COALESCE(#override, #default, 0)` |

### Built-in Functions

**Aggregation:** `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`
**Conditional:** `IF`, `COALESCE`
**Math:** `ROUND`, `FLOOR`, `CEIL`, `ABS`, `POW`
**String:** `CONCAT`, `UPPER`, `LOWER`, `LENGTH`, `SUBSTRING`
**Date:** `NOW`, `DATE_DIFF`, `DATE_ADD`

### Example: Computed Property

```yaml
# entities/part.yaml
computed:
  - name: extended_cost
    expression: "#unit_cost * #quantity"
    dimension: currency
    unit: USD

  - name: total_bom_cost
    expression: "SUM(@self.bom_children[*].extended_cost)"
    dimension: currency
    unit: USD
```

### Example: Lifecycle Condition

```yaml
# entities/part.yaml
lifecycle:
  transitions:
    - from: in_review
      to: released
      action: approve
      when: "@self.unit_cost != null && @self.material != null"
```

### Specification
See: [specs/kernel/06-expressions.md](kernel/06-expressions.md)

---

## 2. Data Binding (UI Context)

### When to Use
- Block props (binding view data to block inputs)
- `showWhen` conditions (conditional visibility)
- Wiring transforms (event payload transformation)
- Template strings (titles, messages)
- Badge values (computed display values)

### Syntax Reference

| Feature | Syntax | Example |
|---------|--------|---------|
| Scope variable | `$scope.property` | `$part.name` |
| Route params | `$params.x` | `$params.entityId` |
| Query params | `$query.x` | `$query.tab` |
| Current user | `$user.x` | `$user.role` |
| Event payload | `$event.x` | `$event.tab` |
| Wiring payload | `$payload.x` | `$payload.entityId` |
| Permission check | `$can('perm')` | `$can('part.create')` |
| Template string | `"${expr}"` | `"${part.name}"` |
| Object literal | `{ key: expr }` | `{ path: '/parts/' + $payload.id }` |

### Scope Variables

Data Binding has access to **view scope** - variables populated by the view's data configuration:

```yaml
# views/part-detail.yaml
data:
  params:
    entityId:
      type: entityId
      entityType: part
      fetch: true
      as: part          # Creates $part in scope

  query:
    tab:
      type: string
      default: details  # Creates $query.tab in scope
```

Available scope variables:
- **`$params`**: Route parameters
- **`$query`**: Query string parameters
- **`$<as>`**: Fetched entities (e.g., `$part` when `as: part`)
- **`$user`**: Current authenticated user
- **`$route`**: Current route info
- **`$event`**: Event payload (in event handlers)
- **`$payload`**: Same as `$event` (in wiring)

### Example: Block Props

```yaml
layout:
  type: single
  block:
    type: trellis.page-header
    props:
      title: $part.name
      subtitle: $part.part_number
      status: $part.status
```

### Example: Conditional Display

```yaml
- type: trellis.button
  props:
    label: Edit
    icon: pencil
  showWhen: $part.status == "draft"
```

### Example: Wiring Transform

```yaml
wiring:
  - from: parts-table
    event: rowSelected
    to: $navigate
    receiver: push
    transform:
      kind: expression
      expr: "{ path: '/parts/' + $payload.entityId }"
```

### Example: Template String

```yaml
meta:
  title: "${part.part_number} - ${part.name}"
```

---

## Key Differences

| Aspect | Expression Engine | Data Binding |
|--------|-------------------|--------------|
| **Prefix** | `@self`, `@{id}`, `#` | `$scope` |
| **Deterministic** | Yes | No (reactive) |
| **Static deps** | Yes (extracted at parse) | No (runtime) |
| **Functions** | `SUM()`, `IF()`, etc. | `$can()`, `$setQuery()` |
| **Object literals** | No | Yes |
| **Template strings** | No | Yes |
| **Evaluated** | Server (kernel) | Client (UI) |

---

## Migration Guide

### From Product Config (Old) to Correct Syntax

#### Computed Properties

**Before (incorrect):**
```yaml
expression: "self.unit_cost * self.quantity"
```

**After (correct - Expression Engine):**
```yaml
expression: "#unit_cost * #quantity"
# or
expression: "@self.unit_cost * @self.quantity"
```

#### Lifecycle Conditions

**Before (incorrect):**
```yaml
when: "self.material != null"
```

**After (correct - Expression Engine):**
```yaml
when: "@self.material != null"
```

#### Data Binding (Already Correct)

Data binding syntax with `$` prefix is correct and should not change:
```yaml
props:
  title: $part.name
  showWhen: $part.status == "draft"
```

---

## When to Use Which

```
Is this a kernel-level calculation that should:
├── Track dependencies for staleness? → Expression Engine
├── Be computed server-side? → Expression Engine
├── Reference other entities? → Expression Engine
└── Drive computed properties? → Expression Engine

Is this a UI-level binding that should:
├── React to view state changes? → Data Binding
├── Reference route/query params? → Data Binding
├── Control visibility? → Data Binding
├── Transform event payloads? → Data Binding
└── Build UI strings? → Data Binding
```

---

## Future Considerations

1. **Server-side filters**: Currently ambiguous. If filters are processed by kernel (for queries), they should use Expression Engine syntax with `@self`. If processed client-side, Data Binding.

2. **Validation expressions**: Custom validators (`validation.custom`) are kernel-level and should use Expression Engine syntax.

3. **Index conditions**: Partial index `where` clauses are database-level and should use a SQL-like syntax (neither system).
