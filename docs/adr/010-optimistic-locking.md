# ADR-010: Optimistic Locking for Conflict Resolution

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team

## Context

Trellis supports collaborative editing where multiple users may modify the same entity. We need to:
- Prevent lost updates (last write wins silently)
- Inform users of conflicts
- Support offline/delayed writes
- Maintain good performance

## Decision Drivers

- Users should not lose work
- Locking should not block other users
- Real-time collaboration scenarios
- Eventual consistency is acceptable
- Clear conflict UX

## Considered Options

1. **Optimistic locking (version numbers)** - Check version on write
2. **Pessimistic locking** - Lock record during edit
3. **Last write wins** - No conflict detection
4. **CRDTs** - Automatic conflict resolution
5. **Operational transformation** - Google Docs style

## Decision

We will use **optimistic locking with version numbers**:

```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  -- ... other columns
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Update Pattern

```typescript
async function updateEntity(
  entityId: string,
  updates: Partial<Entity>,
  expectedVersion: number
): Promise<Entity> {
  const result = await prisma.entity.updateMany({
    where: {
      id: entityId,
      tenantId: context.tenantId,
      version: expectedVersion,  // Optimistic lock check
    },
    data: {
      ...updates,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  if (result.count === 0) {
    // Either not found or version mismatch
    const current = await prisma.entity.findUnique({
      where: { id: entityId }
    });

    if (!current) {
      throw new NotFoundError(`Entity ${entityId} not found`);
    }

    if (current.version !== expectedVersion) {
      throw new ConflictError({
        message: 'Entity was modified by another user',
        currentVersion: current.version,
        expectedVersion,
        currentData: current,
      });
    }

    throw new NotFoundError(`Entity ${entityId} not accessible`);
  }

  return prisma.entity.findUnique({ where: { id: entityId } });
}
```

### Client Handling

```typescript
// Client stores version with entity
interface EntityWithVersion {
  id: string;
  version: number;
  // ... other fields
}

async function saveEntity(entity: EntityWithVersion): Promise<EntityWithVersion> {
  try {
    const updated = await api.updateEntity(entity.id, entity, entity.version);
    return updated;
  } catch (error) {
    if (error instanceof ConflictError) {
      // Show conflict resolution UI
      const resolution = await showConflictDialog({
        yourChanges: entity,
        serverVersion: error.currentData,
      });

      if (resolution.action === 'overwrite') {
        // Retry with current version
        return saveEntity({
          ...entity,
          version: error.currentVersion,
        });
      } else if (resolution.action === 'merge') {
        // Apply merged changes
        return saveEntity(resolution.merged);
      } else {
        // Discard local changes
        return error.currentData;
      }
    }
    throw error;
  }
}
```

### Consequences

**Positive:**
- No blocking during reads
- Scales well with concurrent users
- Simple to implement and understand
- Works with offline scenarios

**Negative:**
- Users must handle conflicts
- Can't prevent conflicts, only detect them
- Version must be tracked through the entire flow

**Neutral:**
- Conflict resolution UX is important
- May want field-level conflict detection later

## Implementation Notes

**API contract:**
```typescript
// Update endpoint expects version
PUT /api/entities/:id
{
  "version": 5,
  "properties": {
    "name": "Updated Name"
  }
}

// Success response
200 OK
{
  "id": "...",
  "version": 6,
  "properties": { "name": "Updated Name" }
}

// Conflict response
409 Conflict
{
  "error": "CONFLICT",
  "message": "Entity was modified by another user",
  "expectedVersion": 5,
  "currentVersion": 7,
  "currentData": { ... }
}
```

**Property-level versioning (future enhancement):**
```typescript
// Each property tracks its own version
interface PropertyValue {
  value: any;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

// Allows merging non-conflicting property changes
function canAutoMerge(
  base: Entity,
  local: Entity,
  server: Entity
): boolean {
  const localChanges = getChangedProperties(base, local);
  const serverChanges = getChangedProperties(base, server);

  // No overlap = can auto-merge
  return !hasOverlap(localChanges, serverChanges);
}
```

**Real-time conflict prevention:**
```typescript
// Broadcast edit intentions
socket.emit('editing', {
  entityId: entity.id,
  propertyName: 'name',
  userId: currentUser.id,
});

// Other clients show "User X is editing name..."
socket.on('editing', ({ entityId, propertyName, userId }) => {
  showEditingIndicator(entityId, propertyName, userId);
});
```

## References

- [ADR-006: Immutable Events](./006-immutable-events.md)
- [Optimistic Concurrency Control](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
