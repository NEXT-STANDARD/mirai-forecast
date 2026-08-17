import React, { useState, useRef } from 'react';

interface ChartPoint {
  date: string;
  prob: number;
  eventNote?: string;
}

interface TrendChartProps {
  currentProb: number;
  isPositive: boolean;
  history?: ChartPoint[];
}

export const TrendChart: React.FC<TrendChartProps> = ({
  currentProb,
  isPositive,
  history,
}) => {
  const defaultHistory: ChartPoint[] = [
    { date: '8/01', prob: Math.max(5, currentProb - (isPositive ? 25 : -20)) },
    { date: '8/05', prob: Math.max(5, currentProb - (isPositive ? 18 : -15)) },
    { date: '8/09', prob: Math.max(5, currentProb - (isPositive ? 22 : -10)), eventNote: '主要メディア報道' },
    { date: '8/12', prob: Math.max(5, currentProb - (isPositive ? 12 : -8)) },
    { date: '8/15', prob: Math.max(5, currentProb - (isPositive ? 5 : -4)), eventNote: '大口資金の流入検知' },
    { date: '8/17 (現在)', prob: currentProb },
  ];

  const data = history || defaultHistory;
  const [selectedIndex, setSelectedIndex] = useState<number>(data.length - 1);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 460;
  const height = 120;
  const paddingX = 24;
  const paddingY = 16;

  const minProb = 0;
  const maxProb = 100;

  const getX = (index: number) => paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
  const getY = (prob: number) => height - paddingY - ((prob - minProb) / (maxProb - minProb)) * (height - paddingY * 2);

  const points = data.map((d, i) => `${getX(i)},${getY(d.prob)}`).join(' ');
  const areaPath = `${points} L ${getX(data.length - 1)},${height - paddingY} L ${getX(0)},${height - paddingY} Z`;

  const lineColor = isPositive ? '#38bdf8' : '#f43f5e';

  // タッチ / スワイプによるインデックス選択
  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const clientX = touch.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const closestIndex = Math.round(ratio * (data.length - 1));
    setSelectedIndex(closestIndex);
  };

  const selectedPoint = data[selectedIndex] || data[data.length - 1];

  return (
    <div className="trend-chart-container">
      <div className="chart-header-row">
        <span className="chart-title">📈 確率の推移</span>
        <div className="chart-active-display">
          <span className="active-date">{selectedPoint.date}:</span>
          <strong className={`active-val ${isPositive ? 'pos' : 'neg'}`}>
            {selectedPoint.prob}%
          </strong>
          {selectedPoint.eventNote && (
            <span className="active-note"> ★ {selectedPoint.eventNote}</span>
          )}
        </div>
      </div>

      <div className="svg-wrapper">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="trend-svg touch-active"
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
        >
          <defs>
            <linearGradient id={`grad-${isPositive ? 'pos' : 'neg'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 基準グリッド線 */}
          <line x1={paddingX} y1={getY(50)} x2={width - paddingX} y2={getY(50)} stroke="#26334d" strokeDasharray="3 3" />

          {/* エリアグラデーション */}
          <polygon points={areaPath} fill={`url(#grad-${isPositive ? 'pos' : 'neg'})`} />

          {/* 折れ線 */}
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* アクティブライン（縦線） */}
          <line
            x1={getX(selectedIndex)}
            y1={paddingY}
            x2={getX(selectedIndex)}
            y2={height - paddingY}
            stroke="rgba(255, 255, 255, 0.4)"
            strokeDasharray="2 2"
          />

          {/* データポイント */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.prob);
            const isSelected = selectedIndex === i;

            return (
              <g key={i} onClick={() => setSelectedIndex(i)}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 6.5 : d.eventNote ? 4.5 : 3.5}
                  fill={isSelected ? '#fff' : d.eventNote ? '#fbbf24' : lineColor}
                  stroke={lineColor}
                  strokeWidth="2"
                  className="chart-circle"
                />
                {d.eventNote && (
                  <text
                    x={cx}
                    y={cy - 9}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#fbbf24"
                    fontWeight="bold"
                  >
                    ★
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="chart-x-labels">
        <span>{data[0].date}</span>
        <span className="tap-hint">タップまたはなぞって過去の確率を確認</span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
};
