# Trellis Kernel Event Schema

## Overview

Every mutation in Trellis emits an immutable event. Events are the source of truth - current state is derived from the event stream.

## Design Principles

1. **Immutable**: Events are never modified or deleted
2. **Ordered**: UUID v7 provides natural time ordering
3. **Complete**: Events contain enough information to reconstruct state
4. **Typed**: Every event has a defined schema

## Base Event Structure

All events share a common envelope:

```typescript
interface BaseEvent {
  /** Unique event identifier (UUID v7 - time-ordered) */
  id: EventId;

  /** Tenant this event belongs to */
  tenant_id: TenantId;

  /** Type of event */
  event_type: EventType;

  /** Entity this event relates to (if applicable) */
  entity_id?: EntityId;

  /** Who/what triggered this event */
  actor_id: ActorId;

  /** When the event occurred (ISO 8601) */
  occurred_at: string;

  /** Event-specific data */
  payload: unknown;
}
```

## Event Types

```typescript
type EventType =
  | 'entity_created'
  | 'entity_updated'
  | 'entity_deleted'
  | 'property_changed'
  | 'relationship_created'
  | 'relationship_deleted'
  | 'type_schema_created'
  | 'type_schema_updated';
```

---

## Entity Events

### entity_created

Emitted when a new entity is created.

```typescript
interface EntityCreatedEvent extends BaseEvent {
  event_type: 'entity_created';
  entity_id: EntityId;
  payload: {
    /** Entity type path */
    type: TypePath;
    /** Initial properties */
    properties: Record<PropertyName, Property>;
    /** Initial version (always 1) */
    version: 1;
  };
}
```

**Example:**
```json
{
  "id": "019467a5-7c1f-7000-8000-000000000001",
  "tenant_id": "tenant_abc",
  "event_type": "entity_created",
  "entity_id": "019467a5-7c1f-7000-8000-000000000002",
  "actor_id": "user_123",
  "occurred_at": "2024-01-15T10:30:00.000Z",
  "payload": {
    "type": "product",
    "properties": {
      "name": {
        "source": "literal",
        "name": "name",
        "value": { "type": "text", "value": "Widget Pro" }
      },
      "price": {
        "source": "literal",
        "name": "price",
        "value": { "type": "number", "value": 99.99, "unit": "USD" }
      }
    },
    "version": 1
  }
}
```

---

### entity_updated

Emitted when an entity is modified.

```typescript
interface EntityUpdatedEvent extends BaseEvent {
  event_type: 'entity_updated';
  entity_id: EntityId;
  payload: {
    /** Version before update */
    previous_version: number;
    /** Version after update */
    new_version: number;
    /** Properties that were added or changed */
    changed_properties: PropertyName[];
    /** Properties that were removed */
    removed_properties: PropertyName[];
  };
}
```

**Note:** `entity_updated` is accompanied by individual `property_changed` events for each modified property, which contain the actual before/after values.

**Example:**
```json
{
  "id": "019467a5-8d2a-7000-8000-000000000003",
  "tenant_id": "tenant_abc",
  "event_type": "entity_updated",
  "entity_id": "019467a5-7c1f-7000-8000-000000000002",
  "actor_id": "user_123",
  "occurred_at": "2024-01-15T11:00:00.000Z",
  "payload": {
    "previous_version": 1,
    "new_version": 2,
    "changed_properties": ["price"],
    "removed_properties": []
  }
}
```

---

### entity_deleted

Emitted when an entity is deleted.

```typescript
interface EntityDeletedEvent extends BaseEvent {
  event_type: 'entity_deleted';
  entity_id: EntityId;
  payload: {
    /** Entity type at time of deletion */
    type: TypePath;
    /** Final version */
    final_version: number;
    /** Whether this was a hard delete */
    hard_delete: boolean;
    /** Snapshot of properties at deletion (for recovery) */
    final_properties: Record<PropertyName, Property>;
  };
}
```

---

## Property Events

### property_changed

Emitted for each property modification. Provides granular change tracking.

```typescript
interface PropertyChangedEvent extends BaseEvent {
  event_type: 'property_changed';
  entity_id: EntityId;
  payload: {
    /** Property name */
    property_name: PropertyName;
    /** Change type */
    change_type: 'added' | 'modified' | 'removed';
    /** Previous property (null if added) */
    previous: Property | null;
    /** New property (null if removed) */
    current: Property | null;
  };
}
```

**Example - Property Modified:**
```json
{
  "id": "019467a5-8d2b-7000-8000-000000000004",
  "tenant_id": "tenant_abc",
  "event_type": "property_changed",
  "entity_id": "019467a5-7c1f-7000-8000-000000000002",
  "actor_id": "user_123",
  "occurred_at": "2024-01-15T11:00:00.000Z",
  "payload": {
    "property_name": "price",
    "change_type": "modified",
    "previous": {
      "source": "literal",
      "name": "price",
      "value": { "type": "number", "value": 99.99, "unit": "USD" }
    },
    "current": {
      "source": "literal",
      "name": "price",
      "value": { "type": "number", "value": 109.99, "unit": "USD" }
    }
  }
}
```

---

## Relationship Events

### relationship_created

Emitted when a relationship is created.

