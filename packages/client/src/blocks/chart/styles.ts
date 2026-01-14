/**
 * Trellis ChartBlock - Styles
 *
 * CSS-in-JS styles for the chart block.
 */

import type React from 'react';

// =============================================================================
// THEME VARIABLES
// =============================================================================

/**
 * CSS custom properties for theming.
 */
export const chartTheme: React.CSSProperties = {
  '--chart-bg': '#ffffff',
  '--chart-border': '#e5e7eb',
  '--chart-text': '#111827',
  '--chart-text-muted': '#6b7280',
  '--chart-grid': '#e5e7eb',
  '--chart-axis': '#9ca3af',
} as React.CSSProperties;

/**
 * Default color palette for charts.
 */
export const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
  '#6366f1', // indigo
];

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles: Record<string, React.CSSProperties> = {
  // Container
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--chart-bg, #ffffff)',
    border: '1px solid var(--chart-border, #e5e7eb)',
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
    color: 'var(--chart-text-muted, #6b7280)',
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
  },

  // Empty state
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    color: 'var(--chart-text-muted, #6b7280)',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },

  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--chart-text, #111827)',
    margin: 0,
  },

  // Chart area
  chartArea: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },

  // Legend
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginTop: '1rem',
    justifyContent: 'center',
  },

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.75rem',
    color: 'var(--chart-text, #111827)',
  },

  legendColor: {
    width: '0.75rem',
    height: '0.75rem',
    borderRadius: '0.125rem',
  },

  // Tooltip
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    pointerEvents: 'none',
    zIndex: 10,
    whiteSpace: 'nowrap',
  },

  // SVG
  svg: {
    overflow: 'visible',
  },
};
