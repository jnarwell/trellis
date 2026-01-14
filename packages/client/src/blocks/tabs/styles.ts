/**
 * Trellis TabsBlock - Styles
 *
 * CSS-in-JS styles for the tabs container block.
 */

import type React from 'react';

// =============================================================================
// THEME VARIABLES
// =============================================================================

/**
 * CSS custom properties for theming.
 */
export const tabsTheme: React.CSSProperties = {
  '--tabs-bg': '#ffffff',
  '--tabs-border': '#e5e7eb',
  '--tabs-text': '#111827',
  '--tabs-text-muted': '#6b7280',
  '--tabs-accent': '#3b82f6',
  '--tabs-hover': '#f3f4f6',
  '--tabs-active-bg': '#eff6ff',
  '--tabs-badge-bg': '#ef4444',
  '--tabs-badge-text': '#ffffff',
  '--tabs-disabled': '#9ca3af',
} as React.CSSProperties;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles: Record<string, React.CSSProperties> = {
  // Container
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--tabs-bg, #ffffff)',
    border: '1px solid var(--tabs-border, #e5e7eb)',
    borderRadius: '0.5rem',
    overflow: 'hidden',
  },

  // Container with left tabs
  containerLeft: {
    flexDirection: 'row',
  },

  // Loading state
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '0.5rem',
    color: 'var(--tabs-text-muted, #6b7280)',
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
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    borderRadius: '0.375rem',
    margin: '1rem',
  },

  // Empty state
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    color: 'var(--tabs-text-muted, #6b7280)',
  },

  // Tab navigation container
  nav: {
    display: 'flex',
    borderBottom: '1px solid var(--tabs-border, #e5e7eb)',
    backgroundColor: 'var(--tabs-bg, #ffffff)',
  },

  // Tab navigation for left position
  navLeft: {
    flexDirection: 'column',
    borderBottom: 'none',
    borderRight: '1px solid var(--tabs-border, #e5e7eb)',
    minWidth: '160px',
  },

  // Tab list (for a11y)
  tabList: {
    display: 'flex',
    gap: '0',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },

  tabListLeft: {
    flexDirection: 'column',
  },

  // Individual tab button - default variant
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--tabs-text-muted, #6b7280)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },

  tabHover: {
    color: 'var(--tabs-text, #111827)',
    backgroundColor: 'var(--tabs-hover, #f3f4f6)',
  },

  tabActive: {
    color: 'var(--tabs-accent, #3b82f6)',
    borderBottomColor: 'var(--tabs-accent, #3b82f6)',
  },

  tabDisabled: {
    color: 'var(--tabs-disabled, #9ca3af)',
    cursor: 'not-allowed',
    opacity: 0.6,
  },

  // Tab - pills variant
  tabPills: {
    borderRadius: '9999px',
    borderBottom: 'none',
    margin: '0.25rem',
  },

  tabPillsActive: {
    backgroundColor: 'var(--tabs-accent, #3b82f6)',
    color: '#ffffff',
  },

  // Tab - underline variant
  tabUnderline: {
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
  },

  tabUnderlineActive: {
    borderBottomColor: 'var(--tabs-accent, #3b82f6)',
  },

  // Badge
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '1.25rem',
    height: '1.25rem',
    padding: '0 0.375rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: '9999px',
    backgroundColor: 'var(--tabs-badge-bg, #ef4444)',
    color: 'var(--tabs-badge-text, #ffffff)',
  },

  // Tab content area
  content: {
    flex: 1,
    padding: '1rem',
    minHeight: '100px',
  },

  // Tab panel
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  panelHidden: {
    display: 'none',
  },
};
