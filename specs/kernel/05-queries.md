# Trellis Kernel Query Patterns

## Overview

This document specifies efficient query patterns for common operations. Implementations MUST follow these patterns to ensure performance at scale.

## Index Strategy

### Primary Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| entities | `(tenant_id, type_path)` | Type queries |
| entities | `(tenant_id, created_at DESC)` | Recent entities |
| entities | `GIN (properties jsonb_path_ops)` | Property queries |
| relationships | `(from_entity, type)` | Outgoing relationships |
| relationships | `(to_entity, type)` | Incoming relationships |
| events | `(entity_id, occurred_at DESC)` | Entity history |

### JSONB Indexing

Properties are stored as JSONB. Use GIN indexes with `jsonb_path_ops` for containment queries:

```sql
-- Index for querying property values
CREATE INDEX idx_entities_properties ON entities
    USING GIN (properties jsonb_path_ops);

-- This enables efficient queries like:
SELECT * FROM entities
WHERE properties @> '{"name": {"value": {"value": "Widget"}}}'::jsonb;
```

For frequently-queried properties, create expression indexes:

```sql
-- Index on specific property value
CREATE INDEX idx_entities_name ON entities (
    (properties->'name'->'value'->>'value')
) WHERE properties ? 'name';

-- Index on numeric property for range queries
CREATE INDEX idx_entities_price ON entities (
    ((properties->'price'->'value'->>'value')::numeric)
) WHERE properties ? 'price';
```

---

## Query Patterns

### Pattern 1: List Entities by Type

**Use case:** "Show all products"

```sql
SELECT *
FROM entities
WHERE tenant_id = $1
  AND type_path <@ 'product'  -- ltree descendant match
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

**Index used:** `idx_entities_tenant_type`

**API equivalent:**
```typescript
await queryEntities(ctx, {
  type: 'product.*',
  limit: 50
});
```

---

### Pattern 2: Filter by Property Value

**Use case:** "Find products priced over $100"

```sql
SELECT *
FROM entities
WHERE tenant_id = $1
  AND type_path <@ 'product'
  AND deleted_at IS NULL
  AND (properties->'price'->'value'->>'value')::numeric > 100
ORDER BY (properties->'price'->'value'->>'value')::numeric DESC;
```

**Optimization:** Create expression index for frequently filtered properties.

**API equivalent:**
```typescript
await queryEntities(ctx, {
  type: 'product',
  filter: {
    logic: 'and',
    conditions: [
      { path: 'price.value.value', operator: 'gt', value: 100 }
    ]
  },
  sort: [{ path: 'price.value.value', direction: 'desc' }]
});
```

---

### Pattern 3: Text Search

**Use case:** "Search products containing 'widget'"

```sql
SELECT *
FROM entities
WHERE tenant_id = $1
  AND type_path <@ 'product'
  AND deleted_at IS NULL
  AND properties->'name'->'value'->>'value' ILIKE '%widget%'
ORDER BY created_at DESC;
```

**For better performance with pg_trgm:**

```sql
CREATE INDEX idx_entities_name_trgm ON entities
    USING GIN ((properties->'name'->'value'->>'value') gin_trgm_ops);

SELECT *
FROM entities
WHERE tenant_id = $1
  AND type_path <@ 'product'
  AND properties->'name'->'value'->>'value' % 'widget'  -- Similarity match
ORDER BY similarity(properties->'name'->'value'->>'value', 'widget') DESC;
```

---

### Pattern 4: Relationship Traversal

**Use case:** "Get all variants of a product"

```sql
SELECT e.*
FROM entities e
JOIN relationships r ON r.to_entity = e.id
WHERE r.tenant_id = $1
  AND r.from_entity = $2  -- Product ID
  AND r.type = 'has_variant'
  AND e.deleted_at IS NULL
ORDER BY r.created_at;
```

**Index used:** `idx_relationships_from_type`

**API equivalent:**
```typescript
await getRelationships(ctx, productId, {
  type: 'has_variant',
  direction: 'outgoing',
  include_entities: true
});
```

---

### Pattern 5: Recursive Relationship (Hierarchy)

**Use case:** "Get all ancestors of an entity"

```sql
WITH RECURSIVE ancestors AS (
    -- Base case: direct parent
    SELECT r.from_entity AS ancestor_id, 1 AS depth
    FROM relationships r
    WHERE r.to_entity = $1  -- Starting entity
      AND r.type = 'parent_of'
      AND r.tenant_id = $2

    UNION ALL

    -- Recursive case: grandparents and beyond
    SELECT r.from_entity, a.depth + 1
    FROM relationships r
    JOIN ancestors a ON r.to_entity = a.ancestor_id
    WHERE r.type = 'parent_of'
      AND r.tenant_id = $2
      AND a.depth < 10  -- Prevent infinite loops
)
SELECT e.*
FROM entities e
JOIN ancestors a ON e.id = a.ancestor_id
ORDER BY a.depth;
```

---

### Pattern 6: Multi-hop Relationships

**Use case:** "Find all products that depend on components from supplier X"

```sql
-- Products → Components → Suppliers
SELECT DISTINCT p.*
FROM entities p
JOIN relationships r1 ON r1.from_entity = p.id AND r1.type = 'uses_component'
JOIN entities c ON c.id = r1.to_entity
JOIN relationships r2 ON r2.from_entity = c.id AND r2.type = 'supplied_by'
JOIN entities s ON s.id = r2.to_entity
WHERE p.tenant_id = $1
  AND s.properties->'name'->'value'->>'value' = 'Supplier X'
  AND p.type_path <@ 'product'
  AND p.deleted_at IS NULL;
