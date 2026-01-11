# Trellis Error Log

This document tracks errors encountered during development, their root causes, and resolutions. Used for pattern recognition and preventing recurrence.

## Format

Each error entry includes:
- **ID**: ERROR-NNN
- **Date**: When discovered
- **Category**: Documentation | Schema | Implementation | Integration
- **Severity**: Low | Medium | High | Critical
- **Status**: Open | Resolved | Monitoring

---

## ERROR-001: Schema/Type Inconsistencies Between ADRs and Specs

**Date**: 2025-01-10
**Category**: Documentation
**Severity**: High
**Status**: Resolved

### Description

Initial ADR documentation contained type definitions and schemas that diverged from the authoritative kernel specifications. This created confusion about what the canonical definitions were.

### Specific Inconsistencies Found

| Area | ADR Value | Spec Value | Resolution |
|------|-----------|------------|------------|
| Property Sources | `input`, `derived`, `external` | `literal`, `inherited`, `computed`, `measured` | Updated GLOSSARY to use spec values |
| ComputationStatus | Not defined | `pending`, `valid`, `stale`, `error`, `circular` | Added to GLOSSARY |
| TypePath | Described as "ltree path" | Branded string with dot notation | Clarified in GLOSSARY |
| Value Types | Basic types only | Full set: text, number, boolean, datetime, duration, reference, list, record | Updated GLOSSARY |
| Event Types | Not specified | 8 defined types (entity_*, property_*, relationship_*, type_schema_*) | Added to GLOSSARY |
| Dimension examples | Generic | Full SI base + derived dimensions | Clarified in ADR-004 |

### Root Cause

ADRs were written before kernel specs were finalized. Once Kernel Designer created authoritative specs in `specs/kernel/`, the ADRs contained outdated terminology and structures.

### Resolution

1. Updated `docs/GLOSSARY.md` to match `specs/kernel/01-types.ts`
2. Added "Authoritative Implementation" sections to ADRs 002, 003, 005 pointing to specs
3. Updated `docs/CURRENT_STATE.md` to reference kernel specs as authoritative

### Prevention

1. ADRs document **decisions and rationale**, not implementations
2. `specs/` contains **authoritative type definitions and schemas**
3. When specs are updated, Documenter instance must verify GLOSSARY alignment
4. ADRs should reference specs, not duplicate their content

### Lessons Learned

- Keep clear separation: ADRs = "why", Specs = "what"
- Always check consistency after spec updates
- Point to authoritative sources rather than duplicating

---

## ERROR-002: Expression Syntax Ambiguity

**Date**: 2025-01-10
**Category**: Documentation
**Severity**: High
**Status**: Resolved

### Description

Product Config spec used inconsistent expression syntax:
- `self.x` instead of `@self.x` in lifecycle conditions
- `sum()` instead of `SUM()` for aggregations
- Ambiguity between Expression Engine and Data Binding contexts

### Specific Issues Found

| Location | Wrong Syntax | Correct Syntax |
|----------|--------------|----------------|
| Lifecycle `when` | `self.unit_cost != null` | `@self.unit_cost != null` |
| Computed expressions | `sum(...)` | `SUM(...)` |
| Navigation badge filters | Mixed `$` and `@` | `#status == 'draft'` (shorthand) |

### Root Cause

Two distinct expression systems (Expression Engine vs Data Binding) were not explicitly documented. Specs were written assuming a single unified syntax.

### Resolution

1. Created `/specs/EXPRESSION-SYSTEMS.md` as authoritative 45-line reference
2. Created `/specs/kernel/06-expressions-addendum.md` with filter syntax decisions
3. Created `/specs/config/EXPRESSION-QUICK-REF.md` as syntax cheat sheet
4. Applied 11 syntax fixes to `product-config-spec.md`
5. Resolved all gaps documented in `EXPRESSION-GAPS.md`

### Prevention

