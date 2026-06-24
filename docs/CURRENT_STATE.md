# Trellis - Current State

**Last Updated:** 2026-06-24
**Status:** Phase 2.12 - differentiator hardening (the PLM-grade engine features are now real, not aspirational)

---

## Differentiator Hardening (Phase 2.12)

A research/verification pass found that the features distinguishing Trellis from
a generic config-driven CRUD tool were declared but inert. These four rounds
made them real, each with tests:

- **Dimensional analysis** (`packages/kernel/src/expressions/units.ts`): the
  expression engine treats numbers as physical quantities. Incompatible
  dimensions error (`5_m + 3_s` throws `DIMENSION_MISMATCH`); compatible units
  convert (`1_m + 300_mm = 1.3_m`); results carry their dimension/unit;
  scaling/ratios behave. (kernel +14 tests)
- **Measured uncertainty**: the engine propagates uncertainty through arithmetic
  (quadrature for ±, relative for ×/÷, across unit conversion), and the data
  table renders `value ± uncertainty unit` (PLM part mass, e.g. `84.5 ± 0.5 g`).
  (kernel +6 tests)
- **Seed loading** (`packages/server/src/loader/seed-data.ts`): the product
  loader actually inserts seed data now — `loadSeedData` was a stub, so
  `trellis serve` produced an empty app. It reads `<product>/seed/*.json` (the
  same format the demo mock consumes) and inserts entities + relationships under
  the loaded tenant. (server +6 tests)
- **Read-time inheritance** (`packages/server/src/services/inheritance-resolver.ts`):
  `inherited` properties resolve their `from_entity`/`from_property` pointer to
  the source's effective value (chains, overrides, missing-source errors, cycle
  detection). The `resolveInherited` read option was previously a no-op.
  (server +10 tests)

**Tests:** 883 passing (kernel 168, server 445, client 270).

---

## Demo Highlights (Phase 2.11)

The demo is now a self-explanatory product tour at `pnpm --filter @trellis/client dev`:

- **Guided shell** (`packages/client/src/DemoShell.tsx`): top-bar switchers for
  all 7 products and 3 roles; a first-visit welcome hint; live connection dot.
- **Live config editor**: `</> View config` opens the product YAML in an
  editor — edit it, Apply, and the app re-renders from the parsed config
  (`DynamicProductApp` `configOverride` prop). Parse errors inline; revert to
  file. The clearest possible demonstration of "config IS the app."
- **Design system**: modern theme tokens, semantic status badges (auto-colored
  by value via `blocks/status-tone.ts`), polished KPI cards / tables / kanban.
- **Computed KPIs**: dashboards aggregate, not just count — CRM pipeline value
  = `SUM(amount)` as currency, inventory units on hand, PLM total mass — all
  from the stats block's `aggregate: sum` + `format`.
- **Functional feedback**: toasts on create/update/delete; real-time pushes.
- **6 recognizable products** (CRM, bug tracker, ATS, inventory, help desk,
  PLM) + kitchen-sink, each one YAML file with KPI-row dashboards.

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

**Phase 2.5: UI Layer** ✅ Complete

| Component | Instance | Status | Tests |
|-----------|----------|--------|-------|
| Client SDK | Instance 19 | ✅ Complete | 127 |
| PLM Demo Product | Instance 24 | ✅ Complete | YAML configs |
| Product Loader | Instance 25 | ✅ Complete | 80+ |
| Storybook Setup | Instance 26 | ✅ Complete | Dev infra |
| React Blocks | Instances 20-22 | ✅ Complete | 143 |
| Block Integration | Instance 23 | ✅ Complete | E2E wiring |

**Total Tests:** 827 passing (+220 from Phase 2.4)

| Package | Tests |
|---------|-------|
| @trellis/kernel | 134 |
| @trellis/server | 423 |
| @trellis/client | 270 |

### React Blocks (Instances 20-22)

| Block | Features | Tests |
|-------|----------|-------|
| TableBlock | 12 cell formats, sorting, filtering, pagination, bulk select, column resize | 42 |
| FormBlock | 7 field types, validation, sections, conditional fields, auto-save | 66 |
| DetailBlock | Property display, computed values, relationship links, sections | 15 |
| KanbanBlock | Drag-drop cards, WIP limits, swimlanes, status filtering | 20 |

