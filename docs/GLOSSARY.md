# Trellis Glossary

This document defines key terms used throughout the Trellis platform. Keep this updated as new concepts are introduced.

---

## Core Concepts

### Entity
A domain object with properties and relationships. Examples: Part, Contact, Document, Test Case. Entities are instances of Entity Types.

### Entity Type
A template defining what properties an entity can have. Defined in product configuration YAML. Similar to a "class" in OOP or a "table" in databases.

### Property
A named, typed attribute of an entity. Properties can be:
- **Literal**: Direct values (string, number, boolean, date)
- **Expression**: Computed from other properties
- **Reference**: Pointer to another entity

### Property Definition
Schema for a property within an Entity Type. Specifies name, type, validation rules, dimension category, and default value.

### Relationship
A typed connection between two entities. Can be simple (flat) or hierarchical (using ltree paths). Examples: "contains", "approved_by", "manufactured_by".

### Relationship Type
Definition of a kind of relationship. Specifies source/target entity types, whether it's hierarchical, cardinality, and metadata schema.

---

## Value System

### Value Node
(Legacy term from Drip) A computable unit - either a literal value, expression, or reference. In Trellis, this concept is embedded in Property values.

### Computation Status
State of a computed property:
- **pending**: Never calculated
- **valid**: Up-to-date
- **stale**: Dependencies changed, needs recalculation
- **error**: Calculation failed
- **circular**: Circular dependency detected

### Expression
A formula that computes a property value from other properties. Uses syntax like `#material_cost + #labor_cost`. See [ADR-005](./adr/005-expressions-staleness.md).

### Staleness Propagation
When a property changes, all properties that depend on it are marked as "stale". This propagates through the entire dependency graph.

### Dependency Graph
The network of which properties depend on which other properties. Used for staleness propagation and circular dependency detection.

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
Category of event: `entity.created`, `property.updated`, `relationship.deleted`, etc.

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
