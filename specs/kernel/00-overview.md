# Trellis Kernel Specification

## Overview

The Trellis Kernel is the foundational data model for the Trellis universal enterprise platform. It provides a flexible, type-safe substrate for modeling any enterprise data domain.

## Design Principles

1. **Entity-centric**: Everything is an Entity. Tools, products, test results, users - all represented uniformly.
2. **Property-flexible**: Properties can be literal, inherited, computed, or measured - with a consistent interface.
3. **Relationship-first**: Relationships are first-class citizens, not afterthoughts.
4. **Event-sourced**: All mutations emit events. State is derived; events are truth.
5. **Tenant-isolated**: Multi-tenancy is baked in at every layer.
6. **Type-safe**: Strong typing at rest (PostgreSQL) and in motion (TypeScript).

## Core Concepts

```
┌─────────────────────────────────────────────────────────────┐
│                         TENANT                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                      ENTITY                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │ Property │  │ Property │  │ Property │   ...    │   │
│  │  │ (Literal)│  │(Computed)│  │(Measured)│          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  └─────────────────────────────────────────────────────┘   │
│          │                                    │             │
│          │ Relationship                       │             │
│          ▼                                    ▼             │
│  ┌───────────────┐                   ┌───────────────┐     │
│  │    ENTITY     │                   │    ENTITY     │     │
│  └───────────────┘                   └───────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Specification Documents

| Document | Description |
|----------|-------------|
| [01-types.ts](./01-types.ts) | Core TypeScript type definitions |
| [02-schema.sql](./02-schema.sql) | PostgreSQL database schema |
| [03-api.md](./03-api.md) | Kernel API contract |
| [04-events.md](./04-events.md) | Event definitions and payloads |
| [05-queries.md](./05-queries.md) | Query patterns and optimization |

## Key Decisions

### Why PostgreSQL + JSONB + ltree?

- **PostgreSQL**: ACID guarantees, mature, excellent JSON support
- **JSONB**: Flexible property storage, indexable, queryable
- **ltree**: Hierarchical type paths (e.g., `product.variant.sku`)

### Why Event-Sourced?

- Audit trail for enterprise compliance
- Temporal queries ("what was this value last Tuesday?")
- Integration hooks (sync to external systems)
- Replay capability for debugging and recovery

### Why Property Sources?

Properties aren't just key-value pairs. They have *provenance*:

| Source | Example | Use Case |
|--------|---------|----------|
| Literal | `name: "Widget"` | User-entered data |
| Inherited | `category` from template | Default values, templates |
| Computed | `margin = price - cost` | Derived values |
| Measured | `length: 10.5mm ± 0.1mm` | Physical measurements with uncertainty |

## Version

Kernel Specification v0.1.0