1. **Check `/specs/EXPRESSION-SYSTEMS.md`** before writing any expression syntax
2. **Core rule**: Entity data = Expression Engine (`@`, `#`), UI display = Data Binding (`$`)
3. **Always use uppercase** for functions: `SUM()`, `COUNT()`, `AVG()`, `IF()`
4. **Always prefix** self-references: `@self.x` not `self.x`

### Lessons Learned

- Separate systems need separate documentation from the start
- Syntax conventions must be established before writing examples
- Cross-review between spec authors catches inconsistencies

---

## ERROR-003: E2E Demo - Multiple Issues Found

**Date**: 2026-01-11
**Category**: Implementation
**Severity**: Medium
**Status**: Resolved

### Description

During the E2E demo run (Phase 2.6), several issues were discovered that prevented the full Trellis stack from running.

### Issues Found and Resolutions

| Issue | Location | Root Cause | Resolution |
|-------|----------|------------|------------|
| Missing CLI entry point | `packages/server/` | No main.ts wiring up CLI commands | Created [main.ts](../packages/server/src/main.ts) with database adapter and block registry setup |
| Null pointer in validator | `packages/server/src/config/validator.ts:733` | Blocks without `props` caused `Object.entries(block.props)` to fail | Added null check: `block.props ?? {}` |
| Route validation too strict | `packages/server/src/config/validator.ts:566` | Regex `/^\/[a-z0-9:_-]*$/` rejected uppercase params and `?` | Updated to `/^\/[a-zA-Z0-9/:_?-]*$/` |
| Missing pino-pretty | `packages/server/` | Logger transport not installed | Added `pino-pretty` as dev dependency |
| Missing MockTrellisClient export | `packages/client/src/test-utils/mock-client.ts` | Stories imported name that wasn't exported | Added alias export |
| Missing DATABASE_URL | CLI startup | Server requires PG connection string | Set `DATABASE_URL=postgres://postgres:trellis@localhost:5432/trellis` |
| EISDIR on directory | CLI load command | Given directory path instead of file | Point to `product.yaml` directly: `../../products/plm-demo/product.yaml` |
| EADDRINUSE port 3000 | Server startup | Previous server process still running | `lsof -ti:3000 \| xargs kill -9` |
| MockTrellisClient not a constructor | Client tests | Export was object not class | Changed to `export class MockTrellisClient` |
| options.entities not iterable | MockClient constructor | Constructor not handling undefined | Added `options?.entities ?? []` |
| Route GET /api/entities not found | API requests | Wrong API path used | Check actual routes in server (use `/entities` not `/api/entities`) |

### Open Issues (Not Yet Fixed)

1. **Query API SQL Syntax Error**: The `/query` endpoint returns a syntax error "42601 - syntax error at or near $1". This is in the query builder implementation and needs investigation.

### Prevention

1. Run E2E demo early in development cycle
2. Add integration tests for CLI commands
3. Add test cases for edge cases (null props, unusual route patterns)
4. Document all required dependencies

---

## Template for New Entries

```markdown
## ERROR-NNN: [Brief Title]

**Date**: YYYY-MM-DD
**Category**: [Documentation | Schema | Implementation | Integration]
**Severity**: [Low | Medium | High | Critical]
**Status**: [Open | Resolved | Monitoring]

### Description
[What went wrong]

### Root Cause
[Why it happened]

### Resolution
[How it was fixed]

### Prevention
[How to prevent recurrence]
```

---

# Runtime Error Codes

This section documents error codes thrown by Trellis at runtime. These are distinct from the ERROR-NNN entries above, which track development/documentation mistakes.

## Expression Engine Errors

> **Status:** ✅ Finalized - Implementation in `packages/kernel/src/expressions/errors.ts`

