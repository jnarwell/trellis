/**
 * Trellis CommentCard - Individual Comment Display
 *
 * Displays a single comment with author, timestamp, and action buttons.
 */

import React, { useCallback } from 'react';
import type { Entity, PropertyName } from '@trellis/kernel';
import type { CommentCardProps } from './types.js';
import { styles } from './styles.js';

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
 * Format a timestamp for display.
 */
function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  canEdit,
  canDelete,
  showTimestamp,
  showAuthor,
  onEdit,
  onDelete,
  onReply,
  allowReplies,
}) => {
  // Guard: Check for valid comment
  if (!comment) {
    return null;
  }

  // Extract comment data with fallbacks
  const text = getPropertyValue(comment, 'text' as PropertyName) ?? '';
  const author = getPropertyValue(comment, 'author' as PropertyName) ?? 'Anonymous';
  const createdAt = comment.created_at;

  const handleEdit = useCallback(() => {
    onEdit?.(comment);
  }, [comment, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete?.(comment);
  }, [comment, onDelete]);

  const handleReply = useCallback(() => {
    onReply?.(comment);
  }, [comment, onReply]);

  const hasActions = canEdit || canDelete || allowReplies;

  return (
    <div
      className="comments-block__card"
      style={styles['commentCard']}
      data-testid="comment-card"
      data-comment-id={comment.id}
    >
      {/* Header: Author and timestamp */}
      <div style={styles['commentHeader']}>
        <div style={styles['commentMeta']}>
          {showAuthor && (
            <span style={styles['commentAuthor']} data-testid="comment-author">
              {String(author)}
            </span>
          )}
          {showAuthor && showTimestamp && <span style={styles['dot']} />}
          {showTimestamp && (
            <span style={styles['commentTime']} data-testid="comment-time">
              {formatTimestamp(createdAt)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        {hasActions && (
          <div style={styles['commentActions']}>
            {allowReplies && onReply && (
              <button
                type="button"
                style={styles['actionButton']}
                onClick={handleReply}
                data-testid="comment-reply-button"
              >
                Reply
              </button>
            )}
            {canEdit && onEdit && (
              <button
                type="button"
                style={styles['actionButton']}
                onClick={handleEdit}
                data-testid="comment-edit-button"
              >
                Edit
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                style={{ ...styles['actionButton'], ...styles['actionButtonDanger'] }}
                onClick={handleDelete}
                data-testid="comment-delete-button"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Comment text */}
      <p style={styles['commentText']} data-testid="comment-text">
        {String(text)}
      </p>
    </div>
  );
};

export default CommentCard;
