/**
 * Trellis KanbanBlock - Main Component
 *
 * Displays entities in a status-based board with drag-and-drop.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import type { Entity, EntityId, PropertyName } from '@trellis/kernel';
import { useQuery, useUpdateEntity, useSubscription } from '../../state/hooks.js';
import type { KanbanBlockProps, KanbanBlockEvent } from './types.js';
import { styles, kanbanTheme } from './styles.js';
import { useDragDrop } from './useDragDrop.js';
import { KanbanColumn } from './KanbanColumn.js';

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
      // Direct value access
      const directValue = prop.value;
      if (directValue && typeof directValue === 'object' && 'value' in directValue) {
        return (directValue as { value: unknown }).value;
      }
      return directValue;

    case 'inherited':
      // Use override if present, otherwise resolved_value
      const inheritedProp = prop as { override?: { value?: unknown }; resolved_value?: { value?: unknown } };
      const inheritedValue = inheritedProp.override ?? inheritedProp.resolved_value;
      if (inheritedValue && typeof inheritedValue === 'object' && 'value' in inheritedValue) {
        return inheritedValue.value;
      }
      return inheritedValue;

    case 'computed':
      // Use cached_value
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
 * Group entities by status property value.
 */
function groupByStatus(
  entities: readonly Entity[],
  statusProperty: PropertyName
): Map<string, Entity[]> {
  const groups = new Map<string, Entity[]>();

  for (const entity of entities) {
    const status = getPropertyValue(entity, statusProperty);
    const key = status !== undefined && status !== null ? String(status) : '';

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entity);
  }

  return groups;
}

/**
 * Loading component.
 */
const KanbanLoading: React.FC = () => (
  <div className="trellis-kanban-loading" style={styles.loading}>
    <div style={styles.loadingSpinner} />
    <span>Loading...</span>
  </div>
);

/**
 * Error component.
 */
const KanbanError: React.FC<{ error: Error }> = ({ error }) => (
  <div className="trellis-kanban-error" style={styles.error}>
    <span>Error: {error.message}</span>
  </div>
);

/**
 * KanbanBlock displays entities in a status-based board.
 *
 * @example
 * ```tsx
 * <KanbanBlock
 *   source="task"
 *   statusProperty="status"
 *   columns={[
 *     { value: "todo", label: "To Do", color: "gray" },
 *     { value: "in_progress", label: "In Progress", color: "blue" },
 *     { value: "done", label: "Done", color: "green" },
 *   ]}
 *   card={{
 *     title: "${$entity.name}",
 *     subtitle: "${$entity.assignee}",
 *     badges: [{ property: "priority" }],
 *   }}
 *   onEvent={(event) => console.log(event)}
 * />
 * ```
 */
export const KanbanBlock: React.FC<KanbanBlockProps> = ({
  source,
  statusProperty,
  columns,
  card,
  filter,
  onEvent,
  className,
}) => {
  // Query entities
  const queryOptions = filter ? { filter, includeTotal: false } : { includeTotal: false };
  const { data: entities, loading, error, refetch } = useQuery(source, queryOptions);

  // Update mutation
  const { mutate: updateEntity } = useUpdateEntity();

  // Subscribe to real-time updates
  useSubscription({ entityType: source }, (event) => {
    // Refetch on any entity change
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

  // Handle card move between columns
  const handleMove = useCallback(
    async (entityId: EntityId, fromColumn: string, toColumn: string) => {
      // Find the entity
      const entity = entities.find((e) => e.id === entityId);
      if (!entity) {
        console.error('Entity not found:', entityId);
        return;
      }

      // Emit cardMoved event
      onEvent?.({ type: 'cardMoved', entityId, fromColumn, toColumn });

      try {
        // Update the entity
        const updatedEntity = await updateEntity({
          id: entityId,
          expected_version: entity.version,
          set_properties: {
            [statusProperty]: {
              source: 'literal',
              value: { type: 'text', value: toColumn },
            },
          },
        });

        // Emit statusChanged event
        onEvent?.({
          type: 'statusChanged',
          entity: updatedEntity,
          oldStatus: fromColumn,
          newStatus: toColumn,
        });
      } catch (err) {
        console.error('Failed to update entity status:', err);
        onEvent?.({
          type: 'statusChangeFailed',
          entityId,
          error: err instanceof Error ? err : new Error('Update failed'),
        });
        // Refetch to restore original state
        refetch();
      }
    },
    [entities, updateEntity, statusProperty, onEvent, refetch]
  );

  // Handle card click
  const handleCardClick = useCallback(
    (entity: Entity) => {
      onEvent?.({ type: 'cardClicked', entity });
    },
    [onEvent]
  );

  // Drag and drop handlers
  const { state: dragState, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop } =
    useDragDrop(handleMove);

  // Group entities by status
  const groupedEntities = useMemo(
    () => groupByStatus(entities, statusProperty),
    [entities, statusProperty]
  );

  // Render content
  const renderContent = () => {
    if (loading && entities.length === 0) {
      return <KanbanLoading />;
    }

    if (error) {
      return <KanbanError error={new Error(error.message ?? 'Failed to load data')} />;
    }

    return columns.map((columnConfig) => {
      const columnEntities = groupedEntities.get(columnConfig.value) ?? [];
      const isDropTarget = dragState.dropTargetColumn === columnConfig.value;
      const cardClickHandler = card?.onClick ? handleCardClick : undefined;

      return (
        <KanbanColumn
          key={columnConfig.value}
          config={columnConfig}
          entities={columnEntities}
          cardConfig={card}
          isDropTarget={isDropTarget}
          onDrop={(entityId) => {
            const entity = entities.find((e) => e.id === entityId);
            if (entity) {
              const fromColumn = String(getPropertyValue(entity, statusProperty) ?? '');
              handleMove(entityId, fromColumn, columnConfig.value);
            }
          }}
          onDragOver={(e) => handleDragOver(e, columnConfig.value)}
          onDragLeave={() =>
            dragState.dropTargetColumn === columnConfig.value
              ? handleDragLeave({ relatedTarget: null } as unknown as React.DragEvent, columnConfig.value)
              : undefined
          }
          onDragStart={(e, entityId) => {
            const ent = entities.find((ent) => ent.id === entityId);
            if (ent) {
              const fromColumn = String(getPropertyValue(ent, statusProperty) ?? '');
              handleDragStart(e, entityId, fromColumn);
            }
          }}
          onDragEnd={handleDragEnd}
          {...(cardClickHandler ? { onCardClick: cardClickHandler } : {})}
        />
      );
    });
  };

  return (
    <div
      className={`kanban-board trellis-kanban ${className ?? ''}`}
      style={{ ...kanbanTheme, ...styles.container }}
      data-source={source}
      data-status-property={statusProperty}
    >
      {renderContent()}
    </div>
  );
};

export default KanbanBlock;
