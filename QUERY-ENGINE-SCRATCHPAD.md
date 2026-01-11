# Query Engine Scratchpad

**STATUS:** ✅ Implementation Complete

**Instance:** 13 - Query Engine
**Phase:** 2.3

---

## Files Read

| File | Key Takeaways |
|------|---------------|
| `specs/kernel/05-queries.md` | 10 query patterns, filter→SQL mapping, JSONB indexing, offset + cursor pagination, cursor encoding |
| `specs/kernel/01-types.ts` | FilterOperator (14), FilterCondition, FilterGroup, SortSpec, EntityQuery, QueryResult |
| `packages/kernel/src/types/query.js` | Types exported from kernel: FilterOperator, FilterCondition, FilterGroup, SortSpec, EntityQuery, QueryResult |
| `packages/server/src/app.ts` | Fastify app factory, middleware chain, `app.pg` for pool access |
| `packages/server/src/db/client.ts` | `withTenantClient`, `withTenantTransaction`, `TenantScopedClient` |
| `packages/server/src/types/fastify.d.ts` | `request.auth.tenantId`, `request.auth.actorId`, `app.pg` |
| `SERVER-SETUP-SCRATCHPAD.md` | Instance 10 complete, all middleware + DB client ready |

---

## Filter Operators to Implement

| Operator | SQL Equivalent | Notes |
|----------|----------------|-------|
| `eq` | `= $1` | Direct equality |
| `neq` | `!= $1` | Not equals |
| `gt` | `> $1` | Greater than |
| `gte` | `>= $1` | Greater than or equal |
| `lt` | `< $1` | Less than |
| `lte` | `<= $1` | Less than or equal |
| `in` | `= ANY($1)` | Value in array |
| `nin` | `!= ALL($1)` | Value not in array |
| `contains` | `ILIKE '%' \|\| $1 \|\| '%'` | Case-insensitive substring |
| `starts` | `ILIKE $1 \|\| '%'` | Case-insensitive prefix |
| `ends` | `ILIKE '%' \|\| $1` | Case-insensitive suffix |
| `regex` | `~ $1` | PostgreSQL regex match |
| `exists` | `properties ? $1` | JSONB key exists |
| `type_is` | `type_path <@ $1` | ltree descendant match |

**Total: 14 operators**

---

## CRITICAL: Property Path Translation

Properties are stored in a nested JSONB structure. The path translation is:

```typescript
// FilterCondition.path: "name" (property name)
// OR: "name.value" (access value field within property)
// OR: "metadata.category" (nested access)

// Property storage structure (from 01-types.ts):
// properties: Record<PropertyName, Property>
// where Property = { source, name, value: Value }
// and Value = { type, value, ... }

// Example for "name" property with value "Widget":
// properties = {
//   name: {
//     source: 'literal',
//     name: 'name',
//     value: { type: 'text', value: 'Widget' }
//   }
// }

// SQL access pattern (per 05-queries.md):
// properties->'name'->'value'->>'value'  -- for text comparison
// (properties->'price'->'value'->>'value')::numeric  -- for numeric comparison
```

**Path Resolution Rules:**
1. Simple property (`name`) → `properties->'name'->'value'->>'value'`
2. Type cast needed for numeric comparisons
3. For `exists` operator, just check key: `properties ? 'name'`
4. For `type_is`, use `type_path` column directly (not properties)

---

## Pagination Strategy

### Offset-based (Simple)
```sql
SELECT * FROM entities
WHERE tenant_id = $1 AND ...
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```
- Use when: Small datasets, random access needed
- API: `{ limit: 50, offset: 100 }`

### Cursor-based (Recommended for large datasets)
```sql
SELECT * FROM entities
WHERE tenant_id = $1
  AND (created_at, id) < ($cursor_time, $cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT $2;
```

**Cursor encoding:**
```typescript
interface Cursor {
  sortValues: unknown[];  // Values of sort columns
  id: EntityId;           // Tiebreaker
}

// Encode: base64url(JSON.stringify(cursor))
// Decode: JSON.parse(base64urlDecode(str))
```

---

## Request/Response Schema (TypeBox)

```typescript
// POST /query
const QueryRequestSchema = Type.Object({
  type: Type.Optional(Type.String()),  // TypePath, supports "product.*"
  filter: Type.Optional(FilterGroupSchema),
  sort: Type.Optional(Type.Array(SortSpecSchema)),
  pagination: Type.Optional(Type.Object({
    limit: Type.Number({ minimum: 1, maximum: 1000, default: 50 }),
    offset: Type.Optional(Type.Number({ minimum: 0 })),
    cursor: Type.Optional(Type.String()),
  })),
  include_total: Type.Optional(Type.Boolean({ default: false })),
});

const QueryResponseSchema = Type.Object({
  data: Type.Array(EntitySchema),
  total_count: Type.Optional(Type.Number()),
  pagination: Type.Object({
    offset: Type.Number(),
    limit: Type.Number(),
    has_more: Type.Boolean(),
    cursor: Type.Optional(Type.String()),
  }),
});
```

