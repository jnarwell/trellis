# Trellis - Current State

**Last Updated:** 2025-01-10
**Status:** Phase 2.2 Complete - Core Systems

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

**Total Output:** ~14,100 lines across 37 files

---

**Phase 2.1: Foundation** ✅ Complete

Completed:
- Monorepo structure (ADR-011, resolves OQ-010 → RQ-005)
- TypeScript types implementation (63 types/interfaces)
- Database schema migration (001_initial.sql)
- Package structure: @trellis/kernel, @trellis/server, @trellis/client, @trellis/shared
- Test infrastructure (11 passing tests)

---

**Phase 2.2: Core Systems** ✅ Complete

| Component | Instance | Status | Tests |
|-----------|----------|--------|-------|
| Expression Engine | Instance 6 | ✅ Complete | 104 passing |
| Block Runtime | Instance 7 | ✅ Complete | 105 passing |
| Debug Infrastructure | Instance 8 | ✅ Complete | Integrated |
| Orchestration Plugin | Instance 9 | ✅ Complete | Ready for install |

**Total Tests:** 209 passing

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
| [011](./adr/011-monorepo-structure.md) | Monorepo with pnpm workspaces | Accepted |

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
```
packages/
├── kernel/
│   └── src/
│       ├── expressions/     # Expression Engine (lexer, parser, evaluator, functions)
│       │   ├── lexer.ts
│       │   ├── parser.ts
│       │   ├── evaluator.ts
│       │   ├── functions.ts (21 built-in functions)
│       │   ├── dependencies.ts
│       │   ├── staleness.ts
│       │   └── errors.ts
│       └── blocks/          # Block Runtime
│           ├── loader.ts    # YAML loader with includes
│           ├── binding.ts   # Data Binding system
│           ├── wiring.ts    # Event → Receiver wiring
│           ├── validator.ts # Config validation
│           └── errors.ts
├── shared/
│   └── src/
│       ├── types/           # Core type definitions
│       └── debug/           # DebugContext, traces
└── server/                  # API server (future)
```

**Test Coverage:** 209 tests passing

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

## Implementation Progress

### Phase 2.1: Foundation ✅
| Deliverable | Status | Location |
|-------------|--------|----------|
| Monorepo structure | ✅ Complete | 4 packages (@trellis/*) |
| TypeScript types | ✅ Complete | 63 types/interfaces |
| Schema migration | ✅ Complete | `001_initial.sql` |
| ADR-011 | ✅ Complete | Resolves OQ-010 → RQ-005 |
| Test infrastructure | ✅ Complete | 11 passing tests |

### Phase 2.2: Core Systems ✅
| Component | Status | Details |
|-----------|--------|---------|
| Expression Engine | ✅ Complete | Lexer, Parser, Evaluator, 21 functions, Staleness propagation, 104 tests |
| Block Runtime | ✅ Complete | 50+ ProductConfig interfaces, YAML loader, Data Binding, Wiring, 105 tests |
| Debug Infrastructure | ✅ Complete | DebugContext types, evaluation traces, AI-parseable errors |
| Orchestration Plugin | ✅ Complete | 4 agents, 5 commands, 4 skills |

**Total: 209 tests passing**

---

## What's Next

### Phase 2.2: Core Systems ✅ COMPLETE

#### Expression Engine (Instance 6) ✅
- [x] Lexer implementation (`lexer.ts`)
- [x] Parser with BNF grammar (`parser.ts`)
- [x] Evaluator (`evaluator.ts`)
- [x] 21 built-in functions
- [x] Dependency extraction (`dependencies.ts`)
- [x] Staleness propagation BFS (`staleness.ts`)
- [x] 104 passing tests

#### Block Runtime (Instance 7) ✅
- [x] 50+ ProductConfig TypeScript interfaces
- [x] YAML loader with includes resolution
- [x] Data Binding system ($scope, $params, $can, $hasRole, $now)
- [x] Wiring system (events → receivers, transforms, navigation)
- [x] 105 passing tests

#### Debug Infrastructure (Instance 8) ✅
- [x] DebugContext types for full error capture
- [x] Evaluation traces, wiring traces
- [x] AI-parseable error formatting
- [x] Debug modes (off/errors/verbose/trace)

#### Orchestration Plugin (Instance 9) ✅
- [x] 4 agents (Explore, Plan, general-purpose, claude-code-guide)
- [x] 5 commands for project workflow
- [x] 4 skills for specialized tasks
- [x] Ready for installation

### Phase 2.3: Integration
1. Expression Engine + Block Runtime integration
2. API implementation from `specs/kernel/03-api.md`
3. Event system implementation
4. End-to-end testing

### Future Phases
- Frontend foundation
- Real-time updates (SSE/WebSocket)
- Product layer deployment

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

This is being built with AI assistance using multiple specialized Claude Code instances coordinated by a human architect.

### Active Instances
| ID | Role | Status | Responsibility |
|----|------|--------|----------------|
| 1 | Documenter | 🟢 Active | Documentation, GLOSSARY, ERRORS, ADRs, CURRENT_STATE |
| 4 | Git Tracker | ⏸️ Standby | Batch commits at phase boundaries |

### Instance History
| ID | Role | Contribution | Phase | Status |
|----|------|--------------|-------|--------|
| 2 | Kernel Designer | `specs/kernel/06-expressions.md`, expression addendum | Phase 1 | 🔴 Released |
| 3 | Block System Designer | `specs/config/product-config-spec.md`, expression fixes | Phase 1 | 🔴 Released |
| 5 | Foundation Architect | Monorepo structure, types, schema, ADR-011 | Phase 2.1 | 🔴 Released |
| 6 | Expression Engine | Lexer, Parser, Evaluator, 21 functions, staleness, 104 tests | Phase 2.2 | 🔴 Released |
| 7 | Block Runtime | 50+ config types, YAML loader, Data Binding, Wiring, 105 tests | Phase 2.2 | 🔴 Released |
| 8 | Test & Debug | DebugContext types, traces, AI-parseable errors | Phase 2.2 | 🔴 Released |
| 9 | Plugin Developer | Orchestration plugin (4 agents, 5 commands, 4 skills) | Phase 2.2 | 🔴 Released |

Each instance can read CLAUDE.md and this document to understand the current state.

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
