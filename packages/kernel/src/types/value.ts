/**
 * Trellis Kernel - Value Type Definitions
 *
 * Defines all value types and dimensions for the Trellis data model.
 * These types map to PostgreSQL types and JSON representations.
 */

import type { EntityId, TypePath } from './entity.js';

// =============================================================================
// VALUE TYPES
// =============================================================================

/**
 * The fundamental value types supported by Trellis.
 * These map to PostgreSQL types and JSON representations.
 */
export type ValueType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'duration'
  | 'reference'
  | 'list'
  | 'record';

/** Text value - UTF-8 string */
export interface TextValue {
  readonly type: 'text';
  readonly value: string;
}

/**
 * Number value - with optional dimension and unit
 * Stored as numeric in PostgreSQL for precision
 */
export interface NumberValue {
  readonly type: 'number';
  readonly value: number;
  /** SI dimension (e.g., "length", "mass", "time") */
  readonly dimension?: DimensionType;
  /** Display unit (e.g., "mm", "kg", "s") */
  readonly unit?: string;
}

/** Boolean value */
export interface BooleanValue {
  readonly type: 'boolean';
  readonly value: boolean;
}

/** DateTime value - ISO 8601 with timezone */
export interface DateTimeValue {
  readonly type: 'datetime';
  /** ISO 8601 timestamp (e.g., "2024-01-15T10:30:00Z") */
  readonly value: string;
}

/** Duration value - ISO 8601 duration */
export interface DurationValue {
  readonly type: 'duration';
  /** ISO 8601 duration (e.g., "P1D", "PT2H30M") */
  readonly value: string;
}

/** Reference value - pointer to another entity */
export interface ReferenceValue {
  readonly type: 'reference';
  /** The referenced entity's ID */
  readonly entity_id: EntityId;
  /** Optional: expected type of referenced entity */
  readonly expected_type?: TypePath;
}

/** List value - ordered collection of same-typed values */
export interface ListValue {
  readonly type: 'list';
  /** Type of elements in the list */
  readonly element_type: ValueType;
  /** The values in the list */
  readonly values: readonly Value[];
}

/** Record value - named collection of typed fields */
export interface RecordValue {
  readonly type: 'record';
  /** Field definitions and values */
  readonly fields: Readonly<Record<string, Value>>;
}

/** Union of all value types */
export type Value =
  | TextValue
  | NumberValue
  | BooleanValue
  | DateTimeValue
  | DurationValue
  | ReferenceValue
  | ListValue
  | RecordValue;

// =============================================================================
// DIMENSIONS
// =============================================================================

/**
 * SI Base Dimensions for dimensional analysis.
 * Used to validate unit compatibility and conversions.
 */
export type BaseDimension =
  | 'length'        // L - meters
  | 'mass'          // M - kilograms
  | 'time'          // T - seconds
  | 'current'       // I - amperes
  | 'temperature'   // Θ - kelvin
  | 'amount'        // N - moles
  | 'luminosity';   // J - candela

/**
 * Common derived dimensions.
 * Expressed as combinations of base dimensions.
 */
export type DerivedDimension =
  | 'area'          // L²
  | 'volume'        // L³
  | 'velocity'      // L/T
  | 'acceleration'  // L/T²
  | 'force'         // M·L/T²
  | 'energy'        // M·L²/T²
  | 'power'         // M·L²/T³
  | 'pressure'      // M/(L·T²)
  | 'frequency'     // 1/T
  | 'voltage'       // M·L²/(T³·I)
  | 'resistance';   // M·L²/(T³·I²)

export type DimensionType = BaseDimension | DerivedDimension | 'dimensionless';

/**
 * Dimension specification for numeric values.
 * Enables unit conversion and compatibility checking.
 */
export interface Dimension {
  readonly type: DimensionType;
  /** Exponents for each base dimension (for derived dimensions) */
  readonly exponents?: Readonly<{
    length?: number;
    mass?: number;
    time?: number;
    current?: number;
    temperature?: number;
    amount?: number;
    luminosity?: number;
  }>;
}
