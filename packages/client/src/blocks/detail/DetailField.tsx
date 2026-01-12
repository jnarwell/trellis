/**
 * Trellis DetailBlock - DetailField Component
 *
 * Displays a single field with label and formatted value.
 */

import React from 'react';
import type { DetailFieldProps, FieldFormat } from './types.js';
import { styles, getBadgeStyle } from './styles.js';

/**
 * Format a value based on the specified format.
 */
function formatValue(value: unknown, format: FieldFormat = 'text'): React.ReactNode {
  if (value === null || value === undefined) {
    return null;
  }

  switch (format) {
    case 'text':
      return String(value);

    case 'number':
      if (typeof value === 'number') {
        return value.toLocaleString();
      }
      return String(value);

    case 'currency':
      if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      }
      return String(value);

    case 'datetime':
      try {
        const date = new Date(value as string | number);
        return date.toLocaleString();
      } catch {
        return String(value);
      }

    case 'date':
      try {
        const date = new Date(value as string | number);
        return date.toLocaleDateString();
      } catch {
        return String(value);
      }

    case 'time':
      try {
        const date = new Date(value as string | number);
        return date.toLocaleTimeString();
      } catch {
        return String(value);
      }

    case 'boolean':
      const boolValue = Boolean(value);
      return (
        <span style={boolValue ? styles.booleanTrue : styles.booleanFalse}>
          {boolValue ? 'Yes' : 'No'}
        </span>
      );

    case 'badge':
      const badgeValue = String(value);
      return (
        <span style={{ ...styles.badge, ...getBadgeStyle(badgeValue) }}>
          {badgeValue}
        </span>
      );

    case 'link':
      const linkValue = String(value);
      return (
        <a
          href={linkValue}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
        >
          {linkValue}
        </a>
      );

    default:
      return String(value);
  }
}

/**
 * Convert property name to display label.
 */
function propertyToLabel(property: string): string {
  return property
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * DetailField component displays a single field with label and value.
 */
export const DetailField: React.FC<DetailFieldProps & { isLast?: boolean }> = ({
  config,
  value,
  onClick,
  isLast = false,
}) => {
  const { property, label, format = 'text', emptyText = '—', className } = config;
  const displayLabel = label ?? propertyToLabel(property);
  const isEmpty = value === null || value === undefined || value === '';

  const fieldStyle: React.CSSProperties = {
    ...styles.field,
    ...(isLast ? styles.fieldLast : {}),
    ...(onClick ? styles.fieldClickable : {}),
  };

  const valueStyle: React.CSSProperties = {
    ...styles.fieldValue,
    ...(isEmpty ? styles.fieldEmpty : {}),
  };

  const handleClick = onClick
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        onClick();
      }
    : undefined;

  return (
    <div
      className={`detail-field trellis-detail-field ${className ?? ''}`}
      style={fieldStyle}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <span className="detail-field-label trellis-detail-field-label" style={styles.fieldLabel}>
        {displayLabel}
      </span>
      <span className={`detail-field-value trellis-detail-field-value${isEmpty ? ' empty' : ''}`} style={valueStyle}>
        {isEmpty ? emptyText : formatValue(value, format)}
      </span>
    </div>
  );
};

export default DetailField;
