/**
 * Trellis Block System - Shared Types
 *
 * Common types used across all block implementations.
 */

import type { Entity, EntityId, BlockInstanceId, BlockType } from '@trellis/kernel';
import type { BindingScope } from '../binding/index.js';

// =============================================================================
// BLOCK CONTEXT
// =============================================================================

/**
 * Context provided to all blocks.
 */
export interface BlockContext {
  /** Block instance ID */
  readonly instanceId: BlockInstanceId;

  /** Block type */
  readonly type: BlockType;

  /** Data binding scope */
  readonly scope: BindingScope;

  /** Emit an event from this block */
  readonly emit: (event: string, payload: unknown) => void;
}

// =============================================================================
// COMMON CONFIG TYPES
// =============================================================================

/**
 * Action configuration for buttons/menu items.
 */
export interface ActionConfig {
  /** Action label */
  readonly label: string;

  /** Icon name */
  readonly icon?: string;

  /** Event to emit when clicked */
  readonly event: string;

  /** Navigation target (template string) */
  readonly target?: string;

  /** Show confirmation dialog */
  readonly confirm?: boolean | string;

  /** Confirmation message */
  readonly confirmMessage?: string;

  /** Condition for showing this action */
  readonly showWhen?: string;

  /** Permission required */
  readonly permission?: string;

  /** Visual variant */
  readonly variant?: 'default' | 'primary' | 'danger' | 'ghost';
}

/**
 * Filter configuration.
 */
export interface FilterConfig {
  /** Property to filter on */
  readonly property: string;

  /** Filter type */
  readonly type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean';

  /** Display label */
  readonly label?: string;

  /** Placeholder text */
  readonly placeholder?: string;

  /** Options for select/multiselect */
  readonly options?: readonly FilterOption[];

  /** Default value */
  readonly defaultValue?: unknown;
}

/**
 * Filter option for select filters.
 */
export interface FilterOption {
  readonly value: string;
  readonly label: string;
  readonly icon?: string;
  readonly color?: string;
}

/**
 * Pagination configuration.
 */
export interface PaginationConfig {
  /** Default page size */
  readonly pageSize: number;

  /** Available page size options */
  readonly pageSizeOptions?: readonly number[];

  /** Show total count */
  readonly showTotal?: boolean;

  /** Position */
  readonly position?: 'top' | 'bottom' | 'both';
}

// =============================================================================
// CELL FORMATS
// =============================================================================

/**
 * Cell format types for rendering values.
 */
export type CellFormat =
  | 'text'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'time'
  | 'relative'
  | 'boolean'
  | 'badge'
  | 'link'
  | 'image'
  | 'actions';

/**
 * Cell format options.
 */
export interface CellFormatOptions {
  /** Currency code (for currency format) */
  readonly currency?: string;

  /** Number of decimal places */
  readonly decimals?: number;

  /** Date format pattern */
  readonly dateFormat?: string;

  /** Badge color mapping */
  readonly colors?: Record<string, string>;

  /** Link target */
  readonly linkTarget?: '_blank' | '_self';
}

// =============================================================================
// COMMON PAYLOADS
// =============================================================================

/**
 * Payload for entity-related events.
 */
export interface EntityEventPayload {
  /** Entity ID */
  readonly entityId: EntityId;

  /** Full entity object */
  readonly entity: Entity;

  /** Row index (if in a list) */
  readonly rowIndex?: number;
}

/**
 * Payload for selection events.
 */
export interface SelectionEventPayload {
  /** Selected entity IDs */
  readonly selectedIds: readonly EntityId[];

  /** Count of selected items */
  readonly count: number;
}

/**
 * Payload for pagination events.
 */
export interface PaginationEventPayload {
  /** Current page (1-indexed) */
  readonly page: number;

  /** Page size */
  readonly pageSize: number;

  /** Total items (if known) */
  readonly total?: number;
}

/**
 * Payload for sort events.
 */
export interface SortEventPayload {
  /** Column being sorted */
  readonly column: string;

  /** Sort direction */
  readonly direction: 'asc' | 'desc';
}

/**
 * Payload for filter events.
 */
export interface FilterEventPayload {
  /** Active filters */
  readonly filters: Record<string, unknown>;
}

/**
 * Payload for action events.
 */
export interface ActionEventPayload {
  /** Action that was clicked */
  readonly action: ActionConfig;

  /** Entity the action was performed on */
  readonly entity: Entity;

  /** Entity ID */
  readonly entityId: EntityId;
}
