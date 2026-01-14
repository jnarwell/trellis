/**
 * MonthView - Month grid calendar component
 */

import React, { useMemo } from 'react';
import type { Entity, PropertyName } from '@trellis/kernel';
import type { MonthViewProps, CalendarDayData } from './types.js';
import { styles } from './styles.js';
import { CalendarDay } from './CalendarDay.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Extract property value from entity.
 */
function getPropertyValue(entity: Entity, property: PropertyName): unknown {
  const prop = entity?.properties?.[property];
  if (!prop) return undefined;

  switch (prop.source) {
    case 'literal':
    case 'measured': {
      const value = prop.value;
      if (value && typeof value === 'object' && 'value' in value) {
        return (value as { value: unknown }).value;
      }
      return value;
    }
    case 'inherited': {
      const inhProp = prop as { override?: { value?: unknown }; resolved_value?: { value?: unknown } };
      const inhValue = inhProp.override ?? inhProp.resolved_value;
      if (inhValue && typeof inhValue === 'object' && 'value' in inhValue) {
        return inhValue.value;
      }
      return inhValue;
    }
    case 'computed': {
      const compProp = prop as { cached_value?: { value?: unknown } };
      const cached = compProp.cached_value;
      if (cached && typeof cached === 'object' && 'value' in cached) {
        return cached.value;
      }
      return cached;
    }
    default:
      return undefined;
  }
}

/**
 * Generate the days for a month view (including padding days from adjacent months).
 */
function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Pad start of month with days from previous month
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(new Date(year, month, 1 - (firstDay.getDay() - i)));
  }

  // Days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  // Pad end to complete the last week
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

/**
 * Get events for a specific date.
 */
function getEventsForDate(
  events: readonly Entity[],
  date: Date,
  dateProperty: string
): readonly Entity[] {
  const dateStr = date.toISOString().split('T')[0] ?? '';

  return events.filter((entity) => {
    const eventDate = getPropertyValue(entity, dateProperty as PropertyName);
    if (!eventDate) return false;

    const eventDateStr = String(eventDate);
    // Match YYYY-MM-DD prefix (handles full ISO dates and date-only strings)
    return eventDateStr.startsWith(dateStr);
  });
}

/**
 * Check if two dates are the same day.
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const MonthView: React.FC<MonthViewProps> = ({
  year,
  month,
  events,
  dateProperty,
  labelProperty,
  colorProperty,
  selectedDate,
  selectable,
  onDateClick,
  onEventClick,
}) => {
  const today = useMemo(() => new Date(), []);

  // Generate day data for the month
  const dayData: CalendarDayData[] = useMemo(() => {
    const days = getMonthDays(year, month);

    return days.map((date) => ({
      date,
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameDay(date, today),
      events: getEventsForDate(events, date, dateProperty),
    }));
  }, [year, month, events, dateProperty, today]);

  return (
    <div className="calendar-block__month-view" data-testid="calendar-month-view">
      {/* Weekday headers */}
      <div style={styles['weekdayHeader']}>
        {WEEKDAYS.map((day) => (
          <div key={day} style={styles['weekdayCell']}>
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={styles['monthGrid']}>
        {dayData.map((data, index) => (
          <CalendarDay
            key={`${data.date.toISOString()}-${index}`}
            data={data}
            isSelected={selectedDate ? isSameDay(data.date, selectedDate) : false}
            selectable={selectable}
            onClick={onDateClick}
            onEventClick={onEventClick}
            labelProperty={labelProperty}
            colorProperty={colorProperty}
          />
        ))}
      </div>
    </div>
  );
};

export default MonthView;
