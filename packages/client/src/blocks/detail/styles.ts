/**
 * Trellis DetailBlock - Styles
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
export const detailTheme: React.CSSProperties = {
  '--detail-bg': 'var(--trellis-surface, #ffffff)',
  '--detail-border': 'var(--trellis-border, #e5e5e5)',
  '--detail-text': 'var(--trellis-text, #171717)',
  '--detail-text-muted': 'var(--trellis-text-muted, #737373)',
  '--detail-text-empty': 'var(--trellis-text-empty, #a3a3a3)',
  '--detail-radius': 'var(--trellis-radius, 8px)',
  '--detail-spacing': 'var(--trellis-spacing, 16px)',
  '--detail-font': 'var(--trellis-font, system-ui, sans-serif)',
} as React.CSSProperties;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles = {
  // Container
  container: {
    fontFamily: 'var(--detail-font)',
    backgroundColor: 'var(--detail-bg)',
    border: '1px solid var(--detail-border)',
    borderRadius: 'var(--detail-radius)',
    color: 'var(--detail-text)',
  } as React.CSSProperties,

  // Loading state
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: 'var(--detail-text-muted)',
  } as React.CSSProperties,

  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid var(--detail-border)',
    borderTopColor: 'var(--detail-text)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginRight: '12px',
  } as React.CSSProperties,

  // Not found state
  notFound: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: 'var(--detail-text-muted)',
    textAlign: 'center',
  } as React.CSSProperties,

  notFoundIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  } as React.CSSProperties,

  // Error state
  error: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--detail-radius)',
    color: '#dc2626',
  } as React.CSSProperties,

  // Section
  section: {
    borderBottom: '1px solid var(--detail-border)',
  } as React.CSSProperties,

  sectionLast: {
    borderBottom: 'none',
  } as React.CSSProperties,

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--detail-spacing)',
    cursor: 'default',
  } as React.CSSProperties,

  sectionHeaderCollapsible: {
    cursor: 'pointer',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--detail-text)',
    margin: 0,
  } as React.CSSProperties,

  sectionToggle: {
    fontSize: '12px',
    color: 'var(--detail-text-muted)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.15s',
  } as React.CSSProperties,

  sectionContent: {
    padding: '0 var(--detail-spacing) var(--detail-spacing)',
  } as React.CSSProperties,

  sectionCollapsed: {
    display: 'none',
  } as React.CSSProperties,

  // Field
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '16px',
  } as React.CSSProperties,

  fieldLast: {
    marginBottom: 0,
  } as React.CSSProperties,

  fieldClickable: {
    cursor: 'pointer',
  } as React.CSSProperties,

  fieldLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--detail-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  fieldValue: {
    fontSize: '14px',
    color: 'var(--detail-text)',
    wordBreak: 'break-word',
  } as React.CSSProperties,

  fieldEmpty: {
    color: 'var(--detail-text-empty)',
    fontStyle: 'italic',
  } as React.CSSProperties,

  // Badge
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '9999px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
  } as React.CSSProperties,

  // Link
  link: {
    color: '#2563eb',
    textDecoration: 'none',
  } as React.CSSProperties,

  // Boolean
  booleanTrue: {
    color: '#16a34a',
  } as React.CSSProperties,

  booleanFalse: {
    color: '#dc2626',
  } as React.CSSProperties,

  // Actions
  actions: {
    display: 'flex',
    gap: '8px',
    padding: 'var(--detail-spacing)',
    borderTop: '1px solid var(--detail-border)',
  } as React.CSSProperties,

  actionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: 'none',
  } as React.CSSProperties,

  actionPrimary: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  } as React.CSSProperties,

  actionSecondary: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid var(--detail-border)',
  } as React.CSSProperties,

  actionDanger: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
  } as React.CSSProperties,

  actionDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
} as const;

// =============================================================================
// BADGE COLORS
// =============================================================================

/**
 * Color mappings for badge values.
 */
export const badgeColors: Record<string, React.CSSProperties> = {
  // Status colors
  active: { backgroundColor: '#dcfce7', color: '#166534' },
  inactive: { backgroundColor: '#f3f4f6', color: '#374151' },
  pending: { backgroundColor: '#fef3c7', color: '#92400e' },
  approved: { backgroundColor: '#dcfce7', color: '#166534' },
  rejected: { backgroundColor: '#fee2e2', color: '#991b1b' },
  draft: { backgroundColor: '#e0e7ff', color: '#3730a3' },
  published: { backgroundColor: '#dcfce7', color: '#166534' },
  archived: { backgroundColor: '#f3f4f6', color: '#374151' },

  // Priority colors
  high: { backgroundColor: '#fee2e2', color: '#991b1b' },
  medium: { backgroundColor: '#fef3c7', color: '#92400e' },
  low: { backgroundColor: '#dcfce7', color: '#166534' },
  critical: { backgroundColor: '#fce7f3', color: '#9d174d' },

  // Generic
  yes: { backgroundColor: '#dcfce7', color: '#166534' },
  no: { backgroundColor: '#fee2e2', color: '#991b1b' },
  true: { backgroundColor: '#dcfce7', color: '#166534' },
  false: { backgroundColor: '#fee2e2', color: '#991b1b' },
};

/**
 * Get badge style for a value.
 */
export function getBadgeStyle(value: string): React.CSSProperties {
  const normalized = String(value).toLowerCase().replace(/[_\s-]/g, '');
  return badgeColors[normalized] ?? styles.badge;
}