### Block Integration (Instance 23)

Architecture wiring blocks to live API:

```
ProductApp (shell)
└── TrellisProvider (auth + client)
    └── ViewRenderer (layout)
        └── BlockRenderer (registry lookup)
            └── [TableBlock | FormBlock | DetailBlock | KanbanBlock]
```

Components:
- **Block Registry**: Maps block names to React components
- **BlockRenderer**: Resolves blocks, injects props, handles wiring
- **ProductApp**: Authentication shell with navigation
- **ViewRenderer**: Parses YAML view configs, renders layout

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

### Client SDK (Instance 19)

TypeScript SDK for calling Trellis API from React.

**Location:** `packages/client/src/sdk/` and `packages/client/src/state/`

**Features:**
- HTTP client with automatic auth header injection
- Proactive token refresh (refreshes when <2 min remaining)
- Fluent query builder API
- WebSocket with auto-reconnect (exponential backoff: 1s→30s max)
- React hooks: `useEntity`, `useQuery`, `useSubscription`
- LRU entity cache with TTL and WebSocket invalidation

**Usage:**
```typescript
import { TrellisClient, TrellisProvider, useQuery } from '@trellis/client';

const client = new TrellisClient({ baseUrl: 'http://localhost:3000' });

// Fluent query
const products = await client
  .query('product')
  .where('status', 'eq', 'active')
  .orderBy('name')
  .limit(50)
  .execute();

// React hook
const { data, loading } = useQuery('product', { filter: { status: 'active' } });
```

**Tests:** 127 passing

### Product Loader (Instance 25)

CLI and library for loading YAML product definitions into the database.

**Location:** `packages/server/src/loader/` and `packages/server/src/cli/`

**CLI Commands:**
```bash
# Load product definition
trellis load ./products/plm-demo --force --dry-run

# Validate without loading
trellis validate ./products/plm-demo --verbose

# Start server with product
trellis serve ./products/plm-demo --port 3000
```

**Features:**
- Atomic transactions (rollback on failure)
- `--force` to overwrite existing schemas
- `--dry-run` for validation without writing
- `--skip-seed` to skip initial data
- Event emitter for progress tracking
- Type inheritance support

**Tests:** 80+ passing

---

## Feature Capture System

A pipeline for converting competitive research into Trellis YAML products.

