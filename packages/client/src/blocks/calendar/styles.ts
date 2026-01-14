/**
 * Trellis CalendarBlock - Styles
 */

import type React from 'react';

export const calendarTheme: React.CSSProperties = {
  '--calendar-bg': '#ffffff',
  '--calendar-border': '#e5e7eb',
  '--calendar-text': '#111827',
  '--calendar-text-muted': '#6b7280',
  '--calendar-accent': '#3b82f6',
  '--calendar-today-bg': '#eff6ff',
  '--calendar-selected-bg': '#dbeafe',
  '--calendar-other-month': '#d1d5db',
} as React.CSSProperties;

export const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--calendar-bg, #ffffff)',
    border: '1px solid var(--calendar-border, #e5e7eb)',
    borderRadius: '0.5rem',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--calendar-border, #e5e7eb)',
  },
  headerTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--calendar-text, #111827)',
    margin: 0,
  },
  headerNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    padding: 0,
    backgroundColor: 'transparent',
    border: '1px solid var(--calendar-border, #e5e7eb)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    color: 'var(--calendar-text, #111827)',
  },
  todayButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: 'var(--calendar-accent, #3b82f6)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    marginLeft: '0.5rem',
  },
  weekdayHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    borderBottom: '1px solid var(--calendar-border, #e5e7eb)',
  },
  weekdayCell: {
    padding: '0.5rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--calendar-text-muted, #6b7280)',
    textTransform: 'uppercase',
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
  },
  dayCell: {
    position: 'relative',
    padding: '0.25rem',
    borderRight: '1px solid var(--calendar-border, #e5e7eb)',
    borderBottom: '1px solid var(--calendar-border, #e5e7eb)',
    minHeight: '5rem',
    overflow: 'hidden',
  },
  dayCellSelectable: { cursor: 'pointer' },
  dayCellToday: { backgroundColor: 'var(--calendar-today-bg, #eff6ff)' },
  dayCellSelected: { backgroundColor: 'var(--calendar-selected-bg, #dbeafe)' },
  dayNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.5rem',
    height: '1.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--calendar-text, #111827)',
    marginBottom: '0.25rem',
  },
  dayNumberOtherMonth: { color: 'var(--calendar-other-month, #d1d5db)' },
  dayNumberToday: {
    backgroundColor: 'var(--calendar-accent, #3b82f6)',
    color: '#ffffff',
    borderRadius: '50%',
  },
  dayEvents: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
    overflow: 'hidden',
  },
  eventPill: {
    display: 'block',
    padding: '0.125rem 0.375rem',
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: 'var(--calendar-accent, #3b82f6)',
    borderRadius: '0.25rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    cursor: 'pointer',
  },
  moreEvents: {
    fontSize: '0.6875rem',
    color: 'var(--calendar-text-muted, #6b7280)',
    padding: '0.125rem 0.375rem',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    gap: '0.5rem',
    color: 'var(--calendar-text-muted, #6b7280)',
  },
  loadingSpinner: {
    width: '1.5rem',
    height: '1.5rem',
    border: '2px solid currentColor',
    borderTopColor: 'transparent',
    borderRadius: '50%',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: 'var(--calendar-text-muted, #6b7280)',
  },
};

export const eventColors: Record<string, string> = {
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gray: '#6b7280',
};

export function getEventColor(colorName?: string): string {
  if (!colorName) return eventColors['blue'] ?? '#3b82f6';
  return eventColors[colorName.toLowerCase()] ?? colorName;
}
