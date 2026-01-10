# ADR-002: Entity Properties via JSONB

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team

## Context

Trellis entities need to support arbitrary, user-defined properties. Different products (PLM, CRM, etc.) will define different property schemas. We need a system that:
- Allows dynamic property definitions without schema migrations
- Maintains type safety and validation
- Supports querying and indexing
- Handles units and dimensions

## Decision Drivers

- Products define their own entity types at configuration time
- Properties can be added/removed without database changes
- Each property has a type (string, number, boolean, date, reference, etc.)
- Numeric properties may have units with dimensional analysis
- Need to validate property values against their type definitions

## Considered Options

1. **JSONB column** - Store properties as JSON object
2. **EAV (Entity-Attribute-Value)** - Separate table for each property value
3. **Wide tables with nullable columns** - Add columns for each property
4. **Document database (MongoDB)** - Full schema-less approach

## Decision

We will use **JSONB column** on the entities table because:

```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type_id UUID NOT NULL REFERENCES entity_types(id),
  properties JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Example properties value:
{
  "name": { "type": "string", "value": "Bracket Assembly" },
  "weight": {
    "type": "number",
    "value": 2.5,
    "unit_id": "kg",
    "computed_value": 2.5,
    "computation_status": "valid"
  },
  "cost": {
    "type": "expression",
    "expression": "#material_cost + #labor_cost",
    "computed_value": 150.00,
    "computation_status": "valid",
    "dependencies": ["material_cost", "labor_cost"]
  }
}
```

### Consequences

**Positive:**
- No schema migrations when adding property types
- Full PostgreSQL querying capabilities via JSONB operators
- Can index specific JSON paths with GIN indexes
- Atomic updates to individual properties
- Natural representation matches domain model

**Negative:**
- No foreign key constraints on property values
- Type validation must happen in application layer
- Complex queries on JSONB can be slower
- Storage less efficient than native columns

**Neutral:**
- Property type definitions stored in separate `property_definitions` table
- Validation logic runs on write, not enforced by database

## Implementation Notes

- Create GIN index: `CREATE INDEX idx_entity_properties ON entities USING GIN (properties)`
- Use `jsonb_set` for partial updates
- Property definitions table validates structure on write
- Consider materialized views for frequently-queried property combinations

## Property Value Structure

Each property value in JSONB follows this structure:

```typescript
interface PropertyValue {
  type: 'string' | 'number' | 'boolean' | 'date' | 'reference' | 'expression';
  value?: any;                    // For literals
  expression?: string;            // For expressions
  unit_id?: string;               // For dimensioned numbers
  computed_value?: number;        // Result of expression evaluation
  computation_status: 'pending' | 'valid' | 'stale' | 'error' | 'circular';
  computation_error?: string;     // Error message if status is 'error'
  dependencies?: string[];        // Property names this depends on
}
```

## References

- [ADR-001: Technology Stack](./001-tech-stack.md)
- [PostgreSQL JSONB indexing](https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING)
