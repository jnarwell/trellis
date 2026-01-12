# Running Trellis Locally

This guide covers how to run the full Trellis stack locally for development and testing.

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker (for PostgreSQL)

## Database Setup

Start a PostgreSQL container:

```bash
docker run -d --name trellis-db \
  -e POSTGRES_PASSWORD=trellis \
  -e POSTGRES_DB=trellis \
  -p 5432:5432 postgres:16
```

To stop/restart later:
```bash
docker stop trellis-db
docker start trellis-db
```

## Install Dependencies

From the project root:

```bash
pnpm install
pnpm build
```

## Run Server

The server loads a product definition (YAML) and serves the API:

```bash
cd packages/server

# Set database connection and run
DATABASE_URL=postgres://postgres:trellis@localhost:5432/trellis \
  pnpm cli serve ../../products/plm-demo/product.yaml
```

The server will start on http://localhost:3000

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
| `POST /auth/login` | Get JWT tokens |
| `POST /auth/refresh` | Refresh access token |

## Run Client

The client provides a development web app:

```bash
cd packages/client
pnpm dev
```

Opens at http://localhost:5173 with hot reload.

### Storybook

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
| `DATABASE_URL environment variable is required` | Missing env var | Set `DATABASE_URL=postgres://postgres:trellis@localhost:5432/trellis` |
| `EISDIR: illegal operation on a directory` | Gave directory path to CLI | Point to `product.yaml` file directly |
| `EADDRINUSE: address already in use ::1:3000` | Port already in use | `lsof -ti:3000 \| xargs kill -9` |
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
| `Failed to construct 'URL'` | Relative URL without base | Check `baseUrl` includes protocol or use origin fallback |
| `Body cannot be empty with content-type` | DELETE with empty body | Remove Content-Type header for DELETE requests |
| `TrellisError: Not connected` | WebSocket not ready | Wait for connection or disable real-time updates |
| `Cannot read properties of undefined` | Entity not loaded | Add loading guards before accessing entity properties |

### Debugging Tips

```bash
# Check what's running on port 3000
lsof -i :3000

# Watch server logs
cd packages/server
DATABASE_URL=... pnpm cli serve ... 2>&1 | tee server.log

# Check database connection
docker exec trellis-db psql -U postgres -c "SELECT 1"

# View tenant in database
docker exec trellis-db psql -U postgres -d trellis -c "SELECT id, name FROM tenants"
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | No | `dev-secret` | Secret for signing JWTs |
| `PORT` | No | `3000` | Server port |
| `LOG_LEVEL` | No | `info` | Logging level (debug, info, warn, error) |

## Quick Start Script

Save as `start-dev.sh` in project root:

```bash
#!/bin/bash

# Start database if not running
docker start trellis-db 2>/dev/null || \
  docker run -d --name trellis-db \
    -e POSTGRES_PASSWORD=trellis \
    -e POSTGRES_DB=trellis \
    -p 5432:5432 postgres:16

# Wait for database
sleep 2

# Start server in background
cd packages/server
DATABASE_URL=postgres://postgres:trellis@localhost:5432/trellis \
  pnpm cli serve ../../products/plm-demo/product.yaml &

# Start client
cd ../client
pnpm dev
```

## Verify Everything Works

1. **Database**: `docker exec trellis-db psql -U postgres -c "SELECT 1"`
2. **Server**: `curl http://localhost:3000/health`
3. **Client**: Open http://localhost:5173 in browser

## See Also

- [CURRENT_STATE.md](./CURRENT_STATE.md) - Project status and progress
- [ERRORS.md](./ERRORS.md) - Known issues and resolutions
- [GLOSSARY.md](./GLOSSARY.md) - Term definitions
