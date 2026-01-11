/**
 * Trellis KanbanBlock - KanbanColumn Component
 *
 * Displays a single column in the Kanban board.
 */

import React from 'react';
import type { EntityId } from '@trellis/kernel';
import type { KanbanColumnProps } from './types.js';
import { styles, getColumnColor } from './styles.js';
import { KanbanCard } from './KanbanCard.js';

/**
 * KanbanColumn displays a column with header and cards.
 */
export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  config,
  entities,
  cardConfig,
  isDropTarget,
  onDrop,
  onDragOver,
  onDragLeave,
  onCardClick,
  onDragStart,
  onDragEnd,
}) => {
  const color = getColumnColor(config);
  const count = entities.length;
  const isOverLimit = config.limit !== undefined && count > config.limit;

  // Build column style
  const columnStyle: React.CSSProperties = {
    ...styles.column,
    ...(isDropTarget ? styles.columnDropTarget : {}),
  };

  // Build count style
  const countStyle: React.CSSProperties = {
    ...styles.columnCount,
    ...(isOverLimit ? styles.columnCountOverLimit : {}),
  };

  const handleDragOver = (e: React.DragEvent) => {
    onDragOver(e);
  };

  const handleDragLeave = () => {
    onDragLeave();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const entityId = e.dataTransfer.getData('application/x-trellis-kanban-card');
    if (entityId) {
      try {
        const data = JSON.parse(entityId);
        onDrop(data.entityId as EntityId);
      } catch {
        // Fallback for simple entity ID format
      }
    }
  };

  return (
    <div
      className="trellis-kanban-column"
      style={columnStyle}
      data-column-value={config.value}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header className="trellis-kanban-column-header" style={styles.columnHeader}>
        <h3 className="trellis-kanban-column-title" style={styles.columnTitle}>
          <span
            className="trellis-kanban-column-accent"
            style={{ ...styles.columnAccent, backgroundColor: color }}
          />
          {config.label}
        </h3>
        <span
          className="trellis-kanban-column-count"
          style={countStyle}
          title={
            config.limit !== undefined
              ? `${count} / ${config.limit} (limit)`
              : `${count} items`
          }
        >
          {count}
          {config.limit !== undefined && `/${config.limit}`}
        </span>
      </header>

      {/* Content */}
      <div
        className="trellis-kanban-column-content"
        style={styles.columnContent as React.CSSProperties}
      >
        {entities.length === 0 ? (
          <div className="trellis-kanban-column-empty" style={styles.columnEmpty}>
            No items
          </div>
        ) : (
          entities.map((entity) => {
            const cardClickHandler = onCardClick
              ? () => onCardClick(entity)
              : undefined;

            return (
              <KanbanCard
                key={entity.id}
                entity={entity}
                config={cardConfig}
                isDragging={false}
                onDragStart={(e) => onDragStart(entity.id)}
                onDragEnd={onDragEnd}
                {...(cardClickHandler ? { onClick: cardClickHandler } : {})}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
