-- =============================================================================
-- Trellis Kernel - Initial Migration
-- =============================================================================
--
-- This migration creates the complete database structure for the Trellis kernel.
-- Requirements: PostgreSQL 15+, extensions: uuid-ossp, ltree, pg_trgm
--
-- Source: specs/kernel/02-schema.sql
--
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- -----------------------------------------------------------------------------
-- CUSTOM TYPES
-- -----------------------------------------------------------------------------

-- Computation status for computed/inherited properties (ADR-005)
CREATE TYPE computation_status AS ENUM (
    'pending',    -- Never calculated
    'valid',      -- Calculated and up-to-date
    'stale',      -- Dependencies changed, needs recalculation
    'error',      -- Last calculation failed
    'circular'    -- Circular dependency detected
);

-- Value types (used for documentation; validated in application layer)
CREATE TYPE value_type AS ENUM (
    'text',
    'number',
    'boolean',
    'datetime',
    'duration',
    'reference',
    'list',
    'record'
);

-- Relationship cardinality
CREATE TYPE cardinality AS ENUM (
    'one_to_one',
    'one_to_many',
    'many_to_one',
    'many_to_many'
);

-- Event types
CREATE TYPE event_type AS ENUM (
    'entity_created',
    'entity_updated',
    'entity_deleted',
    'property_changed',
    'property_stale',          -- Added: for staleness propagation events
    'relationship_created',
    'relationship_deleted',
    'type_schema_created',
    'type_schema_updated'
);

-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS (must be created before tables that reference them)
-- -----------------------------------------------------------------------------

-- Function to generate UUID v7 (time-ordered)
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID AS $$
DECLARE
    unix_ts_ms BIGINT;
    uuid_bytes BYTEA;
BEGIN
    unix_ts_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    uuid_bytes := decode(
        lpad(to_hex(unix_ts_ms), 12, '0') ||
        lpad(to_hex((random() * 65535)::INT), 4, '0') ||
        '8' || lpad(to_hex((random() * 4095)::INT), 3, '0') ||
        lpad(to_hex((random() * 1099511627775)::BIGINT), 12, '0'),
        'hex'
    );
    RETURN encode(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- TENANTS
-- -----------------------------------------------------------------------------

CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tenant_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- ACTORS (Users/Systems that perform actions)
-- -----------------------------------------------------------------------------

CREATE TABLE actors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    external_id     TEXT,  -- ID in external auth system
    name            TEXT NOT NULL,
    email           TEXT,
    actor_type      TEXT NOT NULL DEFAULT 'user',  -- 'user', 'system', 'api_key'
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_tenant_external_id UNIQUE (tenant_id, external_id)
);

CREATE INDEX idx_actors_tenant ON actors(tenant_id);
CREATE INDEX idx_actors_external_id ON actors(tenant_id, external_id);

CREATE TRIGGER trigger_actors_updated_at
    BEFORE UPDATE ON actors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- TYPE SCHEMAS
-- -----------------------------------------------------------------------------

CREATE TABLE type_schemas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id       UUID REFERENCES tenants(id),  -- NULL = system-wide
    type_path       ltree NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    extends_type    ltree,  -- Parent type for inheritance
    properties      JSONB NOT NULL DEFAULT '[]',  -- Array of PropertySchema
    abstract        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Either system-wide (tenant_id IS NULL) or tenant-scoped, but unique
    CONSTRAINT unique_type_per_scope UNIQUE (tenant_id, type_path)
);

-- Index for type hierarchy queries
CREATE INDEX idx_type_schemas_path ON type_schemas USING GIST (type_path);
CREATE INDEX idx_type_schemas_tenant ON type_schemas(tenant_id);
CREATE INDEX idx_type_schemas_extends ON type_schemas USING GIST (extends_type);

CREATE TRIGGER trigger_type_schemas_updated_at
    BEFORE UPDATE ON type_schemas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- ENTITIES
-- -----------------------------------------------------------------------------

CREATE TABLE entities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    type_path       ltree NOT NULL,
    properties      JSONB NOT NULL DEFAULT '{}',
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES actors(id),

    -- Soft delete support
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID REFERENCES actors(id)
);

-- Primary indexes
CREATE INDEX idx_entities_tenant ON entities(tenant_id);
CREATE INDEX idx_entities_type ON entities USING GIST (type_path);
CREATE INDEX idx_entities_tenant_type ON entities(tenant_id, type_path);
CREATE INDEX idx_entities_created ON entities(tenant_id, created_at DESC);
CREATE INDEX idx_entities_updated ON entities(tenant_id, updated_at DESC);

