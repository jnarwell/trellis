# ADR-006: Immutable Events for Audit, Undo, Webhooks, and Real-time

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team

## Context

Trellis needs to support:
- Complete audit trail of all changes
- Undo/redo functionality
- Webhook notifications to external systems
- Real-time updates to connected clients
- Time-travel debugging

A unified event system can power all these features.

## Decision Drivers

- Regulatory compliance requires audit trails
- Users expect undo functionality
- Integrations need change notifications
- Real-time collaboration is essential
- Single source of truth for "what happened"

## Considered Options

1. **Immutable event log** - Append-only events table
2. **Mutable audit log** - Traditional audit table with updates
3. **CDC (Change Data Capture)** - Database-level change tracking
4. **Separate systems** - Different solutions for each need

## Decision

We will use an **immutable event log** as the foundation for all change tracking:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  sequence_number BIGSERIAL,  -- Monotonically increasing per tenant

  -- Event classification
  event_type TEXT NOT NULL,   -- e.g., 'entity.created', 'property.updated'
  aggregate_type TEXT NOT NULL, -- e.g., 'entity', 'relationship'
  aggregate_id UUID NOT NULL,

  -- Event data
  payload JSONB NOT NULL,     -- Event-specific data
  metadata JSONB NOT NULL,    -- Actor, timestamp, correlation ID, etc.

  -- Immutability enforced
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Never updated or deleted
  CONSTRAINT events_immutable CHECK (TRUE)
);

-- Optimized for time-range queries
CREATE INDEX idx_events_tenant_seq ON events (tenant_id, sequence_number);
CREATE INDEX idx_events_aggregate ON events (aggregate_type, aggregate_id);
CREATE INDEX idx_events_type ON events (event_type);
CREATE INDEX idx_events_created ON events (created_at);
```

### Event Structure

```typescript
interface Event {
  id: string;
  tenantId: string;
  sequenceNumber: bigint;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  metadata: {
    actorId: string;
    actorType: 'user' | 'system' | 'webhook';
    timestamp: string;
    correlationId: string;
    causationId?: string;    // ID of event that caused this one
    clientId?: string;       // For optimistic UI
  };
  createdAt: string;
}
```

### Event Types

| Event Type | Aggregate | Description |
|------------|-----------|-------------|
| `entity.created` | entity | New entity created |
| `entity.updated` | entity | Entity properties changed |
| `entity.deleted` | entity | Entity soft-deleted |
| `property.updated` | entity | Single property changed |
| `property.computed` | entity | Expression result updated |
| `relationship.created` | relationship | Relationship established |
| `relationship.deleted` | relationship | Relationship removed |

### Consequences

**Positive:**
- Complete history of all changes
- Events are the source of truth
- Easy to replay for debugging
- Natural fit for CQRS if needed later
- Webhooks just consume from event stream
- Real-time via event subscription

**Negative:**
- Storage grows unbounded (need retention policy)
- No "delete" for GDPR (need event redaction strategy)
- Event schema evolution needs care
- Read models may lag behind events

**Neutral:**
- Current state is projection of events
- Can rebuild state from events if needed

## Implementation Notes

**Undo implementation:**
```typescript
async function undoEvent(eventId: string): Promise<Event> {
  const original = await getEvent(eventId);

  // Generate inverse event
  const inverse = generateInverseEvent(original);

  // Apply inverse as new event
  return await applyEvent(inverse);
}

function generateInverseEvent(event: Event): Partial<Event> {
  switch (event.eventType) {
    case 'property.updated':
      return {
        eventType: 'property.updated',
        payload: {
          propertyName: event.payload.propertyName,
          oldValue: event.payload.newValue,
          newValue: event.payload.oldValue,
        },
        metadata: {
          ...event.metadata,
          causationId: event.id,
        },
      };
    // ... other event types
  }
}
```

**Webhook dispatch:**
```typescript
async function dispatchWebhooks(event: Event): Promise<void> {
  const subscriptions = await getWebhookSubscriptions(
    event.tenantId,
    event.eventType
  );

  for (const sub of subscriptions) {
    await enqueueWebhookDelivery(sub, event);
  }
}
```

**Real-time subscription:**
```typescript
// Server-sent events endpoint
app.get('/events/stream', async (req, reply) => {
  const tenantId = req.tenantId;
  const lastSeq = req.query.since || 0;

  reply.raw.setHeader('Content-Type', 'text/event-stream');

  // Send historical events first
  const historical = await getEventsSince(tenantId, lastSeq);
  for (const event of historical) {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // Subscribe to new events
  const unsubscribe = subscribeToEvents(tenantId, (event) => {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.raw.on('close', unsubscribe);
});
```

## GDPR Considerations

For "right to erasure":
1. Redact PII from event payloads (replace with "[REDACTED]")
2. Keep event structure for audit integrity
3. Store redaction event for compliance proof

## References

- [ADR-002: Entity Properties via JSONB](./002-entity-properties-jsonb.md)
- [Event Sourcing pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
