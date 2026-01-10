# Trellis - Open Questions

This document tracks unresolved architectural and design questions. When a question is resolved, move it to the "Resolved" section with a link to the relevant ADR or decision.

**Last Updated:** 2026-01-10

---

## Open Questions

### OQ-001: Expression Evaluation Location
**Status:** Open
**Priority:** High
**Context:** Expressions can be evaluated server-side or client-side (or both).

**Options:**
1. Server-only - Simpler, but latency for every calculation
2. Client-only - Fast feedback, but sync issues
3. Hybrid - Client for preview, server for persistence

**Considerations:**
- Security of expression evaluation
- Real-time feedback in UI
- Complex expressions with many dependencies
- Unit conversion requirements

---

### OQ-002: Event Store Retention Policy
**Status:** Open
**Priority:** Medium
**Context:** Events are immutable and grow unbounded. Need retention strategy.

**Options:**
1. Keep forever - Simple but storage grows
2. Archive to cold storage after N days
3. Aggregate old events into snapshots
4. Per-tenant retention policies

**Considerations:**
- Compliance requirements vary by industry
- Undo needs recent events available
- Audit trails may need long retention
- Cost of storage vs. query performance

---

### OQ-003: Block Rendering Strategy
**Status:** Open
**Priority:** Medium
**Context:** How blocks render in the UI.

**Options:**
1. React components compiled into main bundle
2. Micro-frontends (separate bundles per block)
3. Server-rendered blocks with hydration
4. Web components for framework-agnostic blocks

**Considerations:**
- Block versioning and updates
- Third-party block development
- Performance and bundle size
- Developer experience

---

### OQ-004: Real-time Update Transport
**Status:** Open
**Priority:** Medium
**Context:** How to push updates to connected clients.

**Options:**
1. Server-Sent Events (SSE) - Simple, one-way
2. WebSockets - Bidirectional, more complex
3. Long polling - Fallback option
4. HTTP/2 Push - Limited browser support

**Considerations:**
- Scalability (many connections)
- Reconnection handling
- Message ordering guarantees
- Proxy/firewall compatibility

---

### OQ-005: Permission Model Granularity
**Status:** Open
**Priority:** High
**Context:** How fine-grained should permissions be?

**Options:**
1. Role-based (RBAC) - Users have roles, roles have permissions
2. Attribute-based (ABAC) - Rules based on entity attributes
3. Hybrid - Roles with attribute conditions
4. Per-entity ACLs - Explicit access control lists

**Considerations:**
- Enterprise customers expect fine control
- Performance of permission checks
- Complexity of administration
- Audit requirements

---

### OQ-006: Product Hot-Reload Mechanism
**Status:** Open
**Priority:** Low
**Context:** How to update running products without restart.

**Options:**
1. File watcher with full reload
2. Granular schema diffing and patching
3. Database-backed config with cache invalidation
4. No hot-reload (restart required)

**Considerations:**
- Development vs. production needs differ
- Risk of partial updates
- Database migration implications

---

### OQ-007: Currency Exchange Rates
**Status:** Open
**Priority:** Low
**Context:** How to handle currency conversions in expressions.

**Options:**
1. External API integration (XE, Open Exchange Rates)
2. Manual rate tables maintained by tenant
3. No conversion (different currencies don't mix)
4. Base currency with historical rates

**Considerations:**
- Real-time vs. historical rates
- Audit trail for rate used
- Cost of external APIs
- Offline operation needs

---

### OQ-008: Expression Language Spec
**Status:** Open
**Priority:** High
**Context:** What syntax and functions should expressions support?

**Partial decisions:**
- Property references: `#property_name`
- Cross-entity: `#entity_code.property_name`
- Basic math: `+ - * / ^`

**Open items:**
- Conditional logic: `IF(cond, then, else)`?
- Aggregations: `SUM(#bom_children.weight)`?
- String operations?
- Date math?
- Custom functions?

**Considerations:**
- Security (no arbitrary code execution)
- Learnability for non-programmers
- Power for advanced users
- Consistency with Drip patterns

---

### OQ-009: Entity Soft Delete vs. Hard Delete
**Status:** Open
**Priority:** Medium
**Context:** How to handle entity deletion.

**Options:**
1. Soft delete (deleted_at timestamp)
2. Hard delete with archive table
3. Hard delete with event history
4. Configurable per entity type

**Considerations:**
- Referential integrity
- "Recycle bin" feature needs
- GDPR right to erasure
- Storage implications

---

### OQ-010: Monorepo Package Structure
**Status:** Open
**Priority:** High
**Context:** How to organize packages in the TypeScript monorepo.

**Options:**
```
Option A (by layer):
packages/
  core/         # Shared types, utils
  api/          # Fastify server
  web/          # React frontend
  cli/          # CLI tools

Option B (by domain):
packages/
  entities/     # Entity domain (types, API, UI)
  relationships/
  expressions/
  events/

Option C (hybrid):
packages/
  kernel/       # Core domain types
  server/       # API implementation
  client/       # Frontend
  shared/       # Shared utilities
```

**Considerations:**
- Code sharing between packages
- Build and test isolation
- Deployment units
- Team ownership boundaries

---

## Resolved Questions

### RQ-001: Data Storage Approach
**Resolved:** 2026-01-10
**Decision:** PostgreSQL with JSONB for properties
**ADR:** [002-entity-properties-jsonb.md](./adr/002-entity-properties-jsonb.md)

---

### RQ-002: Hierarchy Storage
**Resolved:** 2026-01-10
**Decision:** ltree extension for materialized paths
**ADR:** [003-relationships-ltree.md](./adr/003-relationships-ltree.md)

---

### RQ-003: Multi-Tenancy Strategy
**Resolved:** 2026-01-10
**Decision:** Query-layer isolation with tenant_id
**ADR:** [009-multi-tenancy.md](./adr/009-multi-tenancy.md)

---

### RQ-004: Concurrency Control
**Resolved:** 2026-01-10
**Decision:** Optimistic locking with version numbers
**ADR:** [010-optimistic-locking.md](./adr/010-optimistic-locking.md)

---

## How to Add Questions

1. Assign the next OQ number
2. Set status to "Open"
3. Assign priority (High/Medium/Low)
4. Describe context and options
5. List considerations

When resolved:
1. Change status to "Resolved"
2. Move to "Resolved Questions" section
3. Link to ADR or other documentation
4. Update CURRENT_STATE.md if needed
