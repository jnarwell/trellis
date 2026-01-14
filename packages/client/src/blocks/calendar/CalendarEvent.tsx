/**
 * CalendarEvent - Event pill component
 */

import React, { useCallback } from 'react';
import type { Entity, PropertyName } from '@trellis/kernel';
import type { CalendarEventProps } from './types.js';
import { styles, getEventColor } from './styles.js';

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

export const CalendarEvent: React.FC<CalendarEventProps> = ({
  entity,
  labelProperty,
  colorProperty,
  onClick,
}) => {
  const label = String(getPropertyValue(entity, labelProperty as PropertyName) ?? 'Untitled');
  const colorValue = colorProperty
    ? String(getPropertyValue(entity, colorProperty as PropertyName) ?? '')
    : undefined;
  const color = getEventColor(colorValue);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(entity);
    },
    [entity, onClick]
  );

  return (
    <div
      className="calendar-block__event"
      style={{ ...styles['eventPill'], backgroundColor: color }}
      onClick={handleClick}
      title={label}
      data-testid="calendar-event"
      data-entity-id={entity.id}
    >
      {label}
    </div>
  );
};

export default CalendarEvent;
