# Interface Contract: [Module/Service Name]

**Version:** 1.0.0
**Last Updated:** YYYY-MM-DD
**Owner:** [Team/Person responsible]
**Consumers:** [List of consuming modules]

## Overview

Brief description of what this interface provides.

## Dependencies

- [Dependency 1] - Why needed
- [Dependency 2] - Why needed

## Data Types

```typescript
// Define shared types here
interface ExampleType {
  id: string;
  name: string;
}
```

## Methods / Endpoints

### `methodName(params): ReturnType`

**Purpose:** What this method does

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| param1 | `string` | Yes | Description |
| param2 | `number` | No | Description |

**Returns:**
```typescript
{
  success: boolean;
  data?: ExampleType;
  error?: string;
}
```

**Errors:**
| Code | Message | When |
|------|---------|------|
| `NOT_FOUND` | Entity not found | Entity with given ID doesn't exist |
| `VALIDATION` | Invalid input | Input fails validation |

**Example:**
```typescript
const result = await methodName({ param1: 'value' });
```

## Events Emitted

| Event | Payload | When Emitted |
|-------|---------|--------------|
| `entity.created` | `{ id, type, data }` | After entity creation |

## Events Consumed

| Event | Handler | Action Taken |
|-------|---------|--------------|
| `other.event` | `handleOtherEvent` | Description of action |

## Invariants

- [Invariant 1: Always true condition]
- [Invariant 2: Business rule that must hold]

## Performance Expectations

- Expected latency: < X ms
- Throughput: X requests/second
- Data volume limits: X

## Versioning Strategy

How breaking changes will be handled.
