import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { ThreeRadar } from './ThreeRadar';
import { TrendingUp, TrendingDown, Radio, Sparkles, BarChart2 } from 'lucide-react';

interface MainTradingChartProps {
  event: MarketItem;
  events: MarketItem[];
  onSelectEvent: (event: MarketItem) => void;
}

interface ChartPoint {
  time: string;
  prob: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  note?: string;
}

export const MainTradingChart: React.FC<MainTradingChartProps> = ({
  event,
  events,
  onSelectEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'radar'>('chart');
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '7D' | '30D' | 'ALL'>('30D');

  const isPositive = event.probChange24h >= 0;

  // OHLC + Volume 時系列データ
  const data: ChartPoint[] = [
    { time: '08/01', prob: Math.max(8, event.worldProbYes - 24), open: event.worldProbYes - 26, high: event.worldProbYes - 20, low: event.worldProbYes - 28, close: event.worldProbYes - 24, vol: 45000 },
    { time: '08/04', prob: Math.max(8, event.worldProbYes - 18), open: event.worldProbYes - 24, high: event.worldProbYes - 15, low: event.worldProbYes - 25, close: event.worldProbYes - 18, vol: 78000 },
    { time: '08/07', prob: Math.max(8, event.worldProbYes - 22), open: event.worldProbYes - 18, high: event.worldProbYes - 16, low: event.worldProbYes - 24, close: event.worldProbYes - 22, vol: 140000, note: '主要メディア報道' },
    { time: '08/10', prob: Math.max(8, event.worldProbYes - 12), open: event.worldProbYes - 22, high: event.worldProbYes - 10, low: event.worldProbYes - 23, close: event.worldProbYes - 12, vol: 92000 },
    { time: '08/13', prob: Math.max(8, event.worldProbYes - 15), open: event.worldProbYes - 12, high: event.worldProbYes - 11, low: event.worldProbYes - 16, close: event.worldProbYes - 15, vol: 64000 },
    { time: '08/15', prob: Math.max(8, event.worldProbYes - 4), open: event.worldProbYes - 15, high: event.worldProbYes - 2, low: event.worldProbYes - 16, close: event.worldProbYes - 4, vol: 240000, note: '大口スマートマネー買い流入' },
    { time: '08/17 (現在)', prob: event.worldProbYes, open: event.worldProbYes - 4, high: Math.min(99, event.worldProbYes + 5), low: Math.max(1, event.worldProbYes - 5), close: event.worldProbYes, vol: 185000 },
  ];

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activePoint = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  const width = 640;
  const height = 240;
  const paddingL = 40;
  const paddingR = 25;
  const paddingT = 20;
  const paddingB = 45;

  const chartW = width - paddingL - paddingR;
  const chartH = height - paddingT - paddingB;

  const maxVol = Math.max(...data.map(d => d.vol));

  const getX = (idx: number) => paddingL + (idx / (data.length - 1)) * chartW;
  const getY = (val: number) => paddingT + chartH - (val / 100) * chartH;
  const getVolY = (vol: number) => height - paddingB - (vol / maxVol) * 45;

  const points = data.map((d, i) => `${getX(i)},${getY(d.prob)}`).join(' ');

  const lineColor = isPositive ? '#38bdf8' : '#f43f5e';

  return (
    <div className="terminal-pane main-chart-pane">
      {/* 銘柄ヘッダー ＆ タブ切替 */}
      <div className="main-chart-top-bar">
        <div className="symbol-info">
          <div className="symbol-title-row">
            <span className="ticker-code">POLY:{event.slug.slice(0, 10).toUpperCase()}</span>
            <span className="category-badge">{event.categoryLabel}</span>
          </div>
          <h2 className="event-main-title">{event.titleJa}</h2>
        </div>

        {/* チャート / 3Dレーダー 切替 */}
        <div className="view-mode-tabs">
          <button
            onClick={() => setActiveTab('chart')}
            className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
          >
            <BarChart2 size={14} />
            <span>価格・出来高チャート</span>
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`tab-btn ${activeTab === 'radar' ? 'active' : ''}`}
          >
            <Radio size={14} />
            <span>3D SmartRadar</span>
          </button>
        </div>
      </div>

      {activeTab === 'chart' ? (
        <div className="tradingview-chart-box">
          {/* 金融ターミナル指標バー */}
          <div className="tv-metric-strip">
            <div className="tv-metric">
              <span className="label">YES 確率</span>
              <div className="val-group">
                <span className="prob-big">{activePoint.prob}%</span>
                <span className={`pill-24h ${isPositive ? 'up' : 'down'}`}>
                  {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {isPositive ? `+${event.probChange24h}%` : `${event.probChange24h}%`}
                </span>
              </div>
            </div>

            <div className="tv-metric">
              <span className="label">始値 (Open)</span>
              <span className="val-mono">{activePoint.open}%</span>
            </div>
            <div className="tv-metric">
              <span className="label">高値 (High)</span>
              <span className="val-mono pos">{activePoint.high}%</span>
            </div>
            <div className="tv-metric">
              <span className="label">安値 (Low)</span>
              <span className="val-mono neg">{activePoint.low}%</span>
            </div>
            <div className="tv-metric">
              <span className="label">出来高 (Vol)</span>
              <span className="val-mono">${Math.round(activePoint.vol / 1000).toLocaleString()}k</span>
            </div>

            {/* 時間軸ボタン */}
            <div className="tv-timeframes">
              {(['1H', '24H', '7D', '30D', 'ALL'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`tf-button ${timeframe === tf ? 'active' : ''}`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* SVG チャート領域 */}
          <div className="tv-svg-wrap">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="tv-svg"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="mainChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* 水平グリッド */}
              {[25, 50, 75].map((lvl) => (
                <g key={lvl}>
                  <line
                    x1={paddingL}
                    y1={getY(lvl)}
                    x2={width - paddingR}
                    y2={getY(lvl)}
                    stroke="#1a2438"
                    strokeDasharray="2 4"
                  />
                  <text
                    x={paddingL - 6}
                    y={getY(lvl) + 3}
                    fontSize="9"
                    fill="#475569"
                    textAnchor="end"
                  >
                    {lvl}%
                  </text>
                </g>
              ))}

              {/* 出来高ヒストグラム */}
              {data.map((d, i) => {
                const bx = getX(i) - 8;
                const by = getVolY(d.vol);
                const bh = height - paddingB - by;
                return (
                  <rect
                    key={`vol-${i}`}
                    x={bx}
                    y={by}
                    width="16"
                    height={bh}
                    fill={hoverIndex === i ? '#38bdf8' : '#1e3a8a'}
                    opacity={hoverIndex === i ? 0.65 : 0.3}
                    rx="1"
                  />
                );
              })}

              {/* エリア面 */}
              <path
                d={`M ${getX(0)},${getY(data[0].prob)} ${data.map((d, i) => `L ${getX(i)},${getY(d.prob)}`).join(' ')} L ${getX(data.length - 1)},${paddingT + chartH} L ${getX(0)},${paddingT + chartH} Z`}
                fill="url(#mainChartGrad)"
              />

              {/* 折れ線 */}
              <polyline
                fill="none"
                stroke={lineColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />

              {/* 十字線 (Crosshair) */}
              {hoverIndex !== null && (
                <g>
                  <line
                    x1={getX(hoverIndex)}
                    y1={paddingT}
                    x2={getX(hoverIndex)}
                    y2={height - paddingB}
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={paddingL}
                    y1={getY(data[hoverIndex].prob)}
                    x2={width - paddingR}
                    y2={getY(data[hoverIndex].prob)}
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                  />
                </g>
              )}

              {/* ポイント */}
              {data.map((d, i) => {
                const cx = getX(i);
                const cy = getY(d.prob);
                const isH = hoverIndex === i;

                return (
                  <g key={i} onMouseEnter={() => setHoverIndex(i)} style={{ cursor: 'crosshair' }}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isH ? 6.5 : d.note ? 4.5 : 3.5}
                      fill={d.note ? '#fbbf24' : isH ? '#fff' : lineColor}
                      stroke="#070a12"
                      strokeWidth="2"
                    />
                    {d.note && (
                      <text x={cx} y={cy - 9} textAnchor="middle" fontSize="10" fill="#fbbf24" fontWeight="bold">
                        ★
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* チャート下部フッター */}
          <div className="tv-chart-footer">
            <div className="footer-status">
              <span className="live-pill">● REALTIME MARKET FEED</span>
              {activePoint.note && (
                <span className="catalyst-note-pill">
                  💡 {activePoint.time}: {activePoint.note}
                </span>
              )}
            </div>
            <div className="footer-legends">
              <span className="legend"><span className="dot blue"></span> 確率推移線</span>
              <span className="legend"><span className="dot bar"></span> 出来高 (Volume)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="tradingview-radar-box">
          <ThreeRadar events={events} onSelectEvent={onSelectEvent} />
        </div>
      )}

      {/* Gemini AI 要因速報フィード */}
      {event.aiInsight && (
        <div className="ai-catalyst-terminal-box">
          <div className="ai-box-head">
            <div className="head-title">
              <Sparkles size={14} className="icon-blue" />
              <span>AI 変動要因＆カタリスト分析（Gemini 3.6 Flash）</span>
            </div>
            <span className="urgency-tag high">重要度: HIGH</span>
          </div>
          <p className="ai-box-summary">{event.aiInsight.summaryJa}</p>
          <div className="ai-box-why">
            <span className="why-lbl">なぜ動いているか:</span> {event.aiInsight.whyMovedJa}
          </div>
        </div>
      )}
    </div>
  );
};
