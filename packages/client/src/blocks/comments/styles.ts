/**
 * Trellis CommentsBlock - Styles
 *
 * CSS-in-JS styles for the comments block.
 */

import type React from 'react';

// =============================================================================
// THEME VARIABLES
// =============================================================================

/**
 * CSS custom properties for theming.
 */
export const commentsTheme: React.CSSProperties = {
  '--comments-bg': '#ffffff',
  '--comments-border': '#e5e7eb',
  '--comments-text': '#111827',
  '--comments-text-muted': '#6b7280',
  '--comments-accent': '#3b82f6',
  '--comments-error': '#ef4444',
  '--comments-success': '#10b981',
  '--comments-card-bg': '#f9fafb',
  '--comments-hover-bg': '#f3f4f6',
} as React.CSSProperties;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles: Record<string, React.CSSProperties> = {
  // Container
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--comments-bg, #ffffff)',
    border: '1px solid var(--comments-border, #e5e7eb)',
    borderRadius: '0.5rem',
    padding: '1rem',
    gap: '1rem',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--comments-text, #111827)',
    margin: 0,
  },

  count: {
    fontSize: '0.875rem',
    color: 'var(--comments-text-muted, #6b7280)',
    marginLeft: '0.5rem',
    fontWeight: 400,
  },

  // Loading state
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '0.5rem',
    color: 'var(--comments-text-muted, #6b7280)',
  },

  loadingSpinner: {
    width: '1.25rem',
    height: '1.25rem',
    border: '2px solid currentColor',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  // Error state
  error: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    gap: '0.5rem',
    color: 'var(--comments-error, #ef4444)',
    backgroundColor: '#fef2f2',
    borderRadius: '0.375rem',
  },

  // Empty state
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    color: 'var(--comments-text-muted, #6b7280)',
    textAlign: 'center',
  },

  emptyIcon: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
    opacity: 0.5,
  },

  // Comments list
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },

  // Comment card
  commentCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--comments-card-bg, #f9fafb)',
    borderRadius: '0.5rem',
    padding: '0.75rem 1rem',
    gap: '0.5rem',
  },

  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },

  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8125rem',
    color: 'var(--comments-text-muted, #6b7280)',
  },

  commentAuthor: {
    fontWeight: 500,
    color: 'var(--comments-text, #111827)',
  },

  commentTime: {
    fontSize: '0.75rem',
  },

  commentText: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
    color: 'var(--comments-text, #111827)',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },

  commentActions: {
    display: 'flex',
    gap: '0.5rem',
  },

  actionButton: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--comments-text-muted, #6b7280)',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s, color 0.15s',
  },

  actionButtonDanger: {
    color: 'var(--comments-error, #ef4444)',
  },

  // Comment input
  inputContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },

  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '0.75rem',
    fontSize: '0.875rem',
    lineHeight: 1.5,
    color: 'var(--comments-text, #111827)',
    backgroundColor: 'var(--comments-bg, #ffffff)',
    border: '1px solid var(--comments-border, #e5e7eb)',
    borderRadius: '0.375rem',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s',
  },

  textareaFocused: {
    borderColor: 'var(--comments-accent, #3b82f6)',
  },

  inputActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
  },

  button: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '0.375rem',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.15s, opacity 0.15s',
  },

  buttonPrimary: {
    backgroundColor: 'var(--comments-accent, #3b82f6)',
    color: '#ffffff',
  },

  buttonSecondary: {
    backgroundColor: '#f3f4f6',
    color: 'var(--comments-text, #111827)',
    border: '1px solid var(--comments-border, #e5e7eb)',
  },

  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  // Dot separator
  dot: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    backgroundColor: 'var(--comments-text-muted, #6b7280)',
  },
};
