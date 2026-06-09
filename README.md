# Trellis

A universal enterprise data platform. One kernel — entities, typed properties,
relationships, immutable events, and an expression engine — turns YAML product
configurations into working enterprise tools (PLM, CRM, ticketing, and more)
with no per-product code.

## Quick Start (zero dependencies)

```bash
pnpm install
pnpm --filter @trellis/client dev
# Open http://localhost:5173
```

This serves the **kitchen-sink demo** — all 14 UI block types on one
config-driven dashboard, backed by an in-memory mock API. See
[docs/RUNNING.md](docs/RUNNING.md) for full-stack mode (Fastify + PostgreSQL).

## Project Structure

- `packages/kernel` - Expression engine, block runtime, core types
- `packages/server` - Fastify API (entities, relationships, queries, events, auth, WebSockets)
- `packages/client` - TypeScript SDK, React hooks, UI blocks, config-driven runtime
- `packages/shared` - Shared types and debug infrastructure
- `products/` - Product definitions (YAML) and seed data
- `specs/` - Kernel and config specifications (authoritative contracts)
- `docs/` - Documentation, ADRs, project status

## Status

Phase 2.8 — working full-stack implementation with 827 passing tests.
See [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).
