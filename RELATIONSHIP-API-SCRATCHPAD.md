# Relationship API Scratchpad

**STATUS:** ✅ Implementation Complete

**Instance:** 12 - Relationship API
**Phase:** 2.3

## Implementation Summary

**Build Status:** ✅ `pnpm build` passes
**Test Status:** ✅ All tests pass (28 tests)

### Files Created

| File | Purpose |
|------|---------|
| `src/repositories/relationship-repository.ts` | Database access for relationships |
| `src/repositories/relationship-schema-repository.ts` | Database access for relationship schemas |
| `src/services/relationship-service.ts` | Business logic, cardinality checks, events |
| `src/routes/relationships/schemas.ts` | TypeBox request/response schemas |
| `src/routes/relationships/create.ts` | POST /relationships handler |
| `src/routes/relationships/delete.ts` | DELETE /relationships/:id handler |
| `src/routes/relationships/list.ts` | GET /entities/:id/relationships handler |
| `src/routes/relationships/index.ts` | Route registration |
| `tests/routes/relationships/schemas.test.ts` | Schema validation tests |

### Endpoints Implemented

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/relationships` | POST | Create relationship with cardinality enforcement |
| `/relationships/:id` | DELETE | Delete relationship (and inverse if bidirectional) |
| `/entities/:id/relationships` | GET | List relationships with direction/type filters |

### Key Features

- Cardinality enforcement (one_to_one, one_to_many, many_to_one, many_to_many)
- Bidirectional relationship support (creates/deletes inverse automatically)
- Entity existence and type validation
- Event emission on create/delete
- RLS-compliant with tenant isolation

---

---

## Discovery Summary

### Files Read

| File | Key Takeaways |
|------|---------------|
| `specs/kernel/03-api.md` | 3 relationship operations: create, delete, getRelationships. Direction filter: `outgoing`/`incoming`/`both`. Optional entity inclusion. |
| `specs/kernel/01-types.ts` | `Relationship`, `RelationshipSchema`, `Cardinality` types. `CreateRelationshipInput` with type, from_entity, to_entity, path?, metadata?. |
| `specs/kernel/02-schema.sql` | `relationships` table with UNIQUE constraint on (tenant_id, type, from_entity, to_entity). no_self_reference CHECK. RLS enabled. |
| `SERVER-SETUP-SCRATCHPAD.md` | Instance 10 complete. `withTenantClient`, `withTenantTransaction` available. Error handler maps KernelError to HTTP. |
| `packages/server/src/app.ts` | Fastify app factory with middleware chain. `app.pg` for pool access. |
| `packages/server/src/db/client.ts` | `TenantScopedClient` interface. Transaction support built-in. |
| `packages/server/src/types/fastify.d.ts` | `request.auth` has `tenantId`, `actorId`, `permissions`. |
| `packages/server/src/middleware/error-handler.ts` | Throws `KernelError` to get proper HTTP status codes. |

---

## API Contract (from 03-api.md)

### POST /relationships - Create Relationship

```typescript
interface CreateRelationshipInput {
  type: RelationshipType;
  from_entity: EntityId;
  to_entity: EntityId;
  path?: string;  // For hierarchical relationships (ltree)
  metadata?: Record<string, Value>;
}
```

**Behavior:**
1. Validate relationship type exists in `relationship_schemas`
2. Validate both entities exist and types are allowed per schema
3. Check cardinality constraints not violated
4. Create relationship record
5. If bidirectional, create inverse relationship
6. Emit `relationship_created` event
7. Return created relationship

### DELETE /relationships/:id - Delete Relationship

**Behavior:**
1. Delete relationship record
2. If bidirectional, delete inverse
3. Emit `relationship_deleted` event
4. Return 204 No Content

### GET /entities/:id/relationships - List Relationships

```typescript
interface RelationshipQueryOptions {
  type?: RelationshipType;
  direction?: 'outgoing' | 'incoming' | 'both';
  include_entities?: boolean;
}
```

Returns `Relationship[]` (optionally with hydrated entities).

---

## Database Schema Analysis

### relationships table

```sql
CREATE TABLE relationships (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    type            TEXT NOT NULL,
    from_entity     UUID NOT NULL REFERENCES entities(id),
    to_entity       UUID NOT NULL REFERENCES entities(id),
    metadata        JSONB NOT NULL DEFAULT '{}',
    path            ltree,  -- For hierarchical relationships
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES actors(id),

    CONSTRAINT unique_relationship UNIQUE (tenant_id, type, from_entity, to_entity),
    CONSTRAINT no_self_reference CHECK (from_entity != to_entity)
);
```

### relationship_schemas table

```sql
CREATE TABLE relationship_schemas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id       UUID REFERENCES tenants(id),  -- NULL = system-wide
    type            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    from_types      ltree[] NOT NULL DEFAULT '{}',
    to_types        ltree[] NOT NULL DEFAULT '{}',
    cardinality     cardinality NOT NULL DEFAULT 'many_to_many',
    bidirectional   BOOLEAN NOT NULL DEFAULT FALSE,
    inverse_type    TEXT,
    metadata_schema JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_rel_type_per_scope UNIQUE (tenant_id, type)
);
```

### Indexes Available

- `idx_relationships_from` - Fast lookup by from_entity
- `idx_relationships_to` - Fast lookup by to_entity
- `idx_relationships_from_type` - Lookup by (from_entity, type)
- `idx_relationships_to_type` - Lookup by (to_entity, type)
- `idx_relationships_bidirectional` - For reverse lookups (tenant_id, type, to_entity, from_entity)

---

## Cardinality Enforcement Strategy

Before creating a relationship:

```typescript
async function checkCardinality(
  client: TenantScopedClient,
  input: CreateRelationshipInput,
  schema: RelationshipSchema
): Promise<void> {
  switch (schema.cardinality) {
    case 'one_to_one':
      // Neither from nor to can have another relationship of this type
      const fromCount = await countRelationships(client, input.from_entity, input.type, 'outgoing');
      const toCount = await countRelationships(client, input.to_entity, input.type, 'incoming');
      if (fromCount > 0 || toCount > 0) {
        throw kernelError('VALIDATION_ERROR', 'Cardinality constraint violated: one_to_one');
      }
      break;

    case 'one_to_many':
      // to_entity can only have one incoming relationship of this type
      const incomingCount = await countRelationships(client, input.to_entity, input.type, 'incoming');
      if (incomingCount > 0) {
        throw kernelError('VALIDATION_ERROR', 'Cardinality constraint violated: one_to_many');
      }
      break;

    case 'many_to_one':
      // from_entity can only have one outgoing relationship of this type
      const outgoingCount = await countRelationships(client, input.from_entity, input.type, 'outgoing');
      if (outgoingCount > 0) {
        throw kernelError('VALIDATION_ERROR', 'Cardinality constraint violated: many_to_one');
      }
      break;

    case 'many_to_many':
      // No additional constraints (unique constraint handles duplicates)
      break;
  }
}
```

---

## Implementation Plan

### Files to Create

```
packages/server/src/
├── routes/
│   └── relationships/
│       ├── index.ts           # Route registration
│       ├── create.ts          # POST /relationships
│       ├── delete.ts          # DELETE /relationships/:id
│       ├── list.ts            # GET /entities/:id/relationships
│       └── schemas.ts         # TypeBox request/response schemas
├── services/
│   └── relationship-service.ts # Business logic
└── repositories/
    └── relationship-repository.ts # Database access
