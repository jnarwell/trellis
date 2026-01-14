/**
 * Trellis CommentsBlock - Main Component
 *
 * Discussion threads attached to entities: notes, feedback, collaboration.
 *
 * @example
 * ```tsx
 * <CommentsBlock
 *   config={{
 *     block: 'comments',
 *     entityId: 'ent_123',
 *     allowCreate: true,
 *     allowEdit: true,
 *     sortOrder: 'desc',
 *   }}
 *   onEvent={(event) => console.log(event)}
 * />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Entity, EntityId, PropertyName, TypePath, PropertyInput } from '@trellis/kernel';
import { useQuery, useCreateEntity, useUpdateEntity, useDeleteEntity } from '../../state/hooks.js';
import type { CommentsBlockProps, CommentsBlockEvent, EditingState } from './types.js';
import { CommentCard } from './CommentCard.js';
import { CommentInput } from './CommentInput.js';
import { styles, commentsTheme } from './styles.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

// =============================================================================
// STATE COMPONENTS
// =============================================================================

const CommentsLoading: React.FC = () => (
  <div
    className="comments-block comments-block--loading"
    style={{ ...commentsTheme, ...styles['container'], ...styles['loading'] }}
    data-testid="comments-loading"
  >
    <div style={styles['loadingSpinner']} />
    <span>Loading comments...</span>
  </div>
);

const CommentsError: React.FC<{ error: Error }> = ({ error }) => (
  <div
    className="comments-block comments-block--error"
    style={{ ...commentsTheme, ...styles['container'], ...styles['error'] }}
    data-testid="comments-error"
  >
    <span>Error: {error.message}</span>
  </div>
);

const CommentsEmpty: React.FC = () => (
  <div
    className="comments-block__empty"
    style={styles['empty']}
    data-testid="comments-empty"
  >
    <span>No comments yet</span>
    <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
      Be the first to add a comment
    </span>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CommentsBlock: React.FC<CommentsBlockProps> = ({
  config,
  entityId: propEntityId,
  onEvent,
  className,
}) => {
  // Configuration with defaults
  const entityId = propEntityId ?? config.entityId;
  const entityType = config.entityType ?? 'comment';
  const parentProperty = config.parentProperty ?? ('entity_id' as PropertyName);
  const sortOrder = config.sortOrder ?? 'desc';
  const allowCreate = config.allowCreate ?? true;
  const allowEdit = config.allowEdit ?? true;
  const allowDelete = config.allowDelete ?? true;
  const allowReplies = config.allowReplies ?? false;
  const showTimestamp = config.showTimestamp ?? true;
  const showAuthor = config.showAuthor ?? true;
  const title = config.title ?? 'Comments';

  // Editing state
  const [editingState, setEditingState] = useState<EditingState | null>(null);

  // Query comments for this entity
  const {
    data: comments,
    loading,
    error,
    refetch,
  } = useQuery(entityType, (() => {
    const opts: { filter?: Record<string, unknown>; sort: Array<{ path: string; direction: 'asc' | 'desc' }>; skip: boolean } = {
      sort: [{ path: 'created_at', direction: sortOrder }],
      skip: !entityId,
    };
    if (entityId) opts.filter = { [parentProperty]: entityId };
    return opts;
  })());

  // Mutations
  const createMutation = useCreateEntity();
  const updateMutation = useUpdateEntity();
  const deleteMutation = useDeleteEntity();

  // Emit commentsLoaded event when data arrives
  useEffect(() => {
    if (comments && comments.length > 0 && onEvent) {
      onEvent({ type: 'commentsLoaded', comments });
    }
  }, [comments, onEvent]);

  // Emit error event
  useEffect(() => {
    if (error && onEvent) {
      onEvent({ type: 'error', error: new Error(error.message ?? 'Failed to load comments') });
    }
  }, [error, onEvent]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleCreateComment = useCallback(
    async (text: string) => {
      if (!entityId) return;

      console.log('[CommentsBlock] Creating comment:', { entityId, text });

      try {
        const comment = await createMutation.mutate({
          type: entityType as TypePath,
          properties: {
            [parentProperty]: {
              source: 'literal',
              value: { type: 'text', value: entityId },
            },
            ['text' as PropertyName]: {
              source: 'literal',
              value: { type: 'text', value: text },
            },
            ['author' as PropertyName]: {
              source: 'literal',
              value: { type: 'text', value: 'Current User' }, // TODO: Get from auth context
            },
          } as Record<PropertyName, PropertyInput>,
        });

        onEvent?.({ type: 'commentCreated', comment });
        await refetch();
      } catch (err) {
        console.error('[CommentsBlock] Create error:', err);
        onEvent?.({ type: 'error', error: err as Error });
        throw err;
      }
    },
    [entityId, entityType, parentProperty, createMutation, onEvent, refetch]
  );

  const handleEditComment = useCallback((comment: Entity) => {
    const currentText = getPropertyValue(comment, 'text' as PropertyName);
    setEditingState({
      commentId: comment.id,
      originalText: String(currentText ?? ''),
    });
  }, []);

  const handleUpdateComment = useCallback(
    async (text: string) => {
      if (!editingState) return;

      console.log('[CommentsBlock] Updating comment:', { id: editingState.commentId, text });

      // Find the comment to get its current version
      const comment = comments?.find((c) => c.id === editingState.commentId);
      if (!comment) {
        console.error('[CommentsBlock] Comment not found for update');
        return;
      }

      try {
        const updated = await updateMutation.mutate({
          id: editingState.commentId,
          expected_version: comment.version,
          set_properties: {
            ['text' as PropertyName]: {
              source: 'literal',
              value: { type: 'text', value: text },
            },
          } as Record<PropertyName, PropertyInput>,
        });

        onEvent?.({ type: 'commentUpdated', comment: updated });
        setEditingState(null);
        await refetch();
      } catch (err) {
        console.error('[CommentsBlock] Update error:', err);
        onEvent?.({ type: 'error', error: err as Error });
        throw err;
      }
    },
    [editingState, comments, updateMutation, onEvent, refetch]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingState(null);
  }, []);

  const handleDeleteComment = useCallback(
    async (comment: Entity) => {
      console.log('[CommentsBlock] Deleting comment:', comment.id);

      try {
        await deleteMutation.mutate(comment.id);
        onEvent?.({ type: 'commentDeleted', commentId: comment.id });
        await refetch();
      } catch (err) {
        console.error('[CommentsBlock] Delete error:', err);
        onEvent?.({ type: 'error', error: err as Error });
      }
    },
    [deleteMutation, onEvent, refetch]
  );

  // ==========================================================================
  // RENDER GUARDS
  // ==========================================================================

  // GUARD: Loading state
  if (loading) {
    return <CommentsLoading />;
  }

  // GUARD: Error state
  if (error) {
    return <CommentsError error={new Error(error.message ?? 'Failed to load comments')} />;
  }

  // Safe access to comments array
  const commentsList = comments ?? [];

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div
      className={`comments-block ${className ?? ''}`}
      style={{ ...commentsTheme, ...styles['container'] }}
      data-testid="comments-block"
      data-entity-id={entityId}
    >
      {/* Header */}
      <div style={styles['header']}>
        <h3 style={styles['title']}>
          {title}
          <span style={styles['count']}>({commentsList.length})</span>
        </h3>
      </div>

      {/* Comments List */}
      {commentsList.length === 0 ? (
        <CommentsEmpty />
      ) : (
        <div style={styles['commentsList']} data-testid="comments-list">
          {commentsList.map((comment) => {
            const isEditing = editingState?.commentId === comment.id;

            if (isEditing) {
              return (
                <div key={comment.id} style={styles['commentCard']}>
                  <CommentInput
                    onSubmit={handleUpdateComment}
                    onCancel={handleCancelEdit}
                    initialText={editingState.originalText}
                    isEdit
                    loading={updateMutation.loading}
                    placeholder="Edit your comment..."
                  />
                </div>
              );
            }

            return (
              <CommentCard
                key={comment.id}
                comment={comment}
                canEdit={allowEdit}
                canDelete={allowDelete}
                showTimestamp={showTimestamp}
                showAuthor={showAuthor}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                allowReplies={allowReplies}
              />
            );
          })}
        </div>
      )}

      {/* New Comment Input */}
      {allowCreate && (
        <CommentInput
          onSubmit={handleCreateComment}
          loading={createMutation.loading}
          placeholder="Add a comment..."
        />
      )}
    </div>
  );
};

export default CommentsBlock;
