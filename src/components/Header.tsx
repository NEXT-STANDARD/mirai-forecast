import React from 'react';
import { RefreshCw, Zap, Flame, HelpCircle } from 'lucide-react';
import { Logo } from './Logo';
import type { CategoryType } from '../types';

interface HeaderProps {
  totalMarketsCount: number;
  totalJapanVotes: number;
  totalVolume: number;
  selectedCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenLetter?: () => void;
  onOpenPropose?: () => void;
  onOpenMyForecast?: () => void;
  onOpenOnboarding?: () => void;
  userVotesCount?: number;
  streakDays?: number;
  resolvedNotificationsCount?: number;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalMarketsCount,
  totalJapanVotes,
  totalVolume,
  selectedCategory,
  onSelectCategory,
  isRefreshing,
  onRefresh,
  onOpenLetter,
  onOpenPropose,
  onOpenMyForecast,
  onOpenOnboarding,
  userVotesCount = 0,
  streakDays = 1,
  resolvedNotificationsCount = 0,
  onGoHome,
}) => {
  const categories: { id: CategoryType; label: string }[] = [
    { id: 'all', label: '☀️ 全銘柄' },
    { id: 'trending', label: '🔥 人気急上昇' },
    { id: 'economy', label: '📊 経済・金利・暗号資産' },
    { id: 'tech', label: '⚡ AI・テック' },
    { id: 'politics', label: '🌐 国際・社会' },
    { id: 'sports', label: '⚾ スポーツ' },
    { id: 'entertainment', label: '🎬 エンタメ' },
  ];

  return (
    <header className="header-container">
      {/* 上部ティッカーバー */}
      <div className="top-ticker-bar">
        <div className="container ticker-inner">
          <div
            className="ticker-badge"
            onClick={onGoHome}
            style={{ cursor: onGoHome ? 'pointer' : 'default' }}
            title="未来レーダー トップへ戻る"
          >
            <span className="live-dot"></span>
            <span className="ticker-badge-text">LIVE TERMINAL</span>
          </div>
          <div className="ticker-text hide-on-mobile">
            <span>Polymarket 自動同期</span>
            <span className="divider">•</span>
            <span>観測総高: <strong>${Math.round(totalVolume / 1000000).toLocaleString()}M+</strong></span>
            <span className="divider">•</span>
            <span className="compliance-tag">非賭博・公選法配慮</span>
          </div>
          <div className="ticker-right-actions">
            {onOpenPropose && (
              <button onClick={onOpenPropose} className="propose-ticker-badge">
                <span>💡 問いを提案する</span>
              </button>
            )}
            {onOpenLetter && (
              <button onClick={onOpenLetter} className="letter-ticker-badge">
                <span className="dot-gold"></span>
                <span>📨 Letter to Mike</span>
              </button>
            )}
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
      </div>

      {/* メインヘッダー */}
      <div className="container main-header">
        <Logo size={32} onClick={onGoHome} />

        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-label">観測マーケット</div>
            <div className="stat-value">{totalMarketsCount.toLocaleString()} <span className="stat-unit">件</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">国内投票総数</div>
            <div className="stat-value">{totalJapanVotes.toLocaleString()} <span className="stat-unit">票</span></div>
          </div>
          {onOpenMyForecast && (
            <button onClick={onOpenMyForecast} className="stat-card forecast-highlight relative" title="あなたの投票履歴・ストリーク・全国ランキング">
              <div className="stat-label flex items-center justify-between">
                <span>MY PREDICTOR</span>
                {streakDays > 0 && (
                  <span className="text-[9px] text-amber-400 flex items-center font-mono font-bold">
                    <Flame size={10} className="fill-amber-400 mr-0.5" />
                    {streakDays}d
                  </span>
                )}
              </div>
              <div className="stat-value text-cyan-400 flex items-center gap-1">
                <span>🏆 マイ予報 ({userVotesCount})</span>
                {resolvedNotificationsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" title="結果確定した銘柄があります" />
                )}
              </div>
            </button>
          )}
          {onOpenOnboarding && (
            <button onClick={onOpenOnboarding} className="stat-card guide-highlight hide-on-xs" title="未来レーダーの3ステップ使い方ガイド">
              <div className="stat-label">GUIDE</div>
              <div className="stat-value text-slate-200 flex items-center gap-1">
                <HelpCircle size={11} className="text-cyan-400" />
                <span>使い方</span>
              </div>
            </button>
          )}
          {onOpenPropose && (
            <button onClick={onOpenPropose} className="stat-card propose-highlight hide-on-xs" title="新しい未来の問いを提案する">
              <div className="stat-label">COMMUNITY</div>
              <div className="stat-value text-amber-400">💡 問いを提案</div>
            </button>
          )}
          {onOpenLetter && (
            <button onClick={onOpenLetter} className="stat-card letter-highlight hide-on-xs" title="Polymarket Japan マイク・エイドリン氏への公開書簡">
              <div className="stat-label">OPEN LETTER</div>
              <div className="stat-value gold-text">📨 to Mike</div>
            </button>
          )}
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
              className={`nav-item ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