```

---

### Pattern 7: Entity with Related Counts

**Use case:** "List products with variant count"

```sql
SELECT
    e.*,
    COALESCE(rc.variant_count, 0) AS variant_count
FROM entities e
LEFT JOIN (
    SELECT from_entity, COUNT(*) AS variant_count
    FROM relationships
    WHERE type = 'has_variant'
      AND tenant_id = $1
    GROUP BY from_entity
) rc ON rc.from_entity = e.id
WHERE e.tenant_id = $1
  AND e.type_path = 'product'
  AND e.deleted_at IS NULL
ORDER BY variant_count DESC;
```

---

### Pattern 8: Temporal Query (Point in Time)

**Use case:** "What was the product's state last Tuesday?"

```sql
-- Reconstruct state by replaying events
WITH ordered_events AS (
    SELECT
        payload,
        event_type,
        occurred_at,
        ROW_NUMBER() OVER (ORDER BY occurred_at) AS event_order
    FROM events
    WHERE entity_id = $1
      AND occurred_at <= $2  -- Target timestamp
    ORDER BY occurred_at
)
SELECT * FROM ordered_events;

-- Implementation reconstructs state from event sequence
```

**Note:** For frequently-accessed historical states, consider snapshots.

---

### Pattern 9: Aggregate by Property

**Use case:** "Sum of prices by category"

```sql
SELECT
    properties->'category'->'value'->>'value' AS category,
    SUM((properties->'price'->'value'->>'value')::numeric) AS total_price,
    COUNT(*) AS count
FROM entities
WHERE tenant_id = $1
  AND type_path <@ 'product'
  AND deleted_at IS NULL
  AND properties ? 'category'
  AND properties ? 'price'
GROUP BY properties->'category'->'value'->>'value'
ORDER BY total_price DESC;
```

---

### Pattern 10: Exists Check (Efficiently)

**Use case:** "Does any product have this SKU?"

```sql
SELECT EXISTS (
    SELECT 1
    FROM entities
    WHERE tenant_id = $1
      AND type_path <@ 'product'
      AND deleted_at IS NULL
      AND properties->'sku'->'value'->>'value' = $2
    LIMIT 1
) AS exists;
```

---

## Performance Guidelines

### Do's

1. **Always include tenant_id** in WHERE clause (RLS + index)
2. **Use ltree operators** (`<@`, `@>`) for type hierarchy
3. **Create expression indexes** for frequently filtered properties
4. **Use LIMIT** even for existence checks
5. **Prefer joins over subqueries** for relationship traversal
6. **Use CTEs** for complex multi-step queries

### Don'ts

1. **Don't use `SELECT *`** in production - select needed columns
2. **Don't query without tenant_id** - breaks RLS assumptions
3. **Don't LIKE without leading %** - can't use index
4. **Don't aggregate without limits** on large tables
5. **Don't nest deep JSON path** queries - create computed columns

---

## Query Translation Reference

### Filter Operators → SQL

| Operator | SQL |
|----------|-----|
| `eq` | `= $value` |
| `neq` | `!= $value` |
| `gt` | `> $value` |
| `gte` | `>= $value` |
| `lt` | `< $value` |
| `lte` | `<= $value` |
| `in` | `= ANY($values)` |
| `nin` | `!= ALL($values)` |
| `contains` | `ILIKE '%' \|\| $value \|\| '%'` |
| `starts` | `ILIKE $value \|\| '%'` |
| `ends` | `ILIKE '%' \|\| $value` |
| `regex` | `~ $pattern` |
| `exists` | `properties ? $name` |
| `type_is` | `type_path <@ $type` |

### Property Path → JSON Path

```typescript
// API path: "name.value"
// SQL: properties->'name'->'value'

// API path: "metadata.tags[0]"
// SQL: properties->'metadata'->'tags'->0

// API path: "price.value.value" (for NumberValue)
// SQL: properties->'price'->'value'->>'value'
```

---

## Caching Strategy

### Computed Property Cache

Computed properties are cached in `computed_cache` table:

```sql
-- Check cache first
SELECT cached_value
FROM computed_cache
WHERE entity_id = $1
  AND property_name = $2
  AND valid = TRUE;

-- If miss, compute and cache
INSERT INTO computed_cache (entity_id, property_name, cached_value, dependencies)
VALUES ($1, $2, $3, $4)
ON CONFLICT (entity_id, property_name)
DO UPDATE SET cached_value = $3, computed_at = NOW(), valid = TRUE;
```

### Cache Invalidation

Triggered by entity property updates:

```sql
-- Invalidate cache when dependencies change
UPDATE computed_cache
SET valid = FALSE
WHERE dependencies && ARRAY[$changed_properties];
```

---

## Pagination

### Offset-based (Simple)

```sql
SELECT * FROM entities
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET 100;
```

**Pros:** Simple, supports random access
**Cons:** Slow for deep pages, inconsistent with concurrent writes

### Cursor-based (Recommended)

```sql
SELECT * FROM entities
WHERE tenant_id = $1
  AND (created_at, id) < ($cursor_time, $cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

**Pros:** Consistent, fast for any depth
**Cons:** No random access

**Cursor encoding:**
```typescript
interface Cursor {
  created_at: string;
  id: EntityId;
}

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

function decodeCursor(s: string): Cursor {
  return JSON.parse(Buffer.from(s, 'base64url').toString());
}
```

---

## Monitoring Queries

### Slow Query Detection

```sql
-- PostgreSQL: enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 100;  -- 100ms

-- Find slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
WHERE mean_time > 100  -- ms
ORDER BY total_time DESC
LIMIT 20;
```

### Index Usage

```sql
-- Check if indexes are being used
SELECT
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```
