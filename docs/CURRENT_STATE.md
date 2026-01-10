# Trellis - Current State

**Last Updated:** 2026-01-10
**Status:** Project Inception

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

**Phase 0: Documentation & Architecture** (Current)

We are establishing:
- Core architectural decisions (ADRs)
- Terminology and glossary
- Interface contracts
- Documentation structure

No implementation code has been written yet.

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

### Documentation
```
docs/
├── adr/
│   ├── 000-template.md
│   ├── 001-tech-stack.md
│   ├── 002-entity-properties-jsonb.md
│   ├── 003-relationships-ltree.md
│   ├── 004-dimensional-properties.md
│   ├── 005-expressions-staleness.md
│   ├── 006-immutable-events.md
│   ├── 007-blocks-specs.md
│   ├── 008-products-yaml.md
│   ├── 009-multi-tenancy.md
│   └── 010-optimistic-locking.md
├── contracts/
│   └── 000-template.md
├── api/
│   └── (empty - to be created)
├── guides/
│   └── (empty - to be created)
├── GLOSSARY.md
├── CURRENT_STATE.md (this file)
└── OPEN_QUESTIONS.md
```

### Code
None yet.

---

## What's Next

### Immediate (Phase 1: Foundation)
1. Initialize TypeScript monorepo structure
2. Set up Prisma with PostgreSQL schema
3. Implement core entity CRUD
4. Implement property system with JSONB
5. Add tenant isolation

### Near-Term (Phase 2: Kernel)
1. Expression parser and evaluator
2. Dependency tracking and staleness
3. Relationship management with ltree
4. Event system foundation
5. Basic API endpoints

### Future (Phase 3+)
1. Block system and specs
2. Product configuration loading
3. Frontend foundation
4. Real-time updates
5. Webhook delivery

---

## Reference Implementation

The architecture is inspired by the **Drip Team Portal** codebase at:
```
/Users/jmarwell/drip-3d.com/drip-team-portal/
```

Key patterns borrowed:
- Value node concept (literal/expression/reference)
- Computation status tracking
- SI dimensional analysis for units
- Property source lookups

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

- [Glossary](./GLOSSARY.md) - Term definitions
- [Open Questions](./OPEN_QUESTIONS.md) - Unresolved decisions
- [ADR Template](./adr/000-template.md) - For new decisions
- [Contract Template](./contracts/000-template.md) - For new interfaces
