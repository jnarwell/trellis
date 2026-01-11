/**
 * Trellis KanbanBlock - Drag and Drop Hook
 *
 * Manages drag-and-drop state for Kanban cards using native HTML5 DnD API.
 */

import { useState, useCallback } from 'react';
import type { EntityId } from '@trellis/kernel';
import type { DragState, DragData } from './types.js';

/**
 * Drag and drop MIME type for Kanban cards.
 */
const DRAG_TYPE = 'application/x-trellis-kanban-card';

/**
 * Hook to manage Kanban drag and drop state.
 */
export function useDragDrop(
  onMove: (entityId: EntityId, fromColumn: string, toColumn: string) => void
) {
  const [state, setState] = useState<DragState>({
    draggedEntityId: null,
    dropTargetColumn: null,
  });

  /**
   * Start dragging a card.
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent, entityId: EntityId, fromColumn: string) => {
      // Set drag data
      const data: DragData = { entityId, fromColumn };
      e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(data));
      e.dataTransfer.effectAllowed = 'move';

      // Set visual feedback
      if (e.currentTarget instanceof HTMLElement) {
        e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
      }

      // Update state
      setState({
        draggedEntityId: entityId,
        dropTargetColumn: null,
      });
    },
    []
  );

  /**
   * End dragging (cancel or complete).
   */
  const handleDragEnd = useCallback(() => {
    setState({
      draggedEntityId: null,
      dropTargetColumn: null,
    });
  }, []);

  /**
   * Handle drag over a column.
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent, columnValue: string) => {
      // Check if we can accept this drag
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) {
        return;
      }

      // Prevent default to allow drop
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Update drop target
      setState((prev) => {
        if (prev.dropTargetColumn === columnValue) {
          return prev;
        }
        return {
          ...prev,
          dropTargetColumn: columnValue,
        };
      });
    },
    []
  );

  /**
   * Handle drag leave from column.
   */
  const handleDragLeave = useCallback((e: React.DragEvent, columnValue: string) => {
    // Only clear if we're actually leaving the column
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget) {
      const column = (e.currentTarget as HTMLElement).closest('[data-column-value]');
      if (column?.contains(relatedTarget)) {
        return;
      }
    }

    setState((prev) => {
      if (prev.dropTargetColumn !== columnValue) {
        return prev;
      }
      return {
        ...prev,
        dropTargetColumn: null,
      };
    });
  }, []);

  /**
   * Handle drop on a column.
   */
  const handleDrop = useCallback(
    (e: React.DragEvent, toColumn: string) => {
      e.preventDefault();

      // Get drag data
      const dataStr = e.dataTransfer.getData(DRAG_TYPE);
      if (!dataStr) {
        return;
      }

      try {
        const data: DragData = JSON.parse(dataStr);

        // Don't move to same column
        if (data.fromColumn === toColumn) {
          handleDragEnd();
          return;
        }

        // Trigger move callback
        onMove(data.entityId, data.fromColumn, toColumn);
      } catch (err) {
        console.error('Failed to parse drag data:', err);
      }

      handleDragEnd();
    },
    [onMove, handleDragEnd]
  );

  return {
    state,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}

export default useDragDrop;
