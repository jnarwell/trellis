/**
 * Trellis TreeViewBlock - Styles
 *
 * CSS-in-JS styles for tree view components.
 */

import type React from 'react';

// =============================================================================
// THEME VARIABLES
// =============================================================================

/**
 * CSS custom properties for theming.
 */
export const treeTheme: React.CSSProperties = {
  '--tree-bg': '#ffffff',
  '--tree-border': '#e5e7eb',
  '--tree-text': '#111827',
  '--tree-text-muted': '#6b7280',
  '--tree-accent': '#3b82f6',
  '--tree-accent-light': '#eff6ff',
  '--tree-error': '#ef4444',
  '--tree-success': '#10b981',
  '--tree-hover': '#f9fafb',
  '--tree-selected': '#eff6ff',
  '--tree-drop-target': '#dbeafe',
  '--tree-line': '#d1d5db',
  '--tree-indent': '1.5rem',
} as React.CSSProperties;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles: Record<string, React.CSSProperties> = {
  // Container
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--tree-bg, #ffffff)',
    border: '1px solid var(--tree-border, #e5e7eb)',
    borderRadius: '0.5rem',
    overflow: 'auto',
  },

  // Header (optional toolbar)
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--tree-border, #e5e7eb)',
  },

  headerTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--tree-text, #111827)',
    margin: 0,
  },

  headerActions: {
    display: 'flex',
    gap: '0.5rem',
  },

  // Tree list container
  treeList: {
    padding: '0.5rem 0',
    minHeight: '100px',
  },

  // Loading state
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '0.5rem',
    color: 'var(--tree-text-muted, #6b7280)',
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
    color: 'var(--tree-error, #ef4444)',
    backgroundColor: '#fef2f2',
    borderRadius: '0.375rem',
    margin: '0.5rem',
  },

  // Empty state
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    color: 'var(--tree-text-muted, #6b7280)',
  },

  emptyIcon: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
    opacity: 0.5,
  },

  // Tree node
  node: {
    display: 'flex',
    flexDirection: 'column',
  },

  nodeRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.375rem 0.75rem',
    paddingLeft: '0.75rem',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.15s',
  },

  nodeRowHover: {
    backgroundColor: 'var(--tree-hover, #f9fafb)',
  },

  nodeRowSelected: {
    backgroundColor: 'var(--tree-selected, #eff6ff)',
  },

  nodeRowDropTarget: {
    backgroundColor: 'var(--tree-drop-target, #dbeafe)',
    outline: '2px dashed var(--tree-accent, #3b82f6)',
    outlineOffset: '-2px',
  },

  nodeRowDragging: {
    opacity: 0.5,
  },

  // Expand/collapse button
  expandButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.25rem',
    height: '1.25rem',
    padding: 0,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'var(--tree-text-muted, #6b7280)',
    borderRadius: '0.25rem',
    flexShrink: 0,
    transition: 'color 0.15s, background-color 0.15s',
  },

  expandButtonHover: {
    backgroundColor: 'var(--tree-border, #e5e7eb)',
    color: 'var(--tree-text, #111827)',
  },

  expandButtonPlaceholder: {
    width: '1.25rem',
    height: '1.25rem',
    flexShrink: 0,
  },

  // Node icon
  nodeIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.25rem',
    height: '1.25rem',
    marginRight: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--tree-text-muted, #6b7280)',
    flexShrink: 0,
  },

  // Node label
  nodeLabel: {
    flex: 1,
    fontSize: '0.875rem',
    color: 'var(--tree-text, #111827)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  nodeLabelSelected: {
    fontWeight: 500,
    color: 'var(--tree-accent, #3b82f6)',
  },

  // Children container
  nodeChildren: {
    display: 'flex',
    flexDirection: 'column',
  },

  // Tree lines (indent guides)
  treeLine: {
    position: 'relative',
  },

  treeLineVertical: {
    position: 'absolute',
    left: '0.625rem',
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: 'var(--tree-line, #d1d5db)',
  },

  treeLineHorizontal: {
    position: 'absolute',
    left: '0.625rem',
    top: '50%',
    width: '0.5rem',
    height: '1px',
    backgroundColor: 'var(--tree-line, #d1d5db)',
  },

  // Action buttons
  button: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    borderRadius: '0.25rem',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.15s',
  },

  buttonIcon: {
    padding: '0.25rem',
    fontSize: '0.75rem',
    lineHeight: 1,
  },

  buttonPrimary: {
    backgroundColor: 'var(--tree-accent, #3b82f6)',
    color: '#ffffff',
  },

  buttonSecondary: {
    backgroundColor: '#f3f4f6',
    color: 'var(--tree-text, #111827)',
    border: '1px solid var(--tree-border, #e5e7eb)',
  },
};

// =============================================================================
// KEYFRAMES (for loading spinner)
// =============================================================================

/**
 * Inject keyframes into document (call once on mount).
 */
export function injectKeyframes(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'trellis-tree-keyframes';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
