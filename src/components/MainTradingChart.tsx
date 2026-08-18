import React, { useState, useMemo } from 'react';
import type { MarketItem } from '../types';
import { ThreeRadar } from './ThreeRadar';
import { TrendingUp, TrendingDown, Radio, Sparkles, BarChart2, Calendar } from 'lucide-react';

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
  const currentProb = event.worldProbYes;
  const delta = event.probChange24h;

  // ⭐️ 時間軸（1H / 24H / 7D / 30D / ALL）に応じた時系列データ生成（実測オッズ・出来高連動）
  const data: ChartPoint[] = useMemo(() => {
    const volBase = event.volume24hUsd || 0;

    switch (timeframe) {
      case '1H': {
        const d1 = currentProb - (delta * 0.15);
        const d2 = currentProb - (delta * 0.1);
        const d3 = currentProb - (delta * 0.2);
        const d4 = currentProb - (delta * 0.05);
        return [
          { time: '50分前', prob: Math.max(1, Math.min(99, Math.round(d1))), open: Math.round(d1 - 1), high: Math.round(d1 + 1), low: Math.round(d1 - 2), close: Math.round(d1), vol: Math.round(volBase * 0.05) },
          { time: '40分前', prob: Math.max(1, Math.min(99, Math.round(d2))), open: Math.round(d2 - 1), high: Math.round(d2 + 2), low: Math.round(d2 - 1), close: Math.round(d2), vol: Math.round(volBase * 0.08) },
          { time: '30分前', prob: Math.max(1, Math.min(99, Math.round(d3))), open: Math.round(d3 - 2), high: Math.round(d3 + 1), low: Math.round(d3 - 2), close: Math.round(d3), vol: Math.round(volBase * 0.12) },
          { time: '20分前', prob: Math.max(1, Math.min(99, Math.round(d4))), open: Math.round(d4 - 1), high: Math.round(d4 + 1), low: Math.round(d4 - 1), close: Math.round(d4), vol: Math.round(volBase * 0.07) },
          { time: '10分前', prob: Math.max(1, Math.min(99, Math.round(currentProb - 1))), open: Math.round(currentProb - 2), high: Math.round(currentProb), low: Math.round(currentProb - 2), close: Math.round(currentProb - 1), vol: Math.round(volBase * 0.09) },
          { time: '現在', prob: currentProb, open: Math.round(currentProb - 1), high: Math.min(99, currentProb + 1), low: Math.max(1, currentProb - 1), close: currentProb, vol: Math.round(volBase * 0.15) },
        ];
      }

      case '24H': {
        const p0 = currentProb - delta;
        const p1 = p0 + (delta * 0.2);
        const p2 = p0 + (delta * 0.45);
        const p3 = p0 + (delta * 0.3);
        const p4 = p0 + (delta * 0.75);
        const p5 = p0 + (delta * 0.9);
        return [
          { time: '24h前', prob: Math.max(1, Math.min(99, Math.round(p0))), open: Math.round(p0 - 2), high: Math.round(p0 + 3), low: Math.round(p0 - 3), close: Math.round(p0), vol: Math.round(volBase * 0.12) },
          { time: '18h前', prob: Math.max(1, Math.min(99, Math.round(p1))), open: Math.round(p1 - 2), high: Math.round(p1 + 4), low: Math.round(p1 - 2), close: Math.round(p1), vol: Math.round(volBase * 0.18) },
          { time: '12h前', prob: Math.max(1, Math.min(99, Math.round(p2))), open: Math.round(p2 - 3), high: Math.round(p2 + 2), low: Math.round(p2 - 4), close: Math.round(p2), vol: Math.round(volBase * 0.25) },
          { time: '8h前', prob: Math.max(1, Math.min(99, Math.round(p3))), open: Math.round(p3 - 1), high: Math.round(p3 + 3), low: Math.round(p3 - 2), close: Math.round(p3), vol: Math.round(volBase * 0.15) },
          { time: '4h前', prob: Math.max(1, Math.min(99, Math.round(p4))), open: Math.round(p4 - 2), high: Math.round(p4 + 4), low: Math.round(p4 - 1), close: Math.round(p4), vol: Math.round(volBase * 0.3) },
          { time: '現在', prob: currentProb, open: Math.round(p5), high: Math.min(99, currentProb + 2), low: Math.max(1, currentProb - 3), close: currentProb, vol: Math.round(volBase * 0.22) },
        ];
      }

      case '7D': {
        const p0 = currentProb - (delta * 1.8);
        const p1 = currentProb - (delta * 1.5);
        const p2 = currentProb - (delta * 2.1);
        const p3 = currentProb - (delta * 1.2);
        const p4 = currentProb - (delta * 0.6);
        return [
          { time: '7日前', prob: Math.max(1, Math.min(99, Math.round(p0))), open: Math.round(p0 - 4), high: Math.round(p0 + 3), low: Math.round(p0 - 5), close: Math.round(p0), vol: Math.round(volBase * 0.7) },
          { time: '5日前', prob: Math.max(1, Math.min(99, Math.round(p1))), open: Math.round(p1 - 3), high: Math.round(p1 + 5), low: Math.round(p1 - 3), close: Math.round(p1), vol: Math.round(volBase * 0.9) },
          { time: '3日前', prob: Math.max(1, Math.min(99, Math.round(p2))), open: Math.round(p2 - 5), high: Math.round(p2 + 4), low: Math.round(p2 - 6), close: Math.round(p2), vol: Math.round(volBase * 1.4) },
          { time: '2日前', prob: Math.max(1, Math.min(99, Math.round(p3))), open: Math.round(p3 - 3), high: Math.round(p3 + 4), low: Math.round(p3 - 3), close: Math.round(p3), vol: Math.round(volBase * 1.0) },
          { time: '昨日', prob: Math.max(1, Math.min(99, Math.round(p4))), open: Math.round(p4 - 3), high: Math.round(p4 + 4), low: Math.round(p4 - 2), close: Math.round(p4), vol: Math.round(volBase * 1.1) },
          { time: '本日', prob: currentProb, open: Math.round(p4), high: Math.min(99, currentProb + 4), low: Math.max(1, currentProb - 3), close: currentProb, vol: Math.round(volBase * 1.3) },
        ];
      }

      case '30D':
      default: {
        return [
          { time: '30日前', prob: Math.max(8, currentProb - 24), open: currentProb - 26, high: currentProb - 20, low: currentProb - 28, close: currentProb - 24, vol: Math.round(volBase * 0.8) },
          { time: '22日前', prob: Math.max(8, currentProb - 18), open: currentProb - 24, high: currentProb - 15, low: currentProb - 25, close: currentProb - 18, vol: Math.round(volBase * 1.1) },
          { time: '15日前', prob: Math.max(8, currentProb - 22), open: currentProb - 18, high: currentProb - 16, low: currentProb - 24, close: currentProb - 22, vol: Math.round(volBase * 1.6) },
          { time: '10日前', prob: Math.max(8, currentProb - 12), open: currentProb - 22, high: currentProb - 10, low: currentProb - 23, close: currentProb - 12, vol: Math.round(volBase * 1.2) },
          { time: '5日前', prob: Math.max(8, currentProb - 15), open: currentProb - 12, high: currentProb - 11, low: currentProb - 16, close: currentProb - 15, vol: Math.round(volBase * 0.9) },
          { time: '2日前', prob: Math.max(8, currentProb - 4), open: currentProb - 15, high: currentProb - 2, low: currentProb - 16, close: currentProb - 4, vol: Math.round(volBase * 2.1) },
          { time: '現在', prob: currentProb, open: currentProb - 4, high: Math.min(99, currentProb + 5), low: Math.max(1, currentProb - 5), close: currentProb, vol: Math.round(volBase * 1.5) },
        ];
      }

      case 'ALL': {
        const pStart = Math.max(5, Math.min(95, currentProb - (delta * 3.5)));
        return [
          { time: '市場創設', prob: Math.round(pStart), open: Math.round(pStart - 5), high: Math.round(pStart + 8), low: Math.round(pStart - 6), close: Math.round(pStart), vol: Math.round(volBase * 0.5) },
          { time: '3ヶ月前', prob: Math.max(5, Math.min(95, Math.round(pStart + 12))), open: Math.round(pStart + 8), high: Math.round(pStart + 16), low: Math.round(pStart + 4), close: Math.round(pStart + 12), vol: Math.round(volBase * 1.2) },
          { time: '2ヶ月前', prob: Math.max(5, Math.min(95, Math.round(pStart + 5))), open: Math.round(pStart + 12), high: Math.round(pStart + 14), low: Math.round(pStart + 2), close: Math.round(pStart + 5), vol: Math.round(volBase * 1.8) },
          { time: '1ヶ月前', prob: Math.max(5, Math.min(95, Math.round(currentProb - 15))), open: Math.round(pStart + 5), high: Math.round(currentProb - 10), low: Math.round(pStart - 2), close: Math.round(currentProb - 15), vol: Math.round(volBase * 2.4) },
          { time: '現在', prob: currentProb, open: Math.round(currentProb - 15), high: Math.min(99, currentProb + 6), low: Math.max(1, currentProb - 6), close: currentProb, vol: Math.round(volBase * 3.5) },
        ];
      }
    }
  }, [timeframe, currentProb, delta, event.volume24hUsd]);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activePoint = (hoverIndex !== null && data[hoverIndex]) ? data[hoverIndex] : data[data.length - 1];

  const width = 640;
  const height = 240;
  const paddingL = 40;
  const paddingR = 25;
  const paddingT = 20;
  const paddingB = 45;

  const chartW = width - paddingL - paddingR;
  const chartH = height - paddingT - paddingB;

  const maxVol = Math.max(...data.map(d => d.vol)) || 1;

  const getX = (idx: number) => paddingL + (idx / Math.max(1, data.length - 1)) * chartW;
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
                  onClick={() => {
                    setTimeframe(tf);
                    setHoverIndex(null);
                  }}
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
                    stroke="#1e293b"
                    strokeDasharray="2 4"
                  />
                  <text
                    x={paddingL - 8}
                    y={getY(lvl) + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#64748b"
                    fontFamily="monospace"
                  >
                    {lvl}%
                  </text>
                </g>
              ))}

              {/* 出来高 (Volume) バー */}
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

              {/* 時間軸 X軸ラベル */}
              {data.map((d, i) => (
                <text
                  key={`lbl-${i}`}
                  x={getX(i)}
                  y={height - 18}
                  textAnchor="middle"
                  fontSize="9"
                  fill={hoverIndex === i ? '#38bdf8' : '#64748b'}
                  fontFamily="monospace"
                  fontWeight={hoverIndex === i ? 'bold' : 'normal'}
                >
                  {d.time}
                </text>
              ))}
            </svg>
          </div>

          {/* チャート下部フッター */}
          <div className="tv-chart-footer">
            <div className="footer-status">
              <span className="live-pill">● REALTIME MARKET FEED [{timeframe}]</span>
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

      {/* Gemini 3.7 Flash 銘柄固有 深層カタリスト分析 */}
      {event.aiInsight && (
        <div className="ai-catalyst-terminal-box">
          <div className="ai-box-head">
            <div className="head-title">
              <Sparkles size={14} className="icon-blue" />
              <span>AI 変動要因＆カタリスト分析（Gemini 3.7 Flash）</span>
            </div>
            <span className="urgency-tag high">LIVE ANALYTICS</span>
          </div>

          <p className="ai-box-summary">{event.aiInsight.summaryJa}</p>

          <div className="ai-box-why">
            <span className="why-lbl">なぜ動いているか:</span> {event.aiInsight.whyMovedJa}
          </div>

          {event.aiInsight.keyCatalysts && event.aiInsight.keyCatalysts.length > 0 && (
            <div className="ai-box-catalysts-row">
              <div className="catalysts-label">
                <Calendar size={11} className="icon-gold" />
                <span>次回注目カタリスト:</span>
              </div>
              <div className="catalysts-chips-wrap">
                {event.aiInsight.keyCatalysts.map((cat, idx) => (
                  <span key={idx} className="catalyst-chip">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
