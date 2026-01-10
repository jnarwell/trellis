# ADR-004: Optional Dimensions on Properties

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team

## Context

Trellis handles engineering data where numeric properties often have physical units (meters, kilograms, seconds). The system must:
- Support dimensional analysis for expressions
- Allow unit conversion
- Validate dimensional compatibility in calculations
- Handle non-physical dimensions (currency)
- Support dimensionless values

## Decision Drivers

- Engineering calculations require unit-aware math
- Adding length to mass should be an error
- Users want to work in preferred units (imperial vs metric)
- Currency values need special handling (not physically dimensional)
- Some numbers are truly dimensionless (ratios, counts)

## Considered Options

1. **Optional dimension enum** - Physical, Currency, or None
2. **Always require dimensions** - Force all numbers to have units
3. **String-based units only** - No dimensional analysis
4. **Separate number types** - Different column types for each

## Decision

Dimensions are **optional on numeric properties** with three categories:

```typescript
type DimensionCategory = 'physical' | 'currency' | 'none';

interface PropertyDefinition {
  name: string;
  type: 'number';
  dimension_category: DimensionCategory;

  // For physical dimensions - SI base dimension exponents
  dimensions?: {
    length: number;      // L (meter)
    mass: number;        // M (kilogram)
    time: number;        // T (second)
    current: number;     // I (ampere)
    temperature: number; // Θ (kelvin)
    amount: number;      // N (mole)
    luminosity: number;  // J (candela)
  };

  // For currency
  currency_code?: string;  // ISO 4217 (USD, EUR, etc.)

  default_unit_id?: string;
}
```

### Dimension Categories

**Physical (`physical`):**
- Uses 7 SI base dimensions
- Full dimensional analysis
- Example: velocity = L·T⁻¹

**Currency (`currency`):**
- Single "currency" dimension
- No mixing currencies in expressions without conversion
- Exchange rates stored separately

**None (`none`):**
- Dimensionless quantities
- Ratios, counts, percentages
- Can multiply/divide with anything

### Consequences

**Positive:**
- Catches unit errors at calculation time
- Clear separation of physical, monetary, and dimensionless values
- Users can work in familiar units
- Expressions can verify dimensional compatibility

**Negative:**
- More complexity in expression evaluation
- Must maintain unit conversion tables
- Currency exchange adds real-time data dependency

**Neutral:**
- Legacy data import may need dimension mapping

## Implementation Notes

**Dimension compatibility checking:**
```typescript
function canAdd(a: Dimensions, b: Dimensions): boolean {
  return a.length === b.length &&
         a.mass === b.mass &&
         a.time === b.time &&
         // ... all dimensions must match
}

function multiplyDimensions(a: Dimensions, b: Dimensions): Dimensions {
  return {
    length: a.length + b.length,
    mass: a.mass + b.mass,
    time: a.time + b.time,
    // ... add exponents
  };
}
```

**Common physical quantities:**
| Quantity | Dimensions |
|----------|------------|
| Length | L |
| Area | L² |
| Volume | L³ |
| Mass | M |
| Velocity | L·T⁻¹ |
| Acceleration | L·T⁻² |
| Force | M·L·T⁻² |
| Energy | M·L²·T⁻² |
| Pressure | M·L⁻¹·T⁻² |

## References

- [ADR-002: Entity Properties via JSONB](./002-entity-properties-jsonb.md)
- [International System of Units (SI)](https://www.bipm.org/en/measurement-units)
