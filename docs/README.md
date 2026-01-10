# Trellis Documentation

Welcome to the Trellis documentation. This is the living documentation for the universal enterprise data platform.

## Quick Start

| Document | Purpose |
|----------|---------|
| [Current State](./CURRENT_STATE.md) | Where we are now - read this first |
| [Glossary](./GLOSSARY.md) | Definitions of all Trellis terms |
| [Open Questions](./OPEN_QUESTIONS.md) | Unresolved design decisions |

## Architecture Decision Records (ADRs)

Architectural decisions are documented in ADRs. These explain the context, options considered, and rationale for each decision.

| ADR | Title | Status |
|-----|-------|--------|
| [000](./adr/000-template.md) | Template | - |
| [001](./adr/001-tech-stack.md) | Technology Stack | Accepted |
| [002](./adr/002-entity-properties-jsonb.md) | Entity Properties via JSONB | Accepted |
| [003](./adr/003-relationships-ltree.md) | Relationships with ltree | Accepted |
| [004](./adr/004-dimensional-properties.md) | Optional Dimensions on Properties | Accepted |
| [005](./adr/005-expressions-staleness.md) | Expressions with Staleness Propagation | Accepted |
| [006](./adr/006-immutable-events.md) | Immutable Events | Accepted |
| [007](./adr/007-blocks-specs.md) | Blocks with Specs | Accepted |
| [008](./adr/008-products-yaml.md) | Products as YAML Configuration | Accepted |
| [009](./adr/009-multi-tenancy.md) | Multi-Tenancy at Query Layer | Accepted |
| [010](./adr/010-optimistic-locking.md) | Optimistic Locking | Accepted |

## Interface Contracts

Interface contracts define the boundaries between modules. See [contracts/](./contracts/) for all contracts.

| Contract | Description |
|----------|-------------|
| [000](./contracts/000-template.md) | Template for new contracts |

## API Documentation

API specifications will be added to [api/](./api/) as they are designed.

## Guides

Developer guides will be added to [guides/](./guides/) as the project progresses.

## Directory Structure

```
docs/
├── README.md           # This file
├── CURRENT_STATE.md    # Project status and context
├── GLOSSARY.md         # Term definitions
├── OPEN_QUESTIONS.md   # Unresolved decisions
├── adr/                # Architecture Decision Records
│   ├── 000-template.md
│   └── NNN-*.md
├── contracts/          # Interface contracts
│   ├── 000-template.md
│   └── *.md
├── api/                # API specifications
│   └── *.md
└── guides/             # Developer guides
    └── *.md
```

## Contributing to Documentation

1. **New ADR**: Copy `adr/000-template.md`, use next number, follow format
2. **New Contract**: Copy `contracts/000-template.md`, name descriptively
3. **New Term**: Add to `GLOSSARY.md` in appropriate section
4. **New Question**: Add to `OPEN_QUESTIONS.md` with next OQ number
5. **Status Update**: Update `CURRENT_STATE.md`

Always keep documentation in sync with code changes.
