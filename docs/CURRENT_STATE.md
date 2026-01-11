# Trellis - Current State

**Last Updated:** 2026-01-10
**Status:** Phase 2.5 In Progress - UI Layer

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

---

**Phase 2.3: API Layer** ✅ Complete

| Component | Instance | Status | Tests |
|-----------|----------|--------|-------|
| Server Setup | Instance 10 | ✅ Complete | Fastify + Prisma |
| Entity API | Instance 11 | ✅ Complete | Full CRUD |
| Relationship API | Instance 12 | ✅ Complete | Hierarchy support |
| Query Engine | Instance 13 | ✅ Complete | Cursor pagination |
| Event Emitter | Instance 14 | ✅ Complete | Immutable log |

**Total Tests:** 446 passing (+237 from Phase 2.2)

---

**Phase 2.4: Full Stack** ✅ Complete

| Component | Instance | Status | Tests |
|-----------|----------|--------|-------|
| Computed Property Evaluation | Instance 15 | ✅ Complete | Expression Engine wired |
| JWT Authentication | Instance 16 | ✅ Complete | Replaces header-based |
| WebSocket Subscriptions | Instance 17 | ✅ Complete | Real-time events |
| Integration Test Harness | Instance 18 | ✅ Complete | E2E coverage |

**Total Tests:** 607 passing (+161 from Phase 2.3)

| Package | Tests |
|---------|-------|
| @trellis/kernel | 134 |
| @trellis/server | 419 |
| @trellis/client | 54 |

---

**Phase 2.5: UI Layer** 🟢 In Progress

| Component | Instance | Status | Notes |
|-----------|----------|--------|-------|
| Client SDK | Instance 19 | ✅ Complete | 127 tests, React hooks |
| PLM Demo Product | Instance 24 | ✅ Complete | 11 YAML files, computed props |
| Product Loader | Instance 25 | ✅ Complete | 80+ tests, schema validation |
| Storybook Setup | Instance 26 | ✅ Complete | Component dev at localhost:6006 |
| React Blocks | Instances 20-22 | 🟢 In Progress | Table, Form, Detail, Kanban |
| Block Integration | Instance 23 | ⏳ Queued | After 20-22 |

### Demo Product Structure
```
products/plm-demo/
├── product.yaml              # Main manifest
├── entities/
│   ├── product.yaml          # With computed margin, stock_status
│   ├── category.yaml         # With computed product_count
│   ├── supplier.yaml         # With computed total_products
│   └── inventory.yaml
├── views/
│   ├── dashboard.yaml        # Stats + recent products
│   ├── products.yaml         # Product table
│   ├── product-detail.yaml
│   ├── product-form.yaml
│   └── categories.yaml
└── navigation.yaml
```

### Storybook Infrastructure
```bash
pnpm --filter @trellis/client storybook
# Opens at http://localhost:6006
```

**Structure:**
```
packages/client/
├── .storybook/
│   ├── main.ts           # Storybook 8 + react-vite
│   └── preview.ts        # Global config
├── src/
│   ├── test-utils/
│   │   └── mock-client.ts  # Mock TrellisClient for stories
│   └── stories/
│       ├── Introduction.mdx
│       ├── foundations/    # Colors, Typography
│       └── blocks/         # Table, Form, Detail, Kanban placeholders
```

