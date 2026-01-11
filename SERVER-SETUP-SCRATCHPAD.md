# Server Setup Scratchpad

**STATUS:** ✅ Implementation Complete

## Implementation Summary

**Build Status:** ✅ `pnpm build` passes

### Files Created (15 files)

| File | Purpose |
|------|---------|
| `src/config/database.ts` | Database configuration types and loader |
| `src/config/server.ts` | Server configuration types and loader |
| `src/db/index.ts` | PostgreSQL connection pool |
| `src/db/client.ts` | Tenant-scoped client wrapper for RLS |
| `src/db/migrations.ts` | CLI migration runner |
| `src/plugins/postgres.ts` | Fastify PostgreSQL plugin |
| `src/types/fastify.d.ts` | Fastify type extensions (AuthContext, pg) |
| `src/middleware/request-id.ts` | X-Request-Id extraction/generation |
| `src/middleware/auth.ts` | Auth header extraction (X-Tenant-Id, X-Actor-Id) |
| `src/middleware/tenant.ts` | Tenant context logging |
| `src/middleware/error-handler.ts` | Global error handler with KernelError mapping |
| `src/middleware/index.ts` | Middleware exports |
| `src/app.ts` | Fastify app factory |
| `src/index.ts` | Server entry point (updated) |
| `package.json` | Added dependencies (updated) |

### Dependencies Added

- `fastify` ^5.2.0
- `fastify-plugin` ^5.0.0
- `@fastify/type-provider-typebox` ^5.0.0
- `@sinclair/typebox` ^0.34.0
- `pg` ^8.13.0
- `@types/pg` ^8.11.0 (dev)
- `tsx` ^4.19.0 (dev)

### Scripts Added

- `pnpm start` - Run production server
- `pnpm dev` - Run development server with watch
- `pnpm migrate` - Run database migrations

### Endpoints

- `GET /health` - Health check (no auth required)
- `GET /ready` - Readiness check with DB ping (no auth required)

### No Blockers for Downstream Instances

Instances 11-14 can now:
- Import `buildApp` and `AppConfig` from `@trellis/server`
- Use `getTenantScopedClient`, `withTenantClient`, `withTenantTransaction` for RLS queries
- Access `request.auth` for tenant/actor context
- Use `Pool` from fastify instance (`app.pg`)

---

## Files Read

| File | Key Takeaways |
|------|---------------|
| `specs/kernel/03-api.md` | AuthContext: `{tenant_id, actor_id, permissions}`. Implementation sets `app.current_tenant_id` for RLS. KernelError with codes for HTTP mapping. |
| `specs/kernel/02-schema.sql` | RLS enabled on all tables. Tenant policies use `current_setting('app.current_tenant_id')::UUID`. uuid_generate_v7() function exists. |
| `docs/adr/001-tech-stack.md` | TypeScript + Fastify + PostgreSQL. May need to eject from Prisma for raw JSONB - use raw pg for V1. |
| `docs/adr/009-multi-tenancy.md` | Query-layer tenant isolation with tenant_id on all tables. RLS as defense-in-depth. |
| `packages/kernel/src/types/` | All types exported from index.ts. Key: EntityId, TenantId, ActorId, KernelError, KernelErrorCode. |
| `packages/server/` | Existing config loader for product YAML. No Fastify, pg, or middleware yet. |

## Config Variables Needed

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `DATABASE_POOL_SIZE` | No | 10 | Connection pool max size |
| `SERVER_HOST` | No | `0.0.0.0` | Server bind host |
| `SERVER_PORT` | No | `3000` | Server bind port |
| `NODE_ENV` | No | `development` | Environment (development/production/test) |
| `LOG_LEVEL` | No | `info` | Pino log level |

## Middleware Chain (Order Matters!)

1. **request-id** - Generate/extract X-Request-Id for tracing (first, before anything logs)
2. **auth** - Extract AuthContext from request headers/token (sets `request.auth`)
3. **tenant** - Set PostgreSQL `app.current_tenant_id` for RLS before any DB queries
4. **error-handler** - Global error handler (via `setErrorHandler`)

## RLS Setup

Per `02-schema.sql`:
```sql
CREATE POLICY tenant_isolation_entities ON entities
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

Per request, before any query:
```typescript
await client.query('SET app.current_tenant_id = $1', [tenantId]);
```

Must set on every connection from pool before use. Best approach: wrap pool.connect() to auto-set tenant.

## Error Code to HTTP Status Mapping

From `03-api.md` and `types/errors.ts`:

| KernelErrorCode | HTTP Status |
|-----------------|-------------|
| `NOT_FOUND` | 404 |
| `ALREADY_EXISTS` | 409 |
| `VERSION_CONFLICT` | 409 |
| `VALIDATION_ERROR` | 400 |
| `TYPE_MISMATCH` | 400 |
| `PERMISSION_DENIED` | 403 |
| `TENANT_MISMATCH` | 403 |
| `CIRCULAR_DEPENDENCY` | 422 |
| `INVALID_EXPRESSION` | 400 |
| `REFERENCE_BROKEN` | 422 |

## Dependencies to Add

```json
{
  "dependencies": {
    "fastify": "^5.2.0",
    "@fastify/type-provider-typebox": "^5.0.0",
    "@sinclair/typebox": "^0.34.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0"
  }
}
```

## AuthContext Interface

From `03-api.md`:
```typescript
interface AuthContext {
  tenant_id: TenantId;
  actor_id: ActorId;
  permissions: string[];
}
```

Extended for Fastify request:
```typescript
declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext;
  }
}
```

## Implementation Plan

1. [x] Discovery phase - read all specs
2. [x] Add dependencies to package.json
3. [x] Create config/database.ts with DatabaseConfig type
4. [x] Create db/index.ts with createPool()
5. [x] Create db/client.ts with TenantScopedClient wrapper
6. [x] Create plugins/postgres.ts Fastify plugin
7. [x] Create types/fastify.d.ts for type extensions
8. [x] Create middleware/request-id.ts
9. [x] Create middleware/auth.ts (extract from headers for now)
10. [x] Create middleware/tenant.ts (set RLS context)
11. [x] Create middleware/error-handler.ts
12. [x] Create app.ts factory function
13. [x] Update index.ts with server startup
14. [x] Create db/migrations.ts runner
15. [x] Test: pnpm build passes
16. [ ] Test: server starts (requires DATABASE_URL)

## Questions for Orchestrator

1. **Auth extraction**: For V1, should we just extract tenant_id/actor_id from headers (e.g., `X-Tenant-Id`, `X-Actor-Id`) or implement JWT validation?
   - **Decision**: Start with headers for simplicity, add JWT later.

2. **Migration runner**: Should migrations run automatically on startup or via CLI command?
   - **Decision**: CLI command preferred (`pnpm migrate`), with optional auto-run in development.

## Notes

- ADR-009 mentions "application-layer enforcement" but schema already has RLS policies. We implement BOTH: application-layer for flexibility + RLS as defense-in-depth.
- Use raw pg (not Prisma) per ADR-001 for raw JSONB operations.
- UUID v7 generation available in schema, but also need JS-side generation for new entities.