```typescript
interface RelationshipCreatedEvent extends BaseEvent {
  event_type: 'relationship_created';
  payload: {
    /** Relationship ID */
    relationship_id: string;
    /** Relationship type */
    type: RelationshipType;
    /** Source entity */
    from_entity: EntityId;
    /** Target entity */
    to_entity: EntityId;
    /** Relationship metadata */
    metadata: Record<string, Value>;
  };
}
```

**Example:**
```json
{
  "id": "019467a5-9e3c-7000-8000-000000000005",
  "tenant_id": "tenant_abc",
  "event_type": "relationship_created",
  "actor_id": "user_123",
  "occurred_at": "2024-01-15T11:30:00.000Z",
  "payload": {
    "relationship_id": "rel_001",
    "type": "belongs_to",
    "from_entity": "variant_001",
    "to_entity": "product_001",
    "metadata": {
      "position": { "type": "number", "value": 1 }
    }
  }
}
```

---

### relationship_deleted

Emitted when a relationship is removed.

```typescript
interface RelationshipDeletedEvent extends BaseEvent {
  event_type: 'relationship_deleted';
  payload: {
    /** Relationship ID */
    relationship_id: string;
    /** Relationship type */
    type: RelationshipType;
    /** Source entity */
    from_entity: EntityId;
    /** Target entity */
    to_entity: EntityId;
  };
}
```

---

## Schema Events

### type_schema_created

Emitted when a new type schema is defined.

```typescript
interface TypeSchemaCreatedEvent extends BaseEvent {
  event_type: 'type_schema_created';
  payload: {
    /** Schema ID */
    schema_id: string;
    /** Type path */
    type: TypePath;
    /** Full schema definition */
    schema: TypeSchema;
  };
}
```

---

### type_schema_updated

Emitted when a type schema is modified.

```typescript
interface TypeSchemaUpdatedEvent extends BaseEvent {
  event_type: 'type_schema_updated';
  payload: {
    /** Schema ID */
    schema_id: string;
    /** Type path */
    type: TypePath;
    /** Changes made */
    changes: {
      properties_added?: PropertySchema[];
      properties_removed?: PropertyName[];
      properties_modified?: PropertySchema[];
      other_changes?: Record<string, { previous: unknown; current: unknown }>;
    };
  };
}
```

---

## Event Consumption Patterns

### Subscribing to Events

Events can be consumed via:

1. **Polling**: Query events table with `occurred_at > last_seen`
2. **Webhooks**: Register callback URLs for event types
3. **Streaming**: PostgreSQL LISTEN/NOTIFY or external queue

### Event Filtering

```typescript
interface EventQuery {
  tenant_id: TenantId;
  event_types?: EventType[];
  entity_id?: EntityId;
  actor_id?: ActorId;
  after?: string;  // occurred_at > after
  before?: string; // occurred_at < before
  limit?: number;
}

async function queryEvents(
  ctx: AuthContext,
  query: EventQuery
): Promise<BaseEvent[]>
```

### Replaying Events

For state reconstruction or debugging:

```typescript
interface ReplayOptions {
  entity_id: EntityId;
  until?: string;  // Replay up to this timestamp
}

async function replayEntityState(
  ctx: AuthContext,
  options: ReplayOptions
): Promise<Entity>
```

---

## Event Storage

### Retention

- **Hot storage**: Last 90 days in primary events table
- **Warm storage**: 90 days - 2 years in partitioned archive
- **Cold storage**: 2+ years in external archive (S3/GCS)

### Partitioning

Events table is partitioned by month:

```sql
-- Automatic partition creation
CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Indexes

```sql
-- Primary access patterns
CREATE INDEX idx_events_entity_time ON events(entity_id, occurred_at DESC);
CREATE INDEX idx_events_tenant_type_time ON events(tenant_id, event_type, occurred_at DESC);
CREATE INDEX idx_events_actor_time ON events(actor_id, occurred_at DESC);
```

---

## Event Guarantees

| Guarantee | Description |
|-----------|-------------|
| **At-least-once delivery** | Events may be delivered multiple times to consumers |
| **Ordering per entity** | Events for same entity are ordered by occurred_at |
| **Durability** | Events persisted before API call returns |
| **Idempotency** | Event IDs enable consumer deduplication |

---

## TypeScript Event Types

Full union type for event handling:

```typescript
type KernelEvent =
  | EntityCreatedEvent
  | EntityUpdatedEvent
  | EntityDeletedEvent
  | PropertyChangedEvent
  | RelationshipCreatedEvent
  | RelationshipDeletedEvent
  | TypeSchemaCreatedEvent
  | TypeSchemaUpdatedEvent;

// Type guard example
function isEntityEvent(event: KernelEvent): event is EntityCreatedEvent | EntityUpdatedEvent | EntityDeletedEvent {
  return event.event_type.startsWith('entity_');
}

// Event handler pattern
type EventHandler<T extends KernelEvent> = (event: T) => Promise<void>;

interface EventBus {
  subscribe<T extends KernelEvent['event_type']>(
    eventType: T,
    handler: EventHandler<Extract<KernelEvent, { event_type: T }>>
  ): () => void;  // Returns unsubscribe function
}
```
