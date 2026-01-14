/**
 * CalendarDay - Individual day cell component
 */

import React, { useCallback } from 'react';
import type { Entity } from '@trellis/kernel';
import type { CalendarDayProps } from './types.js';
import { styles } from './styles.js';
import { CalendarEvent } from './CalendarEvent.js';

const MAX_VISIBLE_EVENTS = 3;

export const CalendarDay: React.FC<CalendarDayProps> = ({
  data,
  isSelected,
  selectable,
  onClick,
  onEventClick,
  labelProperty,
  colorProperty,
}) => {
  const { date, isCurrentMonth, isToday, events } = data;

  const handleClick = useCallback(() => {
    if (selectable && onClick) {
      onClick(date);
    }
  }, [date, selectable, onClick]);

  const handleEventClick = useCallback(
    (entity: Entity) => {
      onEventClick?.(entity);
    },
    [onEventClick]
  );

  // Build cell styles
  const cellStyle: React.CSSProperties = {
    ...styles['dayCell'],
    ...(selectable ? styles['dayCellSelectable'] : {}),
    ...(isToday ? styles['dayCellToday'] : {}),
    ...(isSelected ? styles['dayCellSelected'] : {}),
  };

  // Build day number styles
  const numberStyle: React.CSSProperties = {
    ...styles['dayNumber'],
    ...(!isCurrentMonth ? styles['dayNumberOtherMonth'] : {}),
    ...(isToday ? styles['dayNumberToday'] : {}),
  };

  // Visible events (limit to MAX_VISIBLE_EVENTS)
  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const hiddenCount = events.length - MAX_VISIBLE_EVENTS;

  return (
    <div
      className={`calendar-block__day ${isToday ? 'calendar-block__day--today' : ''} ${isSelected ? 'calendar-block__day--selected' : ''}`}
      style={cellStyle}
      onClick={handleClick}
      data-testid="calendar-day"
      data-date={date.toISOString().split('T')[0]}
    >
      <div style={numberStyle}>{date.getDate()}</div>
      <div style={styles['dayEvents']}>
        {visibleEvents.map((entity) => (
          <CalendarEvent
            key={entity.id}
            entity={entity}
            labelProperty={labelProperty}
            colorProperty={colorProperty}
            onClick={handleEventClick}
          />
        ))}
        {hiddenCount > 0 && (
          <div style={styles['moreEvents']}>+{hiddenCount} more</div>
        )}
      </div>
    </div>
  );
};

export default CalendarDay;
