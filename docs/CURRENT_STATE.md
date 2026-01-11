# Trellis - Current State

**Last Updated:** 2025-01-10
**Status:** Phase 1 Complete - Specification

---

## What is Trellis?

Trellis is a **universal enterprise data platform** that allows any enterprise tool (PLM, CRM, testing systems, etc.) to be configured from a common kernel of entities, properties, relationships, and events.

Instead of building separate applications for each use case, Trellis provides:
- A flexible data model (entities with typed properties)
- A relationship system with hierarchies
- An expression engine with dimensional analysis
- An immutable event log
- A configuration-driven UI system (blocks and products)

---

## Project Phase

**Phase 1: Specification** ✅ Complete

Completed:
- Core architectural decisions (10 ADRs)
- Terminology and glossary
- Kernel specifications (types, schema, API, events, queries, expressions)
- Block system design specification
- Product configuration specification
- Expression systems reconciliation (two-systems model)
- CLAUDE.md for Claude Code instance onboarding

**Total Output:** ~12,700+ lines across 32+ files

---

## Architectural Decisions Made

| ADR | Decision | Status |
|-----|----------|--------|
| [001](./adr/001-tech-stack.md) | TypeScript + Fastify + Prisma + React + PostgreSQL | Accepted |
| [002](./adr/002-entity-properties-jsonb.md) | Entity properties stored in JSONB | Accepted |
| [003](./adr/003-relationships-ltree.md) | Relationships with ltree for hierarchies | Accepted |
| [004](./adr/004-dimensional-properties.md) | Optional dimensions (physical/currency/none) | Accepted |
| [005](./adr/005-expressions-staleness.md) | Expressions with staleness propagation | Accepted |
| [006](./adr/006-immutable-events.md) | Immutable event log for audit/undo/webhooks | Accepted |
| [007](./adr/007-blocks-specs.md) | Blocks with specs (executable contracts) | Accepted |
| [008](./adr/008-products-yaml.md) | Products as YAML configuration | Accepted |
| [009](./adr/009-multi-tenancy.md) | Multi-tenancy at query layer | Accepted |
| [010](./adr/010-optimistic-locking.md) | Optimistic locking for conflicts | Accepted |

---

## What Exists

### Kernel Specifications (Authoritative)
```
specs/kernel/
├── 00-overview.md              # Kernel design overview
├── 01-types.ts                 # TypeScript type definitions
├── 02-schema.sql               # PostgreSQL schema with RLS
├── 03-api.md                   # API contract specification
├── 04-events.md                # Event system specification
├── 05-queries.md               # Query patterns and indexes
├── 06-expressions.md           # Expression engine specification
└── 06-expressions-addendum.md  # Filter syntax decisions
```

### Block System Specifications
```
specs/blocks/
└── block-system-design.md      # Block runtime and spec system
```

### Product Configuration Specifications
```
specs/config/
├── product-config-spec.md      # Full product YAML specification
├── EXPRESSION-QUICK-REF.md     # Expression syntax cheat sheet
├── EXPRESSION-GAPS.md          # Gap analysis (all resolved)
└── EXPRESSION-NEEDS-SCRATCHPAD.md
```

### Expression Systems Reference
```
specs/
└── EXPRESSION-SYSTEMS.md       # Authoritative two-systems reference
```

### Documentation
```
docs/
├── adr/                 # 11 architecture decision records
├── contracts/           # Interface contract templates
├── GLOSSARY.md          # Term definitions (synced with specs)
├── CURRENT_STATE.md     # This file
├── OPEN_QUESTIONS.md    # Unresolved decisions
├── ERRORS.md            # Error log and lessons learned
└── CLAUDE-SCRATCHPAD.md # CLAUDE.md development notes
```

### Root Files
```
/
├── CLAUDE.md            # Project context for Claude Code instances
└── README.md            # Project overview
```

### Implementation Code
None yet - specs are complete and ready for implementation.

---

## Key Decisions This Phase

### Two Expression Systems

| System | Purpose | Syntax | Used In |
|--------|---------|--------|---------|
| Expression Engine | Entity computations | `@self.x`, `#x`, `SUM()`, `IF()` | Computed props, lifecycle `when`, entity filters |
| Data Binding | UI scope access | `$scope.x`, `$can()`, `${template}` | Block props, `showWhen`, wiring transforms |

**Core Principle:**
- Entity data → Expression Engine (deterministic, dependency-tracked)
- UI display → Data Binding (runtime context, reactive)

See [/specs/EXPRESSION-SYSTEMS.md](../specs/EXPRESSION-SYSTEMS.md) for authoritative reference.

---

## What's Next

### Phase 2: Implementation

#### Immediate
1. Initialize TypeScript monorepo structure (see OQ-010)
2. Implement kernel from specs (`specs/kernel/`)
3. Set up PostgreSQL with schema from `02-schema.sql`
4. Implement API from `03-api.md`
5. Add tests for all kernel operations

#### Expression Engine
1. Expression parser (TEL - Trellis Expression Language)
2. Dependency extraction from expressions
3. Staleness propagation implementation
4. Computed cache management

#### Block Runtime
1. Block spec loading and validation
2. Data Binding evaluator
3. Block wiring system
4. Event/receiver communication

#### Product Layer
1. YAML config loading and validation
2. Frontend foundation
3. Real-time updates via SSE/WebSocket

---

## Reference Implementation

The architecture is inspired by the **Drip Team Portal** codebase at:
```
/Users/jmarwell/drip-3d.com/drip-team-portal/
```

Key patterns borrowed:
- Property sources (literal/inherited/computed/measured)
- Computation status tracking (pending/valid/stale/error/circular)
- SI dimensional analysis for units
- Value types with dimension support

---

## Team Context

This is being built with AI assistance using multiple specialized instances:
- **Architect**: High-level design decisions
- **Documenter**: This documentation (you're reading it!)
- **Implementers**: Will write the actual code
- **Reviewers**: Code review and quality

Each instance can read this document to understand the current state.

---

## How to Contribute

1. Read the [Glossary](./GLOSSARY.md) to understand terminology
2. Review relevant [ADRs](./adr/) for context on decisions
3. Check [Open Questions](./OPEN_QUESTIONS.md) for unresolved items
4. When making changes, update this document

---

## Quick Links

- [CLAUDE.md](../CLAUDE.md) - Start here for new Claude Code instances
- [Expression Systems](../specs/EXPRESSION-SYSTEMS.md) - Two-systems reference
- [Kernel Types](../specs/kernel/01-types.ts) - Authoritative type definitions
- [Kernel Schema](../specs/kernel/02-schema.sql) - PostgreSQL schema
- [Kernel API](../specs/kernel/03-api.md) - API contract
- [Glossary](./GLOSSARY.md) - Term definitions
- [Open Questions](./OPEN_QUESTIONS.md) - Unresolved decisions
- [Errors Log](./ERRORS.md) - Past mistakes and lessons
- [ADR Template](./adr/000-template.md) - For new decisions