### Pipeline Overview
```
Domain Researcher (Agent)
         │
         ▼
Feature Capture Template
         │
         ▼
YAML Generator (Skill)
         │
         ▼
products/[name]/ (Draft YAML)
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Feature Capture Template | `docs/product-research/FEATURE-CAPTURE-TEMPLATE.md` | 9-section research template |
| Research Guide | `docs/product-research/RESEARCH-GUIDE.md` | Legal sources, type mapping |
| PLM Example | `docs/product-research/examples/plm-capture-example.md` | Real competitor analysis |
| Domain Researcher | `.claude/agents/domain-researcher.md` | Agent definition |
| Competitive Analysis | `.claude/skills/competitive-analysis.md` | Research methodology |
| YAML Generator | `.claude/skills/yaml-generator.md` | Template → YAML conversion |
| Generation Guide | `docs/product-research/YAML-GENERATION-GUIDE.md` | Step-by-step usage |

### Usage

**Start a new product research:**
```
Spawn a Domain Researcher for [domain] domain,
focusing on [market segment]. Analyze [competitor1], [competitor2], [competitor3].
```

**Generate YAML from completed research:**
```
Use the YAML Generator skill to convert
docs/product-research/captures/[domain]-capture.md
into a Trellis product at products/[name]/
```

### Template Sections

1. Market Overview - Domain, players, personas
2. Core Entities - Data objects, properties, types
3. Relationships - Connections, cardinality
4. Feature Analysis - Killer features, table stakes, pain points
5. UX Patterns - Navigation, data entry, visualization
6. Workflows - Processes, approvals, lifecycles
7. Gap Analysis - Opportunities, differentiation
8. Research Sources - Links, reviews analyzed
9. Draft YAML - Ready for `products/` directory

### Type Mapping (Quick Reference)

| Research Term | Trellis Type |
|---------------|--------------|
| text, string | `{ type: text }` |
| number, integer | `{ type: number }` |
| currency, money | `{ type: number, dimension: currency }` |
| date | `{ type: datetime, format: date }` |
| yes/no, boolean | `{ type: boolean }` |
| dropdown, enum | `{ type: text, enum: [...] }` |
| reference, link | `{ type: reference, target: entity }` |

### Expression Mapping

| Business Logic | Trellis Expression |
|----------------|-------------------|
| Sum children | `SUM(@self.items[*].amount)` |
| Count related | `COUNT(@self.items[*])` |
| Percentage | `@self.part / @self.whole * 100` |
| Conditional | `IF(@self.x > 0, 'Yes', 'No')` |

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
| [012](./adr/012-rbac-permissions.md) | RBAC: permission strings enforce, roles bundle (resolves OQ-005) | Accepted |

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

**Test Coverage:** 827 tests passing

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

### Phase 2.5: UI Layer ✅
| Component | Status | Details |
|-----------|--------|---------|
| Client SDK | ✅ Complete | 127 tests, TrellisClient, React hooks, WebSocket hooks |
| PLM Demo Product | ✅ Complete | 11 YAML files, 4 entities with computed props, 5 views |
| Product Loader | ✅ Complete | 80+ tests, schema validation, entity type registration |
| Storybook Setup | ✅ Complete | Storybook 8.x, block placeholders, mock client |
| React Blocks | ✅ Complete | TableBlock (42), FormBlock (66), DetailBlock (15), KanbanBlock (20) |
| Block Integration | ✅ Complete | Block Registry, BlockRenderer, ProductApp, ViewRenderer |

**Total: 827 tests passing**

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

### Phase 2.5: UI Layer ✅ COMPLETE

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

#### React Blocks (Instances 20-22) ✅
- [x] TableBlock - 12 cell formats, sorting, filtering, pagination (42 tests)
- [x] FormBlock - 7 field types, validation, sections, conditional fields (66 tests)
- [x] DetailBlock - Property display, computed values, relationship links (15 tests)
- [x] KanbanBlock - Drag-drop, WIP limits, swimlanes (20 tests)

#### Block Integration (Instance 23) ✅
- [x] Block Registry - Maps block names to React components
- [x] BlockRenderer - Resolves blocks, injects props, handles wiring
- [x] ProductApp - Authentication shell with navigation
- [x] ViewRenderer - Parses YAML view configs, renders layout

### Phase 2.6: E2E Demo ✅ COMPLETE

#### Client Entry Point ✅
- [x] `packages/client/index.html` - HTML shell
- [x] `packages/client/src/main.tsx` - React entry with PLM config
- [x] `packages/client/vite.config.ts` - Dev server + API proxy
- [x] Vite proxy configuration for `/api` routes

#### E2E Integration Fixes ✅
- [x] SQL SET syntax → `set_config()` function
- [x] UUID format validation for tenant IDs
- [x] CORS proxy configuration
- [x] URL construction for relative paths
- [x] Transaction ordering (BEGIN before set_config)

### Phase 2.7: Full CRUD Demo ✅ COMPLETE

#### Working Features
- [x] **Multi-block pages** - Dashboard with table + stats
- [x] **Table CRUD** - List, create, edit, delete entities
- [x] **Form operations** - Create new, edit existing with validation
- [x] **Kanban drag-drop** - Move cards between columns, persist status
- [x] **Navigation** - Route between views
- [x] **Real-time updates** - WebSocket subscription (with fallback)

#### Bug Fixes

| Bug | Fix |
|-----|-----|
| Response structure mismatch | Unwrap `{ entity }` in entities.ts |
| expected_version field name | Aligned client/server schemas |
| Edit button navigation | Added push() in DetailBlock |
| Entity undefined crashes | Added null guards throughout |
| Form not populating | Guards + reset logic in FormBlock |
| Stale entity in submit | useRef for entity and version |
| 409 Version Conflict | versionRef + refetch on mount |
| No feedback after save | back() navigation after success |
| DELETE empty body | Don't set Content-Type without body |
| Kanban drag broken | Use real DataTransfer event |
| Template resolution | Added ${property} regex format |
| WebSocket loop | Connection guard before subscribe |

**Run the Demo:**
```bash
# Terminal 1: Database
docker start trellis-db

