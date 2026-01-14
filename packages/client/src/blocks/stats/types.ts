/**
 * Trellis StatsBlock - Type Definitions
 *
 * Configuration and event types for the Stats block.
 */

import type { Entity, EntityId } from '@trellis/kernel';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for an individual stat.
 */
export interface StatConfig {
  /** Display label (e.g., "Total Products") */
  readonly label: string;

  // Value source (pick one)
  /** Entity type to count/aggregate */
  readonly entityType?: string;
  /** Static value */
  readonly value?: number | string;
  /** Computed expression (future) */
  readonly expression?: string;

  // Aggregation
  /** Aggregation type */
  readonly aggregate?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  /** Property to aggregate (for sum/avg/min/max) */
  readonly property?: string;
  /** Filter for entities */
  readonly filter?: Record<string, unknown>;

  // Display
  /** Number format */
  readonly format?: 'number' | 'currency' | 'percent';
  /** Value prefix (e.g., "$") */
  readonly prefix?: string;
  /** Value suffix (e.g., "%") */
  readonly suffix?: string;
  /** Icon name */
  readonly icon?: string;
  /** Accent color */
  readonly color?: string;

  // Comparison
  /** Comparison data */
  readonly comparison?: {
    /** Comparison label (e.g., "vs last month") */
    readonly label: string;
    /** Previous value */
    readonly value: number;
    /** Show diff or percentage */
    readonly type: 'absolute' | 'percent';
  };
}

/**
 * Configuration for the StatsBlock (from YAML).
 */
export interface StatsBlockConfig {
  /** Block type identifier (required) */
  readonly block: 'stats';

  /** Stats to display */
  readonly stats?: StatConfig[];

  /** Layout mode */
  readonly layout?: 'row' | 'grid';

  /** Grid columns (for grid layout) */
  readonly columns?: number;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for StatsBlock component.
 */
export interface StatsBlockProps {
  /** Block configuration */
  readonly config: StatsBlockConfig;

  /** Event handler callback */
  readonly onEvent?: (event: StatsBlockEvent) => void;

  /** Additional CSS class */
  readonly className?: string;
}

/**
 * Props for individual StatCard component.
 */
export interface StatCardProps {
  /** Stat configuration */
  readonly config: StatConfig;

  /** Current value (computed by parent) */
  readonly value: number | string | null;

  /** Loading state */
  readonly loading?: boolean | undefined;

  /** Error state */
  readonly error?: Error | null | undefined;

  /** Click handler */
  readonly onClick?: (() => void) | undefined;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by StatsBlock.
 */
export type StatsBlockEvent =
  | { type: 'statsLoaded'; stats: Array<{ label: string; value: number | string | null }> }
  | { type: 'statClicked'; stat: StatConfig; value: number | string | null }
  | { type: 'error'; error: Error };

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Internal state for a single stat's data.
 */
export interface StatDataState {
  readonly value: number | string | null;
  readonly loading: boolean;
  readonly error: Error | null;
}
