import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface ChartPoint {
  date: string;
  prob: number;
  volume: number;
  eventNote?: string;
}

interface TerminalChartProps {
  currentProb: number;
  isPositive: boolean;
  probChange24h: number;
  totalVolumeUsd: number;
}

export const TerminalChart: React.FC<TerminalChartProps> = ({
  currentProb,
  isPositive,
  probChange24h,
  totalVolumeUsd,
}) => {
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D' | 'ALL'>('30D');

  const data: ChartPoint[] = [
    { date: '08/01', prob: Math.max(10, currentProb - 25), volume: 45000 },
    { date: '08/04', prob: Math.max(10, currentProb - 18), volume: 78000 },
    { date: '08/07', prob: Math.max(10, currentProb - 22), volume: 120000, eventNote: '主要メディア報道' },
    { date: '08/10', prob: Math.max(10, currentProb - 12), volume: 89000 },
    { date: '08/13', prob: Math.max(10, currentProb - 15), volume: 64000 },
    { date: '08/15', prob: Math.max(10, currentProb - 5), volume: 210000, eventNote: '大口資金の買い流入' },
    { date: '08/17 (現在)', prob: currentProb, volume: 145000 },
  ];

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activePoint = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  const width = 580;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;

  const maxVol = Math.max(...data.map(d => d.volume));

  const getX = (idx: number) => paddingLeft + (idx / (data.length - 1)) * chartWidth;
  const getY = (prob: number) => paddingTop + chartHeight - (prob / 100) * chartHeight;
  const getVolY = (vol: number) => height - paddingBottom - (vol / maxVol) * 35;

  const points = data.map((d, i) => `${getX(i)},${getY(d.prob)}`).join(' ');
  const areaPath = `${points} L ${getX(data.length - 1)},${paddingTop + chartHeight} L ${getX(0)},${paddingTop + chartHeight} Z`;

  const lineColor = isPositive ? '#38bdf8' : '#f43f5e';

  return (
    <div className="terminal-chart-wrapper">
      {/* チャート上部：銘柄指標バー */}
      <div className="terminal-metric-bar">
        <div className="metric-col">
          <span className="metric-title">現在オッズ (YES)</span>
          <div className="metric-val-row">
            <span className="live-prob">{activePoint.prob}%</span>
            <span className={`badge-24h ${isPositive ? 'up' : 'down'}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? `+${probChange24h}%` : `${probChange24h}%`}
            </span>
          </div>
        </div>

        <div className="metric-col">
          <span className="metric-title">24hレンジ</span>
          <span className="metric-sub-val">
            L: {Math.max(5, currentProb - 8)}% - H: {Math.min(99, currentProb + 6)}%
          </span>
        </div>

        <div className="metric-col">
          <span className="metric-title">総観測ボリューム</span>
          <span className="metric-sub-val">${Math.round(totalVolumeUsd / 1000).toLocaleString()}k</span>
        </div>

        {/* 期間切替 */}
        <div className="timeframe-buttons">
          {(['24H', '7D', '30D', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`tf-btn ${timeframe === tf ? 'active' : ''}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG インタラクティブチャート */}
      <div className="svg-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="terminal-svg"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="termGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 横グリッド線 (25%, 50%, 75%) */}
          {[25, 50, 75].map((level) => (
            <g key={level}>
              <line
                x1={paddingLeft}
                y1={getY(level)}
                x2={width - paddingRight}
                y2={getY(level)}
                stroke="#1e293b"
                strokeDasharray="2 3"
              />
              <text
                x={paddingLeft - 6}
                y={getY(level) + 3}
                fontSize="9"
                fill="#64748b"
                textAnchor="end"
              >
                {level}%
              </text>
            </g>
          ))}

          {/* 出来高ヒストグラム（下部バー） */}
          {data.map((d, i) => {
            const bx = getX(i) - 6;
            const by = getVolY(d.volume);
            const bh = height - paddingBottom - by;
            return (
              <rect
                key={`vol-${i}`}
                x={bx}
                y={by}
                width="12"
                height={bh}
                fill={hoverIndex === i ? '#38bdf8' : '#1e3a8a'}
                opacity={hoverIndex === i ? 0.6 : 0.3}
                rx="2"
              />
            );
          })}

          {/* 面積グラデーション */}
          <polygon points={areaPath} fill="url(#termGrad)" />

          {/* メイン折れ線 */}
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* 十字線（Crosshair） */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={paddingTop}
                x2={getX(hoverIndex)}
                y2={height - paddingBottom}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
              <line
                x1={paddingLeft}
                y1={getY(data[hoverIndex].prob)}
                x2={width - paddingRight}
                y2={getY(data[hoverIndex].prob)}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
            </g>
          )}

          {/* 各ポイント */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.prob);
            const isHovered = hoverIndex === i;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoverIndex(i)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6.5 : d.eventNote ? 4.5 : 3.5}
                  fill={d.eventNote ? '#fbbf24' : isHovered ? '#fff' : lineColor}
                  stroke="#0b0f17"
                  strokeWidth="2"
                />
                {d.eventNote && (
                  <text
                    x={cx}
                    y={cy - 9}
                    textAnchor="middle"
                    fontSize="10"
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

      {/* アクティブポイント情報 */}
      <div className="terminal-chart-footer">
        <div className="footer-date-info">
          <Calendar size={13} />
          <span>{activePoint.date}</span>
          {activePoint.eventNote && (
            <span className="event-note-pill">
              ★ {activePoint.eventNote}
            </span>
          )}
        </div>
        <div className="footer-legend">
          <span className="legend-item"><span className="dot blue"></span> 確率推移</span>
          <span className="legend-item"><span className="dot bar"></span> 取引ボリューム</span>
        </div>
      </div>
    </div>
  );
};