# Terminal 2: Server
cd packages/server
DATABASE_URL=postgres://postgres:trellis@localhost:5432/trellis \
  pnpm cli serve ../../products/plm-demo/product.yaml

# Terminal 3: Client
cd packages/client
pnpm dev

# Browser: http://localhost:5173
```

### Phase 2.8: General-Purpose Runtime + Demo Infrastructure (In Progress)

#### Runtime Infrastructure (committed 2026-01-14)
- [x] `LayoutRenderer` - recursive layouts (single/split/stack/tabs/grid)
- [x] `DynamicProductApp` - loads any product config from the API at runtime
- [x] `GET /config/products[/:id]` server routes (flat `products/*.yaml` contract)
- [x] 10 new block types (calendar, chart, comments, file-uploader, file-viewer, modal, stats, tabs, timeline, tree)
- [x] Connected wrappers for all 14 block types (config normalization + SDK wiring)

#### Kitchen-Sink Demo (2026-06-09)
- [x] **Zero-dependency demo mode**: `pnpm --filter @trellis/client dev` runs the
      kitchen-sink product against an in-memory mock API
      (`packages/client/dev/mock-api-plugin.ts` + `entity-store.ts`), seeded from
      `products/kitchen-sink/seed/*.json`. `TRELLIS_API=real` switches to proxying
      a real server. See [RUNNING.md](./RUNNING.md).
- [x] All 14 block types render on one config-driven dashboard
- [x] Full CRUD verified in-browser: create/edit/delete/kanban-drag all propagate

#### Bug Fixes (2026-06-09)
| Bug | Fix |
|-----|-----|
| Blocks didn't refresh after mutations | Cache invalidation bus: `useQuery` subscribes via `cache.onInvalidate`; create/update/delete invalidate by entity type |
| `trellis.form` / `trellis.kanban` / `trellis.detail` rendered un-wired | Added missing aliases to `getConnectedBlock` (BlockRenderer) |
| FormBlock created entities with `type: undefined` | Normalizes `source ?? entityType`, guards when both missing |
| ConnectedTableBlock queried `type: undefined` for raw YAML configs | Normalizes via `buildTableBlockConfig` internally |
| Kanban cards showed "Untitled" | Connected default card template fixed to `${title}`; KanbanCard falls back to title/name |
| `useUpdateEntity` didn't refresh lists/stats | Invalidates type queries from the updated entity |
| Mock API returned `type_path` | Real server maps DB `type_path` → API `type`; mock + seeds now match |
| Builds picked up tailwind postcss config from a parent directory | Empty `postcss.config.mjs` firewall at repo root (now documented) |

### Phase 2.9: Production Hardening (In Progress)

#### RBAC Permission System (2026-06-09, ADR-012)
- [x] `@trellis/kernel` auth module: `resource.action` permission strings,
      role bundles (admin/editor/viewer), `expandRoles`/`hasPermission`
      (wildcard + `resource.*` prefix), shared by server, client, and demo
- [x] Server enforcement: `requirePermission()` preHandlers on entity,
      relationship, query, and event routes; roles expand to permissions at
      token issuance (`POST /auth/login`); legacy dev headers accept role
      names (`x-permissions: viewer`) and default to full access when absent
- [x] Client: `$can()` uses kernel semantics; `showWhen` evaluated in
      BlockRenderer; `ActionConfig.permission` filters table actions;
      `DynamicProductApp` accepts a `user` for the binding scope
- [x] Demo: `?role=admin|editor|viewer` switches identity — viewer sees no
      create form and no Edit/Delete actions
- [x] Tests: 14 kernel + 6 server enforcement tests (847 total passing)

#### Audit Log (2026-06-09)
- [x] `GET /events` route - tenant-scoped, filterable event-store reads
      (guarded by `event.read`)
- [x] Demo: mock API records `audit_event` entities on every mutation;
      kitchen-sink gains an Audit Log view + nav item (live-updating table)

#### Deployment Configuration (2026-06-09, verified 2026-06-10)
- [x] `deploy/server.Dockerfile` - multi-stage pnpm workspace build
- [x] `deploy/client.Dockerfile` + `deploy/nginx.conf` - static SPA + /api proxy
- [x] `docker-compose.yml` - postgres (schema auto-applied) + server + client
- [x] `pnpm --filter @trellis/client build:app` - production SPA build (vite,
      117 kB gzipped)
- [x] **Compose stack verified end-to-end**: SPA CRUD against Postgres through
      nginx, RBAC 403s, audit events recorded and queryable

#### Bugs Found by Compose Verification (2026-06-10)
| Bug | Fix |
|-----|-----|
| CLI never ran on Windows (`pnpm cli` silently exited) | `isMainModule` now uses `pathToFileURL` (main.ts) |
| Images missed `tsconfig.base.json` → tsc fell back to ES5 | Dockerfiles copy it |
| `serve` bound to localhost (unreachable in containers) | `--host 0.0.0.0` in CMD |
| Container restarts failed ("entity type already exists") | `--force` in CMD |
| Production mode + disabled login = SPA can't bootstrap | Compose defaults to dev auth (`TRELLIS_ENV=production` for IdP setups) |
| Server block registry missing 12 block types → loader rejected valid products | Registry synced with the client registry |
| Old kitchen-sink directory dashboard used `trellis.grid` as a block | Rewritten with valid layout/block structure |
| `serve` never passed `productsDir` → config routes 404 | productPath threaded through; `PRODUCTS_DIR` override |
| **Events were never persisted** (emitter never injected into services) | Shared emitter decorated on the app, injected in entity routes |
| EventStore SQL referenced nonexistent `created_at` column | Aligned with the schema (`occurred_at` is canonical) |
| Demo-default auth hardcoded a tenant that doesn't exist in fresh DBs | Resolved from the loaded product's tenant (cached, hardcoded fallback) |
| Product loader fails on Windows with an empty error | Tracked as a follow-up task (path/glob handling) |

### Phase 2.10: Demo Auth + Real-Time (2026-06-10)

#### Demo Login Flow
- [x] `POST /auth/login` accepts requests without tenant_id/actor_id (dev
      mode): resolves the loaded product's tenant + system actor and echoes
      them in the response
- [x] Mock dev API implements `/auth/login` + `/auth/refresh` (opaque tokens)
- [x] `DynamicProductApp` auto-logs-in with the demo user's roles before
      rendering blocks, so the server enforces the same RBAC the UI gates on
      and WebSocket subscriptions have credentials

#### Real-Time Subscriptions (both modes)
- [x] Mock WebSocket server at /ws in the Vite plugin
      (`packages/client/dev/mock-ws.ts`) speaking the real subscription
      protocol; EntityStore mutations broadcast to matching subscribers
- [x] Real server: the shared event emitter now feeds the WebSocket plugin -
      every persisted event broadcasts to subscribers
- [x] nginx proxies /ws (the client derives ws://host/ws, not under /api)
- [x] `cache.handleEvent` also refreshes type-level queries on
      entity_updated so remote status changes update lists live
- [x] Verified in dev mode: curl create/update → page updates live, zero
      interaction. Verified on the compose stack: WS client through nginx
      received entity_created push (`packages/client/dev/verify-ws.mts`)

#### Loader Fixes
- [x] `trellis validate` is now database-free (dry runs validated before any
      tenant access; previously it CREATED a tenant and crashed without a DB)
- [x] AggregateError causes unwrapped in load failures (pg connection errors
      surfaced as an empty message)

### Phase 2.11: Next
- [ ] Performance optimization (query batching, virtualized tables)
- [ ] Tenant-configurable roles (move role bundles from code to database)
- [ ] Per-entity / per-property permission granularity
- [ ] Real-time presence + optimistic UI updates

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
| 20 | TableBlock | 12 cell formats, sorting, filtering, pagination, 42 tests | Phase 2.5 | 🔴 Released |
| 21 | FormBlock | 7 field types, validation, sections, conditional fields, 66 tests | Phase 2.5 | 🔴 Released |
| 22 | Detail + Kanban | DetailBlock (15 tests) + KanbanBlock (20 tests) | Phase 2.5 | 🔴 Released |
| 23 | Block Integration | Block Registry, BlockRenderer, ProductApp, ViewRenderer | Phase 2.5 | 🔴 Released |
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
