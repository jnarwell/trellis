# ADR-003: Relationships with ltree for Hierarchies

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team

## Context

Trellis needs to model relationships between entities:
- Simple associations (e.g., Contact belongs to Company)
- Hierarchies (e.g., Assembly contains Parts, Folder contains Documents)
- Many-to-many (e.g., Part used in multiple Assemblies)
- Typed relationships (e.g., "manufactured_by", "approved_by", "parent_of")

Hierarchical queries (ancestors, descendants, subtree) are common in PLM and document management.

## Decision Drivers

- Need efficient tree traversal for BOMs (Bill of Materials)
- Relationships have types and optional metadata
- Support for multiple hierarchy types on same entities
- Query performance for "all descendants" operations
- Prevent circular references in hierarchies

## Considered Options

1. **Dedicated relationships table + ltree** - Hybrid approach
2. **Adjacency list** - Simple parent_id column
3. **Nested sets** - Left/right numbering
4. **Closure table** - All ancestor-descendant pairs
5. **JSONB arrays** - Store relationships in entity

## Decision

We will use a **dedicated relationships table with PostgreSQL ltree extension** for hierarchies:

```sql
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE relationships (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  relationship_type_id UUID NOT NULL REFERENCES relationship_types(id),
  source_entity_id UUID NOT NULL REFERENCES entities(id),
  target_entity_id UUID NOT NULL REFERENCES entities(id),

  -- ltree path for hierarchical relationships (null for flat relationships)
  path ltree,

  -- Relationship metadata stored as JSONB
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT no_self_reference CHECK (source_entity_id != target_entity_id)
);

CREATE INDEX idx_relationships_path ON relationships USING GIST (path);
CREATE INDEX idx_relationships_source ON relationships (source_entity_id);
CREATE INDEX idx_relationships_target ON relationships (target_entity_id);
```

### Path Convention

For hierarchical relationships, the `path` column stores the materialized path:
- Root entity: `{entity_id}`
- Child: `{root_id}.{parent_id}.{child_id}`

Example BOM hierarchy:
```
car_001
car_001.engine_001
car_001.engine_001.piston_001
car_001.engine_001.piston_002
car_001.chassis_001
```

### Consequences

**Positive:**
- ltree provides efficient subtree queries: `path <@ 'car_001.engine_001'`
- All descendants in single query without recursion
- Depth queries: `nlevel(path)`
- Ancestor queries: `path @> 'car_001.engine_001.piston_001'`
- Native PostgreSQL extension, well-tested

**Negative:**
- Path updates required when moving subtrees
- Path length limited (practical limit ~1000 levels)
- ltree extension must be installed

**Neutral:**
- Flat relationships just have NULL path
- Relationship types define whether hierarchy applies

## Implementation Notes

**Finding all descendants:**
```sql
SELECT * FROM relationships
WHERE path <@ 'car_001'
AND relationship_type_id = 'bom_contains';
```

**Finding ancestors:**
```sql
SELECT * FROM relationships
WHERE path @> 'car_001.engine_001.piston_001'
AND relationship_type_id = 'bom_contains';
```

**Moving a subtree:**
```sql
UPDATE relationships
SET path = 'new_parent' || subpath(path, nlevel('old_parent'))
WHERE path <@ 'old_parent';
```

**Circular reference prevention:**
- Check that target is not an ancestor of source before creating relationship
- Enforce in application layer with transaction

## References

- [ADR-002: Entity Properties via JSONB](./002-entity-properties-jsonb.md)
- [PostgreSQL ltree documentation](https://www.postgresql.org/docs/current/ltree.html)