-- JSONB property indexes (GIN for containment queries)
CREATE INDEX idx_entities_properties ON entities USING GIN (properties jsonb_path_ops);

-- Partial index for non-deleted entities (most queries)
CREATE INDEX idx_entities_active ON entities(tenant_id, type_path)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trigger_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- RELATIONSHIPS
-- -----------------------------------------------------------------------------

CREATE TABLE relationship_schemas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id       UUID REFERENCES tenants(id),  -- NULL = system-wide
    type            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    from_types      ltree[] NOT NULL DEFAULT '{}',
    to_types        ltree[] NOT NULL DEFAULT '{}',
    cardinality     cardinality NOT NULL DEFAULT 'many_to_many',
    bidirectional   BOOLEAN NOT NULL DEFAULT FALSE,
    inverse_type    TEXT,
    metadata_schema JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_rel_type_per_scope UNIQUE (tenant_id, type)
);

CREATE INDEX idx_rel_schemas_tenant ON relationship_schemas(tenant_id);
CREATE INDEX idx_rel_schemas_type ON relationship_schemas(type);

CREATE TABLE relationships (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    type            TEXT NOT NULL,
    from_entity     UUID NOT NULL REFERENCES entities(id),
    to_entity       UUID NOT NULL REFERENCES entities(id),
    metadata        JSONB NOT NULL DEFAULT '{}',

    -- ltree path for hierarchical relationships (null for flat relationships)
    -- Format: "root_id.parent_id.child_id" - see ADR-003
    path            ltree,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES actors(id),

    -- Prevent duplicate relationships
    CONSTRAINT unique_relationship UNIQUE (tenant_id, type, from_entity, to_entity),

    -- Prevent self-relationships (usually)
    CONSTRAINT no_self_reference CHECK (from_entity != to_entity)
);

-- Relationship query indexes
CREATE INDEX idx_relationships_tenant ON relationships(tenant_id);
CREATE INDEX idx_relationships_type ON relationships(tenant_id, type);
CREATE INDEX idx_relationships_from ON relationships(from_entity);
CREATE INDEX idx_relationships_to ON relationships(to_entity);
CREATE INDEX idx_relationships_from_type ON relationships(from_entity, type);
CREATE INDEX idx_relationships_to_type ON relationships(to_entity, type);

-- For bidirectional traversal
CREATE INDEX idx_relationships_bidirectional ON relationships(tenant_id, type, to_entity, from_entity);

-- GIST index for hierarchical path queries (ADR-003)
CREATE INDEX idx_relationships_path ON relationships USING GIST (path) WHERE path IS NOT NULL;

-- -----------------------------------------------------------------------------
-- EVENTS (Immutable Event Log)
-- -----------------------------------------------------------------------------

CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    event_type      event_type NOT NULL,
    entity_id       UUID,  -- May be NULL for non-entity events
    actor_id        UUID NOT NULL REFERENCES actors(id),
    payload         JSONB NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Events are immutable - no updated_at
    -- Partition key for time-based partitioning
    -- Use UTC timezone for immutable conversion (required for generated columns)
    partition_key   DATE GENERATED ALWAYS AS ((occurred_at AT TIME ZONE 'UTC')::DATE) STORED
);

-- Event query indexes
CREATE INDEX idx_events_tenant ON events(tenant_id);
CREATE INDEX idx_events_entity ON events(entity_id);
CREATE INDEX idx_events_type ON events(tenant_id, event_type);
CREATE INDEX idx_events_occurred ON events(tenant_id, occurred_at DESC);
CREATE INDEX idx_events_actor ON events(tenant_id, actor_id);

-- Composite index for common query: events for entity by time
CREATE INDEX idx_events_entity_time ON events(entity_id, occurred_at DESC);

-- -----------------------------------------------------------------------------
-- COMPUTED PROPERTY CACHE
-- -----------------------------------------------------------------------------

-- Cache for computed property values to avoid recalculation
-- Uses computation_status enum per ADR-005
CREATE TABLE computed_cache (
    entity_id       UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    property_name   TEXT NOT NULL,
    cached_value    JSONB,            -- NULL if pending/error/circular
    dependencies    TEXT[] NOT NULL,  -- Property paths this depends on
    computed_at     TIMESTAMPTZ,      -- NULL if never computed
    status          computation_status NOT NULL DEFAULT 'pending',
    error_message   TEXT,             -- Populated if status is 'error' or 'circular'

    PRIMARY KEY (entity_id, property_name)
);

-- Index for finding valid cached values
CREATE INDEX idx_computed_cache_valid ON computed_cache(entity_id) WHERE status = 'valid';