```

### Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Routes** | HTTP parsing, validation, response formatting |
| **Service** | Business logic, cardinality checks, event emission |
| **Repository** | Raw SQL queries, data access |

### Route Schemas (TypeBox)

```typescript
// schemas.ts
import { Type, Static } from '@sinclair/typebox';

export const CreateRelationshipBody = Type.Object({
  type: Type.String(),
  from_entity: Type.String({ format: 'uuid' }),
  to_entity: Type.String({ format: 'uuid' }),
  path: Type.Optional(Type.String()),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

export const RelationshipParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const ListRelationshipsParams = Type.Object({
  id: Type.String({ format: 'uuid' }),  // entity_id
});

export const ListRelationshipsQuery = Type.Object({
  type: Type.Optional(Type.String()),
  direction: Type.Optional(Type.Union([
    Type.Literal('outgoing'),
    Type.Literal('incoming'),
    Type.Literal('both'),
  ])),
  include_entities: Type.Optional(Type.Boolean()),
});
```

### Service Methods

```typescript
// relationship-service.ts
interface RelationshipService {
  create(ctx: AuthContext, input: CreateRelationshipInput): Promise<Relationship>;
  delete(ctx: AuthContext, id: string): Promise<void>;
  list(ctx: AuthContext, entityId: EntityId, options: RelationshipQueryOptions): Promise<Relationship[]>;
}
```

### Repository Methods

```typescript
// relationship-repository.ts
interface RelationshipRepository {
  insert(client: TenantScopedClient, rel: InsertRelationship): Promise<Relationship>;
  findById(client: TenantScopedClient, id: string): Promise<Relationship | null>;
  delete(client: TenantScopedClient, id: string): Promise<boolean>;
  findByEntity(client: TenantScopedClient, entityId: EntityId, options: QueryOptions): Promise<Relationship[]>;
  countByEntityAndType(client: TenantScopedClient, entityId: EntityId, type: string, direction: 'outgoing' | 'incoming'): Promise<number>;
}

// For RelationshipSchema lookups
interface RelationshipSchemaRepository {
  findByType(client: TenantScopedClient, type: string): Promise<RelationshipSchema | null>;
}
```

---

## Event Emission

Events to emit:

```typescript
// relationship_created
{
  event_type: 'relationship_created',
  entity_id: null,  // Relationships don't have a primary entity
  payload: {
    relationship_id: string,
    type: string,
    from_entity: string,
    to_entity: string,
  }
}

// relationship_deleted
{
  event_type: 'relationship_deleted',
  entity_id: null,
  payload: {
    relationship_id: string,
    type: string,
    from_entity: string,
    to_entity: string,
  }
}
```

---

## Questions/Decisions

### Q1: Entity existence validation
**Question:** Should we validate that from_entity and to_entity exist before creating?
**Decision:** YES - the DB has FK constraints, but we should validate early for better error messages.

### Q2: Entity type validation against schema
**Question:** Should we validate entity types match from_types/to_types in relationship schema?
**Decision:** YES - spec says "validate both entities exist and types are allowed per schema."

### Q3: Bidirectional relationship handling
**Question:** When creating a bidirectional relationship, should we create two DB rows or query both directions?
**Decision:** Create two rows (relationship + inverse). This matches the spec: "If bidirectional, create inverse relationship."

### Q4: Event table usage
**Question:** Should we write to the events table in Phase 2.3?
**Decision:** YES - we have the events table from schema. Emit events as part of the transaction.

### Q5: Cascade on entity deletion
**Question:** What happens to relationships when an entity is deleted?
**Decision:** Per spec, `deleteEntity` has `cascade_relationships?: boolean` option. That's Instance 11's responsibility, not ours. However, our delete endpoint should work for explicit relationship deletion.

---

## Testing Strategy

### Unit Tests (Repository)
- Insert relationship
- Find by ID
- Delete relationship
- Find by entity (outgoing/incoming/both)
- Count by entity and type

### Integration Tests (Routes)
- `POST /relationships` - success
- `POST /relationships` - validation errors (missing fields)
- `POST /relationships` - entity not found
- `POST /relationships` - cardinality violation
- `POST /relationships` - duplicate relationship (409)
- `POST /relationships` - self-reference error
- `DELETE /relationships/:id` - success (204)
- `DELETE /relationships/:id` - not found (404)
- `GET /entities/:id/relationships` - all relationships
- `GET /entities/:id/relationships?direction=outgoing`
- `GET /entities/:id/relationships?direction=incoming`
- `GET /entities/:id/relationships?type=parent_of`

---

## Dependencies

### From Instance 10 (Server Setup) ✅
- `buildApp`, `AppConfig`
- `withTenantClient`, `withTenantTransaction`
- `request.auth` with `tenantId`, `actorId`
- `app.pg` pool access
- Error handler for `KernelError`

### From Instance 11 (Entity API) - NOT BLOCKING
- Entity validation uses direct DB query (no dependency on entity service)
- We query `entities` table directly with RLS

### External Dependencies (already installed by Instance 10)
- `@sinclair/typebox` - Schema validation
- `pg` - PostgreSQL client

---

## Implementation Order

1. [ ] Create `repositories/relationship-repository.ts`
2. [ ] Create `repositories/relationship-schema-repository.ts`
3. [ ] Create `services/relationship-service.ts`
4. [ ] Create `routes/relationships/schemas.ts`
5. [ ] Create `routes/relationships/create.ts`
6. [ ] Create `routes/relationships/delete.ts`
7. [ ] Create `routes/relationships/list.ts`
8. [ ] Create `routes/relationships/index.ts`
9. [ ] Register routes in `app.ts`
10. [ ] Write tests

---

## Ready for Implementation

**Blockers:** None
**Questions remaining:** None (decisions documented above)
**Awaiting approval to proceed.**