| Code | Category | Description |
|------|----------|-------------|
| `EXPR_SYNTAX_ERROR` | Parse | Invalid expression syntax |
| `EXPR_UNEXPECTED_TOKEN` | Parse | Unexpected token during parsing |
| `EXPR_UNEXPECTED_END` | Parse | Unexpected end of expression |
| `EXPR_UNKNOWN_PROPERTY` | Reference | Referenced property does not exist |
| `EXPR_UNKNOWN_FUNCTION` | Reference | Function name not recognized |
| `EXPR_INVALID_ARGUMENT` | Argument | Invalid argument to function |
| `EXPR_ARGUMENT_COUNT` | Argument | Wrong number of arguments to function |
| `EXPR_TYPE_MISMATCH` | Type | Incompatible types in operation |
| `EXPR_DIVISION_BY_ZERO` | Runtime | Division by zero attempted |
| `EXPR_CIRCULAR_DEPENDENCY` | Dependency | Circular reference detected |
| `EXPR_DIMENSION_MISMATCH` | Dimension | Incompatible units in operation |
| `EXPR_NULL_REFERENCE` | Reference | Null value in non-nullable context |
| `EXPR_EVALUATION_FAILED` | Runtime | General evaluation failure |

### Error Code Format

```typescript
interface ExpressionError {
  code: string;           // e.g., 'EXPR_SYNTAX_ERROR'
  message: string;        // Human-readable description
  position?: {            // Location in expression (if applicable)
    line: number;
    column: number;
    offset: number;
  };
  expression?: string;    // The failing expression
  context?: Record<string, unknown>;  // Additional debug info
}
```

### Common Causes and Resolutions

#### EXPR_SYNTAX_ERROR
**Symptoms:** Expression fails to parse
**Common Causes:**
- Missing closing parenthesis
- Invalid operator usage
- Unquoted string literals
**Resolution:** Check expression against [EXPRESSION-QUICK-REF.md](../specs/config/EXPRESSION-QUICK-REF.md)

#### EXPR_CIRCULAR_DEPENDENCY
**Symptoms:** Property shows `circular` computation status
**Common Causes:**
- Property A depends on B, B depends on A
- Indirect cycles through multiple properties
**Resolution:** Review dependency graph, refactor to break cycle

#### EXPR_DIMENSION_MISMATCH
**Symptoms:** Computation fails on unit-aware operations
**Common Causes:**
- Adding length to mass
- Comparing incompatible units
**Resolution:** Ensure operands have compatible dimensions, use explicit conversions

---

## Data Binding Errors

> **Status:** ✅ Finalized - Implementation in `packages/kernel/src/blocks/errors.ts`

| Code | Category | Description |
|------|----------|-------------|
| `BIND_SCOPE_NOT_FOUND` | Reference | Referenced scope variable doesn't exist |
| `BIND_INVALID_PATH` | Reference | Invalid property path in binding |
| `BIND_PERMISSION_DENIED` | Auth | `$can()` check failed |
| `BIND_EVALUATION_FAILED` | Runtime | Binding expression evaluation failed |

---

## Block Runtime Errors

> **Status:** ✅ Finalized - Implementation in `packages/kernel/src/blocks/errors.ts`

| Code | Category | Description |
|------|----------|-------------|
| `BLOCK_NOT_FOUND` | Reference | Referenced block ID doesn't exist |
| `BLOCK_VALIDATION_ERROR` | Validation | Block config validation failed |
| `WIRING_INVALID_SOURCE` | Wiring | Source block/event not found |
| `WIRING_INVALID_TARGET` | Wiring | Target block/receiver not found |
| `WIRING_TRANSFORM_FAILED` | Wiring | Transform expression failed |
| `CONFIG_LOAD_ERROR` | Config | YAML config failed to load |
| `CONFIG_INCLUDE_ERROR` | Config | Included file not found |
| `CONFIG_VALIDATION_ERROR` | Config | Config schema validation failed |

---

## Debug Error Codes

> **Status:** ✅ Finalized - Implementation in `packages/shared/src/debug/`

| Code | Category | Description |
|------|----------|-------------|
| `DEBUG_TRACE_OVERFLOW` | Trace | Trace buffer exceeded limit |
| `DEBUG_CONTEXT_NOT_SET` | Context | Debug context not initialized |

