# Trellis Kernel API Contract

## Overview

The Kernel API provides CRUD operations for entities, properties, and relationships. All operations are tenant-scoped and emit events.

## Design Principles

1. **Explicit over implicit**: All inputs fully specified, no magic defaults
2. **Optimistic concurrency**: Version checks prevent lost updates
3. **Event emission**: Every mutation emits an event
4. **Transaction support**: Operations can be batched in transactions

## Authentication Context

Every API call includes an authentication context:

```typescript
interface AuthContext {
  tenant_id: TenantId;
  actor_id: ActorId;
  permissions: string[];  // For future RBAC
}
```

The implementation layer sets `app.current_tenant_id` in PostgreSQL for RLS.

---

## Entity Operations

### Create Entity

Creates a new entity with the specified type and properties.

**Signature:**
```typescript
async function createEntity(
  ctx: AuthContext,
  input: CreateEntityInput
): Promise<Entity>
```

**Input:**
```typescript
interface CreateEntityInput {
  type: TypePath;
  properties: Record<PropertyName, PropertyInput>;
  relationships?: RelationshipInput[];
}

// Property without name (name comes from the key)
type PropertyInput =
  | { source: 'literal'; value: Value }
  | { source: 'inherited'; from_entity: EntityId; from_property?: PropertyName; override?: Value }
  | { source: 'computed'; expression: string }
  | { source: 'measured'; value: NumberValue; uncertainty?: number; measured_at?: string };
```

**Behavior:**
1. Validate type exists in type_schemas (tenant-specific or system-wide)
2. Validate required properties present per schema
3. Validate property values match schema types
4. Create entity record with version = 1
5. Create any specified relationships
6. Emit `entity_created` event
7. Return created entity

**Errors:**
| Code | Condition |
|------|-----------|
| `TYPE_NOT_FOUND` | Type path doesn't exist |
| `VALIDATION_ERROR` | Required property missing or type mismatch |
| `REFERENCE_BROKEN` | Inherited property references non-existent entity |

**Example:**
```typescript
const product = await createEntity(ctx, {
  type: 'product' as TypePath,
  properties: {
    name: { source: 'literal', value: { type: 'text', value: 'Widget Pro' } },
    price: { source: 'literal', value: { type: 'number', value: 99.99, unit: 'USD' } },
    margin: { source: 'computed', expression: 'price * 0.3' }
  }
});
```

---

### Get Entity

Retrieves a single entity by ID.

**Signature:**
```typescript
async function getEntity(
  ctx: AuthContext,
  id: EntityId,
  options?: GetEntityOptions
): Promise<Entity | null>
```

**Options:**
```typescript
interface GetEntityOptions {
  /** Resolve inherited properties to their values */
  resolve_inherited?: boolean;
  /** Evaluate computed properties */
  evaluate_computed?: boolean;
  /** Include relationships of these types */
  include_relationships?: RelationshipType[];
}
```

**Behavior:**
1. Fetch entity from database (RLS ensures tenant isolation)
2. If `resolve_inherited`, follow inheritance chain for inherited properties
3. If `evaluate_computed`, evaluate expressions (use cache if valid)
4. If `include_relationships`, fetch related entities
5. Return entity or null if not found

**Example:**
```typescript
const product = await getEntity(ctx, productId, {
  resolve_inherited: true,
  include_relationships: ['belongs_to_category']
});
```

---

### Update Entity

Updates an entity's properties with optimistic concurrency control.

**Signature:**
```typescript
async function updateEntity(
  ctx: AuthContext,
  input: UpdateEntityInput
): Promise<Entity>
```

**Input:**
```typescript
interface UpdateEntityInput {
  id: EntityId;
  expected_version: number;
  set_properties?: Record<PropertyName, PropertyInput>;
  remove_properties?: PropertyName[];
}
```

**Behavior:**
1. Fetch current entity and verify version matches
2. Validate new property values against schema
3. Merge property changes (set overwrites, remove deletes)
4. Increment version
5. Invalidate computed property cache for dependents
6. Emit `entity_updated` event (and `property_changed` for each change)
7. Return updated entity

