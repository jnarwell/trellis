/**
 * Trellis TimelineBlock - Main Component
 *
 * Display chronological events: activity history, audit logs, status changes, comments.
 *
 * @example
 * ```tsx
 * <TimelineBlock
 *   config={{
 *     block: 'timeline',
 *     source: 'entities',
 *     entityType: 'activity',
 *     timestampProperty: 'created_at',
 *     titleProperty: 'description',
 *     actorProperty: 'user',
 *     order: 'desc',
 *     groupBy: 'day',
 *     showActor: true,
 *     showTimestamp: true,
 *   }}
 *   onEvent={(event) => console.log(event)}
 * />
 * ```
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import type { Entity, EntityId, PropertyName } from '@trellis/kernel';
import { useQuery, useEntity } from '../../state/hooks.js';
import type {
  TimelineBlockProps,
  TimelineBlockEvent,
  TimelineBlockConfig,
  TimelineItem,
  TimelineGroup,
  TimelineGroupBy,
} from './types.js';
import { styles, timelineTheme } from './styles.js';
import { TimelineDateGroup } from './TimelineDateGroup.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract property value from entity.
 * Handles all property sources (literal, inherited, computed, measured).
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
      const inhProp = prop as {
        override?: { value?: unknown };
        resolved_value?: { value?: unknown };
      };
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
 * Convert entity to timeline item.
 */
function entityToTimelineItem(entity: Entity, config: TimelineBlockConfig): TimelineItem {
  const timestampProp = config.timestampProperty ?? ('created_at' as PropertyName);
  const titleProp = config.titleProperty ?? ('name' as PropertyName);
  const descriptionProp = config.descriptionProperty;
  const actorProp = config.actorProperty;
  const typeProp = config.typeProperty;

  const timestampValue = getPropertyValue(entity, timestampProp);
  const timestamp = timestampValue ? new Date(String(timestampValue)) : new Date(entity.created_at);

  return {
    id: entity.id,
    timestamp,
    title: String(getPropertyValue(entity, titleProp) ?? 'Untitled'),
    description: descriptionProp ? String(getPropertyValue(entity, descriptionProp) ?? '') : undefined,
    actor: actorProp ? String(getPropertyValue(entity, actorProp) ?? '') : undefined,
    eventType: typeProp ? String(getPropertyValue(entity, typeProp) ?? '') : undefined,
    entity,
  };
}

/**
 * Get date key for grouping based on groupBy setting.
 */
function getDateKey(date: Date, groupBy: TimelineGroupBy): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (groupBy) {
    case 'day':
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'week': {
      // Get start of week (Sunday)
      const startOfWeek = new Date(date);
      startOfWeek.setDate(day - date.getDay());
      return startOfWeek.toISOString().split('T')[0] ?? '';
    }
    case 'month':
      return `${year}-${String(month + 1).padStart(2, '0')}`;
    default:
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
}

/**
 * Format date key to display label.
 */
function formatDateLabel(dateKey: string, groupBy: TimelineGroupBy): string {
  const date = new Date(dateKey);

  switch (groupBy) {
    case 'day':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'week':
      return `Week of ${date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}`;
    case 'month':
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    default:
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
  }
}

/**
 * Group items by date.
 */
function groupItemsByDate(
  items: readonly TimelineItem[],
  groupBy: TimelineGroupBy,
  order: 'asc' | 'desc'
): TimelineGroup[] {
  const groups = new Map<string, TimelineItem[]>();

  for (const item of items) {
    const key = getDateKey(item.timestamp, groupBy);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  // Sort items within each group
  for (const [, groupItems] of groups) {
    groupItems.sort((a, b) => {
      const diff = a.timestamp.getTime() - b.timestamp.getTime();
      return order === 'desc' ? -diff : diff;
    });
  }

  // Convert to array and sort groups
  const result: TimelineGroup[] = [];
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    const diff = a.localeCompare(b);
    return order === 'desc' ? -diff : diff;
  });

  for (const key of sortedKeys) {
    result.push({
      dateKey: key,
      label: formatDateLabel(key, groupBy),
      items: groups.get(key)!,
    });
  }

  return result;
}

// =============================================================================
// STATE COMPONENTS
// =============================================================================

const TimelineLoading: React.FC = () => (
  <div
    className="timeline-block timeline-block--loading"
    style={{ ...timelineTheme, ...styles['container'], ...styles['loading'] }}
    data-testid="timeline-loading"
  >
    <div style={styles['loadingSpinner']} />
    <span>Loading...</span>
  </div>
);

const TimelineError: React.FC<{ error: Error }> = ({ error }) => (
  <div
    className="timeline-block timeline-block--error"
    style={{ ...timelineTheme, ...styles['container'], ...styles['error'] }}
    data-testid="timeline-error"
  >
    <span>Error: {error.message}</span>
  </div>
);

