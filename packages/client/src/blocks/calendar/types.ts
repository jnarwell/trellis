/**
 * Trellis CalendarBlock - Type Definitions
 *
 * Types for calendar date-based data display.
 */

import type { Entity, EntityId, PropertyName } from '@trellis/kernel';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Action configuration for date selection or event click.
 */
export interface CalendarActionConfig {
  /** Action type */
  readonly action: 'navigate' | 'emit' | 'create';
  /** View to navigate to (for 'navigate' action) */
  readonly view?: string;
  /** Event name to emit (for 'emit' action) */
  readonly event?: string;
}

/**
 * Configuration for the calendar block (from YAML).
 */
export interface CalendarBlockConfig {
  /** Block type identifier (required) */
  readonly block: 'calendar';

  /** Entity type to query for calendar events */
  readonly entityType: string;

  /** Property containing the event date */
  readonly dateProperty: string;

  /** Property containing end date (for date ranges) */
  readonly endDateProperty?: string;

  /** Property to use as event label */
  readonly labelProperty: string;

  /** Property to use for event color */
  readonly colorProperty?: string;

  /** Initial view mode */
  readonly view?: 'month' | 'week' | 'day' | 'agenda';

  /** Initial date to display */
  readonly defaultDate?: string;

  /** Whether dates can be selected */
  readonly selectable?: boolean;

  /** Action on date selection */
  readonly onSelect?: CalendarActionConfig;

  /** Action on event click */
  readonly onEventClick?: CalendarActionConfig;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for CalendarBlock component.
 */
export interface CalendarBlockProps {
  /** Block configuration */
  readonly config: CalendarBlockConfig;

  /** Event handler callback */
  readonly onEvent?: (event: CalendarBlockEvent) => void;

  /** Additional CSS class */
  readonly className?: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by CalendarBlock.
 */
export type CalendarBlockEvent =
  | { type: 'dataLoaded'; entities: readonly Entity[] }
  | { type: 'eventClicked'; entity: Entity }
  | { type: 'dateSelected'; date: Date }
  | { type: 'monthChanged'; year: number; month: number }
  | { type: 'error'; error: Error };

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Internal state for the calendar.
 */
export interface CalendarState {
  /** Current year being displayed */
  readonly currentYear: number;
  /** Current month being displayed (0-11) */
  readonly currentMonth: number;
  /** Currently selected date */
  readonly selectedDate?: Date;
}

/**
 * Day cell data.
 */
export interface CalendarDayData {
  /** The date object */
  readonly date: Date;
  /** Whether this day is in the current month */
  readonly isCurrentMonth: boolean;
  /** Whether this is today */
  readonly isToday: boolean;
  /** Events on this day */
  readonly events: readonly Entity[];
}

/**
 * Props for CalendarDay component.
 */
export interface CalendarDayProps {
  /** Day data */
  readonly data: CalendarDayData;
  /** Whether this date is selected */
  readonly isSelected?: boolean | undefined;
  /** Whether dates can be selected */
  readonly selectable?: boolean | undefined;
  /** Click handler */
  readonly onClick?: ((date: Date) => void) | undefined;
  /** Event click handler */
  readonly onEventClick?: ((entity: Entity) => void) | undefined;
  /** Label property for events */
  readonly labelProperty: string;
  /** Color property for events */
  readonly colorProperty?: string | undefined;
}

/**
 * Props for CalendarEvent component.
 */
export interface CalendarEventProps {
  /** The entity/event to display */
  readonly entity: Entity;
  /** Property to use as label */
  readonly labelProperty: string;
  /** Property to use for color */
  readonly colorProperty?: string | undefined;
  /** Click handler */
  readonly onClick?: ((entity: Entity) => void) | undefined;
}

/**
 * Props for MonthView component.
 */
export interface MonthViewProps {
  /** Current year */
  readonly year: number;
  /** Current month (0-11) */
  readonly month: number;
  /** Events to display */
  readonly events: readonly Entity[];
  /** Date property on events */
  readonly dateProperty: string;
  /** Label property for events */
  readonly labelProperty: string;
  /** Color property for events */
  readonly colorProperty?: string | undefined;
  /** Selected date */
  readonly selectedDate?: Date | undefined;
  /** Whether dates can be selected */
  readonly selectable?: boolean | undefined;
  /** Date click handler */
  readonly onDateClick?: ((date: Date) => void) | undefined;
  /** Event click handler */
  readonly onEventClick?: ((entity: Entity) => void) | undefined;
}