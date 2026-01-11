# Trellis Expression Quick Reference

**For:** Product Config Authors & Block Implementers
**Version:** 1.0 (Two-Systems Model)

---

## Two Expression Systems

Trellis uses **two distinct expression systems** for different purposes:

| System | Purpose | Used In |
|--------|---------|---------|
| **Expression Engine** | Entity computations | Computed properties, lifecycle `when`, entity query filters |
| **Data Binding** | UI scope access | Block props, `showWhen`, wiring transforms, template strings |

---

## Expression Engine (Kernel)

Used in: `computed.expression`, `lifecycle.when`, `badge.query.filter`

### Self Property Access
```
@self.property_name     # Full syntax
#property_name          # Shorthand (same as @self.property_name)

# Examples
@self.unit_cost         # Access unit_cost property
#name                   # Shorthand for @self.name
#status == 'draft'      # Comparison
```

### Specific Entity by ID
```
@{entity-uuid}.property_name

# Example
@{550e8400-e29b-41d4-a716-446655440000}.status
```

### Relationship Traversal
```
@self.relationship_type.property         # To-one relationship
@self.relationship_type[*].property      # To-many (all related)
@self.relationship_type[0].property      # First related entity
@self.relationship_type[-1].property     # Last related entity

# Examples
@self.supplier.name                      # Parent's name (to-one)
@self.bom_children[*].unit_cost          # All child costs (to-many)
@self.bom_children[0].part_number        # First child's part number
```

### Aggregation Functions (UPPERCASE)
```
SUM(@self.relationship[*].property)
AVG(@self.relationship[*].property)
MIN(@self.relationship[*].property)
MAX(@self.relationship[*].property)
COUNT(@self.relationship[*])

# Examples
SUM(@self.bom_children[*].extended_cost)
COUNT(@self.documents[*])
AVG(@self.test_results[*].value)
```

### Conditional & Null Handling
```
IF(condition, then_value, else_value)
COALESCE(value1, value2, ...)

# Examples
IF(#status == 'active', 'Yes', 'No')
COALESCE(#override_cost, #unit_cost, 0)
```

### String Functions
```
CONCAT(str1, str2, ...)    # Concatenate (NOT +)
UPPER(str)
LOWER(str)
SUBSTRING(str, start, len)
TRIM(str)
LENGTH(str)

# Example
CONCAT(#part_number, ' - ', #name)
```

### Math Functions
```
ROUND(num, decimals?)
ABS(num)
FLOOR(num)
CEIL(num)
SQRT(num)
```

### Date Functions
```
NOW()
DATE_DIFF(date1, date2, unit)
DATE_ADD(date, amount, unit)

# Example
DATE_DIFF(NOW(), #created_at, 'days')
```

### Operators
```
# Comparison
==, !=, <, <=, >, >=

# Logical
&&, ||, !

# Arithmetic
+, -, *, /, %, ^

# Example
@self.unit_cost != null && @self.material != null
#unit_cost * #quantity
```

---

## Data Binding (UI)

Used in: block `props`, `showWhen`, `visible`, wiring `transform`, template strings

### Scope Access
```
$part.name              # Fetched entity property
$params.entityId        # Route parameter
$query.status           # Query string parameter
$user.id                # Current user
$user.role              # Current user's role
$tenant.id              # Current tenant

# Examples in YAML
props:
  title: $part.name
  entityId: $params.entityId
```

### Permission Checks
```
$can('permission.name')    # Returns boolean

# Examples
$can('part.create')
$can('part.delete')
$can('admin.access')
```

### Template Strings
```
"${scope.property}"        # String interpolation

# Examples
title: "${part.part_number} - ${part.name}"
subtitle: "Revision ${part.revision}"
```

### Event Payload (in wiring)
```
$event.entityId            # Event payload property
$event.entityType
$payload.entityId          # Alias for $event

# Example in wiring transform
transform:
  kind: expression
  expr: "{ path: '/parts/' + $event.entityId }"
```

### Object Literals (in transforms)
```
{ key: value, key2: value2 }

# Example
transform:
  kind: expression
  expr: "{ path: '/parts/' + $payload.entityId }"
```

### String Concatenation
```
'string1' + 'string2'      # Allowed in Data Binding (not Expression Engine)

# Example
targetView: $payload.entityType + "-detail"
```

---

## When to Use Which

| Context | System | Example |
|---------|--------|---------|
| `computed.expression` | Expression Engine | `#qty * #unit_cost` |
| `lifecycle.when` | Expression Engine | `@self.status == 'draft'` |
| `badge.query.filter` | Expression Engine | `#status == 'in_review'` |
| `props.title` | Data Binding | `$part.name` |
| `props.entityId` | Data Binding | `$params.entityId` |
| `showWhen` | Data Binding | `$can('edit')` |
| `visible` | Data Binding | `$user.role == 'admin'` |
| `wiring.transform` | Data Binding | `{ path: '/parts/' + $event.id }` |
| Template strings | Data Binding | `"${part.part_number}"` |

---

## Common Patterns

### Computed Total Cost (Expression Engine)
```yaml
computed:
  - name: total_cost
    label: Total Cost
    expression: "#unit_cost * #quantity"
```

### BOM Rollup (Expression Engine)
```yaml
computed:
  - name: extended_cost
    label: Extended Cost
    expression: "SUM(@self.bom_children[*].extended_cost) + #unit_cost"
```

### Lifecycle Guard (Expression Engine)
```yaml
transitions:
  - from: draft
    to: in_review
    when: "@self.unit_cost != null && @self.material != null"
```

### Badge Count Filter (Expression Engine)
```yaml
badge:
  type: count
  query:
    entityType: part
    filter: "#status == 'in_review'"
```

### View Title (Data Binding)
```yaml
props:
  title: $part.name
  subtitle: "${part.part_number} - Rev ${part.revision}"
```

### Conditional Visibility (Data Binding)
```yaml
showWhen: "$part.status == 'draft'"
visible: "$can('part.edit')"
```

### Navigation Wiring (Data Binding)
```yaml
wiring:
  - from: parts-table
    event: rowSelected
    to: $navigate
    transform:
      kind: expression
      expr: "{ path: '/parts/' + $payload.entityId }"
```

---

## Syntax Comparison

| Feature | Expression Engine | Data Binding |
|---------|------------------|--------------|
| Self property | `@self.x` or `#x` | N/A |
| Scope access | N/A | `$scope.x` |
| String concat | `CONCAT(a, b)` | `a + b` |
| Aggregation | `SUM()`, `COUNT()` | N/A |
| Permission | N/A | `$can('x')` |
| Object literal | N/A | `{ key: value }` |
| Template | N/A | `${scope.x}` |
| Null check | `@self.x != null` | `$scope.x != null` |

---

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Unknown identifier 'self'` | Missing `@` prefix | Use `@self.prop` or `#prop` |
| `Unknown function 'sum'` | Lowercase function | Use `SUM()` uppercase |
| `Invalid token '$'` in computed | Used Data Binding in kernel | Use `@self.x` or `#x` |
| `Unknown scope 'part'` | Scope not defined in view | Check `data.params` has `as: part` |

---

## References

- [Expression Engine Spec](../kernel/06-expressions.md) - Full grammar and semantics
- [Product Config Spec](./product-config-spec.md) - Configuration format
- [Expression Gaps](./EXPRESSION-GAPS.md) - Gap analysis and resolutions