**Errors:**
| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Entity doesn't exist |
| `VERSION_CONFLICT` | `expected_version` doesn't match current |
| `VALIDATION_ERROR` | Property value invalid |

**Example:**
```typescript
const updated = await updateEntity(ctx, {
  id: productId,
  expected_version: 1,
  set_properties: {
    price: { source: 'literal', value: { type: 'number', value: 109.99, unit: 'USD' } }
  },
  remove_properties: ['deprecated_field']
});
```

---

### Delete Entity

Soft-deletes an entity.

**Signature:**
```typescript
async function deleteEntity(
  ctx: AuthContext,
  id: EntityId,
  options?: DeleteEntityOptions
): Promise<void>
```

**Options:**
```typescript
interface DeleteEntityOptions {
  /** Also delete relationships (default: true) */
  cascade_relationships?: boolean;
  /** Hard delete instead of soft delete */
  hard_delete?: boolean;
}
```

**Behavior:**
1. Set `deleted_at` and `deleted_by` on entity
2. If `cascade_relationships`, delete all relationships involving this entity
3. Emit `entity_deleted` event
4. If `hard_delete`, permanently remove from database

**Errors:**
| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Entity doesn't exist |
| `REFERENCE_EXISTS` | Other entities reference this one (if not cascading) |

---

### Query Entities

Queries entities with filtering, sorting, and pagination.

**Signature:**
```typescript
async function queryEntities(
  ctx: AuthContext,
  query: EntityQuery
): Promise<QueryResult<Entity>>
```

**Input:**
```typescript
interface EntityQuery {
  type?: TypePath | `${string}.*`;  // Exact or hierarchy match
  filter?: FilterGroup;
  sort?: SortSpec[];
  offset?: number;
  limit?: number;
  include_relationships?: RelationshipType[];
  include_deleted?: boolean;
}
```

**Filter Operators:**
```typescript
type FilterOperator =
  | 'eq' | 'neq'           // Equality
  | 'gt' | 'gte'           // Greater than
  | 'lt' | 'lte'           // Less than
  | 'in' | 'nin'           // Set membership
  | 'contains'             // Text contains
  | 'starts' | 'ends'      // Text prefix/suffix
  | 'regex'                // Regex match
  | 'exists'               // Property exists
  | 'type_is';             // Type hierarchy match
```

**Example:**
```typescript
const results = await queryEntities(ctx, {
  type: 'product.*',  // All products and variants
  filter: {
    logic: 'and',
    conditions: [
      { path: 'price.value', operator: 'gte', value: 50 },
      { path: 'status.value', operator: 'eq', value: 'active' }
    ]
  },
  sort: [{ path: 'created_at', direction: 'desc' }],
  limit: 20,
  offset: 0
});
```

---

## Relationship Operations

### Create Relationship

Creates a relationship between two entities.

**Signature:**
```typescript
async function createRelationship(
  ctx: AuthContext,
  input: CreateRelationshipInput
): Promise<Relationship>
```

**Input:**
```typescript
interface CreateRelationshipInput {
  type: RelationshipType;
  from_entity: EntityId;
  to_entity: EntityId;
  metadata?: Record<string, Value>;
}
```

**Behavior:**
1. Validate relationship type exists
2. Validate both entities exist and types are allowed per schema
3. Check cardinality constraints not violated
4. Create relationship record
5. If bidirectional, create inverse relationship
6. Emit `relationship_created` event
7. Return created relationship

**Example:**
```typescript
const rel = await createRelationship(ctx, {
  type: 'belongs_to',
  from_entity: variantId,
  to_entity: productId,
  metadata: {
    position: { type: 'number', value: 1 }
  }
});
```

---

### Delete Relationship

Removes a relationship.

**Signature:**
```typescript
async function deleteRelationship(
  ctx: AuthContext,
  id: string
): Promise<void>
```

**Behavior:**
1. Delete relationship record
2. If bidirectional, delete inverse
3. Emit `relationship_deleted` event

---

### Get Relationships

Queries relationships for an entity.

**Signature:**
```typescript
async function getRelationships(
  ctx: AuthContext,
  entity_id: EntityId,
  options?: RelationshipQueryOptions
): Promise<Relationship[]>
```