**Block Placeholders:**
- TableBlock - 4 variants (Default, WithFilters, WithPagination, Loading)
- FormBlock - 4 variants (Create, Edit, WithValidation, Loading)
- DetailBlock - 3 variants (Default, WithSections, Loading)
- KanbanBlock - 3 variants (Default, WithDragDrop, Loading)

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
├── server/
│   └── src/
│       ├── index.ts         # Fastify app setup
│       ├── plugins/         # Fastify plugins (prisma, tenant, auth)
│       ├── routes/
│       │   ├── entities.ts  # Entity CRUD endpoints
│       │   ├── relationships.ts  # Relationship endpoints
│       │   ├── queries.ts   # Query engine endpoints
│       │   └── auth/        # Auth endpoints (login, refresh)
│       ├── services/
│       │   ├── entity.service.ts
│       │   ├── relationship.service.ts
│       │   ├── query.service.ts
│       │   └── event.service.ts  # Event emitter
│       ├── auth/            # JWT authentication (Phase 2.4)
│       │   ├── jwt.ts       # Token signing/verification
│       │   ├── tokens.ts    # Token generation
│       │   └── types.ts     # Auth types
│       ├── evaluation/      # Computed property evaluation (Phase 2.4)
│       │   ├── context-builder.ts
│       │   ├── evaluator.ts
│       │   ├── computation-service.ts
│       │   └── recalculation-handler.ts
│       ├── websocket/       # Real-time subscriptions (Phase 2.4)
│       │   ├── protocol.ts
│       │   ├── subscriptions.ts
│       │   ├── connection.ts
│       │   └── handlers.ts
│       └── lib/
│           ├── pagination.ts # Cursor pagination
│           └── errors.ts    # API error types
│   └── tests/
│       ├── harness/         # Test infrastructure (Phase 2.4)
│       └── e2e/             # End-to-end tests
└── client/
    └── src/
        ├── index.ts         # TrellisClient export
        └── client.ts        # Tenant-scoped API client
