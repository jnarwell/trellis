/**
 * Trellis StatCard - Individual Stat Display
 *
 * Displays a single statistic with optional icon, comparison, and formatting.
 */

import React from 'react';
import type { StatCardProps } from './types.js';
import { styles, iconMap } from './styles.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format a numeric value based on format type.
 */
function formatValue(
  value: number | string | null,
  format?: 'number' | 'currency' | 'percent',
  prefix?: string,
  suffix?: string
): string {
  if (value === null || value === undefined) {
    return '--';
  }

  // If string, return as-is with prefix/suffix
  if (typeof value === 'string') {
    return `${prefix ?? ''}${value}${suffix ?? ''}`;
  }

  let formatted: string;

  switch (format) {
    case 'currency':
      formatted = value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      break;
    case 'percent':
      // Assume value is already a decimal (0.85 = 85%)
      formatted = `${(value * 100).toFixed(1)}%`;
      break;
    default:
      formatted = value.toLocaleString('en-US');
  }

  // Apply custom prefix/suffix (override currency symbol if provided)
  if (prefix !== undefined || suffix !== undefined) {
    // For currency with custom prefix, strip the default symbol
    if (format === 'currency' && prefix !== undefined) {
      formatted = value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }
    return `${prefix ?? ''}${formatted}${suffix ?? ''}`;
  }

  return formatted;
}

/**
 * Calculate comparison display.
 */
function getComparisonDisplay(
  currentValue: number | string | null,
  comparison: { label: string; value: number; type: 'absolute' | 'percent' }
): { text: string; direction: 'up' | 'down' | 'neutral' } {
  if (currentValue === null || typeof currentValue === 'string') {
    return { text: comparison.label, direction: 'neutral' };
  }

  const diff = currentValue - comparison.value;
  const direction: 'up' | 'down' | 'neutral' =
    diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';

  let diffText: string;
  if (comparison.type === 'percent' && comparison.value !== 0) {
    const percentDiff = ((diff / comparison.value) * 100).toFixed(1);
    diffText = `${diff >= 0 ? '+' : ''}${percentDiff}%`;
  } else {
    diffText = `${diff >= 0 ? '+' : ''}${diff.toLocaleString()}`;
  }

  return {
    text: `${diffText} ${comparison.label}`,
    direction,
  };
}

/**
 * Get icon for display.
 */
function getIcon(iconName?: string): string | null {
  if (!iconName) return null;
  return iconMap[iconName.toLowerCase()] ?? iconName;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const StatCard: React.FC<StatCardProps> = ({
  config,
  value,
  loading = false,
  error = null,
  onClick,
}) => {
  // Build card styles
  const cardStyle: React.CSSProperties = {
    ...styles['card'],
    ...(onClick ? styles['cardClickable'] : {}),
    ...(loading ? styles['cardLoading'] : {}),
    ...(error ? styles['cardError'] : {}),
    ...(config.color ? { borderTopColor: config.color, borderTopWidth: '3px' } : {}),
  };

  // Get icon
  const icon = getIcon(config.icon);

  // Format the value
  const formattedValue = formatValue(
    value,
    config.format,
    config.prefix,
    config.suffix
  );

  // Calculate comparison if provided
  const comparisonDisplay = config.comparison
    ? getComparisonDisplay(value, config.comparison)
    : null;

  // Handle click
  const handleClick = () => {
    if (onClick && !loading && !error) {
      onClick();
    }
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick && !loading && !error) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`stats-block__card ${loading ? 'stats-block__card--loading' : ''} ${error ? 'stats-block__card--error' : ''}`}
      style={cardStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-testid="stat-card"
      data-stat-label={config.label}
    >
      {/* Icon */}
      {icon && (
        <span
          style={{ ...styles['icon'], color: config.color }}
          data-testid="stat-icon"
        >
          {icon}
        </span>
      )}

      {/* Value */}
      {loading ? (
        <div style={styles['skeleton']} data-testid="stat-loading" />
      ) : error ? (
        <span style={{ ...styles['value'], color: 'var(--stats-error)' }}>--</span>
      ) : (
        <span
          style={{
            ...styles['value'],
            ...(formattedValue.length > 8 ? styles['valueSmall'] : {}),
            color: config.color,
          }}
          data-testid="stat-value"
        >
          {formattedValue}
        </span>
      )}

      {/* Label */}
      <span style={styles['label']} data-testid="stat-label">
        {config.label}
      </span>

      {/* Comparison */}
      {comparisonDisplay && !loading && !error && (
        <div
          style={{
            ...styles['comparison'],
            ...(comparisonDisplay.direction === 'up'
              ? styles['comparisonUp']
              : comparisonDisplay.direction === 'down'
                ? styles['comparisonDown']
                : styles['comparisonNeutral']),
          }}
          data-testid="stat-comparison"
        >
          {comparisonDisplay.direction === 'up' && (
            <span style={styles['arrowUp']} />
          )}
          {comparisonDisplay.direction === 'down' && (
            <span style={styles['arrowDown']} />
          )}
          <span>{comparisonDisplay.text}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
