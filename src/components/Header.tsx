import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Logo } from './Logo';
import type { CategoryType } from '../types';

interface HeaderProps {
  activeCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalMarketVolume: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  onRefresh,
  isRefreshing,
  totalMarketVolume,
}) => {
  const categories: { id: CategoryType; label: string }[] = [
    { id: 'all', label: '☀️ 全銘柄 (All)' },
    { id: 'economy', label: '📊 経済・金利・暗号資産' },
    { id: 'politics', label: '🌐 国際・選挙・地政学' },
    { id: 'tech', label: '⚡ テック・AI・半導体' },
    { id: 'sports', label: '⚽ スポーツ・カルチャー' },
  ];

  return (
    <header className="header-container">
      {/* 上部ティッカーバー */}
      <div className="top-ticker-bar">
        <div className="container ticker-inner">
          <div className="ticker-badge">
            <span className="live-dot"></span>
            <span>LIVE TERMINAL FEED</span>
          </div>
          <div className="ticker-text">
            <span>Polymarket CLOB/Gamma リアルタイム観測</span>
            <span className="divider">•</span>
            <span>観測総ボリューム: <strong>${Math.round(totalMarketVolume / 1000000).toLocaleString()}M+</strong></span>
            <span className="divider">•</span>
            <span className="compliance-tag">非賭博・公選法配慮済み</span>
          </div>
          <button
            onClick={onRefresh}
            className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            title="データを再取得"
          >
            <RefreshCw size={11} />
            <span>{isRefreshing ? '同期中...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {/* メインヘッダー */}
      <div className="container main-header">
        {/* ミニマル幾何学ロゴ */}
        <Logo size={36} />

        {/* 証券風ステータスインジケーター */}
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-label">観測マーケット数</div>
            <div className="stat-value">3,420 件</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">国内投票総数</div>
            <div className="stat-value">128,450 票</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-label">SmartRadar</div>
            <div className="stat-value" style={{ color: '#38bdf8' }}>ONLINE (3D)</div>
          </div>
        </div>
      </div>

      {/* ツールバー型カテゴリナビ */}
      <div className="container nav-container">
        <nav className="category-nav">
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
