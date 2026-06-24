/**
 * Trellis Expression Engine - Dimensional Analysis
 *
 * Unit registry + dimension algebra so the engine treats numbers as physical
 * quantities, not bare floats:
 *  - adding/comparing incompatible dimensions (e.g. length + time) errors
 *  - compatible units with different scales (m + mm) are converted, not summed raw
 *  - results carry their dimension/unit through arithmetic
 *
 * A number's dimension is taken from its explicit `dimension` field if present,
 * otherwise inferred from its `unit` via the registry. Dimensionless numbers
 * (no dimension, no known unit) stay permissive so plain-number configs keep
 * working — a dimension mismatch is only raised when BOTH operands are
 * dimensioned and the dimensions differ.
 */

import type { NumberValue, DimensionType } from '../types/value.js';

// =============================================================================
// UNIT REGISTRY
// =============================================================================

interface UnitInfo {
  readonly dimension: DimensionType;
  /** Multiplicative factor to the dimension's SI base unit. */
  readonly toBase: number;
}

/**
 * Common units → {dimension, factor-to-SI-base}. Multiplicative only
 * (temperature offset scales like °C/°F are intentionally excluded — they
 * are not pure scaling and would convert incorrectly here).
 */
export const UNIT_REGISTRY: Readonly<Record<string, UnitInfo>> = {
  // length (base: metre)
  mm: { dimension: 'length', toBase: 0.001 },
  cm: { dimension: 'length', toBase: 0.01 },
  m: { dimension: 'length', toBase: 1 },
  km: { dimension: 'length', toBase: 1000 },
  in: { dimension: 'length', toBase: 0.0254 },
  ft: { dimension: 'length', toBase: 0.3048 },
  // mass (base: kilogram)
  mg: { dimension: 'mass', toBase: 1e-6 },
  g: { dimension: 'mass', toBase: 0.001 },
  kg: { dimension: 'mass', toBase: 1 },
  t: { dimension: 'mass', toBase: 1000 },
  lb: { dimension: 'mass', toBase: 0.45359237 },
  oz: { dimension: 'mass', toBase: 0.028349523 },
  // time (base: second)
  ms: { dimension: 'time', toBase: 0.001 },
  s: { dimension: 'time', toBase: 1 },
  sec: { dimension: 'time', toBase: 1 },
  min: { dimension: 'time', toBase: 60 },
  h: { dimension: 'time', toBase: 3600 },
  hr: { dimension: 'time', toBase: 3600 },
  day: { dimension: 'time', toBase: 86400 },
};

function unitInfo(unit?: string): UnitInfo | undefined {
  return unit ? UNIT_REGISTRY[unit] : undefined;
}

// =============================================================================
// DIMENSION RESOLUTION
// =============================================================================

/** Resolve a number's dimension: explicit field, else inferred from its unit. */
export function resolveDimension(v: NumberValue): DimensionType | undefined {
  if (v.dimension) return v.dimension;
  const info = unitInfo(v.unit);
  return info?.dimension;
}

/**
 * Whether two numbers can be combined under +, -, or comparison.
 * Permissive: a dimensionless operand is compatible with anything; a clash is
 * only two *defined* dimensions that differ.
 */
export function dimensionsCompatible(a: NumberValue, b: NumberValue): boolean {
  const da = resolveDimension(a);
  const db = resolveDimension(b);
  if (da === undefined || db === undefined) return true;
  return da === db;
}

/**
 * Convert a numeric value from one unit to another within the same dimension.
 * Returns the converted number, or the original value if either unit is unknown
 * or they belong to different dimensions (caller has already checked dimension
 * compatibility).
 */
export function convertValue(value: number, fromUnit?: string, toUnit?: string): number {
  const from = unitInfo(fromUnit);
  const to = unitInfo(toUnit);
  if (!from || !to || from.dimension !== to.dimension) return value;
  return (value * from.toBase) / to.toBase;
}

// =============================================================================
// RESULT CONSTRUCTION
// =============================================================================

/** Build a number value, attaching dimension/unit only when defined. */
export function numberWithUnit(
  value: number,
  dimension?: DimensionType,
  unit?: string
): NumberValue {
  return {
    type: 'number',
    value,
    ...(dimension !== undefined && { dimension }),
    ...(unit !== undefined && { unit }),
  };
}

/**
 * For + / - / %: align `right` to `left`'s unit (when both convertible),
 * returning the aligned right-hand numeric value and the dimension/unit the
 * result should carry (the left's if defined, else the right's).
 */
export function alignAdditive(
  left: NumberValue,
  right: NumberValue
): { rightValue: number; dimension?: DimensionType; unit?: string } {
  const rightValue =
    left.unit && right.unit ? convertValue(right.value, right.unit, left.unit) : right.value;
  const dimension = resolveDimension(left) ?? resolveDimension(right);
  const unit = left.unit ?? right.unit;
  const out: { rightValue: number; dimension?: DimensionType; unit?: string } = { rightValue };
  if (dimension !== undefined) out.dimension = dimension;
  if (unit !== undefined) out.unit = unit;
  return out;
}