**Options:**
```typescript
interface RelationshipQueryOptions {
  type?: RelationshipType;
  direction?: 'outgoing' | 'incoming' | 'both';
  include_entities?: boolean;  // Also fetch related entities
}
```

---

## Property Operations

### Set Property

Sets a single property on an entity (convenience method).

**Signature:**
```typescript
async function setProperty(
  ctx: AuthContext,
  entity_id: EntityId,
  property_name: PropertyName,
  property: PropertyInput,
  expected_version: number
): Promise<Entity>
```

Equivalent to `updateEntity` with single property.

---

### Get Property Value

Gets the resolved value of a property.

**Signature:**
```typescript
async function getPropertyValue(
  ctx: AuthContext,
  entity_id: EntityId,
  property_name: PropertyName
): Promise<Value | null>
```

**Behavior:**
1. Fetch entity
2. Resolve property based on source:
   - Literal: return value directly
   - Inherited: follow chain to source entity
   - Computed: evaluate expression (using cache if valid)
   - Measured: return value with uncertainty
3. Return resolved value or null

---

## Batch Operations

### Batch Mutate

Executes multiple operations in a single transaction.

**Signature:**
```typescript
async function batchMutate(
  ctx: AuthContext,
  operations: MutationOperation[]
): Promise<BatchResult>
```

**Input:**
```typescript
type MutationOperation =
  | { op: 'create_entity'; input: CreateEntityInput }
  | { op: 'update_entity'; input: UpdateEntityInput }
  | { op: 'delete_entity'; id: EntityId }
  | { op: 'create_relationship'; input: CreateRelationshipInput }
  | { op: 'delete_relationship'; id: string };

interface BatchResult {
  success: boolean;
  results: Array<{
    index: number;
    success: boolean;
    result?: Entity | Relationship;
    error?: KernelError;
  }>;
}
```

**Behavior:**
1. Begin transaction
2. Execute each operation in order
3. If any fails, rollback entire transaction
4. If all succeed, commit and emit all events
5. Return results for each operation

---

## Type Schema Operations

### Create Type Schema

Defines a new entity type.

**Signature:**
```typescript
async function createTypeSchema(
  ctx: AuthContext,
  schema: TypeSchemaInput
): Promise<TypeSchema>
```

### Get Type Schema

Retrieves type schema by path.

**Signature:**
```typescript
async function getTypeSchema(
  ctx: AuthContext,
  type: TypePath
): Promise<TypeSchema | null>
```

### List Type Schemas

Lists all type schemas visible to tenant.

**Signature:**
```typescript
async function listTypeSchemas(
  ctx: AuthContext,
  options?: { include_system?: boolean }
): Promise<TypeSchema[]>
```

---

## Error Handling

All operations return errors in a consistent format:

```typescript
interface KernelError {
  code: KernelErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

type KernelErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'VERSION_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'TYPE_MISMATCH'
  | 'PERMISSION_DENIED'
  | 'TENANT_MISMATCH'
  | 'CIRCULAR_DEPENDENCY'
  | 'INVALID_EXPRESSION'
  | 'REFERENCE_BROKEN';
```

**Error Examples:**
```typescript
// Version conflict
{
  code: 'VERSION_CONFLICT',
  message: 'Entity version mismatch',
  details: {
    entity_id: '...',
    expected_version: 1,
    actual_version: 2
  }
}

// Validation error
{
  code: 'VALIDATION_ERROR',
  message: 'Property validation failed',
  details: {
    property: 'price',
    reason: 'Value must be a positive number',
    value: -10
  }
}
```

---

## Transaction Guarantees

1. **Atomicity**: Batch operations are all-or-nothing
2. **Consistency**: Schema validation enforced on every write
3. **Isolation**: RLS ensures tenant isolation
4. **Durability**: Events persisted before operation returns

---

## Rate Limits & Pagination

- Default page size: 50 items
- Maximum page size: 1000 items
- Batch operation limit: 100 operations per call
- Rate limits: Implementation-specific (not in kernel spec)
