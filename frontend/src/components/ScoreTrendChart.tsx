import React, { useState, useRef, useEffect } from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
  Card,
  Button
} from '@fluentui/react-components';
import { ChartMultiple20Regular, Dismiss24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    position: 'relative',
    display: 'inline-block'
  },
  icon: {
    marginLeft: '4px',
    cursor: 'pointer',
    color: tokens.colorBrandForeground1,
    verticalAlign: 'middle',
    '&:hover': {
      color: tokens.colorBrandForeground2
    }
  },
  popover: {
    position: 'fixed',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow16,
    ...shorthands.padding('16px'),
    zIndex: 10000,
    minWidth: '500px',
    minHeight: '300px'
  },
  popoverHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  closeButton: {
    minWidth: 'auto'
  },
  chartTitle: {
    marginBottom: '12px',
    fontWeight: 600
  },
  chartCanvas: {
    width: '100%',
    height: '250px',
    position: 'relative'
  },
  svg: {
    width: '100%',
    height: '100%'
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    ...shorthands.padding('8px'),
    fontSize: '12px',
    pointerEvents: 'none',
    boxShadow: tokens.shadow8,
    zIndex: 10001,
    whiteSpace: 'nowrap'
  },
  legend: {
    display: 'flex',
    flexDirection: 'row',
    ...shorthands.gap('16px'),
    marginTop: '12px',
    fontSize: '12px',
    justifyContent: 'center'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px')
  },
  legendBox: {
    width: '12px',
    height: '12px',
    ...shorthands.borderRadius('2px')
  }
});

interface DataPoint {
  timestamp: string;
  score: number;
  run_key: string;
}

interface ScoreTrendChartProps {
  dataPoints: DataPoint[];
  thresholdLow: number | null;
  thresholdHigh: number | null;
  ruleName: string;
  outputName: string;
}

