/**
 * Trellis ChartBlock - Main Component
 *
 * Data visualization block supporting bar, line, pie, doughnut, and area charts.
 *
 * @example
 * ```tsx
 * <ChartBlock
 *   config={{
 *     block: 'chart',
 *     type: 'bar',
 *     entityType: 'product',
 *     labelProperty: 'status',
 *     aggregate: 'count',
 *     title: 'Products by Status',
 *   }}
 * />
 * ```
 */

import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import type { Entity, PropertyName } from '@trellis/kernel';
import { useQuery } from '../../state/hooks.js';
import type {
  ChartBlockProps,
  ChartBlockEvent,
  ChartDataPoint,
  AggregateFunction,
} from './types.js';
import { styles, chartTheme, DEFAULT_COLORS } from './styles.js';
import { BarChart } from './BarChart.js';
import { LineChart, AreaChart } from './LineChart.js';
import { PieChart, DoughnutChart } from './PieChart.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract property value from entity.
 * Handles all property sources (literal, inherited, computed, measured).
 */
function getPropertyValue(entity: Entity, property: PropertyName): unknown {
  const prop = entity.properties?.[property];
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
 * Transform entities to chart data points.
 */
function entitiesToChartData(
  entities: readonly Entity[],
  labelProperty: PropertyName,
  valueProperty: PropertyName | undefined,
  aggregate: AggregateFunction | undefined
): ChartDataPoint[] {
  if (entities.length === 0) return [];

  // Group entities by label
  const groups = new Map<string, number[]>();

  for (const entity of entities) {
    const label = String(getPropertyValue(entity, labelProperty) ?? 'Unknown');
    const value = valueProperty
      ? Number(getPropertyValue(entity, valueProperty) ?? 0)
      : 1;

    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(value);
  }

  // Apply aggregation
  const result: ChartDataPoint[] = [];

  for (const [label, values] of groups.entries()) {
    let aggregatedValue: number;

    switch (aggregate) {
      case 'count':
        aggregatedValue = values.length;
        break;
      case 'sum':
        aggregatedValue = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      default:
        // If no aggregate specified and we have a valueProperty, sum the values
        aggregatedValue = valueProperty
          ? values.reduce((a, b) => a + b, 0)
          : values.length;
    }

    result.push({ label, value: aggregatedValue });
  }

  // Sort alphabetically by label for consistency
  return result.sort((a, b) => a.label.localeCompare(b.label));
}

// =============================================================================
// STATE COMPONENTS
// =============================================================================

const ChartLoading: React.FC = () => (
  <div
    className="chart-block chart-block--loading"
    style={{ ...chartTheme, ...styles['container'], ...styles['loading'] }}
    data-testid="chart-loading"
  >
    <div style={styles['loadingSpinner']} />
    <span>Loading...</span>
  </div>
);

const ChartError: React.FC<{ error: Error }> = ({ error }) => (
  <div
    className="chart-block chart-block--error"
    style={{ ...chartTheme, ...styles['container'], ...styles['error'] }}
    data-testid="chart-error"
  >
    <span>Error: {error.message}</span>
  </div>
);

const ChartEmpty: React.FC = () => (
  <div
    className="chart-block chart-block--empty"
    style={{ ...chartTheme, ...styles['container'], ...styles['empty'] }}
    data-testid="chart-empty"
  >
    <span>No data to display</span>
  </div>
);

// =============================================================================
// LEGEND COMPONENT
// =============================================================================

interface LegendProps {
  readonly data: readonly ChartDataPoint[];
  readonly colors: readonly string[];
}

const Legend: React.FC<LegendProps> = ({ data, colors }) => (
  <div style={styles['legend']} data-testid="chart-legend">
    {data.map((item, i) => (
      <div key={item.label} style={styles['legendItem']}>
        <div
          style={{
            ...styles['legendColor'],
            backgroundColor: item.color ?? colors[i % colors.length],
          }}
        />
        <span>{item.label}</span>
      </div>
    ))}
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ChartBlock: React.FC<ChartBlockProps> = ({
  config,
  onEvent,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  // Get entity type from config (support both entityType and source)
  const entityType = config.entityType ?? config.source;

  // Fetch entities if entityType is provided
  const { data: entities, loading, error } = useQuery(entityType ?? '', {
    skip: !entityType,
  });

  // Calculate chart dimensions based on container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Use configured height or responsive height
        const height = config.height ?? Math.min(width * 0.6, 400);
        setDimensions({ width: Math.max(width - 32, 200), height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [config.height]);

  // Transform data for chart
  const chartData = useMemo<readonly ChartDataPoint[]>(() => {
    // Use static data if provided
    if (config.data && config.data.length > 0) {
      return config.data;
    }

    // Transform entities to chart data
    if (entities && entities.length > 0 && config.labelProperty) {
      return entitiesToChartData(
        entities,
        config.labelProperty,
        config.valueProperty,
        config.aggregate
      );
    }

    return [];
  }, [config.data, entities, config.labelProperty, config.valueProperty, config.aggregate]);

  // Emit dataLoaded event when data changes
  useEffect(() => {
    if (chartData.length > 0 && onEvent) {
      onEvent({ type: 'dataLoaded', data: chartData });
    }
  }, [chartData, onEvent]);

  // Emit error event
  useEffect(() => {
    if (error && onEvent) {
      onEvent({ type: 'error', error: new Error(error.message ?? 'Unknown error') });
    }
  }, [error, onEvent]);

  // Handle segment click
  const handleSegmentClick = useCallback(
    (dataPoint: ChartDataPoint, index: number) => {
      console.log('[ChartBlock] Segment clicked:', dataPoint, index);
      onEvent?.({ type: 'segmentClicked', dataPoint, index });
    },
    [onEvent]
  );

  // ==========================================================================
  // RENDER GUARDS (REQUIRED)
  // ==========================================================================

  // GUARD: Loading state (only if fetching from entity source)
  if (entityType && loading) {
    return <ChartLoading />;
  }

  // GUARD: Error state
  if (error) {
    return <ChartError error={new Error(error.message ?? 'Failed to load')} />;
  }

  // GUARD: Empty state
  if (chartData.length === 0) {
    return <ChartEmpty />;
  }

  // ==========================================================================
  // RENDER CHART
  // ==========================================================================

  const chartType = config.type ?? 'bar';
  const colors = config.colors ?? DEFAULT_COLORS;
  const showLegend = config.showLegend ?? false;
  const showGrid = config.showGrid ?? true;
  const title = config.title;

  const chartProps = {
    data: chartData,
    width: dimensions.width,
    height: dimensions.height,
    showGrid,
    colors,
    onSegmentClick: handleSegmentClick,
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return <BarChart {...chartProps} />;
      case 'line':
        return <LineChart {...chartProps} />;
      case 'area':
        return <AreaChart {...chartProps} />;
      case 'pie':
        return <PieChart {...chartProps} />;
      case 'doughnut':
        return <DoughnutChart {...chartProps} />;
      default:
        return <BarChart {...chartProps} />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`chart-block ${className ?? ''}`}
      style={{ ...chartTheme, ...styles['container'] }}
      data-testid="chart-block"
      data-chart-type={chartType}
    >
      {/* Header */}
      {title && (
        <div style={styles['header']}>
          <h3 style={styles['title']}>{title}</h3>
        </div>
      )}

      {/* Chart */}
      <div style={styles['chartArea']}>{renderChart()}</div>

      {/* Legend */}
      {showLegend && <Legend data={chartData} colors={colors} />}
    </div>
  );
};

export default ChartBlock;
