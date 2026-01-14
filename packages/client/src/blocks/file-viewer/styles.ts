/**
 * Trellis FileViewerBlock - Styles
 */

import type React from 'react';

// =============================================================================
// THEME VARIABLES
// =============================================================================

export const fileViewerTheme: React.CSSProperties = {
  '--viewer-bg': '#ffffff',
  '--viewer-border': '#e5e7eb',
  '--viewer-text': '#111827',
  '--viewer-text-muted': '#6b7280',
  '--viewer-accent': '#3b82f6',
  '--viewer-error': '#ef4444',
  '--viewer-success': '#10b981',
  '--viewer-overlay': 'rgba(0, 0, 0, 0.75)',
} as React.CSSProperties;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles: Record<string, React.CSSProperties> = {
  // Container
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--viewer-bg, #ffffff)',
    border: '1px solid var(--viewer-border, #e5e7eb)',
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
    color: 'var(--viewer-text-muted, #6b7280)',
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
    color: 'var(--viewer-error, #ef4444)',
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
    color: 'var(--viewer-text-muted, #6b7280)',
  },

  emptyIcon: {
    width: '3rem',
    height: '3rem',
    marginBottom: '0.5rem',
    opacity: 0.5,
  },

  // Grid layout
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '1rem',
  },

  // List layout
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  // File card (grid mode)
  cardGrid: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--viewer-border, #e5e7eb)',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.2s',
    backgroundColor: '#fafafa',
  },

  cardGridHover: {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(-2px)',
  },

  cardThumbnail: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    backgroundColor: '#f3f4f6',
  },

  cardThumbnailPlaceholder: {
    width: '100%',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    fontSize: '1.5rem',
    fontWeight: 600,
    color: 'var(--viewer-text-muted, #6b7280)',
    textTransform: 'uppercase',
  },

  cardInfo: {
    padding: '0.75rem',
  },

  cardName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--viewer-text, #111827)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  cardMeta: {
    fontSize: '0.75rem',
    color: 'var(--viewer-text-muted, #6b7280)',
    marginTop: '0.25rem',
  },

  // File card (list mode)
  cardList: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    border: '1px solid var(--viewer-border, #e5e7eb)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },

  cardListHover: {
    backgroundColor: '#f9fafb',
  },

  cardListIcon: {
    width: '2.5rem',
    height: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--viewer-text-muted, #6b7280)',
    textTransform: 'uppercase',
    flexShrink: 0,
  },

  cardListInfo: {
    flex: 1,
    minWidth: 0,
  },

  cardListName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--viewer-text, #111827)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  cardListMeta: {
    fontSize: '0.75rem',
    color: 'var(--viewer-text-muted, #6b7280)',
    display: 'flex',
    gap: '0.5rem',
  },

  cardActions: {
    display: 'flex',
    gap: '0.25rem',
    flexShrink: 0,
  },

  // Action buttons
  actionButton: {
    padding: '0.375rem',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--viewer-text-muted, #6b7280)',
    transition: 'background-color 0.15s, color 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionButtonHover: {
    backgroundColor: '#f3f4f6',
    color: 'var(--viewer-text, #111827)',
  },

  actionButtonDanger: {
    color: 'var(--viewer-error, #ef4444)',
  },

  // Preview overlay
  previewOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--viewer-overlay, rgba(0, 0, 0, 0.75))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  previewContent: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh',
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--viewer-border, #e5e7eb)',
  },

  previewTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--viewer-text, #111827)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  previewActions: {
    display: 'flex',
    gap: '0.5rem',
  },

  previewBody: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    overflow: 'auto',
  },

  previewImage: {
    maxWidth: '100%',
    maxHeight: '70vh',
    objectFit: 'contain',
  },

  previewPdf: {
    width: '100%',
    height: '70vh',
    border: 'none',
  },

  previewUnsupported: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    color: 'var(--viewer-text-muted, #6b7280)',
  },

  // Close button
  closeButton: {
    position: 'absolute',
    top: '-0.5rem',
    right: '-0.5rem',
    width: '2rem',
    height: '2rem',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '1px solid var(--viewer-border, #e5e7eb)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
};
