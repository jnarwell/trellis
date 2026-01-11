# Entity API Scratchpad

**STATUS:** ✅ Implementation Complete

**Instance:** 11 - Entity API
**Phase:** 2.3
**Date:** 2026-01-10

---

## Summary

This instance implements CRUD endpoints for entities following the API specification in [specs/kernel/03-api.md](specs/kernel/03-api.md).

### Implementation Complete

**Files Created:**
- `packages/server/src/routes/entities/schemas.ts` - Zod validation schemas
- `packages/server/src/routes/entities/create.ts` - POST /entities handler
- `packages/server/src/routes/entities/read.ts` - GET /entities/:id handler
- `packages/server/src/routes/entities/update.ts` - PUT /entities/:id handler
- `packages/server/src/routes/entities/delete.ts` - DELETE /entities/:id handler
- `packages/server/src/routes/entities/index.ts` - Route registration
- `packages/server/src/services/entity-service.ts` - Business logic layer
- `packages/server/src/repositories/entity-repository.ts` - Database queries
- `packages/server/tests/routes/entities/schemas.test.ts` - Schema validation tests

**Dependencies Added:**
- `zod` - Schema validation
- `uuidv7` - UUID v7 generation

**Tests:** 36 tests passing

---

## Prerequisites Verified

- [x] Instance 10 (Server Setup) complete
- [x] App factory available at `packages/server/src/app.ts`
- [x] Database client with tenant scoping at `packages/server/src/db/client.ts`
- [x] Auth middleware extracting `tenantId` and `actorId` at `packages/server/src/middleware/auth.ts`
- [x] Error handler mapping `KernelError` to HTTP status at `packages/server/src/middleware/error-handler.ts`
- [x] PostgreSQL plugin decorating `app.pg` at `packages/server/src/plugins/postgres.ts`

---

## Endpoints to Implement

| Method | Path | Request Type | Response Type | HTTP Codes |
|--------|------|--------------|---------------|------------|
| POST | `/entities` | `CreateEntityRequest` | `{ entity: Entity }` | 201, 400, 422 |
| GET | `/entities/:id` | Query params | `{ entity: Entity }` | 200, 404 |
| PUT | `/entities/:id` | `UpdateEntityRequest` | `{ entity: Entity }` | 200, 400, 404, 409 |
| DELETE | `/entities/:id` | Query params | (empty) | 204, 404 |

---

## Request/Response Schemas

### POST /entities - Create Entity

**Request:**
```typescript
interface CreateEntityRequest {
  type: TypePath;
  properties: Record<PropertyName, PropertyInput>;
  // Note: relationships[] deferred to Instance 12
}
```

**Response (201):**
```typescript
interface CreateEntityResponse {
  entity: Entity;
}
```

**Errors:**
- `400 VALIDATION_ERROR` - Invalid input (missing type, bad property values)
- `400 TYPE_NOT_FOUND` - Type path doesn't exist (if schema validation enabled)
- `422 REFERENCE_BROKEN` - Inherited property references non-existent entity

### GET /entities/:id - Get Entity

**Query Params:**
```typescript
interface GetEntityQuery {
  resolve_inherited?: boolean;  // Default: false
  evaluate_computed?: boolean;  // Default: false
  // Note: include_relationships deferred to Instance 12
}
```

**Response (200):**
```typescript
interface GetEntityResponse {
  entity: Entity;
}
```

**Errors:**
- `404 NOT_FOUND` - Entity doesn't exist

### PUT /entities/:id - Update Entity

**Request:**
```typescript
interface UpdateEntityRequest {
  version: number;  // Required for optimistic locking
  set_properties?: Record<PropertyName, PropertyInput>;
  remove_properties?: PropertyName[];
}
```

**Response (200):**
```typescript
interface UpdateEntityResponse {
  entity: Entity;
}
```

**Errors:**
- `400 VALIDATION_ERROR` - Invalid property values
- `404 NOT_FOUND` - Entity doesn't exist
- `409 VERSION_CONFLICT` - Version mismatch (returns current entity in details)

### DELETE /entities/:id - Delete Entity

**Query Params:**
```typescript
interface DeleteEntityQuery {
  hard_delete?: boolean;  // Default: false (soft delete)
  // Note: cascade_relationships deferred to Instance 12
}
```

**Response (204):** No content

**Errors:**
- `404 NOT_FOUND` - Entity doesn't exist

---

## Architecture Decisions

### Layer Structure

```
routes/entities/
├── index.ts           # Route registration
├── create.ts          # POST handler
├── read.ts            # GET handler
├── update.ts          # PUT handler
├── delete.ts          # DELETE handler
└── schemas.ts         # Zod schemas for validation

services/
└── entity-service.ts  # Business logic (validates, transforms, calls repository)

repositories/
└── entity-repository.ts  # Raw SQL queries with tenant scoping
```

### Why This Structure

1. **Routes** - Thin handlers that parse input, call service, return response
2. **Services** - Business logic, validation, transformation (PropertyInput → Property)
3. **Repositories** - SQL queries, optimistic locking implementation

### Optimistic Locking (per ADR-010)

```sql
-- Update with version check
UPDATE entities
SET properties = $1,
    version = version + 1,
    updated_at = NOW()
WHERE id = $2
  AND tenant_id = current_setting('app.current_tenant_id')::uuid
  AND version = $3
RETURNING *;

-- If rowCount === 0, check if entity exists to distinguish NOT_FOUND vs VERSION_CONFLICT
```

### Property Transformation

Per 03-api.md, the API transforms `PropertyInput` to full `Property`:

```typescript
// Input (from client)
{ source: 'computed', expression: 'price * 0.3' }

// Output (stored)
{
  source: 'computed',
  name: 'margin',  // Added from Record key
  expression: 'price * 0.3',
  dependencies: ['price'],  // Parsed from expression
  computation_status: 'pending',  // Initialized
  cached_value: undefined,
  cached_at: undefined
}
```

### UUID v7 Generation

Use `uuidv7` package for time-ordered IDs:
```typescript
import { uuidv7 } from 'uuidv7';
const entityId = uuidv7() as EntityId;
```

---

## Implementation Details

### Validation Schemas (Zod)

```typescript
// PropertyInput variants
const literalPropertyInput = z.object({
  source: z.literal('literal'),
  value: valueSchema,  // Discriminated union of value types
});

const inheritedPropertyInput = z.object({
  source: z.literal('inherited'),
  from_entity: z.string().uuid(),
  from_property: z.string().optional(),
  override: valueSchema.optional(),
});

const computedPropertyInput = z.object({
  source: z.literal('computed'),
  expression: z.string().min(1),
});

const measuredPropertyInput = z.object({
  source: z.literal('measured'),
  value: numberValueSchema,
  uncertainty: z.number().optional(),
  measured_at: z.string().datetime().optional(),
});

const propertyInputSchema = z.discriminatedUnion('source', [
  literalPropertyInput,
  inheritedPropertyInput,
  computedPropertyInput,
  measuredPropertyInput,
]);
```

### SQL Queries

```sql
-- Create entity
INSERT INTO entities (id, tenant_id, type, properties, created_at, updated_at, created_by, version)
VALUES ($1, current_setting('app.current_tenant_id')::uuid, $2, $3, NOW(), NOW(), $4, 1)
RETURNING *;

-- Get entity
SELECT * FROM entities
WHERE id = $1
  AND tenant_id = current_setting('app.current_tenant_id')::uuid
  AND deleted_at IS NULL;

-- Update entity (optimistic lock)
UPDATE entities
SET properties = $1, version = version + 1, updated_at = NOW()
WHERE id = $2
  AND tenant_id = current_setting('app.current_tenant_id')::uuid
  AND version = $3
  AND deleted_at IS NULL
RETURNING *;

-- Soft delete
UPDATE entities
SET deleted_at = NOW(), deleted_by = $1
WHERE id = $2
  AND tenant_id = current_setting('app.current_tenant_id')::uuid
  AND deleted_at IS NULL
RETURNING id;

-- Hard delete
DELETE FROM entities
WHERE id = $1
  AND tenant_id = current_setting('app.current_tenant_id')::uuid
RETURNING id;
```

---

## Integration Points

### Instance 12 (Relationships) Will Add:
- `relationships[]` to `CreateEntityRequest`
- `include_relationships[]` to `GetEntityQuery`
- `cascade_relationships` to `DeleteEntityQuery`

### Instance 13 (Query) Will Add:
- `GET /entities` with filter/sort/pagination (queryEntities)

### Instance 14 (Events) Will Add:
- Event emission hooks in entity-service.ts:
  - `entity_created` after create
  - `entity_updated` after update (+ `property_changed` for each)
  - `entity_deleted` after delete

**Current implementation leaves TODO comments for event hooks:**
```typescript
async createEntity(input: CreateEntityInput): Promise<Entity> {
  const entity = await this.repository.create(input);
  // TODO: Instance 14 will add event emission here
  return entity;
}
```

---

## Files to Create

```
packages/server/src/
├── routes/
│   └── entities/
│       ├── index.ts           # ~30 lines - route registration
│       ├── create.ts          # ~50 lines - POST handler
│       ├── read.ts            # ~40 lines - GET handler
│       ├── update.ts          # ~60 lines - PUT handler
│       ├── delete.ts          # ~40 lines - DELETE handler
│       └── schemas.ts         # ~100 lines - Zod validation schemas
├── services/
│   └── entity-service.ts      # ~150 lines - business logic
└── repositories/
    └── entity-repository.ts   # ~120 lines - SQL queries
```

---

## Testing Strategy

| Test File | Coverage |
|-----------|----------|
| `create.test.ts` | Create valid entity, missing type, invalid properties |
| `read.test.ts` | Get existing entity, not found, soft deleted |
| `update.test.ts` | Update properties, version conflict, remove properties |
| `delete.test.ts` | Soft delete, hard delete, not found |
| `integration.test.ts` | Full CRUD cycle, concurrent updates |

---

## Questions

1. **Type schema validation** - Should we validate that `type` exists in `type_schemas` table on create? The spec says "Validate type exists" but schema system may not be implemented yet.
   - **Proposed:** Skip type schema validation for now, add in future phase

2. **Expression dependency parsing** - Should we parse computed property expressions to extract dependencies now, or defer?
   - **Proposed:** Use `extractDependencies()` from `@trellis/kernel` which is already implemented

3. **Soft delete visibility** - Should GET return soft-deleted entities with a flag, or always 404?
   - **Spec says:** `include_deleted` query param on `queryEntities`, but for single GET, spec shows no option
   - **Proposed:** GET single entity returns 404 for soft-deleted, `include_deleted` available in query endpoint (Instance 13)

---

## Completion Notes

**Decisions Applied:**
1. Type schema validation skipped for V1 (TODO comments added)
2. Using `parseWithDependencies()` from `@trellis/kernel` for expression parsing
3. GET returns 404 for soft-deleted entities

**TODO markers left for future instances:**
- `// TODO: Schema validation in Phase 3` - in entity-service.ts
- `// TODO: Instance 14 will add event emission here` - in entity-service.ts (3 locations)
- `// TODO: Implement resolve_inherited and evaluate_computed options` - in entity-service.ts
