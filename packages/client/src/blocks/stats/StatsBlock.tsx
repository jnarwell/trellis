/**
 * Trellis StatsBlock - Main Component
 *
 * Display KPI cards with counts, totals, percentages, and metrics.
 *
 * @example
 * ```tsx
 * <StatsBlock
 *   config={{
 *     block: 'stats',
 *     layout: 'row',
 *     stats: [
 *       { label: 'Products', entityType: 'product', aggregate: 'count', icon: 'box' },
 *       { label: 'Revenue', entityType: 'order', aggregate: 'sum', property: 'total', format: 'currency' },
 *       { label: 'Growth', value: 0.12, format: 'percent' },
 *     ],
 *   }}
 *   onEvent={(event) => console.log(event)}
 * />
 * ```
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import type { Entity, PropertyName } from '@trellis/kernel';
import { useQuery } from '../../state/hooks.js';
import type { StatsBlockProps, StatsBlockEvent, StatConfig, StatDataState } from './types.js';
import { styles, statsTheme } from './styles.js';
import { StatCard } from './StatCard.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract property value from entity.
 * Handles all property sources (literal, inherited, computed, measured).
 */
function getPropertyValue(entity: Entity, property: PropertyName): unknown {
  const prop = entity?.properties?.[property];
  if (!prop) return undefined;

  switch (prop.source) {
    case 'literal':
    case 'measured': {
      const value = prop.value;
      if (value && typeof value === 'object' && 'value' in value) {
        return (value as { value: unknown }).value;
      }
      return value;
    }

    case 'inherited': {
      const inhProp = prop as {
        override?: { value?: unknown };
        resolved_value?: { value?: unknown };
      };
      const inhValue = inhProp.override ?? inhProp.resolved_value;
      if (inhValue && typeof inhValue === 'object' && 'value' in inhValue) {
        return inhValue.value;
      }
      return inhValue;
    }

    case 'computed': {
      const compProp = prop as { cached_value?: { value?: unknown } };
      const cached = compProp.cached_value;
      if (cached && typeof cached === 'object' && 'value' in cached) {
        return cached.value;
      }
      return cached;
    }

    default:
      return undefined;
  }
}

/**
 * Aggregate values from entities.
 */
function aggregateValues(
  entities: readonly Entity[],
  aggregate: 'count' | 'sum' | 'avg' | 'min' | 'max',
  property?: string
): number {
  if (aggregate === 'count') {
    return entities.length;
  }

  if (!property) {
    return 0;
  }

  const values = entities
    .map((e) => getPropertyValue(e, property as PropertyName))
    .filter((v): v is number => typeof v === 'number');

  if (values.length === 0) {
    return 0;
  }

  switch (aggregate) {
    case 'sum':
      return values.reduce((acc, v) => acc + v, 0);
    case 'avg':
      return values.reduce((acc, v) => acc + v, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return 0;
  }
}

// =============================================================================
// STAT DATA HOOK
// =============================================================================

/**
 * Hook to fetch data for a single stat.
 */
function useStatData(config: StatConfig): StatDataState {
  // If static value provided, use it directly
  if (config.value !== undefined) {
    return {
      value: config.value,
      loading: false,
      error: null,
    };
  }

  // If entityType provided, query entities
  const shouldQuery = !!config.entityType;
  const queryOpts: { filter?: Record<string, unknown>; includeTotal: boolean; skip: boolean } = {
    includeTotal: config.aggregate === 'count',
    skip: !shouldQuery,
  };
  if (config.filter !== undefined) queryOpts.filter = config.filter;
  const { data, loading, error } = useQuery(config.entityType ?? '', queryOpts);

  // Calculate aggregated value
  const value = useMemo(() => {
    if (!shouldQuery || loading || error) {
      return null;
    }

    const entities = data ?? [];
    const aggregate = config.aggregate ?? 'count';

    return aggregateValues(entities, aggregate, config.property);
  }, [shouldQuery, loading, error, data, config.aggregate, config.property]);

  return {
    value,
    loading: shouldQuery ? loading : false,
    error: error ? new Error(error.message ?? 'Failed to load') : null,
  };
}

// =============================================================================
// STATE COMPONENTS
// =============================================================================

const StatsLoading: React.FC = () => (
  <div
    className="stats-block stats-block--loading"
    style={{ ...statsTheme, ...styles['container'], ...styles['loading'] }}
    data-testid="stats-loading"
  >
    <div style={styles['loadingSpinner']} />
    <span>Loading stats...</span>
  </div>
);

const StatsError: React.FC<{ error: Error }> = ({ error }) => (
  <div
    className="stats-block stats-block--error"
    style={{ ...statsTheme, ...styles['container'], ...styles['error'] }}
    data-testid="stats-error"
  >
    <span>Error: {error.message}</span>
  </div>
);

const StatsEmpty: React.FC = () => (
  <div
    className="stats-block stats-block--empty"
    style={{ ...statsTheme, ...styles['container'], ...styles['empty'] }}
    data-testid="stats-empty"
  >
    <span>No stats configured</span>
  </div>
);

// =============================================================================
// SINGLE STAT WRAPPER
// =============================================================================

/**
 * Wrapper that fetches data for a single stat and renders the card.
 */
const StatWithData: React.FC<{
  config: StatConfig;
  onStatClick?: (stat: StatConfig, value: number | string | null) => void;
}> = ({ config, onStatClick }) => {
  const { value, loading, error } = useStatData(config);

  const handleClick = useCallback(() => {
    if (onStatClick) {
      onStatClick(config, value);
    }
  }, [onStatClick, config, value]);

  return (
    <StatCard
      config={config}
      value={value}
      loading={loading}
      error={error}
      onClick={onStatClick ? handleClick : undefined}
    />
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const StatsBlock: React.FC<StatsBlockProps> = ({
  config,
  onEvent,
  className,
}) => {
  // ==========================================================================
  // GUARDS & DEFAULTS
  // ==========================================================================

  // GUARD: Null/undefined config properties with defaults
  const stats = config.stats ?? [];
  const layout = config.layout ?? 'row';
  const columns = config.columns ?? 'auto';

  // GUARD: Empty stats array
  if (stats.length === 0) {
    return <StatsEmpty />;
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleStatClick = useCallback(
    (stat: StatConfig, value: number | string | null) => {
      console.log('[StatsBlock] Stat clicked:', stat.label, value);
      onEvent?.({ type: 'statClicked', stat, value });
    },
    [onEvent]
  );

  // ==========================================================================
  // LAYOUT STYLES
  // ==========================================================================

  const layoutStyle: React.CSSProperties = useMemo(() => {
    if (layout === 'grid') {
      return {
        ...(styles['grid'] ?? {}),
        gridTemplateColumns:
          typeof columns === 'number'
            ? `repeat(${columns}, 1fr)`
            : `repeat(auto-fit, minmax(140px, 1fr))`,
      };
    }
    return styles['row'] ?? {};
  }, [layout, columns]);

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div
      className={`stats-block ${className ?? ''}`}
      style={{ ...statsTheme, ...styles['container'] }}
      data-testid="stats-block"
      data-layout={layout}
    >
      <div style={layoutStyle}>
        {stats.map((statConfig, index) => (
          <StatWithData
            key={`${statConfig.label}-${index}`}
            config={statConfig}
            onStatClick={handleStatClick}
          />
        ))}
      </div>
    </div>
  );
};

export default StatsBlock;