---

## Files to Create

```
packages/server/src/
├── routes/
│   └── query/
│       ├── index.ts           # Route registration (registerQueryRoutes)
│       ├── query.ts           # POST /query handler
│       └── schemas.ts         # TypeBox request/response schemas
├── services/
│   └── query-service.ts       # QueryService class
└── query/
    ├── builder.ts             # buildSelectQuery() - main SQL builder
    ├── filters.ts             # filterToSQL(), filterGroupToSQL()
    ├── sorting.ts             # sortToSQL()
    ├── pagination.ts          # encodeCursor(), decodeCursor(), paginationToSQL()
    └── property-path.ts       # propertyPathToSQL() - JSONB path translation
```

---

## Implementation Approach

### 1. Property Path Translation (`property-path.ts`)
```typescript
function propertyPathToSQL(path: string, forComparison: 'text' | 'numeric' | 'boolean' = 'text'): string {
  // "name" → properties->'name'->'value'->>'value'
  // "metadata.tags" → properties->'metadata'->'value'->'tags'

  const parts = path.split('.');
  const propertyName = parts[0];

  // Build JSONB path
  let sql = `properties->'${propertyName}'->'value'`;

  for (let i = 1; i < parts.length; i++) {
    sql = `${sql}->'${parts[i]}'`;
  }

  // Final accessor depends on comparison type
  if (forComparison === 'numeric') {
    return `(${sql}->>'value')::numeric`;
  } else if (forComparison === 'boolean') {
    return `(${sql}->>'value')::boolean`;
  }
  return `${sql}->>'value'`;
}
```

### 2. Filter Translation (`filters.ts`)
```typescript
interface SQLFragment {
  sql: string;
  params: unknown[];
}

function filterConditionToSQL(
  condition: FilterCondition,
  paramOffset: number
): SQLFragment {
  const { path, operator, value } = condition;

  // Special cases
  if (operator === 'exists') {
    return { sql: `properties ? $${paramOffset}`, params: [path] };
  }
  if (operator === 'type_is') {
    return { sql: `type_path <@ $${paramOffset}`, params: [value] };
  }

  // Determine value type for proper casting
  const valueType = typeof value === 'number' ? 'numeric' : 'text';
  const sqlPath = propertyPathToSQL(path, valueType);

  switch (operator) {
    case 'eq': return { sql: `${sqlPath} = $${paramOffset}`, params: [value] };
    case 'neq': return { sql: `${sqlPath} != $${paramOffset}`, params: [value] };
    case 'gt': return { sql: `${sqlPath} > $${paramOffset}`, params: [value] };
    // ... etc
  }
}

function filterGroupToSQL(group: FilterGroup, paramOffset: number): SQLFragment {
  const fragments: SQLFragment[] = [];
  let currentOffset = paramOffset;

  for (const condition of group.conditions) {
    if ('logic' in condition) {
      // Nested group
      const nested = filterGroupToSQL(condition, currentOffset);
      fragments.push({ sql: `(${nested.sql})`, params: nested.params });
      currentOffset += nested.params.length;
    } else {
      // Leaf condition
      const leaf = filterConditionToSQL(condition, currentOffset);
      fragments.push(leaf);
      currentOffset += leaf.params.length;
    }
  }

  const joiner = group.logic === 'and' ? ' AND ' : ' OR ';
  return {
    sql: fragments.map(f => f.sql).join(joiner),
    params: fragments.flatMap(f => f.params),
  };
}
```

### 3. Sorting (`sorting.ts`)
```typescript
function sortToSQL(specs: SortSpec[]): string {
  return specs.map(spec => {
    const path = propertyPathToSQL(spec.path, 'text');
    const dir = spec.direction.toUpperCase();
    const nulls = spec.nulls ? ` NULLS ${spec.nulls.toUpperCase()}` : '';
    return `${path} ${dir}${nulls}`;
  }).join(', ');
}
```

