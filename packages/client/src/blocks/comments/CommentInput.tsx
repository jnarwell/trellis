/**
 * Trellis CommentInput - Comment Text Input
 *
 * Input area for creating or editing comments.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { CommentInputProps } from './types.js';
import { styles, commentsTheme } from './styles.js';

// =============================================================================
// COMPONENT
// =============================================================================

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  placeholder = 'Add a comment...',
  loading = false,
  onCancel,
  initialText = '',
  isEdit = false,
}) => {
  const [text, setText] = useState(initialText);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount for edit mode
  useEffect(() => {
    if (isEdit && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
    }
  }, [isEdit]);

  // Reset text when initialText changes (e.g., switching edit targets)
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleSubmit = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText || loading) return;

    try {
      await onSubmit(trimmedText);
      // Only clear on successful submit for new comments
      if (!isEdit) {
        setText('');
      }
    } catch (err) {
      // Error handling is managed by parent component
      console.error('[CommentInput] Submit error:', err);
    }
  }, [text, loading, onSubmit, isEdit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Cmd/Ctrl + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit();
      }
      // Cancel on Escape (edit mode only)
      if (e.key === 'Escape' && isEdit && onCancel) {
        e.preventDefault();
        onCancel();
      }
    },
    [handleSubmit, isEdit, onCancel]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  const handleCancel = useCallback(() => {
    setText(initialText);
    onCancel?.();
  }, [initialText, onCancel]);

  const canSubmit = text.trim().length > 0 && !loading;
  const buttonLabel = isEdit ? 'Save' : 'Post';

  return (
    <div
      className="comments-block__input"
      style={{ ...commentsTheme, ...styles['inputContainer'] }}
      data-testid="comment-input"
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={loading}
        style={{
          ...styles['textarea'],
          ...(isFocused ? styles['textareaFocused'] : {}),
        }}
        data-testid="comment-textarea"
        aria-label={isEdit ? 'Edit comment' : 'Add a comment'}
      />
      <div style={styles['inputActions']}>
        {isEdit && onCancel && (
          <button
            type="button"
            style={{ ...styles['button'], ...styles['buttonSecondary'] }}
            onClick={handleCancel}
            disabled={loading}
            data-testid="comment-cancel-button"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          style={{
            ...styles['button'],
            ...styles['buttonPrimary'],
            ...(canSubmit ? {} : styles['buttonDisabled']),
          }}
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-testid="comment-submit-button"
        >
          {loading ? 'Posting...' : buttonLabel}
        </button>
      </div>
    </div>
  );
};

export default CommentInput;
