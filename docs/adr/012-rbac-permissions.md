# ADR-012: Role-Based Access Control with Permission Strings

**Status:** Accepted
**Date:** 2026-06-09
**Resolves:** OQ-005 (Permission model)

## Context

The auth plumbing has carried `roles[]` and `permissions[]` JWT claims since
Phase 2.4, the API spec defines `AuthContext.permissions: string[]`, and the
UI Data Binding system specifies `$can('part.create')` — but nothing enforced
any of it, and OQ-005 left the model (RBAC vs ABAC vs hybrid) undecided.

We need authorization that:
- conforms to the existing `AuthContext.permissions: string[]` contract
- keeps `$can('<permission>')` working as specified
- is simple enough to enforce uniformly at route level today
- leaves room for attribute-based policies later

## Decision

**Permissions are the enforcement unit; roles are permission bundles.**

1. **Permission strings** use dot-separated `resource.action` form, matching
   the `$can()` examples in the specs: `entity.read`, `entity.create`,
   `entity.update`, `entity.delete`, `relationship.read`,
   `relationship.write`, `event.read`, `config.read`. `*` is a wildcard and
   `resource.*` grants all actions on a resource.

2. **Built-in roles** (tenant-scoped) expand to permissions at token
   issuance — enforcement never inspects role names:
   - `admin` → `*`
   - `editor` → entity/relationship CRUD + event/config reads
   - `viewer` → reads only

3. **Single source of truth** is `@trellis/kernel` (`packages/kernel/src/auth/roles.ts`),
   shared by the server (route guards, token issuance), the client
   (`$can()` scope, action gating), and the mock dev API.

4. **Enforcement points:**
   - Server: `requirePermission(<permission>)` Fastify preHandler per route.
   - Client: `$can()` in Data Binding (`showWhen`) and `ActionConfig.permission`
     filtering in blocks. Client checks are UX, not security — the server is
     authoritative.

5. **Development ergonomics:** legacy header auth (dev only) without an
   `x-permissions` header defaults to `*`, preserving the existing dev/demo
   flow. An explicit `x-permissions` header (which may name roles, e.g.
   `x-permissions: viewer`) is normalized and enforced, so restricted flows
   are testable without JWTs.

## Consequences

**Positive:**
- One permission vocabulary across server, client, config, and specs.
- `$can()` works as documented with zero new syntax.
- Roles can be re-bundled without touching enforcement code.
- ABAC can be added later as a policy layer that *produces* permission
  decisions, because checks are already mediated through `hasPermission()`.

**Negative:**
- No per-entity / per-property permissions yet (whole-resource granularity).
- Role definitions are static code, not tenant-configurable data. Moving them
  to the database is forward-compatible (same expansion point).

**Neutral:**
- JWTs carry both `roles` (informational) and expanded `permissions`
  (enforced). Token size is negligible at this permission count.
