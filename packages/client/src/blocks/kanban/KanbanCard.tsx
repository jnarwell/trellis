/**
 * Trellis KanbanBlock - KanbanCard Component
 *
 * Displays a single entity card in the Kanban board.
 */

import React, { useState } from 'react';
import type { Entity, PropertyName } from '@trellis/kernel';
import type { KanbanCardProps, KanbanCardConfig } from './types.js';
import { styles, getBadgeStyle } from './styles.js';

/**
 * Extract property value from entity.
 * Handles different property types (literal, inherited, computed, measured).
 */
function getPropertyValue(entity: Entity, property: PropertyName): unknown {
  const prop = entity.properties[property];
  if (!prop) return undefined;

  // Handle different property sources
  switch (prop.source) {
    case 'literal':
    case 'measured':
      const directValue = prop.value;
      if (directValue && typeof directValue === 'object' && 'value' in directValue) {
        return (directValue as { value: unknown }).value;
      }
      return directValue;

    case 'inherited':
      const inheritedProp = prop as { override?: { value?: unknown }; resolved_value?: { value?: unknown } };
      const inheritedValue = inheritedProp.override ?? inheritedProp.resolved_value;
      if (inheritedValue && typeof inheritedValue === 'object' && 'value' in inheritedValue) {
        return inheritedValue.value;
      }
      return inheritedValue;

    case 'computed':
      const computedProp = prop as { cached_value?: { value?: unknown } };
      const cachedValue = computedProp.cached_value;
      if (cachedValue && typeof cachedValue === 'object' && 'value' in cachedValue) {
        return cachedValue.value;
      }
      return cachedValue;

    default:
      return undefined;
  }
}

/**
 * Evaluate a simple template string with entity data.
 * Supports multiple formats:
 * - ${$entity.property} - full format
 * - $entity.property - no braces
 * - ${property} - simple format
 */
function evaluateSimpleTemplate(template: string, entity: Entity): string {
  // First try full format: ${$entity.property} or $entity.property
  let result = template.replace(/\$\{?\$?entity\.(\w+)\}?/g, (_, property) => {
    const value = getPropertyValue(entity, property as PropertyName);
    return value !== undefined && value !== null ? String(value) : '';
  });

  // Then try simple format: ${property}
  result = result.replace(/\$\{(\w+)\}/g, (match, property) => {
    const value = getPropertyValue(entity, property as PropertyName);
    return value !== undefined && value !== null ? String(value) : match;
  });

  return result;
}

/**
 * KanbanCard displays a single entity as a draggable card.
 */
export const KanbanCard: React.FC<KanbanCardProps> = ({
  entity,
  config,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Evaluate templates
  const title = evaluateSimpleTemplate(config.title, entity);
  const subtitle = config.subtitle
    ? evaluateSimpleTemplate(config.subtitle, entity)
    : null;

  // Build card style
  const cardStyle: React.CSSProperties = {
    ...styles.card,
    ...(isDragging ? styles.cardDragging : {}),
    ...(onClick ? styles.cardClickable : {}),
    ...(isHovered && !isDragging ? styles.cardHover : {}),
  };

  const handleClick = onClick
    ? (e: React.MouseEvent) => {
        // Don't trigger click if we're dragging
        if (isDragging) return;
        onClick();
      }
    : undefined;

  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <div
      className={`kanban-card trellis-kanban-card${isDragging ? ' dragging' : ''}`}
      style={cardStyle}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-entity-id={entity.id}
    >
      {/* Title */}
      <h4 className="kanban-card-title trellis-kanban-card-title" style={styles.cardTitle}>
        {title || 'Untitled'}
      </h4>

      {/* Subtitle */}
      {subtitle && (
        <p className="kanban-card-subtitle trellis-kanban-card-subtitle" style={styles.cardSubtitle}>
          {subtitle}
        </p>
      )}

      {/* Badges */}
      {config.badges && config.badges.length > 0 && (
        <div className="kanban-card-badges trellis-kanban-card-badges" style={styles.cardBadges}>
          {config.badges.map((badge, index) => {
            const value = getPropertyValue(entity, badge.property);
            if (value === undefined || value === null || value === '') {
              return null;
            }

            const badgeStyle = getBadgeStyle(String(value));

            return (
              <span
                key={badge.property ?? index}
                className="kanban-card-badge trellis-kanban-card-badge"
                style={badgeStyle}
              >
                {String(value)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KanbanCard;
