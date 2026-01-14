/**
 * Trellis ChartBlock - Type Definitions
 *
 * Types for data visualization charts.
 */

import type { Entity, EntityId, PropertyName } from '@trellis/kernel';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Chart type options.
 */
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area';

/**
 * Aggregation functions for data.
 */
export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';

/**
 * A single data point for charts.
 */
export interface ChartDataPoint {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

/**
 * Configuration for the ChartBlock (from YAML).
 */
export interface ChartBlockConfig {
  /** Block type identifier (required) */
  readonly block: 'chart';

  /** Chart type */
  readonly type?: ChartType;

  /** Entity type to query (data source) */
  readonly entityType?: string;

  /** Alternative: source field (for compatibility) */
  readonly source?: string;

  /** Static data (alternative to entityType) */
  readonly data?: readonly ChartDataPoint[];

  /** Property to use for labels (X-axis / segment labels) */
  readonly labelProperty?: PropertyName;

  /** Property to use for values (Y-axis / segment values) */
  readonly valueProperty?: PropertyName;

  /** Property to group by (for multiple series) */
  readonly groupProperty?: PropertyName;

  /** Aggregation function to apply */
  readonly aggregate?: AggregateFunction;

  /** Chart title */
  readonly title?: string;

  /** Show legend */
  readonly showLegend?: boolean;

  /** Show grid lines */
  readonly showGrid?: boolean;

  /** Custom color palette */
  readonly colors?: readonly string[];

  /** Chart height in pixels */
  readonly height?: number;

  /** Entity ID for single-entity mode (optional) */
  readonly entityId?: EntityId;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for ChartBlock component.
 */
export interface ChartBlockProps {
  /** Block configuration */
  readonly config: ChartBlockConfig;

  /** Entity ID (may be passed as prop instead of config) */
  readonly entityId?: EntityId;

  /** Event handler callback */
  readonly onEvent?: (event: ChartBlockEvent) => void;

  /** Additional CSS class */
  readonly className?: string;
}

/**
 * Props for individual chart components.
 */
export interface ChartComponentProps {
  /** Chart data */
  readonly data: readonly ChartDataPoint[];

  /** Chart width */
  readonly width: number;

  /** Chart height */
  readonly height: number;

  /** Show grid lines */
  readonly showGrid?: boolean;

  /** Show legend */
  readonly showLegend?: boolean;

  /** Custom color palette */
  readonly colors?: readonly string[];

  /** Click handler for segments/bars */
  readonly onSegmentClick?: (dataPoint: ChartDataPoint, index: number) => void;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by ChartBlock.
 */
export type ChartBlockEvent =
  | { type: 'dataLoaded'; data: readonly ChartDataPoint[] }
  | { type: 'segmentClicked'; dataPoint: ChartDataPoint; index: number }
  | { type: 'error'; error: Error };

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Aggregated data result.
 */
export interface AggregatedData {
  readonly label: string;
  readonly value: number;
  readonly count: number;
}
