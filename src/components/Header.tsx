import React from 'react';
import { RefreshCw, Zap } from 'lucide-react';
import { Logo } from './Logo';
import type { CategoryType } from '../types';

interface HeaderProps {
  activeCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalMarketVolume: number;
  totalMarketsCount: number;
  totalJapanVotes: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  onRefresh,
  isRefreshing,
  totalMarketVolume,
  totalMarketsCount,
  totalJapanVotes,
}) => {
  const categories: { id: CategoryType; label: string }[] = [
    { id: 'all', label: '☀️ 全銘柄' },
    { id: 'trending', label: '🔥 人気急上昇' },
    { id: 'economy', label: '📊 経済・金利・暗号資産' },
    { id: 'politics', label: '🌐 国際・選挙' },
    { id: 'tech', label: '⚡ AI・テック' },
    { id: 'sports', label: '⚽ エンタメ' },
  ];

  return (
    <header className="header-container">
      {/* 上部ティッカーバー */}
      <div className="top-ticker-bar">
        <div className="container ticker-inner">
          <div className="ticker-badge">
            <span className="live-dot"></span>
            <span className="ticker-badge-text">LIVE TERMINAL</span>
          </div>
          <div className="ticker-text hide-on-mobile">
            <span>Polymarket 自動同期</span>
            <span className="divider">•</span>
            <span>観測総高: <strong>${Math.round(totalMarketVolume / 1000000).toLocaleString()}M+</strong></span>
            <span className="divider">•</span>
            <span className="compliance-tag">非賭博・公選法配慮</span>
          </div>
          <button
            onClick={onRefresh}
            className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            title="データを再取得"
          >
            <RefreshCw size={11} />
            <span>{isRefreshing ? '同期中' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {/* メインヘッダー */}
      <div className="container main-header">
        <Logo size={32} />

        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-label">観測マーケット</div>
            <div className="stat-value">{totalMarketsCount.toLocaleString()} <span className="stat-unit">件</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">国内投票総数</div>
            <div className="stat-value">{totalJapanVotes.toLocaleString()} <span className="stat-unit">票</span></div>
          </div>
          <div className="stat-card highlight hide-on-xs">
            <div className="stat-label">SmartRadar</div>
            <div className="stat-value pulse-text"><Zap size={11} /> 3D LIVE</div>
          </div>
        </div>
      </div>

      {/* ツールバー型カテゴリナビ */}
      <div className="container nav-container">
        <nav className="category-nav custom-scroll">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`nav-item ${activeCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
