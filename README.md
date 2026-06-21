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

Backed by an in-memory mock API (no database). See [docs/RUNNING.md](docs/RUNNING.md)
for full-stack mode (Fastify + PostgreSQL).

The demo opens in a **guided shell**: switch tools and roles from the top bar,
and click **`</> View config`** to see the exact YAML that generated the app
you're looking at. Create/edit/delete are live (with toasts), and changes push
to other open tabs over WebSockets.

## Demo products — same engine, different tools

This is the whole point of Trellis: each of these is a **complete, working app
defined by a single YAML file** in [`products/`](products/) — no per-product
code. Switch between them in the top bar (or with the `?product=` query param):

| Tool | What it emulates | URL | Config |
|------|------------------|-----|--------|
| CRM | Salesforce / HubSpot / Pipedrive | `?product=crm` | [crm.yaml](products/crm.yaml) |
| Bug Tracker | Linear / Jira / GitHub Issues | `?product=bug-tracker` | [bug-tracker.yaml](products/bug-tracker.yaml) |
| Recruiting (ATS) | Greenhouse / Lever / Ashby | `?product=recruiting` | [recruiting.yaml](products/recruiting.yaml) |
| Inventory | Stock / asset tracking | `?product=inventory` | [inventory.yaml](products/inventory.yaml) |
| Help Desk | Zendesk / Freshdesk | `?product=helpdesk` | [helpdesk.yaml](products/helpdesk.yaml) |
| PLM | Hardware part lifecycle (the original domain) | `?product=plm` | [plm.yaml](products/plm.yaml) |
| Kitchen Sink | All 14 block types on one page (component showcase) | `?product=kitchen-sink` | [kitchen-sink.yaml](products/kitchen-sink.yaml) |

Each gives you a stats row, a create form, a sortable table with edit/delete,
charts, and a drag-and-drop pipeline board — generated entirely from its config.
To build a new tool, copy a YAML file and change the entities and fields.

Add `&role=viewer` to any URL to see role-based access control: the create form
and edit/delete actions disappear for read-only users (enforced server-side too).

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
