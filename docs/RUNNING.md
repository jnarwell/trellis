# Running Trellis Locally

There are two ways to run Trellis locally:

1. **Demo mode (zero dependencies)** — the client dev server with an in-memory
   mock API. No database, no backend. Best for demos and UI development.
2. **Full stack** — Fastify server + PostgreSQL + client. Best for end-to-end
   work on the real API.

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker — only for full-stack mode

```bash
pnpm install
```

---

## Demo Mode (Zero Dependencies)

```bash
pnpm --filter @trellis/client dev
# Open http://localhost:5173
```

That's it. The Vite dev server runs a mock API
([packages/client/dev/mock-api-plugin.ts](../packages/client/dev/mock-api-plugin.ts))
that serves:

- **Product configs** from `products/*.yaml` (same contract as the real
  server's `GET /config/products/:id` route)
- **Entity CRUD + queries** from an in-memory store seeded from
  `products/<id>/seed/*.json`

The default product is **kitchen-sink** (all 14 block types on one dashboard:
form, stats, table, charts, kanban, timeline, tree, tabs, card, file blocks,
modal). Switch products with a query param:

```
http://localhost:5173/?product=kitchen-sink
```

Everything works: create via the form, edit/delete from the table, drag kanban
cards — all blocks refresh through the client cache-invalidation bus.
Mutations persist until the dev server restarts, and every mutation is
recorded in the **Audit Log** view.

### Demo RBAC

Switch the demo identity with a query param (ADR-012):

```
http://localhost:5173/?role=admin    # everything (default)
http://localhost:5173/?role=editor   # full CRUD
http://localhost:5173/?role=viewer   # read-only: no create form, no Edit/Delete
```

Gating is driven by config: `showWhen: "$can('entity.create')"` on blocks and
`permission: entity.delete` on table actions. The real server enforces the
same permission strings via route guards.

### Demo architecture

```
Browser (DynamicProductApp)
  └── GET /api/config/products/kitchen-sink   ← products/kitchen-sink.yaml
  └── POST /api/query, /api/entities ...      ← in-memory EntityStore
                                                 seeded from products/kitchen-sink/seed/
```

- `products/kitchen-sink.yaml` — flat product config served to the client
- `products/kitchen-sink/` — canonical directory format (entities/views/
  navigation includes) loadable by the server CLI, plus `seed/` data used by
  the mock API

### Pointing the client at a real server

```bash
TRELLIS_API=real pnpm --filter @trellis/client dev          # proxies /api → localhost:3000
TRELLIS_API_URL=http://other-host:3000 TRELLIS_API=real ...  # custom target
```

---

## Full Stack (Server + PostgreSQL)

### Database

```bash
docker run -d --name trellis-db \
  -e POSTGRES_PASSWORD=trellis \
  -e POSTGRES_DB=trellis \
  -p 5432:5432 postgres:16
```

To stop/restart later: `docker stop trellis-db` / `docker start trellis-db`

### Server

The server loads a product definition (YAML) and serves the API:

```bash
cd packages/server

DATABASE_URL=postgres://postgres:trellis@localhost:5432/trellis \
  pnpm cli serve ../../products/plm-demo/product.yaml
```

The server starts on http://localhost:3000

### Client (proxied to the real server)

```bash
cd packages/client
TRELLIS_API=real pnpm dev
```

### Server Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /entities` | List entities |
| `GET /entities/:id` | Get entity by ID |
| `POST /entities` | Create entity |
| `PUT /entities/:id` | Update entity |
| `DELETE /entities/:id` | Delete entity |
| `POST /query` | Query entities |
| `GET /relationships` | List relationships |
| `GET /config/products` | List product configs |
| `GET /config/products/:id` | Get product config as JSON |
| `POST /auth/login` | Get JWT tokens |
| `POST /auth/refresh` | Refresh access token |

## Docker Deployment

A full-stack deployment is defined in [docker-compose.yml](../docker-compose.yml):

```bash
docker compose up --build
# Client: http://localhost:8080   API: http://localhost:3000
```

- `db`: postgres:16 — the kernel schema (`packages/kernel/src/schema/migrations/`)
  is applied automatically on first boot via the init mount
- `server`: built from [deploy/server.Dockerfile](../deploy/server.Dockerfile);
  loads `PRODUCT_FILE` (default kitchen-sink) and serves the API
- `client`: built from [deploy/client.Dockerfile](../deploy/client.Dockerfile);
  nginx serves the SPA and proxies `/api` to the server

The stack is verified end-to-end: SPA at :8080 runs full CRUD against
Postgres through the nginx proxy, RBAC returns 403s for missing permissions,
and every mutation lands in the audit log (`GET /api/events`).

Configuration:

| Variable | Default | Notes |
|----------|---------|-------|
| `TRELLIS_ENV` | `development` | Dev mode resolves demo auth from the loaded tenant so the SPA works without an IdP. Set `production` behind a real identity provider — every request then requires a JWT. |
| `PRODUCT_FILE` | kitchen-sink | Product the server loads and serves |
| `POSTGRES_PASSWORD`, `JWT_SECRET` | dev values | Set real values for anything beyond local evaluation |

## Storybook

For component development in isolation:

```bash
cd packages/client
pnpm storybook
```

Opens at http://localhost:6006

## Run Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @trellis/kernel test
pnpm --filter @trellis/server test
pnpm --filter @trellis/client test
```

## Common Issues

### Startup Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot find module 'tailwindcss'` (PostCSS) | A postcss config in a directory **above** the repo is being picked up | Keep the empty `postcss.config.mjs` at the repo root — it stops the upward search |
| `DATABASE_URL environment variable is required` | Missing env var (full-stack mode) | Set `DATABASE_URL=postgres://postgres:trellis@localhost:5432/trellis` |
| `EISDIR: illegal operation on a directory` | Gave directory path to CLI | Point to `product.yaml` file directly |
| `EADDRINUSE: address already in use` | Port already in use | Kill the stale process holding 5173/3000 |
| `connect ECONNREFUSED` | Database not running | Start docker container |

### API Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `syntax error at or near "SET"` | Wrong PostgreSQL syntax | Server uses `set_config()` function, not `SET` |
| `invalid input syntax for type uuid` | Non-UUID tenant ID | Use valid UUID format: `00000000-0000-0000-0000-000000000001` |
| `Entity was modified by another request` (409) | Stale version number | Refetch entity before update, use current `version` |
| `CORS policy` blocked | Direct browser requests | Use Vite proxy, requests should go to `/api/*` |

### Client Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Blocks show data but don't refresh after create/update/delete | Entity type not reaching the cache invalidation bus | Ensure block configs have `entityType` or `source`; Connected wrappers normalize both |
| `Failed to construct 'URL'` | Relative URL without base | Check `baseUrl` includes protocol or use origin fallback |
| `Body cannot be empty with content-type` | DELETE with empty body | Remove Content-Type header for DELETE requests |
| `[Trellis] WebSocket unavailable, skipping subscription` | No WS server in demo mode | Expected — subscriptions degrade to no-ops; CRUD refresh uses cache invalidation instead |
| `Cannot read properties of undefined` | Entity not loaded | Add loading guards before accessing entity properties |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRELLIS_API` | No | (mock) | `real` disables the mock API and proxies `/api` to a real server |
| `TRELLIS_API_URL` | No | `http://localhost:3000` | Proxy target when `TRELLIS_API=real` |
| `DATABASE_URL` | Full-stack only | - | PostgreSQL connection string |
| `JWT_SECRET` | No | `dev-secret` | Secret for signing JWTs |
| `PORT` | No | `3000` | Server port |
| `LOG_LEVEL` | No | `info` | Logging level (debug, info, warn, error) |

## Verify Everything Works

Demo mode:
1. Open http://localhost:5173 — dashboard renders with seeded work items
2. Create an item via the form — table, stats, kanban, tree all update
3. Drag a kanban card — status persists and the table row updates

Full stack:
1. **Database**: `docker exec trellis-db psql -U postgres -c "SELECT 1"`
2. **Server**: `curl http://localhost:3000/health`
3. **Client**: Open http://localhost:5173 in browser

## See Also

- [CURRENT_STATE.md](./CURRENT_STATE.md) - Project status and progress
- [ERRORS.md](./ERRORS.md) - Known issues and resolutions
- [GLOSSARY.md](./GLOSSARY.md) - Term definitions
