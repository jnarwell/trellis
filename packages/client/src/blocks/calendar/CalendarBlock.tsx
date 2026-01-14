/**
 * Trellis CalendarBlock - Main Component
 *
 * Displays date-based data: schedules, due dates, events, milestones.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Entity } from '@trellis/kernel';
import { useQuery, useSubscription } from '../../state/hooks.js';
import type { CalendarBlockProps, CalendarBlockEvent } from './types.js';
import { styles, calendarTheme } from './styles.js';
import { MonthView } from './MonthView.js';

// =============================================================================
// MONTH NAMES
// =============================================================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// =============================================================================
// STATE COMPONENTS
// =============================================================================

const CalendarLoading: React.FC = () => (
  <div
    className="calendar-block calendar-block--loading"
    style={{ ...calendarTheme, ...styles['container'], ...styles['loading'] }}
    data-testid="calendar-loading"
  >
    <div style={styles['loadingSpinner']} />
    <span>Loading...</span>
  </div>
);

const CalendarError: React.FC<{ error: Error }> = ({ error }) => (
  <div
    className="calendar-block calendar-block--error"
    style={{ ...calendarTheme, ...styles['container'], ...styles['error'] }}
    data-testid="calendar-error"
  >
    <span>Error: {error.message}</span>
  </div>
);

const CalendarEmpty: React.FC = () => (
  <div
    className="calendar-block calendar-block--empty"
    style={{ ...calendarTheme, ...styles['container'], ...styles['empty'] }}
    data-testid="calendar-empty"
  >
    <span>No events found</span>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CalendarBlock: React.FC<CalendarBlockProps> = ({
  config,
  onEvent,
  className,
}) => {
  // Extract config with safe defaults
  const entityType = config?.entityType ?? '';
  const dateProperty = config?.dateProperty ?? 'date';
  const labelProperty = config?.labelProperty ?? 'name';
  const colorProperty = config?.colorProperty;
  const selectable = config?.selectable ?? false;
  const defaultDate = config?.defaultDate;

  // Parse initial date (handles YYYY-MM-DD format without timezone issues)
  const initialDate = useMemo(() => {
    if (defaultDate) {
      // Parse YYYY-MM-DD format directly to avoid timezone issues
      const match = defaultDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }
      // Fallback to Date parsing
      const parsed = new Date(defaultDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [defaultDate]);

  // Calendar state
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Query entities
  const queryOptions = useMemo(() => ({ includeTotal: false }), []);
  const { data: entities, loading, error, refetch } = useQuery(entityType, queryOptions);

  // Subscribe to real-time updates (with guard)
  useSubscription({ entityType }, () => {
    refetch();
  });

  // Emit dataLoaded event
  useEffect(() => {
    if (entities.length > 0 && onEvent) {
      onEvent({ type: 'dataLoaded', entities });
    }
  }, [entities, onEvent]);

  // Emit error event
  useEffect(() => {
    if (error && onEvent) {
      onEvent({ type: 'error', error: new Error(error.message ?? 'Unknown error') });
    }
  }, [error, onEvent]);

  // Navigate to previous month
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  // Navigate to next month
  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  // Navigate to today
  const handleToday = useCallback(() => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    onEvent?.({ type: 'monthChanged', year: today.getFullYear(), month: today.getMonth() });
  }, [onEvent]);

  // Handle date selection
  const handleDateClick = useCallback(
    (date: Date) => {
      if (selectable) {
        setSelectedDate(date);
        onEvent?.({ type: 'dateSelected', date });
      }
    },
    [selectable, onEvent]
  );

  // Handle event click
  const handleEventClick = useCallback(
    (entity: Entity) => {
      onEvent?.({ type: 'eventClicked', entity });
    },
    [onEvent]
  );

  // Emit month changed when navigation happens
  useEffect(() => {
    onEvent?.({ type: 'monthChanged', year: currentYear, month: currentMonth });
  }, [currentYear, currentMonth, onEvent]);

  // ==========================================================================
  // RENDER GUARDS (REQUIRED)
  // ==========================================================================

  // GUARD: Missing config
  if (!config || !entityType) {
    return <CalendarEmpty />;
  }

  // GUARD: Loading state (only when no data yet)
  if (loading && entities.length === 0) {
    return <CalendarLoading />;
  }

  // GUARD: Error state
  if (error) {
    return <CalendarError error={new Error(error.message ?? 'Failed to load')} />;
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  const monthTitle = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  return (
    <div
      className={`calendar-block ${className ?? ''}`}
      style={{ ...calendarTheme, ...styles['container'] }}
      data-testid="calendar-block"
      data-entity-type={entityType}
    >
      {/* Header with navigation */}
      <div style={styles['header']}>
        <div style={styles['headerNav']}>
          <button
            type="button"
            style={styles['navButton']}
            onClick={handlePrevMonth}
            aria-label="Previous month"
            data-testid="calendar-prev"
          >
            &lt;
          </button>
          <h3 style={styles['headerTitle']}>{monthTitle}</h3>
          <button
            type="button"
            style={styles['navButton']}
            onClick={handleNextMonth}
            aria-label="Next month"
            data-testid="calendar-next"
          >
            &gt;
          </button>
        </div>
        <button
          type="button"
          style={styles['todayButton']}
          onClick={handleToday}
          data-testid="calendar-today"
        >
          Today
        </button>
      </div>

      {/* Month view */}
      <MonthView
        year={currentYear}
        month={currentMonth}
        events={entities}
        dateProperty={dateProperty}
        labelProperty={labelProperty}
        colorProperty={colorProperty}
        selectedDate={selectedDate}
        selectable={selectable}
        onDateClick={handleDateClick}
        onEventClick={handleEventClick}
      />
    </div>
  );
};

export default CalendarBlock;