const TimelineEmpty: React.FC = () => (
  <div
    className="timeline-block timeline-block--empty"
    style={{ ...timelineTheme, ...styles['container'], ...styles['empty'] }}
    data-testid="timeline-empty"
  >
    <span>No events to display</span>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TimelineBlock: React.FC<TimelineBlockProps> = ({
  config,
  entityId: propEntityId,
  data: externalData,
  onEvent,
  className,
}) => {
  // GUARD: Null/undefined config
  const safeConfig = config ?? ({} as TimelineBlockConfig);

  // Determine entity ID from props or config
  const entityId = propEntityId ?? safeConfig.entityId;

  // Extract config values with defaults
  const source = safeConfig.source ?? 'entities';
  const entityType = safeConfig.entityType ?? '';
  const order = safeConfig.order ?? 'desc';
  const groupBy = safeConfig.groupBy ?? 'day';
  const showTimestamp = safeConfig.showTimestamp ?? true;
  const showActor = safeConfig.showActor ?? true;
  const limit = safeConfig.limit;
  const filter = safeConfig.filter;

  // Query for entities mode
  const queryOptions = useMemo(
    () => ({
      filter: filter ?? {},
      limit: limit ?? 50,
      includeTotal: false,
    }),
    [filter, limit]
  );

  // Use query for entities source
  const {
    data: queryEntities,
    loading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery(source === 'entities' ? entityType : '', queryOptions);

  // Use entity for single entity events mode
  const {
    data: singleEntity,
    loading: entityLoading,
    error: entityError,
  } = useEntity(source === 'events' ? (entityId ?? null) : null);

  // Determine loading/error state based on source
  const loading = source === 'entities' ? queryLoading : source === 'events' ? entityLoading : false;
  const error = source === 'entities' ? queryError : source === 'events' ? entityError : null;

  // Convert entities to timeline items
  const timelineItems = useMemo((): readonly TimelineItem[] => {
    // Custom mode: use external data
    if (source === 'custom') {
      return externalData ?? [];
    }

    // Entities mode: convert query results
    if (source === 'entities') {
      const entities = queryEntities ?? [];
      return entities.map((entity) => entityToTimelineItem(entity, safeConfig));
    }

    // Events mode: would fetch events for the entity
    // For now, return empty (events source would need a different API)
    if (source === 'events' && singleEntity) {
      // In a full implementation, we'd query events for this entity
      // For now, just show the entity itself as a single event
      return [entityToTimelineItem(singleEntity, safeConfig)];
    }

    return [];
  }, [source, externalData, queryEntities, singleEntity, safeConfig]);

  // Sort items by timestamp
  const sortedItems = useMemo((): readonly TimelineItem[] => {
    const items = [...timelineItems];
    items.sort((a, b) => {
      const diff = a.timestamp.getTime() - b.timestamp.getTime();
      return order === 'desc' ? -diff : diff;
    });
    return items;
  }, [timelineItems, order]);

  // Group items by date
  const groupedItems = useMemo(
    () => groupItemsByDate(sortedItems, groupBy, order),
    [sortedItems, groupBy, order]
  );

  // Emit dataLoaded event
  useEffect(() => {
    if (sortedItems.length > 0 && onEvent) {
      onEvent({ type: 'dataLoaded', items: sortedItems });
    }
  }, [sortedItems, onEvent]);

  // Emit error event
  useEffect(() => {
    if (error && onEvent) {
      onEvent({ type: 'error', error: new Error(error.message ?? 'Unknown error') });
    }
  }, [error, onEvent]);

  // Handle item click
  const handleItemClick = useCallback(
    (item: TimelineItem) => {
      console.log('[TimelineBlock] Item clicked:', item.id);
      onEvent?.({ type: 'itemClicked', item });
    },
    [onEvent]
  );

  // ==========================================================================
  // RENDER GUARDS
  // ==========================================================================

  // GUARD: Loading state
  if (loading) {
    return <TimelineLoading />;
  }

  // GUARD: Error state
  if (error) {
    return <TimelineError error={new Error(error.message ?? 'Failed to load')} />;
  }

  // GUARD: Empty state
  if (sortedItems.length === 0) {
    return <TimelineEmpty />;
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div
      className={`timeline-block ${className ?? ''}`}
      style={{ ...timelineTheme, ...styles['container'] }}
      data-testid="timeline-block"
      data-source={source}
      data-order={order}
      data-group-by={groupBy}
    >
      <div className="timeline-block__timeline" style={styles['timeline']}>
        {groupedItems.map((group) => (
          <TimelineDateGroup
            key={group.dateKey}
            label={group.label}
            items={group.items}
            showTimestamp={showTimestamp}
            showActor={showActor}
            onItemClick={handleItemClick}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineBlock;