### 4. Query Builder (`builder.ts`)
```typescript
interface BuildQueryOptions {
  tenantId: TenantId;
  type?: string;
  filter?: FilterGroup;
  sort?: SortSpec[];
  limit: number;
  offset?: number;
  cursor?: string;
  includeTotal?: boolean;
}

function buildSelectQuery(options: BuildQueryOptions): { sql: string; params: unknown[] } {
  const params: unknown[] = [options.tenantId];
  let paramIndex = 2;

  // SELECT
  let sql = `SELECT * FROM entities WHERE tenant_id = $1 AND deleted_at IS NULL`;

  // Type filter
  if (options.type) {
    if (options.type.endsWith('.*')) {
      sql += ` AND type_path <@ $${paramIndex}`;
      params.push(options.type.slice(0, -2));
    } else {
      sql += ` AND type_path = $${paramIndex}`;
      params.push(options.type);
    }
    paramIndex++;
  }

  // Filters
  if (options.filter) {
    const filterSQL = filterGroupToSQL(options.filter, paramIndex);
    sql += ` AND (${filterSQL.sql})`;
    params.push(...filterSQL.params);
    paramIndex += filterSQL.params.length;
  }

  // Cursor pagination
  if (options.cursor) {
    const cursor = decodeCursor(options.cursor);
    // Build cursor WHERE clause based on sort columns
    // ...
  }

  // ORDER BY
  if (options.sort?.length) {
    sql += ` ORDER BY ${sortToSQL(options.sort)}`;
  } else {
    sql += ` ORDER BY created_at DESC, id DESC`;
  }

  // LIMIT/OFFSET
  sql += ` LIMIT $${paramIndex}`;
  params.push(options.limit + 1); // +1 to detect has_more
  paramIndex++;

  if (options.offset && !options.cursor) {
    sql += ` OFFSET $${paramIndex}`;
    params.push(options.offset);
  }

  return { sql, params };
}
```

---

## SQL Injection Prevention

**Parameterization:** All user values go through `$N` parameters, never interpolated.

**Path sanitization:** Property paths must be validated:
```typescript
const VALID_PATH = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

function validatePath(path: string): boolean {
  return VALID_PATH.test(path);
}
```

**Operator whitelist:** Only accept known operators from `FilterOperator` type.

---

## Test Plan

| Test File | Coverage |
|-----------|----------|
| `filters.test.ts` | Each of 14 operators, nested groups, edge cases |
| `sorting.test.ts` | Single/multi-column, ASC/DESC, NULLS FIRST/LAST |
| `pagination.test.ts` | Offset-based, cursor encode/decode, has_more detection |
| `property-path.test.ts` | Simple paths, nested paths, type casting |
| `builder.test.ts` | Full query assembly, type wildcards, combined filters+sort+pagination |
| `query-service.test.ts` | Integration with mock DB |

---

## Open Questions

1. **Total count performance:** For large tables, `COUNT(*)` is expensive. Options:
   - Only compute when `include_total: true`
   - Use estimated count from `pg_class.reltuples`
   - Cache counts per type

2. **Default limit:** 50 seems reasonable, max 1000. Confirm?

3. **Type wildcard syntax:** `product.*` vs `product/**` - spec uses dot notation.

---

## Success Criteria

- [x] All 14 filter operators work correctly
- [x] AND/OR grouping with arbitrary nesting
- [x] Multi-column sorting with nulls handling
- [x] Both offset and cursor pagination
- [x] JSONB property queries with proper nesting
- [x] Type hierarchy queries with ltree
- [x] All tests pass (138 tests)
- [x] No SQL injection vulnerabilities
- [x] Zod schemas validate requests/responses

---

## Implementation Summary

**Build Status:** ✅ Query engine files compile successfully

### Files Created (11 files)

| File | Purpose |
|------|---------|
| `src/config/query.ts` | Query defaults (limit: 50, maxLimit: 1000) |
| `src/query/property-path.ts` | JSONB path translation with validation |
| `src/query/filters.ts` | 14 filter operators → SQL translation |
| `src/query/sorting.ts` | Sort specs → ORDER BY with id tiebreaker |
| `src/query/pagination.ts` | Offset + cursor (base64url) pagination |
| `src/query/builder.ts` | Complete SELECT query builder |
| `src/query/index.ts` | Module exports |
| `src/services/query-service.ts` | QueryService class with entity queries |
| `src/routes/query/schemas.ts` | Zod validation schemas |
| `src/routes/query/query.ts` | POST /query handler |
| `src/routes/query/index.ts` | Route registration |

### Tests Created (5 test files, 138 tests)

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `property-path.test.ts` | 32 | Path validation, SQL generation, type casting |
| `filters.test.ts` | 24 | All 14 operators, nested groups |
| `sorting.test.ts` | 27 | Single/multi-column, directions, nulls |
| `pagination.test.ts` | 20 | Cursor encode/decode, offset, hasMore |
| `schemas.test.ts` | 35 | Request validation, all operators |

### Endpoint

- **POST /query** - Query entities with filtering, sorting, and pagination

### Key Decisions

1. **Used Zod** (not TypeBox) to match existing entity routes
2. **Limit +1** for hasMore detection (request 51, return 50 + hasMore flag)
3. **id as tiebreaker** in all sorts for stable pagination
4. **include_total: false** by default (COUNT(*) is expensive)

---

## Dependencies

- Instance 10 (Server Setup) ✅ Complete

---

## No Blockers for Downstream

Downstream instances can now use:
- `QueryService.queryEntities()` for programmatic access
- `POST /query` endpoint for API access