export const ScoreTrendChart: React.FC<ScoreTrendChartProps> = ({
  dataPoints,
  thresholdLow,
  thresholdHigh,
  ruleName,
  outputName
}) => {
  const styles = useStyles();
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        iconRef.current &&
        !iconRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover]);

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popoverWidth = 520;
      const popoverHeight = 350;

      // Calculate position to keep popover in viewport
      let left = rect.left;
      let top = rect.bottom + 5;

      // If popover would go off right edge, align to right of icon
      if (left + popoverWidth > viewportWidth) {
        left = viewportWidth - popoverWidth - 10;
      }

      // If popover would go off bottom, show above icon
      if (top + popoverHeight > viewportHeight) {
        top = rect.top - popoverHeight - 5;
      }

      setPopoverPosition({ top, left });
    }

    setShowPopover(!showPopover);
  };

  if (dataPoints.length === 0) {
    return null;
  }

  // Sort data points by timestamp
  const sortedData = [...dataPoints].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Chart dimensions
  const chartWidth = 480;
  const chartHeight = 220;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Y-axis: 0 to 100
  const yMin = 0;
  const yMax = 100;

  // X-axis scale
  const xScale = innerWidth / (sortedData.length - 1 || 1);

  // Y-axis scale
  const yScale = innerHeight / (yMax - yMin);

  // Convert data point to coordinates
  const getX = (index: number) => padding.left + index * xScale;
  const getY = (score: number) => padding.top + innerHeight - (score - yMin) * yScale;

  // Color bands
  const bands: Array<{ color: string; yStart: number; yEnd: number; label: string; range: string }> = [];

  // Red band: 0 to thresholdLow
  if (thresholdLow !== null) {
    bands.push({
      color: 'rgba(220, 38, 38, 0.25)', // Light red background
      yStart: getY(0),
      yEnd: getY(thresholdLow),
      label: 'Not Acceptable',
      range: `Min 0%, Max ${thresholdLow.toFixed(0)}%`
    });
  }

  // Yellow band: thresholdLow to thresholdHigh
  if (thresholdLow !== null && thresholdHigh !== null) {
    bands.push({
      color: 'rgba(255, 243, 205, 0.5)', // Light yellow
      yStart: getY(thresholdHigh),
      yEnd: getY(thresholdLow),
      label: 'Acceptable',
      range: `Min ${thresholdLow.toFixed(0)}%, Max ${thresholdHigh.toFixed(0)}%`
    });
  }

  // Green band: thresholdHigh to 100
  if (thresholdHigh !== null) {
    bands.push({
      color: 'rgba(212, 237, 218, 0.5)', // Light green
      yStart: getY(100),
      yEnd: getY(thresholdHigh),
      label: 'Good',
      range: `Min ${thresholdHigh.toFixed(0)}%, Max 100%`
    });
  }

  // Create path for line chart
  const linePath = sortedData
    .map((point, index) => {
      const x = getX(index);
      const y = getY(point.score);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Handle mouse over data point
  const handlePointMouseOver = (e: React.MouseEvent, point: DataPoint, index: number) => {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    const date = new Date(point.timestamp).toLocaleString();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      text: `Run ${point.run_key}\n${date}\nScore: ${point.score.toFixed(2)}%`
    });
  };

  const handlePointMouseOut = () => {
    setTooltip(null);
  };

  // Y-axis ticks
  const yTicks = [0, 25, 50, 75, 100];

  // X-axis ticks (show max 5 labels)
  const maxXLabels = 5;
  const xLabelInterval = Math.ceil(sortedData.length / maxXLabels);
  const xLabels = sortedData.filter((_, index) => index % xLabelInterval === 0 || index === sortedData.length - 1);

  return (
    <span className={styles.container}>
      <span ref={iconRef} onClick={handleIconClick} className={styles.icon}>
        <ChartMultiple20Regular />
      </span>

      {showPopover && (
        <div
          ref={popoverRef}
          className={styles.popover}
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`
          }}
        >
          <div className={styles.popoverHeader}>
            <Text className={styles.chartTitle}>
              Score Trend: {ruleName} / {outputName}
            </Text>
            <Button
              appearance="subtle"
              icon={<Dismiss24Regular />}
              onClick={() => setShowPopover(false)}
              className={styles.closeButton}
              aria-label="Close"
            />
          </div>

          <div className={styles.chartCanvas}>
            <svg className={styles.svg} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              {/* Color bands */}
              {bands.map((band, index) => {
                // SVG y-axis goes top to bottom, so we need to use the smaller y value as the top
                const rectY = Math.min(band.yStart, band.yEnd);
                const rectHeight = Math.abs(band.yEnd - band.yStart);
                return (
                  <rect
                    key={index}
                    x={padding.left}
                    y={rectY}
                    width={innerWidth}
                    height={rectHeight}
                    fill={band.color}
                  />
                );
              })}

              {/* Grid lines */}
              {yTicks.map((tick) => (
                <line
                  key={tick}
                  x1={padding.left}
                  y1={getY(tick)}
                  x2={padding.left + innerWidth}
                  y2={getY(tick)}
                  stroke={tokens.colorNeutralStroke2}
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
              ))}

              {/* Y-axis */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={padding.top + innerHeight}
                stroke={tokens.colorNeutralStroke1}
                strokeWidth="2"
              />

              {/* X-axis */}
              <line
                x1={padding.left}
                y1={padding.top + innerHeight}
                x2={padding.left + innerWidth}
                y2={padding.top + innerHeight}
                stroke={tokens.colorNeutralStroke1}
                strokeWidth="2"
              />

              {/* Y-axis labels */}
              {yTicks.map((tick) => (
                <text
                  key={tick}
                  x={padding.left - 10}
                  y={getY(tick) + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill={tokens.colorNeutralForeground2}
                >
                  {tick}
                </text>
              ))}

              {/* X-axis labels */}
              {xLabels.map((point, labelIndex) => {
                const dataIndex = sortedData.indexOf(point);
                const date = new Date(point.timestamp);
                const label = `${date.getMonth() + 1}/${date.getDate()}`;
                return (
                  <text
                    key={labelIndex}
                    x={getX(dataIndex)}
                    y={padding.top + innerHeight + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fill={tokens.colorNeutralForeground2}
                  >
                    {label}
                  </text>
                );
              })}

              {/* Line path */}
              <path
                d={linePath}
                fill="none"
                stroke={tokens.colorBrandForeground1}
                strokeWidth="2"
              />

              {/* Data points */}
              {sortedData.map((point, index) => (
                <circle
                  key={index}
                  cx={getX(index)}
                  cy={getY(point.score)}
                  r="4"
                  fill={tokens.colorBrandBackground}
                  stroke="#fff"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseOver={(e) => handlePointMouseOver(e, point, index)}
                  onMouseOut={handlePointMouseOut}
                />
              ))}
            </svg>

            {/* Tooltip */}
            {tooltip && (
              <div
                className={styles.tooltip}
                style={{
                  top: `${tooltip.y}px`,
                  left: `${tooltip.x}px`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                {tooltip.text.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            {bands.map((band, index) => (
              <div key={index} className={styles.legendItem}>
                <div
                  className={styles.legendBox}
                  style={{ backgroundColor: band.color.replace(/0\.\d+/, '0.9') }}
                />
                <span>
                  {band.label} ({band.range})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
};
