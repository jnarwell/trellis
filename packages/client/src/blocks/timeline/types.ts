/**
 * Trellis TimelineBlock - Type Definitions
 *
 * Display chronological events: activity history, audit logs, status changes, comments.
 */

import type { Entity, EntityId, PropertyName } from '@trellis/kernel';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Data source mode for timeline.
 */
export type TimelineSource = 'events' | 'entities' | 'custom';

/**
 * Time grouping mode.
 */
export type TimelineGroupBy = 'day' | 'week' | 'month';

/**
 * Sort order.
 */
export type TimelineOrder = 'asc' | 'desc';

/**
 * Configuration for the block (from YAML).
 */
export interface TimelineBlockConfig {
  /** Block type identifier */
  readonly block: 'timeline';

  /** Data source mode */
  readonly source: TimelineSource;

  /** Entity ID for single-entity events mode */
  readonly entityId?: EntityId;

  /** Entity type for querying entities as timeline items */
  readonly entityType?: string;

  /** Property for ordering (default: 'created_at') */
  readonly timestampProperty?: PropertyName;

  /** Property for event title */
  readonly titleProperty?: PropertyName;

  /** Property for event description */
  readonly descriptionProperty?: PropertyName;

  /** Property for who performed the action */
  readonly actorProperty?: PropertyName;

  /** Property for event type (icons/colors) */
  readonly typeProperty?: PropertyName;

  /** Chronological or reverse chronological order */
  readonly order?: TimelineOrder;

  /** Max items to show */
  readonly limit?: number;

  /** Group events by time period */
  readonly groupBy?: TimelineGroupBy;

  /** Show time for each event */
  readonly showTimestamp?: boolean;

  /** Show who performed action */
  readonly showActor?: boolean;

  /** Additional filter criteria */
  readonly filter?: Record<string, unknown>;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for TimelineBlock component.
 */
export interface TimelineBlockProps {
  /** Block configuration */
  readonly config: TimelineBlockConfig;

  /** Entity ID (may be passed as prop instead of config) */
  readonly entityId?: EntityId;

  /** External data source (for custom mode) */
  readonly data?: readonly TimelineItem[];

  /** Event handler callback */
  readonly onEvent?: (event: TimelineBlockEvent) => void;

  /** Additional CSS class */
  readonly className?: string;
}

/**
 * Props for TimelineEvent component.
 */
export interface TimelineEventProps {
  /** Timeline item to display */
  readonly item: TimelineItem;

  /** Whether to show timestamp */
  readonly showTimestamp: boolean;

  /** Whether to show actor */
  readonly showActor: boolean;

  /** Click handler */
  readonly onClick?: ((item: TimelineItem) => void) | undefined;
}

/**
 * Props for TimelineDateGroup component.
 */
export interface TimelineDateGroupProps {
  /** Date label (e.g., "January 11, 2026") */
  readonly label: string;

  /** Items in this group */
  readonly items: readonly TimelineItem[];

  /** Whether to show timestamp */
  readonly showTimestamp: boolean;

  /** Whether to show actor */
  readonly showActor: boolean;

  /** Item click handler */
  readonly onItemClick?: ((item: TimelineItem) => void) | undefined;
}

// =============================================================================
// DATA TYPES
// =============================================================================

/**
 * Normalized timeline item for display.
 */
export interface TimelineItem {
  /** Unique identifier */
  readonly id: EntityId;

  /** Event timestamp */
  readonly timestamp: Date;

  /** Event title */
  readonly title: string;

  /** Event description (optional) */
  readonly description?: string | undefined;

  /** Actor/user who performed action */
  readonly actor?: string | undefined;

  /** Event type for styling */
  readonly eventType?: string | undefined;

  /** Original entity (if applicable) */
  readonly entity?: Entity | undefined;
}

/**
 * Grouped timeline items by date.
 */
export interface TimelineGroup {
  /** Group label (e.g., "January 11, 2026") */
  readonly label: string;

  /** Date key for sorting */
  readonly dateKey: string;

  /** Items in this group */
  readonly items: readonly TimelineItem[];
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by TimelineBlock.
 */
export type TimelineBlockEvent =
  | { type: 'dataLoaded'; items: readonly TimelineItem[] }
  | { type: 'itemClicked'; item: TimelineItem }
  | { type: 'error'; error: Error };

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Internal state for the block.
 */
export interface TimelineBlockState {
  /** Currently loading more items */
  readonly loadingMore: boolean;

  /** Filter by event type */
  readonly filterType?: string;
}
