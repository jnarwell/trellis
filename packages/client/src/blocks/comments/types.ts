/**
 * Trellis CommentsBlock - Type Definitions
 *
 * Discussion threads attached to entities for notes, feedback, and collaboration.
 */

import type { Entity, EntityId, PropertyName } from '@trellis/kernel';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for the CommentsBlock (from YAML).
 */
export interface CommentsBlockConfig {
  /** Block type identifier (required) */
  readonly block: 'comments';

  /** Entity type to query/display */
  readonly source?: string;

  /** Entity ID to show comments for */
  readonly entityId?: EntityId;

  /** Comment entity type (default: 'comment') */
  readonly entityType?: string;

  /** Property linking to parent entity (default: 'entity_id') */
  readonly parentProperty?: PropertyName;

  /** Sort order: oldest or newest first (default: 'desc') */
  readonly sortOrder?: 'asc' | 'desc';

  /** Show comment input (default: true) */
  readonly allowCreate?: boolean;

  /** Can edit own comments (default: true) */
  readonly allowEdit?: boolean;

  /** Can delete own comments (default: true) */
  readonly allowDelete?: boolean;

  /** Allow threaded replies (default: false) */
  readonly allowReplies?: boolean;

  /** Reply nesting depth (default: 2) */
  readonly maxDepth?: number;

  /** Show timestamp (default: true) */
  readonly showTimestamp?: boolean;

  /** Show author (default: true) */
  readonly showAuthor?: boolean;

  /** Title to display (default: 'Comments') */
  readonly title?: string;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for CommentsBlock component.
 */
export interface CommentsBlockProps {
  /** Block configuration */
  readonly config: CommentsBlockConfig;

  /** Entity ID (may be passed as prop instead of config) */
  readonly entityId?: EntityId;

  /** Event handler callback */
  readonly onEvent?: (event: CommentsBlockEvent) => void;

  /** Additional CSS class */
  readonly className?: string;
}

/**
 * Props for CommentCard component.
 */
export interface CommentCardProps {
  /** The comment entity */
  readonly comment: Entity;

  /** Can edit this comment */
  readonly canEdit: boolean;

  /** Can delete this comment */
  readonly canDelete: boolean;

  /** Show timestamp */
  readonly showTimestamp: boolean;

  /** Show author */
  readonly showAuthor: boolean;

  /** Edit callback */
  readonly onEdit?: (comment: Entity) => void;

  /** Delete callback */
  readonly onDelete?: (comment: Entity) => void;

  /** Reply callback (for threaded replies) */
  readonly onReply?: (comment: Entity) => void;

  /** Allow replies */
  readonly allowReplies?: boolean;
}

/**
 * Props for CommentInput component.
 */
export interface CommentInputProps {
  /** Submit callback */
  readonly onSubmit: (text: string) => Promise<void>;

  /** Placeholder text */
  readonly placeholder?: string;

  /** Whether submission is in progress */
  readonly loading?: boolean;

  /** Cancel callback (for edit mode) */
  readonly onCancel?: () => void;

  /** Initial text (for edit mode) */
  readonly initialText?: string;

  /** Is this in edit mode? */
  readonly isEdit?: boolean;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by CommentsBlock.
 */
export type CommentsBlockEvent =
  | { type: 'commentsLoaded'; comments: readonly Entity[] }
  | { type: 'commentCreated'; comment: Entity }
  | { type: 'commentUpdated'; comment: Entity }
  | { type: 'commentDeleted'; commentId: EntityId }
  | { type: 'error'; error: Error };

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Internal state for editing a comment.
 */
export interface EditingState {
  readonly commentId: EntityId;
  readonly originalText: string;
}

/**
 * Comment data extracted from entity.
 */
export interface CommentData {
  readonly id: EntityId;
  readonly text: string;
  readonly author: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly parentCommentId?: EntityId;
}
