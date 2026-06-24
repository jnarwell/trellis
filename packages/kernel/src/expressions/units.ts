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

/** SI base unit for each registered base dimension (factor 1). */
const BASE_UNIT: Partial<Record<DimensionType, string>> = {
  length: 'm',
  mass: 'kg',
  time: 's',
};

/**
 * The unit to use for conversion. A value with an explicit `unit` uses it; a
 * value carrying only a `dimension` is taken to be in that dimension's SI base
 * unit (so `1·length + 900·mm` converts as 1 m + 900 mm, not raw 1 + 900).
 */
export function effectiveUnit(v: NumberValue): string | undefined {
  if (v.unit) return v.unit;
  const dim = v.dimension;
  return dim ? BASE_UNIT[dim] : undefined;
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

/** Build a number value, attaching dimension/unit/uncertainty only when defined. */
export function numberWithUnit(
  value: number,
  dimension?: DimensionType,
  unit?: string,
  uncertainty?: number
): NumberValue {
  return {
    type: 'number',
    value,
    ...(dimension !== undefined && { dimension }),
    ...(unit !== undefined && { unit }),
    ...(uncertainty !== undefined && { uncertainty }),
  };
}

/**
 * For + / - / %: align `right` to `left`'s unit (when both convertible),
 * returning the aligned right-hand numeric value and uncertainty plus the
 * dimension/unit the result should carry (the left's if defined, else right's).
 */
export function alignAdditive(
  left: NumberValue,
  right: NumberValue
): { rightValue: number; rightUncertainty?: number; dimension?: DimensionType; unit?: string } {
  // Convert using EFFECTIVE units (explicit unit, else the dimension's base
  // unit) so a dimensioned-but-unitless operand still scales correctly instead
  // of being summed raw.
  const lu = effectiveUnit(left);
  const ru = effectiveUnit(right);
  const convert = Boolean(lu && ru);
  const rightValue = convert ? convertValue(right.value, ru, lu) : right.value;
  const rightUncertainty =
    right.uncertainty === undefined
      ? undefined
      : convert
        ? convertValue(right.uncertainty, ru, lu)
        : right.uncertainty;
  const dimension = resolveDimension(left) ?? resolveDimension(right);
  const unit = left.unit ?? right.unit;
  const out: { rightValue: number; rightUncertainty?: number; dimension?: DimensionType; unit?: string } = { rightValue };
  if (rightUncertainty !== undefined) out.rightUncertainty = rightUncertainty;
  if (dimension !== undefined) out.dimension = dimension;
  if (unit !== undefined) out.unit = unit;
  return out;
}

// =============================================================================
// UNCERTAINTY PROPAGATION  (https://en.wikipedia.org/wiki/Propagation_of_uncertainty)
// =============================================================================

/** Add/subtract: absolute uncertainties combine in quadrature. */
export function combineUncertaintyAddSub(left?: number, right?: number): number | undefined {
  if (left === undefined && right === undefined) return undefined;
  const l = left ?? 0;
  const r = right ?? 0;
  return Math.sqrt(l * l + r * r);
}

/**
 * Multiply q = l*r: absolute uncertainty σq = sqrt((r·σl)² + (l·σr)²).
 * Uses the absolute-error form (not |q|·relative) so it stays correct when the
 * result — or either operand — is exactly 0.
 */
export function combineUncertaintyMul(
  l: number,
  r: number,
  leftUnc?: number,
  rightUnc?: number
): number | undefined {
  if (leftUnc === undefined && rightUnc === undefined) return undefined;
  const a = r * (leftUnc ?? 0);
  const b = l * (rightUnc ?? 0);
  return Math.sqrt(a * a + b * b);
}

/**
 * Divide q = l/r: absolute uncertainty σq = sqrt((σl/r)² + (l·σr/r²)²).
 * r is non-zero here (division-by-zero is guarded upstream), so this is robust
 * even when l (and hence q) is 0.
 */
export function combineUncertaintyDiv(
  l: number,
  r: number,
  leftUnc?: number,
  rightUnc?: number
): number | undefined {
  if (leftUnc === undefined && rightUnc === undefined) return undefined;
  const a = (leftUnc ?? 0) / r;
  const b = (l * (rightUnc ?? 0)) / (r * r);
  return Math.sqrt(a * a + b * b);
}
