/**
 * Trellis TimelineBlock - Styles
 *
 * CSS-in-JS styles for the timeline block.
 */

import type React from 'react';

// =============================================================================
// THEME VARIABLES
// =============================================================================

/**
 * CSS custom properties for theming.
 */
export const timelineTheme: React.CSSProperties = {
  // Colors
  '--timeline-bg': '#ffffff',
  '--timeline-border': '#e5e7eb',
  '--timeline-text': '#111827',
  '--timeline-text-muted': '#6b7280',
  '--timeline-accent': '#3b82f6',
  '--timeline-line': '#d1d5db',
  '--timeline-dot': '#3b82f6',
  '--timeline-error': '#ef4444',
  '--timeline-success': '#10b981',
} as React.CSSProperties;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles: Record<string, React.CSSProperties> = {
  // Container
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--timeline-bg, #ffffff)',
    border: '1px solid var(--timeline-border, #e5e7eb)',
    borderRadius: '0.5rem',
    padding: '1rem',
    maxHeight: '100%',
    overflow: 'auto',
  },

  // Loading state
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '0.5rem',
    color: 'var(--timeline-text-muted, #6b7280)',
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
    color: 'var(--timeline-error, #ef4444)',
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
    color: 'var(--timeline-text-muted, #6b7280)',
  },

  // Timeline wrapper
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },

  // Date group
  dateGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '0.5rem',
  },

  dateGroupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    paddingLeft: '1.25rem',
    marginBottom: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--timeline-text, #111827)',
  },

  dateGroupItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    position: 'relative',
  },

  // Vertical timeline line
  timelineLine: {
    position: 'absolute',
    left: '0.5rem',
    top: '0',
    bottom: '0',
    width: '2px',
    backgroundColor: 'var(--timeline-line, #d1d5db)',
  },

  // Event item
  eventItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.5rem 0',
    position: 'relative',
    cursor: 'pointer',
  },

  eventItemHover: {
    backgroundColor: '#f9fafb',
  },

  // Event dot (on the timeline)
  eventDot: {
    width: '1rem',
    height: '1rem',
    borderRadius: '50%',
    backgroundColor: 'var(--timeline-dot, #3b82f6)',
    border: '2px solid var(--timeline-bg, #ffffff)',
    flexShrink: 0,
    zIndex: 1,
    marginTop: '0.125rem',
  },

  // Event dot colors by type
  eventDotCreate: {
    backgroundColor: '#10b981',
  },

  eventDotUpdate: {
    backgroundColor: '#3b82f6',
  },

  eventDotDelete: {
    backgroundColor: '#ef4444',
  },

  eventDotDefault: {
    backgroundColor: '#6b7280',
  },

  // Event content
  eventContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },

  eventTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--timeline-text, #111827)',
    margin: 0,
  },

  eventDescription: {
    fontSize: '0.75rem',
    color: 'var(--timeline-text-muted, #6b7280)',
    margin: 0,
  },

  eventMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: 'var(--timeline-text-muted, #6b7280)',
    marginTop: '0.25rem',
  },

  eventActor: {
    fontWeight: 500,
  },

  eventTimestamp: {
    color: 'var(--timeline-text-muted, #6b7280)',
  },

  metaSeparator: {
    color: 'var(--timeline-line, #d1d5db)',
  },

  // Event type icon placeholder
  eventTypeIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.25rem',
    height: '1.25rem',
    fontSize: '0.75rem',
    color: 'var(--timeline-text-muted, #6b7280)',
  },
};

/**
 * Get dot style based on event type.
 */
export function getDotStyle(eventType?: string): React.CSSProperties {
  switch (eventType?.toLowerCase()) {
    case 'create':
    case 'created':
    case 'add':
    case 'added':
      return { ...styles['eventDot'], ...styles['eventDotCreate'] };
    case 'update':
    case 'updated':
    case 'change':
    case 'changed':
      return { ...styles['eventDot'], ...styles['eventDotUpdate'] };
    case 'delete':
    case 'deleted':
    case 'remove':
    case 'removed':
      return { ...styles['eventDot'], ...styles['eventDotDelete'] };
    default:
      return { ...styles['eventDot'], ...styles['eventDotDefault'] };
  }
}
