# ADR-005: Expressions with Dependency Tracking and Staleness Propagation

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team

## Context

Trellis supports computed properties via expressions (e.g., `total_cost = #material_cost + #labor_cost`). When a dependency changes, computed values become stale. We need to:
- Track which properties depend on which
- Propagate staleness efficiently
- Recalculate values on demand or eagerly
- Detect circular dependencies
- Support cross-entity references

## Decision Drivers

- Real-time feedback on data changes
- Avoid recalculating entire dependency graph on every change
- Clear visibility into stale vs. valid values
- Handle circular references gracefully
- Scale to thousands of interconnected properties

## Considered Options

1. **Staleness propagation with lazy evaluation** - Mark stale, recalc on read
2. **Eager recalculation** - Recalc immediately on any change
3. **Scheduled batch recalculation** - Periodic recalc jobs
4. **Event-sourced calculation log** - Store all calculations

## Decision

We will use **staleness propagation with lazy evaluation and optional eager recalculation**:

### Computation Status

```typescript
type ComputationStatus = 'pending' | 'valid' | 'stale' | 'error' | 'circular';
```

- **pending**: Never calculated
- **valid**: Calculated and up-to-date
- **stale**: Dependencies changed, needs recalculation
- **error**: Last calculation failed
- **circular**: Circular dependency detected

### Dependency Graph

```sql
CREATE TABLE property_dependencies (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,

  -- The property that has the expression
  dependent_entity_id UUID NOT NULL REFERENCES entities(id),
  dependent_property_name TEXT NOT NULL,

  -- The property being referenced
  source_entity_id UUID NOT NULL REFERENCES entities(id),
  source_property_name TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deps_source ON property_dependencies (source_entity_id, source_property_name);
CREATE INDEX idx_deps_dependent ON property_dependencies (dependent_entity_id, dependent_property_name);
```

### Staleness Propagation Algorithm

When a property value changes:
1. Find all properties that depend on it (direct dependents)
2. Mark those properties as `stale`
3. Recursively find dependents of dependents
4. Mark all as `stale` (BFS/DFS traversal)
5. Emit `property.stale` events for real-time UI updates

### Consequences

**Positive:**
- Minimal work on write (just propagate staleness)
- Recalculation can be batched or prioritized
- UI can show stale indicators immediately
- Circular dependencies detected and reported
- Cross-entity dependencies fully supported

**Negative:**
- May have many stale values at any time
- Recalculation timing can be confusing to users
- Dependency graph can grow large

**Neutral:**
- Products can configure eager vs. lazy recalculation
- Bulk operations can defer staleness propagation

## Implementation Notes

**Expression syntax:**
```
#property_name              - Same entity property
#entity_code.property_name  - Other entity by code
@entity_id.property_name    - Other entity by ID (internal)
```

**Circular detection:**
```typescript
function detectCircular(
  entityId: string,
  propertyName: string,
  visited: Set<string> = new Set()
): boolean {
  const key = `${entityId}.${propertyName}`;
  if (visited.has(key)) return true;
  visited.add(key);

  const deps = getDependencies(entityId, propertyName);
  for (const dep of deps) {
    if (detectCircular(dep.entityId, dep.propertyName, visited)) {
      return true;
    }
  }
  return false;
}
```

**Staleness propagation:**
```typescript
async function propagateStaleness(
  entityId: string,
  propertyName: string
): Promise<void> {
  const queue = [{ entityId, propertyName }];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.entityId}.${current.propertyName}`;
    if (processed.has(key)) continue;
    processed.add(key);

    await markPropertyStale(current.entityId, current.propertyName);

    const dependents = await getDependents(current.entityId, current.propertyName);
    queue.push(...dependents);
  }

  // Emit events for all stale properties
  await emitStaleEvents(processed);
}
```

## References

- [ADR-002: Entity Properties via JSONB](./002-entity-properties-jsonb.md)
- [ADR-004: Dimensional Properties](./004-dimensional-properties.md)
