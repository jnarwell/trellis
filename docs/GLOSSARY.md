# Trellis Glossary

This document defines key terms used throughout the Trellis platform. Keep this updated as new concepts are introduced.

---

## Core Concepts

### Entity
A domain object with properties and relationships. Examples: Part, Contact, Document, Test Case. Entities are instances of Entity Types.

### Entity Type
A template defining what properties an entity can have. Represented as a **TypePath** (hierarchical path like `product.variant`). Defined in product configuration YAML or type_schemas table. Similar to a "class" in OOP.

### TypePath
A hierarchical type identifier using dot notation (stored as `ltree` in PostgreSQL). Examples: `product`, `product.variant`, `test.result.measurement`. Enables type inheritance and hierarchy queries.

### Property
A named, typed attribute of an entity. Properties have a **source** that determines how their value is obtained:
- **literal**: Directly set value
- **inherited**: Value from a parent entity or template (can become stale)
- **computed**: Calculated from an expression (can become stale)
- **measured**: From a measurement with optional uncertainty

See [specs/kernel/01-types.ts](../specs/kernel/01-types.ts) for authoritative type definitions.

### Property Definition
Schema for a property within an Entity Type. Specifies name, type, validation rules, dimension category, and default value.

### Relationship
A typed connection between two entities. Can be simple (flat) or hierarchical (using ltree paths). Examples: "contains", "approved_by", "manufactured_by".

### Relationship Type
Definition of a kind of relationship. Specifies source/target entity types, whether it's hierarchical, cardinality, and metadata schema.

---

## Value System

### Value
The typed data stored in a property. Value types include:
- **text**: UTF-8 string
- **number**: Numeric with optional dimension and unit
- **boolean**: True/false
- **datetime**: ISO 8601 timestamp
- **duration**: ISO 8601 duration
- **reference**: Pointer to another entity
- **list**: Ordered collection of same-typed values
- **record**: Named collection of typed fields

### Value Node
(Legacy term from Drip) A computable unit. In Trellis, this concept evolved into the Property with its source types (literal, inherited, computed, measured).

### Computation Status
State of a computed property:
- **pending**: Never calculated
- **valid**: Up-to-date
- **stale**: Dependencies changed, needs recalculation
- **error**: Calculation failed
- **circular**: Circular dependency detected

### Data Binding
UI-layer system for accessing runtime scope in views. Syntax: `$scope.property`, `${template}`, `$can()`. Used in block props, showWhen conditions, and wiring transforms. Not dependency-tracked - evaluated at render time. See [/specs/EXPRESSION-SYSTEMS.md](../specs/EXPRESSION-SYSTEMS.md).

### Expression (Generic)
A formula that computes a value. Trellis has two distinct expression systems - see **Expression Engine** and **Data Binding**.

### Expression Engine
Kernel-layer system for computing entity property values. Syntax: `@self.property`, `#shorthand`, `SUM()`, `IF()`. Used in computed properties, lifecycle conditions, and entity filters. Dependency-tracked for staleness propagation. See [specs/kernel/06-expressions.md](../specs/kernel/06-expressions.md) and [/specs/EXPRESSION-SYSTEMS.md](../specs/EXPRESSION-SYSTEMS.md).

### Staleness Propagation
When a property changes, all properties that depend on it are marked as "stale". This propagates through the entire dependency graph.

### Dependency Graph
The network of which properties depend on which other properties. Stored in the `property_dependencies` table. Used for staleness propagation and circular dependency detection. See [specs/kernel/02-schema.sql](../specs/kernel/02-schema.sql).

### Computed Cache
Cache table (`computed_cache`) storing evaluated values for computed properties. Tracks `computation_status`, `cached_value`, and `dependencies` to avoid re-evaluation of valid expressions.

---

## Dimensions and Units

### Dimension Category
Classification of numeric values:
- **physical**: Has SI dimensions (length, mass, time, etc.)
- **currency**: Monetary value with currency code
- **none**: Dimensionless (ratios, counts)

### SI Dimensions
The seven base dimensions from physics:
- L (Length) - meter
- M (Mass) - kilogram
- T (Time) - second
- I (Current) - ampere
- Θ (Temperature) - kelvin
- N (Amount) - mole
- J (Luminosity) - candela

### Unit
A specific measurement unit (kg, lb, m, ft). Units have dimension exponents that determine compatibility.

### Dimensional Analysis
Checking that mathematical operations make physical sense. You can't add meters to kilograms.

---

## Events

### Event
An immutable record of something that happened. Contains: type, aggregate, payload, metadata. Powers audit, undo, webhooks, and real-time updates.

### Event Type
Category of event stored in the `event_type` enum:
- `entity_created`, `entity_updated`, `entity_deleted`
- `property_changed`, `property_stale`
- `relationship_created`, `relationship_deleted`
- `type_schema_created`, `type_schema_updated`

### Aggregate
The domain object an event relates to. Usually an entity or relationship.

### Sequence Number
Monotonically increasing number per tenant. Ensures event ordering.

---

## Blocks and Products

### Block
A reusable UI/logic component with a defined interface (spec). Examples: property-editor, relationship-tree, data-table.

### Block Spec
The contract defining a block's props, events, and receivers. Enables configuration-time validation of block wiring.

### Prop
An input parameter to a block. Defined with name, type, required flag, and default value.

### Event (Block)
An output signal from a block when something happens. Carries a typed payload.

### Receiver
An action a block can receive from other blocks or the system. Like a method that can be called.

### Wiring
Configuration connecting one block's events to another block's receivers.

### Product
A complete application built on Trellis. Defined in YAML configuration. Examples: PLM, CRM, Test Management.

### Product Configuration
The YAML files defining a product: entity types, views, workflows, permissions.

### View
A screen/page in a product. Composed of blocks arranged in a layout.

---

## Multi-Tenancy

### Tenant
An organization using Trellis. All data is isolated by tenant_id.

### Tenant Context
The current tenant identifier, passed through all operations. Set from authentication.

### Query-Layer Isolation
Tenant isolation enforced by always filtering queries by tenant_id.

---

## Concurrency

### Optimistic Locking
Conflict detection using version numbers. Updates fail if the version has changed since reading.

### Version
Integer incremented on each update. Used for optimistic locking.

### Conflict
When two users try to update the same entity simultaneously. Detected via version mismatch.

---

## Infrastructure

### Fastify
The Node.js web framework used for the API server.

### Prisma
The TypeScript ORM used for database access.

### ltree
PostgreSQL extension for hierarchical data. Stores materialized paths for efficient tree queries.

### JSONB
PostgreSQL's binary JSON type. Used for flexible property storage with indexing.

### GIN Index
Generalized Inverted Index. Used to index JSONB for efficient queries.

---

## Abbreviations

| Abbr | Full Form |
|------|-----------|
| ADR | Architecture Decision Record |
| BOM | Bill of Materials |
| CRM | Customer Relationship Management |
| CQRS | Command Query Responsibility Segregation |
| EAV | Entity-Attribute-Value |
| PLM | Product Lifecycle Management |
| RLS | Row-Level Security |
| SI | International System of Units |
| SSE | Server-Sent Events |

---

## See Also

- [Current State](./CURRENT_STATE.md) - Where we are now
- [Open Questions](./OPEN_QUESTIONS.md) - Unresolved decisions
- [ADRs](./adr/) - Detailed decision records