---

## API Layer Errors (Phase 2.3)

> **Status:** ✅ Finalized - Implementation in `packages/kernel/src/types/errors.ts`

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_FOUND` | 404 | Entity, relationship, or resource not found |
| `ALREADY_EXISTS` | 409 | Entity or relationship already exists |
| `VERSION_CONFLICT` | 409 | Optimistic locking version mismatch |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `TYPE_MISMATCH` | 400 | Property type doesn't match schema |
| `PERMISSION_DENIED` | 403 | User lacks permission for operation |
| `TENANT_MISMATCH` | 403 | Resource belongs to different tenant |
| `CIRCULAR_DEPENDENCY` | 422 | Circular reference in relationships or expressions |
| `INVALID_EXPRESSION` | 400 | Expression syntax or evaluation error |
| `REFERENCE_BROKEN` | 422 | Referenced entity no longer exists |

### Error Response Format

```typescript
interface ErrorResponse {
  code: string;           // e.g., 'VERSION_CONFLICT'
  message: string;        // Human-readable description
  details?: Record<string, unknown>;  // Additional context
  requestId?: string;     // Request ID for debugging
}
```

### Common Causes and Resolutions

#### VERSION_CONFLICT
**Symptoms:** Update returns HTTP 409
**Common Causes:**
- Another user updated the entity since you read it
- Missing `expected_version` in request
**Resolution:** Re-fetch entity, get current version, retry update

#### TENANT_MISMATCH
**Symptoms:** Access returns HTTP 403
**Common Causes:**
- Trying to access entity from different tenant
- Auth token has wrong tenant_id
**Resolution:** Verify tenant context in request, check authentication

#### REFERENCE_BROKEN
**Symptoms:** Operation returns HTTP 422
**Common Causes:**
- Referenced entity was deleted
- Relationship target no longer exists
**Resolution:** Update or remove the broken reference

---

## Authentication Errors (Phase 2.4)

> **Status:** ✅ Finalized - Implementation in `packages/server/src/auth/`

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid Authorization header |
| `TOKEN_EXPIRED` | 401 | JWT has expired, needs refresh |
| `TOKEN_INVALID` | 401 | JWT signature invalid or malformed |
| `REFRESH_INVALID` | 401 | Refresh token invalid or expired |

### Common Causes and Resolutions

#### TOKEN_EXPIRED
**Symptoms:** API returns HTTP 401 with code `TOKEN_EXPIRED`
**Common Causes:**
- Access token older than 1 hour
- System clock skew between client and server
**Resolution:** Use refresh token to obtain new access token via `/auth/refresh` endpoint

#### REFRESH_INVALID
**Symptoms:** Refresh endpoint returns HTTP 401
**Common Causes:**
- Refresh token older than 7 days
- Token was revoked on logout
- Token was already used (if single-use policy)
**Resolution:** User must re-authenticate via login flow

---

## WebSocket Errors (Phase 2.4)

> **Status:** ✅ Finalized - Implementation in `packages/server/src/websocket/`

| Code | Description |
|------|-------------|
| `WS_AUTH_REQUIRED` | Connection not authenticated, send auth message first |
| `WS_AUTH_FAILED` | Authentication message invalid or token expired |
| `WS_INVALID_MESSAGE` | Message format invalid (not valid JSON or missing type) |
| `WS_SUBSCRIPTION_NOT_FOUND` | Unsubscribe for unknown subscription ID |
| `WS_RATE_LIMITED` | Too many messages, connection throttled |

### WebSocket Protocol

```typescript
// Client → Server messages
{ type: 'auth', token: string }
{ type: 'subscribe', filter: { entity_type?, entity_id?, event_types? } }
{ type: 'unsubscribe', subscription_id: string }

// Server → Client messages
{ type: 'auth_ok' }
{ type: 'subscribed', subscription_id: string }
{ type: 'event', subscription_id: string, event: TrellisEvent }
{ type: 'error', code: string, message: string }
```
