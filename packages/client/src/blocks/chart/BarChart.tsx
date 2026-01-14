/**
 * Trellis BarChart Component
 *
 * SVG-based bar chart for data visualization.
 */

import React, { useState, useMemo } from 'react';
import type { ChartComponentProps, ChartDataPoint } from './types.js';
import { DEFAULT_COLORS, styles } from './styles.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
const BAR_GAP = 0.2; // Gap between bars as fraction of bar width

// =============================================================================
// COMPONENT
// =============================================================================

export const BarChart: React.FC<ChartComponentProps> = ({
  data,
  width,
  height,
  showGrid = true,
  colors = DEFAULT_COLORS,
  onSegmentClick,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Calculate chart dimensions
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // Calculate scales
  const { maxValue, yTicks, barWidth, bars } = useMemo(() => {
    if (data.length === 0) {
      return { maxValue: 0, yTicks: [], barWidth: 0, bars: [] };
    }

    const max = Math.max(...data.map((d) => d.value), 0);
    const roundedMax = Math.ceil(max / 10) * 10 || 10;

    // Generate Y-axis ticks
    const tickCount = 5;
    const tickStep = roundedMax / tickCount;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * tickStep);

    // Calculate bar dimensions
    const totalBars = data.length;
    const availableWidth = chartWidth / totalBars;
    const barW = availableWidth * (1 - BAR_GAP);
    const gap = availableWidth * BAR_GAP;

    // Calculate bar positions
    const barData = data.map((d, i) => {
      const barHeight = (d.value / roundedMax) * chartHeight;
      const x = PADDING.left + i * availableWidth + gap / 2;
      const y = PADDING.top + chartHeight - barHeight;
      const color = d.color ?? colors[i % colors.length];

      return { ...d, x, y, width: barW, height: barHeight, color, index: i };
    });

    return { maxValue: roundedMax, yTicks: ticks, barWidth: barW, bars: barData };
  }, [data, chartWidth, chartHeight, colors]);

  const handleMouseEnter = (
    e: React.MouseEvent<SVGRectElement>,
    index: number
  ) => {
    setHoveredIndex(index);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
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
        data-testid="bar-chart"
      >
        {/* Grid lines */}
        {showGrid &&
          yTicks.map((tick, i) => {
            const y = PADDING.top + chartHeight - (tick / maxValue) * chartHeight;
            return (
              <line
                key={`grid-${i}`}
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + chartWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4,4"
              />
            );
          })}

        {/* Y-axis */}
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={PADDING.top + chartHeight}
          stroke="#9ca3af"
        />

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => {
          const y = PADDING.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <text
              key={`y-label-${i}`}
              x={PADDING.left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#6b7280"
            >
              {tick}
            </text>
          );
        })}

        {/* X-axis */}
        <line
          x1={PADDING.left}
          y1={PADDING.top + chartHeight}
          x2={PADDING.left + chartWidth}
          y2={PADDING.top + chartHeight}
          stroke="#9ca3af"
        />

        {/* Bars */}
        {bars.map((bar) => (
          <g key={`bar-${bar.index}`}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={bar.color}
              opacity={hoveredIndex === bar.index ? 0.8 : 1}
              rx={2}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
              onMouseEnter={(e) => handleMouseEnter(e, bar.index)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={() => {
                const point = data[bar.index];
                if (point) handleClick(point, bar.index);
              }}
              data-testid={`bar-${bar.index}`}
            />
            {/* X-axis label */}
            <text
              x={bar.x + bar.width / 2}
              y={PADDING.top + chartHeight + 16}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {bar.label.length > 10 ? `${bar.label.slice(0, 10)}...` : bar.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div
          style={{
            ...styles['tooltip'],
            left: tooltipPos.x + 10,
            top: tooltipPos.y - 30,
          }}
          data-testid="chart-tooltip"
        >
          <strong>{data[hoveredIndex]?.label}</strong>: {data[hoveredIndex]?.value}
        </div>
      )}
    </div>
  );
};

export default BarChart;
