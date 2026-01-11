# Product Config Expression Fixes

## Summary

The Product Config spec contains **kernel-level expressions** that do not conform to the Expression Engine syntax. This document lists all required corrections.

**Impact:** 11 expression instances need correction
**Files affected:** `product-config-spec.md`

---

## Required Changes

### 1. Computed Property: total_cost (Line 692-694)

**Current:**
```yaml
- name: total_cost
  expression: "self.unit_cost * self.quantity"
```

**Corrected:**
```yaml
- name: total_cost
  expression: "#unit_cost * #quantity"
```

**Rationale:** `self.` prefix is not valid Expression Engine syntax. Use `#` shorthand for same-entity properties.

---

### 2. Computed Property: volume (Line 696-700)

**Current:**
```yaml
- name: volume
  expression: "self.specifications.length * self.specifications.width * self.specifications.height"
```

**Corrected:**
```yaml
- name: volume
  expression: "@self.specifications.length * @self.specifications.width * @self.specifications.height"
```

**Rationale:** Nested property access requires `@self.` prefix.

---

### 3. Lifecycle Condition: approve (Line 748)

**Current:**
```yaml
when: "self.unit_cost != null && self.material != null"
```

**Corrected:**
```yaml
when: "@self.unit_cost != null && @self.material != null"
```

---

### 4. Event Payload (Line 766-767)

**Current:**
```yaml
payload:
  partId: $entity.id
  partNumber: $entity.part_number
```

**Note:** This is UI context (event emission), so `$entity` is correct Data Binding syntax. **No change needed** - this is wiring, not kernel.

---

### 5. Computed Property: total_bom_cost (Line 2597-2600)

**Current:**
```yaml
- name: total_bom_cost
  expression: "sum(children.unit_cost * children.quantity)"
```

**Corrected:**
```yaml
- name: total_bom_cost
  expression: "SUM(@self.bom_children[*].extended_cost)"
```

**Rationale:**
1. Function names are uppercase: `SUM` not `sum`
2. Relationship traversal requires explicit type: `bom_children` not `children`
3. Collection access requires `[*]` notation
4. Inline multiplication in aggregation not supported - requires `extended_cost` computed on children

**Alternative (if inline calc needed):** See Expression Engine Addendum for proposed `MAP` function.

---

### 6. Lifecycle Condition: approve (Line 2637)

**Current:**
```yaml
when: "self.material != null"
```

**Corrected:**
```yaml
when: "@self.material != null"
```

---

### 7. Computed Property: part_count (Line 2690-2692)

**Current:**
```yaml
- name: part_count
  expression: "count(descendants[type == 'part'])"
```

**Corrected:**
```yaml
- name: part_count
  expression: "COUNT(@self.bom_descendants[* WHERE @.type == 'part'])"
```

**Rationale:**
1. Function names uppercase: `COUNT` not `count`
2. Explicit relationship type: `bom_descendants`
3. Filter syntax: `[* WHERE condition]` (requires Expression Engine Addendum)

**Note:** If filter syntax not added to Expression Engine, this requires a different approach - possibly a dedicated relationship for parts only.

---

### 8. Computed Property: total_weight (Line 2694-2698)

**Current:**
```yaml
- name: total_weight
  expression: "sum(children.weight * children.quantity)"
```

**Corrected:**
```yaml
- name: total_weight
  expression: "SUM(@self.bom_children[*].weighted_mass)"
```

**Rationale:** Same as total_bom_cost - requires `weighted_mass` computed on children (= weight * quantity).

---

## Filter Expression Clarifications

The following filter expressions need context clarification:

### Navigation Badge Filters (Lines 1591, 1629, 2893)

**Current:**
```yaml
filter: "status == 'draft'"
filter: "status == 'pending_review'"
filter: "status == 'in_review'"
```

**Question:** Where are these evaluated?
- If **kernel** (server-side query): Should be `@self.status == 'draft'`
- If **UI** (client-side filter): Current syntax acceptable

**Recommendation:** These are query filters sent to the kernel, so they should use Expression Engine syntax. However, since they filter a collection (not reference current entity), the `@self` prefix may not apply. Need to define **filter context** in Expression Engine.

**Proposed:**
```yaml
filter: "#status == 'draft'"  # Implicit current-row context
```

---

### View Query Filters (Lines 1125, 1283)

**Current:**
```yaml
filter: "relationships.parent == $params.entityId"
filter: "category == $part.category && id != $part.id"
```

**Issue:** Mixes kernel property syntax with UI scope (`$params`, `$part`).

**Recommendation:** View query filters should:
1. Use `#property` for the entity being filtered
2. Use `{{param}}` for parameter interpolation (at query build time)

**Corrected:**
```yaml
filter: "#parent == {{params.entityId}}"
filter: "#category == {{part.category}} && #id != {{part.id}}"
```

---

## Summary Table

| Location | Type | Old Syntax | New Syntax | Status |
|----------|------|-----------|-----------|--------|
| L692 | Computed | `self.x` | `#x` | Fix |
| L698 | Computed | `self.x.y` | `@self.x.y` | Fix |
| L748 | Lifecycle | `self.x` | `@self.x` | Fix |
| L766 | Event Payload | `$entity.x` | `$entity.x` | OK (UI) |
| L2599 | Computed | `sum(children.x)` | `SUM(@self.rel[*].x)` | Fix |
| L2637 | Lifecycle | `self.x` | `@self.x` | Fix |
| L2691 | Computed | `count(desc[filter])` | Needs addendum | Fix |
| L2696 | Computed | `sum(children.x*y)` | `SUM(@self.rel[*].z)` | Fix |
| L1591 | Filter | `status == x` | TBD | Clarify |
| L1125 | Filter | Mixed | TBD | Clarify |

---

## Implementation Steps

1. **Update product-config-spec.md** with corrected expressions (8 fixes)
2. **Add filter context documentation** to Expression Engine spec
3. **Review filter expressions** to determine if kernel or UI context
4. **Consider Expression Engine Addendum** for filter syntax if needed
