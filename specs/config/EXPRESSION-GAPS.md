# Expression Engine Gap Analysis

**Date:** 2026-01-10 (Updated)
**Reviewer:** Block System Designer
**Specs Compared:**
- `/specs/config/product-config-spec.md` (Product Configuration)
- `/specs/kernel/06-expressions.md` (Expression Engine)

---

## Executive Summary

**UPDATED:** The original analysis incorrectly assumed a single expression system. Trellis uses **two distinct systems**:

| System | Purpose | Used In |
|--------|---------|---------|
| **Expression Engine** | Entity computations | Computed properties, lifecycle `when`, entity query filters |
| **Data Binding** | UI scope access | Block props, `showWhen`, wiring transforms, template strings |

This clarification resolves most gaps. The Expression Engine does NOT need scope variables (`$params`, `$user`) because those belong to Data Binding.

**Updated Verdict:** 8 of 8 use cases now have clear resolution paths.

---

## Gap Resolution Status

| Gap | Original Status | New Status | Resolution |
|-----|-----------------|------------|------------|
| GAP-1 | CRITICAL | ✅ RESOLVED | Scope variables are Data Binding, not Expression Engine |
| GAP-2 | HIGH | ✅ RESOLVED | Object literals are Data Binding syntax |
| GAP-3 | MEDIUM | ✅ RESOLVED | Use `CONCAT()` in Expression Engine, `+` in Data Binding |
| GAP-4 | HIGH | ✅ RESOLVED | Permission functions (`$can()`) are Data Binding |
| GAP-5 | MEDIUM | ✅ RESOLVED | Fixed in Product Config spec (now uses `@self.x` / `#x`) |
| GAP-6 | LOW | ✅ RESOLVED | Use `COUNT()` in Expression Engine, `.length` in Data Binding |

---

## Updated Gap Analysis Table

| # | Use Case | System | Correct Syntax | Status |
|---|----------|--------|----------------|--------|
| 1 | Lifecycle conditions | Expression Engine | `@self.unit_cost != null` | ✅ Fixed in spec |
| 2 | Badge filters | Expression Engine | `#status == 'in_review'` | ✅ Fixed in spec |
| 3 | View data bindings | Data Binding | `$part.name` | ✅ Correct system |
| 4 | Query parameters | Data Binding | `$params.entityId` | ✅ Correct system |
| 5 | Object transforms | Data Binding | `{ path: '/x/' + $event.id }` | ✅ Correct system |
| 6 | Permission checks | Data Binding | `$can('part.create')` | ✅ Correct system |
| 7 | Collection length | Both | `COUNT(@self.x[*])` or `$children.length` | ✅ Documented |
| 8 | Aggregations | Expression Engine | `SUM(@self.bom[*].cost)` | ✅ Fixed in spec |

---

## Fixes Applied to Product Config Spec

### Expression Engine Syntax Fixes

| Line | Before | After |
|------|--------|-------|
| 692 | `self.unit_cost * self.quantity` | `#unit_cost * #quantity` |
| 698 | `self.specifications.length * ...` | `@self.specifications.length * ...` |
| 748 | `self.unit_cost != null` | `@self.unit_cost != null` |
| 1591 | `status == 'draft'` | `#status == 'draft'` |
| 1629 | `status == 'pending_review'` | `#status == 'pending_review'` |
| 2599 | `sum(children.unit_cost * ...)` | `SUM(@self.bom_children[*].extended_cost)` |
| 2637 | `self.material != null` | `@self.material != null` |
| 2692 | `count(descendants[...])` | `COUNT(@self.descendants[*])` |
| 2696 | `sum(children.weight * ...)` | `SUM(@self.bom_children[*].weight)` |
| 2894 | `status == 'in_review'` | `#status == 'in_review'` |

---

## Two-Systems Architecture

### Expression Engine (Kernel)

**Used in:**
- `computed.expression` - Computed property formulas
- `lifecycle.when` - Transition guard conditions
- `badge.query.filter` - Entity query filters

**Syntax:**
```
@self.property           # Current entity property
#property                # Shorthand for @self.property
@{uuid}.property         # Specific entity by ID
@self.relation[*].prop   # Relationship traversal
SUM(), COUNT(), AVG()    # Aggregation (UPPERCASE)
CONCAT(), IF()           # Functions (UPPERCASE)
```

**Cannot use:** `$scope`, `$params`, `$user`, `$can()`, object literals, `+` for strings

### Data Binding (UI)

**Used in:**
- Block `props` values
- `showWhen`, `visible` conditions
- Wiring `transform` expressions
- Template strings `"${...}"`

**Syntax:**
```
$part.name               # Fetched entity scope
$params.entityId         # Route parameters
$query.status            # Query string
$user.role               # Current user
$can('permission')       # Permission check
{ key: value }           # Object literals
'a' + 'b'                # String concatenation
"${scope.prop}"          # Template interpolation
```

**Cannot use:** `@self`, `#prop`, `SUM()`, `COUNT()`

---

## Remaining Considerations

### Data Binding Specification

The Data Binding system needs formal specification covering:
- [ ] Full grammar for scope references
- [ ] Template string interpolation rules
- [ ] Object literal construction
- [ ] Permission function signatures
- [ ] Type coercion rules for `+` operator

### Filtered Aggregations

The Expression Engine spec should clarify filtered aggregations:
```
# Current: COUNT(@self.descendants[*]) counts all
# Needed: COUNT with filter for specific types
# Possible syntax: COUNT(@self.descendants[* WHERE #type == 'part'])
```

This is tracked separately as a potential Expression Engine enhancement.

---

## Verification Checklist

- [x] Lifecycle `when:` expressions use `@self.x` syntax
- [x] Navigation badge filters use `#prop` syntax
- [x] Aggregations use uppercase functions (`SUM`, `COUNT`)
- [x] View data bindings use `$scope.x` syntax
- [x] Wiring transforms can construct objects
- [x] Permission checks use `$can('x')` syntax
- [x] Quick reference documents both systems
- [x] Product Config spec examples corrected

---

## References

- [Expression Quick Reference](./EXPRESSION-QUICK-REF.md) - Two-systems syntax guide
- [Expression Engine Spec](../kernel/06-expressions.md) - Kernel expression grammar
- [Product Config Spec](./product-config-spec.md) - Updated configuration format
