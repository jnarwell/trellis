/**
 * Trellis KanbanBlock - Styles
 *
 * CSS-in-JS styles using CSS custom properties for theming.
 */

import type React from 'react';

// =============================================================================
// CSS CUSTOM PROPERTIES
// =============================================================================

/**
 * Default theme variables (can be overridden via CSS).
 */
export const kanbanTheme: React.CSSProperties = {
  '--kanban-bg': 'var(--trellis-surface-alt, #f5f5f5)',
  '--kanban-column-bg': 'var(--trellis-surface, #ffffff)',
  '--kanban-border': 'var(--trellis-border, #e5e5e5)',
  '--kanban-text': 'var(--trellis-text, #171717)',
  '--kanban-text-muted': 'var(--trellis-text-muted, #737373)',
  '--kanban-radius': 'var(--trellis-radius, 8px)',
  '--kanban-spacing': 'var(--trellis-spacing, 12px)',
  '--kanban-font': 'var(--trellis-font, system-ui, sans-serif)',
  '--kanban-column-width': '280px',
  '--kanban-card-shadow': '0 1px 3px rgba(0, 0, 0, 0.1)',
} as React.CSSProperties;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles = {
  // Container
  container: {
    display: 'flex',
    gap: 'var(--kanban-spacing)',
    padding: 'var(--kanban-spacing)',
    fontFamily: 'var(--kanban-font)',
    backgroundColor: 'var(--kanban-bg)',
    borderRadius: 'var(--kanban-radius)',
    overflowX: 'auto',
    minHeight: '400px',
  } as React.CSSProperties,

  // Loading state
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    color: 'var(--kanban-text-muted)',
    gap: '12px',
  } as React.CSSProperties,

  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid var(--kanban-border)',
    borderTopColor: 'var(--kanban-text)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  } as React.CSSProperties,

  // Error state
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--kanban-radius)',
    color: '#dc2626',
  } as React.CSSProperties,

  // Column
  column: {
    display: 'flex',
    flexDirection: 'column',
    width: 'var(--kanban-column-width)',
    minWidth: 'var(--kanban-column-width)',
    backgroundColor: 'var(--kanban-column-bg)',
    borderRadius: 'var(--kanban-radius)',
    border: '1px solid var(--kanban-border)',
  } as React.CSSProperties,

  columnDropTarget: {
    boxShadow: '0 0 0 2px #3b82f6',
    backgroundColor: '#eff6ff',
  } as React.CSSProperties,

  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    borderBottom: '1px solid var(--kanban-border)',
  } as React.CSSProperties,

  columnTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--kanban-text)',
    margin: 0,
  } as React.CSSProperties,

  columnAccent: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  } as React.CSSProperties,

  columnCount: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '24px',
    padding: '0 6px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
    color: 'var(--kanban-text-muted)',
  } as React.CSSProperties,

  columnCountOverLimit: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  } as React.CSSProperties,

  columnContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    flex: 1,
    overflowY: 'auto',
    minHeight: '100px',
  } as React.CSSProperties,

  columnEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--kanban-text-muted)',
    fontSize: '13px',
    fontStyle: 'italic',
    padding: '24px 12px',
  } as React.CSSProperties,

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid var(--kanban-border)',
    padding: '12px',
    cursor: 'grab',
    boxShadow: 'var(--kanban-card-shadow)',
    transition: 'box-shadow 0.15s, transform 0.15s',
  } as React.CSSProperties,

  cardDragging: {
    opacity: 0.5,
    cursor: 'grabbing',
  } as React.CSSProperties,

  cardClickable: {
    cursor: 'pointer',
  } as React.CSSProperties,

  cardHover: {
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(-1px)',
  } as React.CSSProperties,

  cardTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--kanban-text)',
    margin: '0 0 4px 0',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  } as React.CSSProperties,

  cardSubtitle: {
    fontSize: '12px',
    color: 'var(--kanban-text-muted)',
    margin: 0,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  } as React.CSSProperties,

  cardBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '8px',
  } as React.CSSProperties,

  cardBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: '4px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
  } as React.CSSProperties,
} as const;

// =============================================================================
// COLUMN COLORS
// =============================================================================

/**
 * Default column colors by common status names.
 */
export const columnColors: Record<string, string> = {
  // Workflow statuses
  todo: '#6b7280',
  'to do': '#6b7280',
  'to-do': '#6b7280',
  backlog: '#6b7280',
  open: '#6b7280',
  new: '#6b7280',

  in_progress: '#3b82f6',
  'in progress': '#3b82f6',
  'in-progress': '#3b82f6',
  doing: '#3b82f6',
  active: '#3b82f6',
  working: '#3b82f6',

  review: '#8b5cf6',
  'in review': '#8b5cf6',
  'in-review': '#8b5cf6',
  testing: '#8b5cf6',

  done: '#22c55e',
  complete: '#22c55e',
  completed: '#22c55e',
  closed: '#22c55e',
  resolved: '#22c55e',

  blocked: '#ef4444',
  failed: '#ef4444',
  rejected: '#ef4444',
  cancelled: '#ef4444',

  // Generic colors by name
  gray: '#6b7280',
  grey: '#6b7280',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

/**
 * Get column color from config or defaults.
 */
export function getColumnColor(config: { value: string; color?: string }): string {
  if (config.color) {
    // If it's a named color, look it up
    const namedColor = columnColors[config.color.toLowerCase()];
    if (namedColor) {
      return namedColor;
    }
    // Otherwise use as-is (hex, rgb, etc.)
    return config.color;
  }

  // Try to match by value
  const normalized = config.value.toLowerCase().replace(/[_\s-]/g, '');
  for (const [key, color] of Object.entries(columnColors)) {
    if (key.replace(/[_\s-]/g, '') === normalized) {
      return color;
    }
  }

  // Default gray
  return '#6b7280';
}

// =============================================================================
// BADGE COLORS
// =============================================================================

/**
 * Badge colors for priority and other common values.
 */
export const badgeColors: Record<string, React.CSSProperties> = {
  high: { backgroundColor: '#fee2e2', color: '#991b1b' },
  medium: { backgroundColor: '#fef3c7', color: '#92400e' },
  low: { backgroundColor: '#dcfce7', color: '#166534' },
  critical: { backgroundColor: '#fce7f3', color: '#9d174d' },
  urgent: { backgroundColor: '#fee2e2', color: '#991b1b' },
  normal: { backgroundColor: '#f3f4f6', color: '#374151' },
};

/**
 * Get badge style for a value.
 */
export function getBadgeStyle(value: string): React.CSSProperties {
  const normalized = String(value).toLowerCase().replace(/[_\s-]/g, '');
  return { ...styles.cardBadge, ...(badgeColors[normalized] ?? {}) };
}