```

**Test Coverage:** 607 tests passing

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
| Expression Engine | ✅ Complete | Lexer, Parser, Evaluator, 21 functions, Staleness propagation |
| Block Runtime | ✅ Complete | 50+ ProductConfig interfaces, YAML loader, Data Binding, Wiring |
| Debug Infrastructure | ✅ Complete | DebugContext types, evaluation traces, AI-parseable errors |
| Orchestration Plugin | ✅ Complete | 4 agents, 5 commands, 4 skills |

### Phase 2.3: API Layer ✅
| Component | Status | Details |
|-----------|--------|---------|
| Server Setup | ✅ Complete | Fastify app, Prisma plugin, tenant context, auth middleware |
| Entity API | ✅ Complete | Full CRUD, optimistic locking, RLS enforcement |
| Relationship API | ✅ Complete | Create/delete, hierarchy queries, ltree support |
| Query Engine | ✅ Complete | Cursor pagination, filtering, sorting, property queries |
| Event Emitter | ✅ Complete | Immutable event log, 8 event types, sequence numbers |

### Phase 2.4: Full Stack ✅
| Component | Status | Details |
|-----------|--------|---------|
| Computed Property Evaluation | ✅ Complete | Expression Engine wired to server, EvaluationContext, recalculation handler |
| JWT Authentication | ✅ Complete | Access tokens (1h), refresh tokens (7d), replaces header-based auth |
| WebSocket Subscriptions | ✅ Complete | Real-time event subscriptions, connection management, filters |
| Integration Test Harness | ✅ Complete | TestHarness class, database pool, E2E test structure |

**Total: 607 tests passing**

### Phase 2.5: UI Layer 🟢
| Component | Status | Details |
|-----------|--------|---------|
| Client SDK | ✅ Complete | 127 tests, TrellisClient, React hooks, WebSocket hooks |
| PLM Demo Product | ✅ Complete | 11 YAML files, 4 entities with computed props, 5 views |
| Product Loader | ✅ Complete | 80+ tests, schema validation, entity type registration |
| Storybook Setup | ✅ Complete | Storybook 8.x, block placeholders, mock client |
| React Blocks | 🟢 In Progress | Table, Form, Detail, Kanban (Instances 20-22) |
| Block Integration | ⏳ Queued | After React Blocks (Instance 23) |

---

## What's Next

### Phase 2.4: Full Stack ✅ COMPLETE

#### Computed Property Evaluation (Instance 15) ✅
- [x] EvaluationContext builder
- [x] Server-side expression evaluator
- [x] ComputationService for orchestration
- [x] RecalculationHandler for staleness events

#### JWT Authentication (Instance 16) ✅
- [x] Access token generation (1h expiry)
- [x] Refresh token generation (7d expiry)
- [x] JWT verification middleware
- [x] Login and refresh endpoints

#### WebSocket Subscriptions (Instance 17) ✅
- [x] WebSocket protocol definition
- [x] Subscription management
- [x] Connection lifecycle handling
- [x] Event filtering and broadcasting

#### Integration Test Harness (Instance 18) ✅
- [x] TestHarness class with setup/teardown
- [x] Database pool management
- [x] E2E test structure
- [x] Tenant isolation in tests

### Phase 2.5: UI Layer 🟢 IN PROGRESS

#### PLM Demo Product (Instance 24) ✅
- [x] Product entity with computed margin, stock_status
- [x] Category entity with computed product_count
- [x] Supplier entity with computed total_products
- [x] Inventory entity with reorder expressions
- [x] Dashboard, product list, detail, form views
- [x] Navigation with badge queries

#### Storybook Setup (Instance 26) ✅
- [x] Storybook 8.x configuration
- [x] Block placeholder stories
- [x] Visual development at localhost:6006
- [x] React + TypeScript integration

#### Client SDK (Instance 19) ✅
- [x] TrellisClient with full API coverage
- [x] React hooks for data fetching (useEntity, useEntities, useQuery)
- [x] WebSocket subscription hooks (useSubscription)
- [x] 127 tests

#### Product Loader (Instance 25) ✅
- [x] Server-side YAML loader with validation
- [x] Schema generation from YAML definitions
- [x] Entity type registration in database
- [x] 80+ tests

#### React Blocks (Instances 20-22) 🟢
- [ ] TableBlock - Data table with sorting/filtering (Instance 20)
- [ ] FormBlock - Entity create/edit forms (Instance 21)
- [ ] DetailBlock - Entity detail view (Instance 22)
- [ ] KanbanBlock - Status-based card view (Instance 22)

#### Block Integration (Instance 23) ⏳
- [ ] Wire blocks to real API
- [ ] Navigation between views
- [ ] End-to-end demo flow

### Phase 2.6: Production (Next)
1. Permission system (role-based access control)
2. Audit log UI (query event store)
3. Deployment configuration
4. Performance optimization

### Future Phases
- Multi-region support
- Plugin marketplace
- Advanced analytics

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
| 10 | Server Setup | Fastify app, Prisma plugin, tenant context, auth middleware | Phase 2.3 | 🔴 Released |
| 11 | Entity API | Full CRUD, optimistic locking, RLS enforcement, 258 tests | Phase 2.3 | 🔴 Released |
| 12 | Relationship API | Create/delete, hierarchy queries, ltree support | Phase 2.3 | 🔴 Released |
| 13 | Query Engine | Cursor pagination, filtering, sorting, property queries | Phase 2.3 | 🔴 Released |
| 14 | Event Emitter | Immutable event log, 8 event types, sequence numbers | Phase 2.3 | 🔴 Released |
| 15 | Computed Property Evaluation | EvaluationContext, ComputationService, RecalculationHandler | Phase 2.4 | 🔴 Released |
| 16 | JWT Authentication | Access/refresh tokens, JWT middleware, login endpoints | Phase 2.4 | 🔴 Released |
| 17 | WebSocket Subscriptions | Protocol, subscriptions, connection management, handlers | Phase 2.4 | 🔴 Released |
| 18 | Integration Test Harness | TestHarness class, database pool, E2E test structure | Phase 2.4 | 🔴 Released |
| 19 | Client SDK | TrellisClient, React hooks, WebSocket hooks, 127 tests | Phase 2.5 | 🔴 Released |
| 20 | TableBlock | Data table with sorting, filtering, pagination | Phase 2.5 | 🟢 Active |
| 21 | FormBlock | Entity create/edit forms with validation | Phase 2.5 | 🟢 Active |
| 22 | Detail + Kanban | DetailBlock and KanbanBlock components | Phase 2.5 | 🟢 Active |
| 23 | Block Integration | Wire blocks to API, navigation, E2E demo | Phase 2.5 | ⏳ Queued |
| 24 | PLM Demo Product | 11 YAML files, 4 entities, 5 views, computed props | Phase 2.5 | 🔴 Released |
| 25 | Product Loader | YAML loading, schema validation, 80+ tests | Phase 2.5 | 🔴 Released |
| 26 | Storybook Setup | Storybook 8.x, block placeholders, mock client | Phase 2.5 | 🔴 Released |

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
