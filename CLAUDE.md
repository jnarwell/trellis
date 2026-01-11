# CLAUDE.md - Trellis

## What is Trellis?

A universal enterprise data platform for product and process data. Event-sourced architecture where entities hold properties and relate to each other through typed relationships. Currently in **specification phase** - no implementation code exists yet.

## Project Status

- **Phase**: Kernel Specification (specs complete, no implementation)
- **Tech Stack**: TypeScript + Fastify + Prisma + React + PostgreSQL

## Where Things Are

| Need | Location |
|------|----------|
| Type definitions | [specs/kernel/01-types.ts](specs/kernel/01-types.ts) |
| Database schema | [specs/kernel/02-schema.sql](specs/kernel/02-schema.sql) |
| API contract | [specs/kernel/03-api.md](specs/kernel/03-api.md) |
| Query patterns | [specs/kernel/05-queries.md](specs/kernel/05-queries.md) |
| Expression engine | [specs/kernel/06-expressions.md](specs/kernel/06-expressions.md) |
| **Expression systems** | [specs/EXPRESSION-SYSTEMS.md](specs/EXPRESSION-SYSTEMS.md) |
| Expression cheat sheet | [specs/config/EXPRESSION-QUICK-REF.md](specs/config/EXPRESSION-QUICK-REF.md) |
| Term definitions | [docs/GLOSSARY.md](docs/GLOSSARY.md) |
| Design decisions | [docs/adr/](docs/adr/) |
| Open questions | [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) |
| Error log | [docs/ERRORS.md](docs/ERRORS.md) |

## Core Concepts

**Entity**: Universal data container with UUID v7 ID, TypePath, properties, and version number.

**Property Sources** (4 types):
- `literal` - Direct value
- `inherited` - From parent entity (can override)
- `computed` - Expression-evaluated with dependencies
- `measured` - Value with uncertainty

**ComputationStatus** (5 states): `pending` → `valid` → `stale` → (recompute) → `valid`. Errors: `error`, `circular`.

**Relationship**: Typed connection between entities. Uses ltree for hierarchy queries.

**Event**: Immutable record of every mutation. 8 types covering entities, properties, relationships, schemas.

## CRITICAL: Things You MUST Do

1. **Always include `tenant_id`** in WHERE clauses - RLS depends on it
2. **Always provide `expected_version`** for updates - optimistic locking required
3. **Always cross-reference ADRs when writing specs** - prevents documentation drift
4. **Check [docs/GLOSSARY.md](docs/GLOSSARY.md) for term definitions** - terminology is precise
5. **Check [specs/EXPRESSION-SYSTEMS.md](specs/EXPRESSION-SYSTEMS.md)** before writing any expression syntax
6. **Follow orchestration methodology** for complex multi-file work (see Orchestration section below)
7. **Run discovery phase before implementation** - read `skills/discovery-protocol.md`

## CRITICAL: Things You Must NOT Do

1. **Do NOT query properties without full nesting**:
   ```sql
   -- WRONG
   properties->>'name'

   -- CORRECT
   properties->'name'->'value'->>'value'
   ```

2. **Do NOT confuse TypePath and PropertyName**:
   - TypePath: dot-separated hierarchy (`product.variant.sku`)
   - PropertyName: single identifier, no dots (`unit_price`)

3. **Do NOT treat `stale` as an error** - it's a normal state meaning "needs recomputation"

4. **Do NOT copy code from `/Users/jmarwell/drip-3d.com/drip-team-portal`** - use for PATTERN REFERENCE ONLY

5. **Do NOT duplicate type definitions in ADRs** - ADRs explain "why", specs define "what"

6. **Do NOT mix Expression Engine and Data Binding syntax**:
   - Expression Engine (kernel): `@self.x`, `#x`, `SUM()`, `IF()`
   - Data Binding (UI): `$scope.x`, `$can()`, `${template}`

7. **Do NOT use `self.x`** - always use `@self.x` or `#x` in kernel contexts

8. **Do NOT use lowercase functions** - always `SUM()`, `COUNT()`, `AVG()`, `IF()` (uppercase)

## Orchestration Methodology

This project uses multi-instance orchestration for complex work. The full methodology is documented in `.claude-plugins/orchestration/`.

### Quick Reference

| Resource | Path | Use When |
|----------|------|----------|
| Full Guide | `skills/orchestration-guide.md` | Starting a new phase |
| Discovery Protocol | `skills/discovery-protocol.md` | Before any implementation |
| Spawn Templates | `skills/spawn-templates.md` | Creating new instances |
| Scratchpad Format | `skills/scratchpad-format.md` | Documenting work in progress |

### Instance Types

- **Persistent:** Documenter (always active)
- **Periodic:** Codebase Auditor (after milestones)
- **On-demand:** Git Tracker (at commits)
- **Temporary:** Domain experts, reviewers (single task)

### Core Protocols

1. **Discovery First:** Read specs → Create scratchpad → Report → Get approval → Implement
2. **Cross-Review:** When outputs integrate, instances review each other
3. **Audit Before Commit:** Codebase Auditor verifies spec compliance before Git Tracker commits

### Commands (Manual Invocation)

To use orchestration commands, ask Claude to read and follow:
- "Follow the spawn command for a new domain expert"
- "Run the audit command for Phase 2.3"
- "Execute the status command"

### Key Files

When starting complex work, read these first:
1. `skills/orchestration-guide.md` - Full methodology
2. `skills/discovery-protocol.md` - How to do discovery phase
3. `agents/documenter.md` - Documenter responsibilities

## When Confused

1. **Unknown term?** → [docs/GLOSSARY.md](docs/GLOSSARY.md)
2. **Why was X decided?** → [docs/adr/](docs/adr/)
3. **What's the type structure?** → [specs/kernel/01-types.ts](specs/kernel/01-types.ts)
4. **How to query?** → [specs/kernel/05-queries.md](specs/kernel/05-queries.md)
5. **Which expression syntax?** → [specs/EXPRESSION-SYSTEMS.md](specs/EXPRESSION-SYSTEMS.md)
6. **What's unresolved?** → [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md)
7. **Past mistakes?** → [docs/ERRORS.md](docs/ERRORS.md)

## Quick Type Reference

```typescript
// Property sources
type PropertySource = 'literal' | 'inherited' | 'computed' | 'measured';

// Computation states
type ComputationStatus = 'pending' | 'valid' | 'stale' | 'error' | 'circular';

// Value types
type ValueType = 'text' | 'number' | 'boolean' | 'datetime' | 'duration' | 'reference' | 'list' | 'record';

// All identifiers are UUID v7 (time-ordered)
type EntityId = string & { readonly __brand: 'EntityId' };
```

## Authoritative Sources

- **Types**: `specs/kernel/01-types.ts` is canonical - if ADRs conflict, specs win
- **Schema**: `specs/kernel/02-schema.sql` is canonical PostgreSQL
- **Expression syntax**: `specs/EXPRESSION-SYSTEMS.md` (which system), `specs/config/EXPRESSION-QUICK-REF.md` (cheat sheet)
- **ADRs**: Document decisions and rationale, not implementations
