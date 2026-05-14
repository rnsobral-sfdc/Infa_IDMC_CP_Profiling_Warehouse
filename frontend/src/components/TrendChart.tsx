import React from 'react';

interface DataPoint {
  x: string | number;
  y: number;
  label?: string;
}

interface TrendChartProps {
  data: DataPoint[];
  title: string;
  xLabel?: string;
  yLabel?: string;
  height?: number;
}

export default function TrendChart({ data, title, xLabel, yLabel, height = 200 }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-12">No data available</div>
      </div>
    );
  }

  const maxY = Math.max(...data.map(d => d.y));
  const minY = Math.min(...data.map(d => d.y));
  const range = maxY - minY || 1;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((point.y - minY) / range) * 100;
    return { x, y, original: point };
  });

  const pathData = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          ))}

          {/* Trend line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill="#3b82f6"
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${point.original.label || point.original.x}: ${point.original.y}`}</title>
            </circle>
          ))}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-2" style={{ width: '40px', marginLeft: '-45px' }}>
          <span>{maxY.toFixed(2)}</span>
          <span>{((maxY + minY) / 2).toFixed(2)}</span>
          <span>{minY.toFixed(2)}</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{data[0].label || data[0].x}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)].label || data[Math.floor(data.length / 2)].x}</span>}
        <span>{data[data.length - 1].label || data[data.length - 1].x}</span>
      </div>

      {xLabel && <div className="text-center text-sm text-gray-600 mt-2">{xLabel}</div>}
    </div>
  );
}