-- Index for finding stale values that need recalculation
CREATE INDEX idx_computed_cache_stale ON computed_cache(entity_id) WHERE status = 'stale';

-- Index for finding properties by their dependencies (for staleness propagation)
CREATE INDEX idx_computed_cache_deps ON computed_cache USING GIN (dependencies);

-- -----------------------------------------------------------------------------
-- PROPERTY DEPENDENCIES (ADR-005)
-- -----------------------------------------------------------------------------

-- Tracks which properties depend on which for staleness propagation
CREATE TABLE property_dependencies (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),

    -- The property that has the expression (the dependent)
    dependent_entity_id     UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    dependent_property_name TEXT NOT NULL,

    -- The property being referenced (the source)
    source_entity_id        UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    source_property_name    TEXT NOT NULL,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate dependency records
    CONSTRAINT unique_dependency UNIQUE (
        dependent_entity_id, dependent_property_name,
        source_entity_id, source_property_name
    )
);

-- Index for finding all dependents of a source property (staleness propagation)
CREATE INDEX idx_deps_source ON property_dependencies (source_entity_id, source_property_name);

-- Index for finding all sources of a dependent property
CREATE INDEX idx_deps_dependent ON property_dependencies (dependent_entity_id, dependent_property_name);

-- Index for tenant-scoped queries
CREATE INDEX idx_deps_tenant ON property_dependencies (tenant_id);

-- -----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- -----------------------------------------------------------------------------

-- Enable RLS on all tenant-scoped tables
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE type_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_dependencies ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies (application sets current_tenant_id)
CREATE POLICY tenant_isolation_entities ON entities
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_relationships ON relationships
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_events ON events
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_actors ON actors
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Type schemas: visible if system-wide OR owned by tenant
CREATE POLICY tenant_isolation_type_schemas ON type_schemas
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_rel_schemas ON relationship_schemas
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_property_deps ON property_dependencies
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- -----------------------------------------------------------------------------
-- ADDITIONAL HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Function to check if a type matches (including hierarchy)
CREATE OR REPLACE FUNCTION type_matches(entity_type ltree, query_type ltree)
RETURNS BOOLEAN AS $$
BEGIN
    -- Exact match or ancestor match
    RETURN entity_type <@ query_type OR entity_type = query_type;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to mark computed cache as stale when dependencies change
CREATE OR REPLACE FUNCTION invalidate_computed_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark cached values as stale if they depend on changed properties
    UPDATE computed_cache
    SET status = 'stale'
    WHERE entity_id = NEW.id
      AND status = 'valid'
      AND dependencies && ARRAY(SELECT jsonb_object_keys(NEW.properties));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to invalidate cache on entity update
CREATE TRIGGER trigger_invalidate_computed_cache
    AFTER UPDATE OF properties ON entities
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_computed_cache();

-- -----------------------------------------------------------------------------
-- JSONB PROPERTY ACCESS HELPERS
-- -----------------------------------------------------------------------------

-- Extract property value (handles all source types)
CREATE OR REPLACE FUNCTION get_property_value(props JSONB, prop_name TEXT)
RETURNS JSONB AS $$
DECLARE
    prop JSONB;
    source TEXT;
BEGIN
    prop := props->prop_name;
    IF prop IS NULL THEN
        RETURN NULL;
    END IF;

    source := prop->>'source';

    CASE source
        WHEN 'literal' THEN
            RETURN prop->'value';
        WHEN 'inherited' THEN
            -- Return override if present, otherwise resolved_value
            RETURN COALESCE(prop->'override', prop->'resolved_value');
        WHEN 'computed' THEN
            RETURN prop->'cached_value';
        WHEN 'measured' THEN
            RETURN prop->'value';
        ELSE
            RETURN prop->'value';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if property exists
CREATE OR REPLACE FUNCTION has_property(props JSONB, prop_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN props ? prop_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get scalar value from property (for text/number comparisons)
CREATE OR REPLACE FUNCTION get_property_scalar(props JSONB, prop_name TEXT)
RETURNS TEXT AS $$
DECLARE
    val JSONB;
BEGIN
    val := get_property_value(props, prop_name);
    IF val IS NULL THEN
        RETURN NULL;
    END IF;

    -- Return the scalar value based on type
    IF val->>'type' = 'text' THEN
        RETURN val->>'value';
    ELSIF val->>'type' = 'number' THEN
        RETURN val->>'value';
    ELSIF val->>'type' = 'boolean' THEN
        RETURN val->>'value';
    ELSE
        RETURN val::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

COMMIT;
