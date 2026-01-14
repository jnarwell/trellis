/**
 * Trellis LineChart Component
 *
 * SVG-based line chart for data visualization.
 */

import React, { useState, useMemo } from 'react';
import type { ChartComponentProps, ChartDataPoint } from './types.js';
import { DEFAULT_COLORS, styles } from './styles.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
const POINT_RADIUS = 4;

// =============================================================================
// COMPONENT
// =============================================================================

export const LineChart: React.FC<ChartComponentProps> = ({
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

  // Calculate scales and points
  const { maxValue, yTicks, points, linePath } = useMemo(() => {
    if (data.length === 0) {
      return { maxValue: 0, yTicks: [], points: [], linePath: '' };
    }

    const max = Math.max(...data.map((d) => d.value), 0);
    const roundedMax = Math.ceil(max / 10) * 10 || 10;

    // Generate Y-axis ticks
    const tickCount = 5;
    const tickStep = roundedMax / tickCount;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * tickStep);

    // Calculate point positions
    const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;
    const pointData = data.map((d, i) => {
      const x = PADDING.left + (data.length > 1 ? i * stepX : stepX);
      const y = PADDING.top + chartHeight - (d.value / roundedMax) * chartHeight;
      const color = d.color ?? colors[0];

      return { ...d, x, y, color, index: i };
    });

    // Generate SVG path
    const path =
      pointData.length > 0
        ? pointData
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ')
        : '';

    return { maxValue: roundedMax, yTicks: ticks, points: pointData, linePath: path };
  }, [data, chartWidth, chartHeight, colors]);

  // Generate area path for area chart variant
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    if (!lastPoint || !firstPoint) return '';

    const bottomY = PADDING.top + chartHeight;
    return `${linePath} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`;
  }, [linePath, points, chartHeight]);

  const handleMouseEnter = (
    e: React.MouseEvent<SVGCircleElement>,
    index: number
  ) => {
    setHoveredIndex(index);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGCircleElement>) => {
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

  const lineColor = colors[0];

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        style={styles['svg']}
        data-testid="line-chart"
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

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((point) => (
          <g key={`point-${point.index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === point.index ? POINT_RADIUS + 2 : POINT_RADIUS}
              fill={lineColor}
              stroke="#ffffff"
              strokeWidth={2}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
              onMouseEnter={(e) => handleMouseEnter(e, point.index)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={() => {
                const p = data[point.index];
                if (p) handleClick(p, point.index);
              }}
              data-testid={`point-${point.index}`}
            />
            {/* X-axis label */}
            <text
              x={point.x}
              y={PADDING.top + chartHeight + 16}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {point.label.length > 8 ? `${point.label.slice(0, 8)}...` : point.label}
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

/**
 * Area chart variant of LineChart.
 */
export const AreaChart: React.FC<ChartComponentProps> = (props) => {
  const { data, width, height, showGrid = true, colors = DEFAULT_COLORS, onSegmentClick } = props;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  const { maxValue, yTicks, points, linePath, areaPath } = useMemo(() => {
    if (data.length === 0) {
      return { maxValue: 0, yTicks: [], points: [], linePath: '', areaPath: '' };
    }

    const max = Math.max(...data.map((d) => d.value), 0);
    const roundedMax = Math.ceil(max / 10) * 10 || 10;

    const tickCount = 5;
    const tickStep = roundedMax / tickCount;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * tickStep);

    const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;
    const pointData = data.map((d, i) => {
      const x = PADDING.left + (data.length > 1 ? i * stepX : stepX);
      const y = PADDING.top + chartHeight - (d.value / roundedMax) * chartHeight;
      const color = d.color ?? colors[0];
      return { ...d, x, y, color, index: i };
    });

    const path = pointData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const bottomY = PADDING.top + chartHeight;
    const lastPt = pointData[pointData.length - 1];
    const firstPt = pointData[0];
    const area = lastPt && firstPt ? `${path} L ${lastPt.x} ${bottomY} L ${firstPt.x} ${bottomY} Z` : '';

    return { maxValue: roundedMax, yTicks: ticks, points: pointData, linePath: path, areaPath: area };
  }, [data, chartWidth, chartHeight, colors]);

  if (data.length === 0) return null;

  const lineColor = colors[0];

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height} style={styles['svg']} data-testid="area-chart">
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

        <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + chartHeight} stroke="#9ca3af" />
        {yTicks.map((tick, i) => {
          const y = PADDING.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <text key={`y-label-${i}`} x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
              {tick}
            </text>
          );
        })}
        <line x1={PADDING.left} y1={PADDING.top + chartHeight} x2={PADDING.left + chartWidth} y2={PADDING.top + chartHeight} stroke="#9ca3af" />

        {/* Area fill */}
        <path d={areaPath} fill={lineColor} opacity={0.2} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {points.map((point) => (
          <g key={`point-${point.index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === point.index ? POINT_RADIUS + 2 : POINT_RADIUS}
              fill={lineColor}
              stroke="#ffffff"
              strokeWidth={2}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
              onMouseEnter={(e) => {
                setHoveredIndex(point.index);
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                const p = data[point.index];
                if (p) onSegmentClick?.(p, point.index);
              }}
              data-testid={`point-${point.index}`}
            />
            <text x={point.x} y={PADDING.top + chartHeight + 16} textAnchor="middle" fontSize="11" fill="#6b7280">
              {point.label.length > 8 ? `${point.label.slice(0, 8)}...` : point.label}
            </text>
          </g>
        ))}
      </svg>

      {hoveredIndex !== null && data[hoveredIndex] && (
        <div style={{ ...styles['tooltip'], left: tooltipPos.x + 10, top: tooltipPos.y - 30 }} data-testid="chart-tooltip">
          <strong>{data[hoveredIndex]?.label}</strong>: {data[hoveredIndex]?.value}
        </div>
      )}
    </div>
  );
};

export default LineChart;
