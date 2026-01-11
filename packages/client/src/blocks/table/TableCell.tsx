/**
 * Trellis TableBlock - Cell Renderers
 */

import React from 'react';
import type { Entity } from '@trellis/kernel';
import type { CellProps, ColumnConfig } from './types.js';
import type { CellFormat } from '../types.js';
import { cell, badge, cn } from './styles.js';

// =============================================================================
// CELL VALUE EXTRACTION
// =============================================================================

/**
 * Extract a value from an entity by property path.
 */
function getPropertyValue(entity: Entity, path: string): unknown {
  // Handle nested paths like "address.city"
  const parts = path.split('.');
  let value: unknown = entity;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }

    // Check if this is a property in the entity's properties
    if (part === parts[0] && entity.properties && part in entity.properties) {
      // Use bracket notation with type coercion for branded PropertyName
      const prop = (entity.properties as Record<string, unknown>)[part];
      // Extract value from property structure
      if (prop && typeof prop === 'object' && 'value' in prop) {
        const propValue = prop.value;
        if (propValue && typeof propValue === 'object' && 'value' in propValue) {
          value = propValue.value;
        } else {
          value = propValue;
        }
      } else {
        value = prop;
      }
    } else if (typeof value === 'object' && value !== null) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return value;
}

// =============================================================================
// FORMAT FUNCTIONS
// =============================================================================

function formatCurrency(value: unknown, currency = 'USD'): string {
  if (typeof value !== 'number') return String(value ?? '');
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

function formatNumber(value: unknown, decimals?: number): string {
  if (typeof value !== 'number') return String(value ?? '');
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPercent(value: unknown): string {
  if (typeof value !== 'number') return String(value ?? '');
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: unknown, format?: string): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTime(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelative(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (isNaN(date.getTime())) return String(value);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

// =============================================================================
// CELL COMPONENTS
// =============================================================================

const TextCell: React.FC<CellProps> = ({ value }) => {
  const displayValue = value === null || value === undefined ? '' : String(value);
  return (
    <span className={cell.text} title={displayValue}>
      {displayValue}
    </span>
  );
};

const NumberCell: React.FC<CellProps> = ({ value, column }) => {
  const decimals = column.formatOptions?.decimals;
  return <span className={cell.number}>{formatNumber(value, decimals)}</span>;
};

const CurrencyCell: React.FC<CellProps> = ({ value, column }) => {
  const currency = column.formatOptions?.currency ?? 'USD';
  return <span className={cell.currency}>{formatCurrency(value, currency)}</span>;
};

const PercentCell: React.FC<CellProps> = ({ value }) => {
  return <span className={cell.number}>{formatPercent(value)}</span>;
};

const DateCell: React.FC<CellProps> = ({ value, column }) => {
  const format = column.formatOptions?.dateFormat;
  return <span className={cell.date}>{formatDate(value, format)}</span>;
};

const DateTimeCell: React.FC<CellProps> = ({ value }) => {
  return <span className={cell.date}>{formatDateTime(value)}</span>;
};

const TimeCell: React.FC<CellProps> = ({ value }) => {
  return <span className={cell.date}>{formatTime(value)}</span>;
};

const RelativeCell: React.FC<CellProps> = ({ value }) => {
  return <span className={cell.date}>{formatRelative(value)}</span>;
};

const BooleanCell: React.FC<CellProps> = ({ value }) => {
  const isTrue = Boolean(value);
  return (
    <span className={cell.boolean}>
      {isTrue ? (
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </span>
  );
};

const BadgeCell: React.FC<CellProps> = ({ value, column }) => {
  const displayValue = String(value ?? '');
  const colors = column.formatOptions?.colors ?? {};
  const colorKey = displayValue.toLowerCase();
  const colorClass = colors[colorKey] ?? badge.colors.gray;

  return (
    <span className={cn(badge.base, colorClass)}>
      {displayValue}
    </span>
  );
};

const LinkCell: React.FC<CellProps> = ({ value, column }) => {
  const displayValue = String(value ?? '');
  const target = column.formatOptions?.linkTarget ?? '_self';

  return (
    <a
      href={displayValue}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={cell.link}
    >
      {displayValue}
    </a>
  );
};

const ImageCell: React.FC<CellProps> = ({ value }) => {
  const src = String(value ?? '');
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      className={cell.image}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

// =============================================================================
// CELL RENDERER MAP
// =============================================================================

const CellRenderers: Record<CellFormat, React.FC<CellProps>> = {
  text: TextCell,
  number: NumberCell,
  currency: CurrencyCell,
  percent: PercentCell,
  date: DateCell,
  datetime: DateTimeCell,
  time: TimeCell,
  relative: RelativeCell,
  boolean: BooleanCell,
  badge: BadgeCell,
  link: LinkCell,
  image: ImageCell,
  actions: TextCell, // Actions are handled separately
};

// =============================================================================
// MAIN TABLE CELL COMPONENT
// =============================================================================

export interface TableCellProps {
  /** Column configuration */
  column: ColumnConfig;

  /** Entity data */
  entity: Entity;

  /** Row index */
  rowIndex: number;

  /** Evaluated value (if expression was used) */
  evaluatedValue?: unknown;
}

export const TableCell: React.FC<TableCellProps> = ({
  column,
  entity,
  rowIndex,
  evaluatedValue,
}) => {
  // Get value - either from evaluated expression or property path
  const value = evaluatedValue !== undefined
    ? evaluatedValue
    : getPropertyValue(entity, column.property);

  // Determine format
  const format = column.format ?? 'text';

  // Get renderer
  const Renderer = CellRenderers[format] ?? TextCell;

  return (
    <Renderer
      value={value}
      column={column}
      entity={entity}
      rowIndex={rowIndex}
    />
  );
};

// Export individual cell components for customization
export {
  TextCell,
  NumberCell,
  CurrencyCell,
  PercentCell,
  DateCell,
  DateTimeCell,
  TimeCell,
  RelativeCell,
  BooleanCell,
  BadgeCell,
  LinkCell,
  ImageCell,
  getPropertyValue,
};
