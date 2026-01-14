/**
 * Trellis FileUploaderBlock - Styles
 */

import type React from 'react';

// =============================================================================
// THEME VARIABLES
// =============================================================================

export const fileUploaderTheme: React.CSSProperties = {
  '--uploader-bg': '#ffffff',
  '--uploader-border': '#e5e7eb',
  '--uploader-border-active': '#3b82f6',
  '--uploader-text': '#111827',
  '--uploader-text-muted': '#6b7280',
  '--uploader-accent': '#3b82f6',
  '--uploader-error': '#ef4444',
  '--uploader-success': '#10b981',
  '--uploader-warning': '#f59e0b',
} as React.CSSProperties;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles: Record<string, React.CSSProperties> = {
  // Container
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backgroundColor: 'var(--uploader-bg, #ffffff)',
    border: '1px solid var(--uploader-border, #e5e7eb)',
    borderRadius: '0.5rem',
    padding: '1rem',
  },

  // Loading state
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '0.5rem',
    color: 'var(--uploader-text-muted, #6b7280)',
  },

  loadingSpinner: {
    width: '1.5rem',
    height: '1.5rem',
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
    color: 'var(--uploader-error, #ef4444)',
    backgroundColor: '#fef2f2',
    borderRadius: '0.375rem',
  },

  // Drop zone
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    border: '2px dashed var(--uploader-border, #e5e7eb)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: '#fafafa',
  },

  dropZoneActive: {
    borderColor: 'var(--uploader-accent, #3b82f6)',
    backgroundColor: '#eff6ff',
  },

  dropZoneDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  dropZoneIcon: {
    width: '3rem',
    height: '3rem',
    marginBottom: '0.5rem',
    color: 'var(--uploader-text-muted, #6b7280)',
  },

  dropZoneText: {
    fontSize: '0.875rem',
    color: 'var(--uploader-text-muted, #6b7280)',
    textAlign: 'center',
  },

  dropZoneLink: {
    color: 'var(--uploader-accent, #3b82f6)',
    cursor: 'pointer',
    textDecoration: 'underline',
  },

  dropZoneHint: {
    fontSize: '0.75rem',
    color: 'var(--uploader-text-muted, #6b7280)',
    marginTop: '0.5rem',
  },

  // File list
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  // File progress item
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.375rem',
    border: '1px solid var(--uploader-border, #e5e7eb)',
  },

  fileItemError: {
    borderColor: 'var(--uploader-error, #ef4444)',
    backgroundColor: '#fef2f2',
  },

  fileItemComplete: {
    borderColor: 'var(--uploader-success, #10b981)',
    backgroundColor: '#f0fdf4',
  },

  fileIcon: {
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--uploader-text-muted, #6b7280)',
    textTransform: 'uppercase',
  },

  fileInfo: {
    flex: 1,
    minWidth: 0,
  },

  fileName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--uploader-text, #111827)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  fileSize: {
    fontSize: '0.75rem',
    color: 'var(--uploader-text-muted, #6b7280)',
  },

  fileStatus: {
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },

  fileStatusSuccess: {
    color: 'var(--uploader-success, #10b981)',
  },

  fileStatusError: {
    color: 'var(--uploader-error, #ef4444)',
  },

  // Progress bar
  progressBar: {
    width: '100%',
    height: '0.25rem',
    backgroundColor: '#e5e7eb',
    borderRadius: '9999px',
    overflow: 'hidden',
    marginTop: '0.25rem',
  },

  progressFill: {
    height: '100%',
    backgroundColor: 'var(--uploader-accent, #3b82f6)',
    transition: 'width 0.2s ease',
  },

  // Actions
  fileActions: {
    display: 'flex',
    gap: '0.25rem',
  },

  actionButton: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    border: '1px solid var(--uploader-border, #e5e7eb)',
    backgroundColor: '#ffffff',
    color: 'var(--uploader-text, #111827)',
    transition: 'background-color 0.15s',
  },

  actionButtonDanger: {
    color: 'var(--uploader-error, #ef4444)',
    borderColor: 'var(--uploader-error, #ef4444)',
  },
};
