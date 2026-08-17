import React from 'react';
import type { MarketItem } from '../types';
import { ThreeRadar } from './ThreeRadar';
import { Radio, TrendingUp, TrendingDown, ArrowRight, Zap } from 'lucide-react';

interface SmartMoneyRadarProps {
  events: MarketItem[];
  onSelectEvent: (event: MarketItem) => void;
}

export const SmartMoneyRadar: React.FC<SmartMoneyRadarProps> = ({
  events,
  onSelectEvent,
}) => {
  const volatileEvents = [...events]
    .sort((a, b) => Math.abs(b.probChange24h) - Math.abs(a.probChange24h))
    .slice(0, 4);

  return (
    <section className="smart-radar-terminal">
      {/* ターミナルヘッダー */}
      <div className="terminal-header-row">
        <div className="terminal-brand">
          <div className="pulse-icon">
            <Radio size={16} />
          </div>
          <div>
            <h3 className="terminal-title">SmartRadar ｜ スマートマネー予兆検知</h3>
            <p className="terminal-subtitle">
              Polymarket上で確率が急変（±5%以上）または大口資金が流入した市場をリアルタイム走査
            </p>
          </div>
        </div>
        <div className="terminal-badges">
          <span className="badge-radar-live">
            <Zap size={13} /> 3D RADAR SCANNING
          </span>
        </div>
      </div>

      {/* 2カラム構成：左に3Dレーダー、右に急変トピックリスト */}
      <div className="terminal-body-grid">
        {/* 左側：Three.js 3Dレーダー */}
        <div className="radar-3d-pane">
          <ThreeRadar events={events} onSelectEvent={onSelectEvent} />
          <div className="radar-caption">
            💡 3Dノード（球体）をタップすると、その市場の世論ギャップと要因分析を開きます
          </div>
        </div>

        {/* 右側：急変動アラートリスト */}
        <div className="radar-list-pane">
          <div className="pane-header">
            <span>🚨 急変動検知トピック (TOP 4)</span>
            <span className="sub">24h変動率順</span>
          </div>

          <div className="radar-items-stack">
            {volatileEvents.map((item) => {
              const isUp = item.probChange24h > 0;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectEvent(item)}
                  className="radar-stack-card"
                >
                  <div className="stack-card-top">
                    <span className="category-tag">{item.categoryLabel}</span>
                    <span className={`delta-tag ${isUp ? 'pos' : 'neg'}`}>
                      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {isUp ? `+${item.probChange24h}%` : `${item.probChange24h}%`} (24h)
                    </span>
                  </div>

                  <h4 className="stack-card-title">{item.titleJa}</h4>

                  <div className="stack-card-metrics">
                    <div className="metric">
                      <span className="lbl">現在確率</span>
                      <span className="val blue">YES {item.worldProbYes}%</span>
                    </div>
                    <div className="metric">
                      <span className="lbl">出来高</span>
                      <span className="val">${Math.round(item.volume24hUsd / 1000).toLocaleString()}k</span>
                    </div>
                    <div className="metric right">
                      <ArrowRight size={15} className="arrow-icon" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
