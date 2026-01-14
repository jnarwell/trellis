/**
 * Trellis StatsBlock - Styles
 *
 * CSS-in-JS styles for the Stats block.
 */

import type React from 'react';

// =============================================================================
// THEME VARIABLES
// =============================================================================

/**
 * CSS custom properties for theming.
 */
export const statsTheme: React.CSSProperties = {
  '--stats-bg': '#ffffff',
  '--stats-border': '#e5e7eb',
  '--stats-text': '#111827',
  '--stats-text-muted': '#6b7280',
  '--stats-accent': '#3b82f6',
  '--stats-error': '#ef4444',
  '--stats-success': '#10b981',
  '--stats-warning': '#f59e0b',
} as React.CSSProperties;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles: Record<string, React.CSSProperties> = {
  // Container
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--stats-bg, #ffffff)',
    borderRadius: '0.5rem',
    padding: '1rem',
  },

  // Row layout
  row: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '1rem',
  },

  // Grid layout
  grid: {
    display: 'grid',
    gap: '1rem',
  },

  // Loading state
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '0.5rem',
    color: 'var(--stats-text-muted, #6b7280)',
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
    color: 'var(--stats-error, #ef4444)',
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
    color: 'var(--stats-text-muted, #6b7280)',
  },

  // Stat card
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    backgroundColor: 'var(--stats-bg, #ffffff)',
    border: '1px solid var(--stats-border, #e5e7eb)',
    borderRadius: '0.5rem',
    minWidth: '140px',
    flex: '1 1 auto',
    textAlign: 'center',
    transition: 'box-shadow 0.15s, transform 0.15s',
  },

  cardClickable: {
    cursor: 'pointer',
  },

  cardLoading: {
    opacity: 0.6,
  },

  cardError: {
    borderColor: 'var(--stats-error, #ef4444)',
    backgroundColor: '#fef2f2',
  },

  // Icon
  icon: {
    fontSize: '1.5rem',
    marginBottom: '0.5rem',
  },

  // Value
  value: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--stats-text, #111827)',
    lineHeight: 1.2,
    marginBottom: '0.25rem',
  },

  valueSmall: {
    fontSize: '1.5rem',
  },

  // Label
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--stats-text-muted, #6b7280)',
    marginTop: '0.25rem',
  },

  // Comparison
  comparison: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    marginTop: '0.5rem',
  },

  comparisonUp: {
    color: 'var(--stats-success, #10b981)',
  },

  comparisonDown: {
    color: 'var(--stats-error, #ef4444)',
  },

  comparisonNeutral: {
    color: 'var(--stats-text-muted, #6b7280)',
  },

  // Arrow icons
  arrowUp: {
    display: 'inline-block',
    width: 0,
    height: 0,
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderBottom: '6px solid currentColor',
  },

  arrowDown: {
    display: 'inline-block',
    width: 0,
    height: 0,
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderTop: '6px solid currentColor',
  },

  // Card value loading skeleton
  skeleton: {
    backgroundColor: '#e5e7eb',
    borderRadius: '0.25rem',
    height: '2rem',
    width: '4rem',
    animation: 'pulse 2s infinite',
  },
};

// =============================================================================
// ICON MAP
// =============================================================================

/**
 * Icon map placeholder (integrate with icon library like lucide-react later).
 */
export const iconMap: Record<string, string> = {};
