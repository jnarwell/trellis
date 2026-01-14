/**
 * Trellis PieChart Component
 *
 * SVG-based pie/doughnut chart for data visualization.
 */

import React, { useState, useMemo } from 'react';
import type { ChartComponentProps, ChartDataPoint } from './types.js';
import { DEFAULT_COLORS, styles } from './styles.js';

// =============================================================================
// TYPES
// =============================================================================

interface PieChartProps extends ChartComponentProps {
  /** Inner radius ratio for doughnut chart (0-1, 0 = pie, >0 = doughnut) */
  readonly innerRadius?: number;
}

interface SliceData {
  readonly dataPoint: ChartDataPoint;
  readonly index: number;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly color: string;
  readonly path: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly percentage: number;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert polar coordinates to Cartesian.
 */
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInRadians: number
): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

/**
 * Generate SVG arc path.
 */
function describeArc(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const startOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  if (innerRadius === 0) {
    // Pie slice (triangle-like with arc)
    return [
      `M ${cx} ${cy}`,
      `L ${startOuter.x} ${startOuter.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
      'Z',
    ].join(' ');
  }

  // Doughnut slice
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PieChart: React.FC<PieChartProps> = ({
  data,
  width,
  height,
  colors = DEFAULT_COLORS,
  innerRadius = 0,
  onSegmentClick,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Calculate chart dimensions
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 10;
  const innerR = outerRadius * innerRadius;

  // Calculate slices
  const slices = useMemo<SliceData[]>(() => {
    if (data.length === 0) return [];

    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return [];

    const sliceData: SliceData[] = [];
    let currentAngle = -Math.PI / 2; // Start at top

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (!d) continue;
      const percentage = (d.value / total) * 100;
      const sliceAngle = (d.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      // Calculate label position (middle of slice, at 70% radius)
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = outerRadius * 0.7;
      const { x: labelX, y: labelY } = polarToCartesian(cx, cy, labelRadius, midAngle);

      const path = describeArc(cx, cy, outerRadius, innerR, startAngle, endAngle);
      const color = d.color ?? colors[i % colors.length] ?? '#3b82f6';

      sliceData.push({
        dataPoint: d,
        index: i,
        startAngle,
        endAngle,
        color,
        path,
        labelX,
        labelY,
        percentage,
      });

      currentAngle = endAngle;
    }

    return sliceData;
  }, [data, cx, cy, outerRadius, innerR, colors]);

  const handleMouseEnter = (
    e: React.MouseEvent<SVGPathElement>,
    index: number
  ) => {
    setHoveredIndex(index);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const handleClick = (dataPoint: ChartDataPoint, index: number) => {
    onSegmentClick?.(dataPoint, index);
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        style={styles['svg']}
        data-testid={innerRadius > 0 ? 'doughnut-chart' : 'pie-chart'}
      >
        {slices.map((slice) => (
          <path
            key={`slice-${slice.index}`}
            d={slice.path}
            fill={slice.color}
            stroke="#ffffff"
            strokeWidth={2}
            opacity={hoveredIndex === slice.index ? 0.8 : 1}
            style={{
              cursor: onSegmentClick ? 'pointer' : 'default',
              transform: hoveredIndex === slice.index ? 'scale(1.02)' : 'scale(1)',
              transformOrigin: `${cx}px ${cy}px`,
              transition: 'transform 0.1s ease-out',
            }}
            onMouseEnter={(e) => handleMouseEnter(e, slice.index)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(slice.dataPoint, slice.index)}
            data-testid={`slice-${slice.index}`}
          />
        ))}

        {/* Center hole for doughnut */}
        {innerRadius > 0 && (
          <circle cx={cx} cy={cy} r={innerR} fill="var(--chart-bg, #ffffff)" />
        )}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && slices[hoveredIndex] && (
        <div
          style={{
            ...styles['tooltip'],
            left: tooltipPos.x + 10,
            top: tooltipPos.y - 30,
          }}
          data-testid="chart-tooltip"
        >
          <strong>{slices[hoveredIndex]?.dataPoint.label}</strong>:{' '}
          {slices[hoveredIndex]?.dataPoint.value} (
          {slices[hoveredIndex]?.percentage.toFixed(1)}%)
        </div>
      )}
    </div>
  );
};

/**
 * Doughnut chart variant.
 */
export const DoughnutChart: React.FC<ChartComponentProps> = (props) => {
  return <PieChart {...props} innerRadius={0.6} />;
};

export default PieChart;
