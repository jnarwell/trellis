# ADR-009: Multi-Tenancy at Query Layer

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team

## Context

Trellis is a SaaS platform serving multiple organizations (tenants). We need to:
- Completely isolate tenant data
- Support tenant-specific configurations
- Maintain performance at scale
- Enable future per-tenant scaling

## Decision Drivers

- Data isolation is non-negotiable for enterprise customers
- Same codebase serves all tenants
- Some tenants may need dedicated resources later
- Operational simplicity for small deployments
- Query performance should not degrade with tenant count

## Considered Options

1. **Query-layer isolation (shared schema)** - Filter by tenant_id
2. **Schema-per-tenant** - Separate Postgres schemas
3. **Database-per-tenant** - Completely separate databases
4. **Row-level security (RLS)** - Postgres native feature
5. **Application-layer only** - No database enforcement

## Decision

We will use **query-layer tenant isolation** with `tenant_id` on all tables, enforced at the repository layer:

```sql
-- All data tables include tenant_id
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  -- ... other columns
);

CREATE INDEX idx_entities_tenant ON entities (tenant_id);

-- Composite indexes for common queries
CREATE INDEX idx_entities_tenant_type ON entities (tenant_id, entity_type_id);
```

### Enforcement Strategy

```typescript
// Base repository with mandatory tenant filtering
abstract class TenantScopedRepository<T> {
  constructor(
    protected prisma: PrismaClient,
    protected tenantId: string
  ) {}

  // All queries automatically scoped
  protected get baseWhere() {
    return { tenantId: this.tenantId };
  }

  async findMany(where: Partial<T>): Promise<T[]> {
    return this.prisma.entity.findMany({
      where: { ...this.baseWhere, ...where }
    });
  }

  async create(data: Omit<T, 'tenantId'>): Promise<T> {
    return this.prisma.entity.create({
      data: { ...data, tenantId: this.tenantId }
    });
  }
}

// Request context carries tenant
interface RequestContext {
  tenantId: string;
  userId: string;
  permissions: string[];
}

// Fastify hook injects tenant from auth
fastify.addHook('preHandler', async (request) => {
  const token = await verifyToken(request.headers.authorization);
  request.context = {
    tenantId: token.tenantId,
    userId: token.userId,
    permissions: token.permissions,
  };
});
```

### Why Not Row-Level Security?

While Postgres RLS is powerful, we chose application-layer enforcement because:
- More portable (not Postgres-specific)
- Easier to debug and test
- More flexible for complex authorization
- Can add RLS later as defense-in-depth

### Consequences

**Positive:**
- Simple operational model (one database)
- Easy to query across entity types within tenant
- Straightforward backup/restore
- Can add RLS as additional safety layer

**Negative:**
- Must be vigilant about always including tenant_id
- Cross-tenant queries require special handling
- Large tenants can impact shared resources

**Neutral:**
- Can shard by tenant_id later if needed
- Tenant context must be passed through all layers

## Implementation Notes

**Preventing tenant leakage:**
```typescript
// Type-safe tenant context
type TenantId = string & { readonly brand: unique symbol };

function createTenantId(id: string): TenantId {
  if (!isValidUUID(id)) throw new Error('Invalid tenant ID');
  return id as TenantId;
}

// Repository requires TenantId type, not just string
class EntityRepository extends TenantScopedRepository<Entity> {
  constructor(prisma: PrismaClient, tenantId: TenantId) {
    super(prisma, tenantId);
  }
}
```

**Testing tenant isolation:**
```typescript
describe('tenant isolation', () => {
  it('cannot access other tenant data', async () => {
    const tenant1 = await createTenant();
    const tenant2 = await createTenant();

    const entity = await createEntity(tenant1.id, { name: 'Secret' });

    const repo = new EntityRepository(prisma, tenant2.id);
    const result = await repo.findById(entity.id);

    expect(result).toBeNull();
  });
});
```

**Admin/support access:**
```typescript
// Special repository for platform admins
class PlatformAdminRepository {
  // Requires explicit tenant specification
  async findEntityAcrossTenants(
    entityId: string,
    reason: string
  ): Promise<Entity | null> {
    await auditLog.record({
      action: 'cross_tenant_access',
      entityId,
      reason,
      actor: this.adminId,
    });

    return this.prisma.entity.findUnique({
      where: { id: entityId }
      // No tenant filter - intentionally
    });
  }
}
```

## References

- [ADR-001: Technology Stack](./001-tech-stack.md)
- [Multi-tenant SaaS patterns](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)
