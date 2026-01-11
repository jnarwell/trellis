# Trellis Expression Systems

**Status:** Authoritative Reference
**Date:** 2026-01-10

---

## Two Systems, Two Purposes

| System | Purpose | Runs On | Dependencies |
|--------|---------|---------|--------------|
| **Expression Engine** | Computed entity values | Server (Kernel) | Static, tracked |
| **Data Binding** | UI rendering & interaction | Client (Browser) | Dynamic, reactive |

---

## Expression Engine

**Use for:** Computed properties, lifecycle conditions, entity query filters

**Syntax:**
```
@self.property          # Current entity
#property               # Shorthand for @self
@{uuid}.property        # Specific entity
@self.rel[*].property   # Relationship traversal
SUM(), IF(), CONCAT()   # Built-in functions
```

**Characteristics:**
- Dependencies extracted at parse time
- Participates in staleness propagation
- Values cached in `computed_cache`
- Evaluated server-side with kernel privileges

**NOT supported:** `$scope`, `$can()`, `{ objects }`, `"${templates}"`

---

## Data Binding

**Use for:** View props, showWhen, wiring transforms, templates

**Syntax:**
```
$part.name              # Scope variable
$params.entityId        # Route params
$can('permission')      # Permission check
{ path: $event.id }     # Object literal
"${x} - ${y}"           # Template string
```

**Characteristics:**
- Evaluated at UI render time
- Reactive to scope changes
- No staleness propagation
- Runs in user's browser context

**NOT supported:** `@self`, relationship traversal, aggregation functions

---

## Quick Reference

| I need to... | Use | Example |
|--------------|-----|---------|
| Compute entity total | Expression Engine | `SUM(@self.items[*].price)` |
| Show/hide button | Data Binding | `$part.status == 'draft'` |
| Check permission | Data Binding | `$can('part.edit')` |
| Build nav params | Data Binding | `{ path: '/x/' + $event.id }` |
| Gate lifecycle | Expression Engine | `@self.cost != null` |
| Display user name | Data Binding | `$user.name` |

---

## The Rule

**If it affects stored entity data → Expression Engine**
**If it affects UI display/behavior → Data Binding**
