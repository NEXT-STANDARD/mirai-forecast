import React from 'react';
import { RefreshCw, Flame, HelpCircle, PlusCircle } from 'lucide-react';
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
      {/* 1. 最上部スリム・ティッカーバー */}
      <div className="top-ticker-bar">
        <div className="container ticker-inner">
          <div className="ticker-left-info">
            <div
              className="ticker-badge"
              onClick={onGoHome}
              style={{ cursor: onGoHome ? 'pointer' : 'default' }}
              title="未来レーダー トップへ戻る"
            >
              <span className="live-dot"></span>
              <span className="ticker-badge-text">LIVE</span>
            </div>
            <div className="ticker-meta-items hide-on-mobile">
              <span className="ticker-item">Polymarket 実況同期</span>
              <span className="ticker-divider">•</span>
              <span className="ticker-item">観測: <strong>{totalMarketsCount}銘柄</strong> (${Math.round(totalVolume / 1000000).toLocaleString()}M)</span>
              <span className="ticker-divider">•</span>
              <span className="ticker-item">国内投票: <strong>{totalJapanVotes.toLocaleString()}票</strong></span>
              <span className="ticker-divider">•</span>
              <span className="compliance-tag">完全無料・非賭博</span>
            </div>
          </div>

          <div className="ticker-right-actions">
            {onOpenLetter && (
              <button onClick={onOpenLetter} className="letter-ticker-badge hide-on-xs" title="Polymarket Mike氏への公開書簡">
                <span className="dot-gold"></span>
                <span>📨 to Mike</span>
              </button>
            )}
            <button
              onClick={onRefresh}
              className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              title="最新データを再取得"
            >
              <RefreshCw size={11} />
              <span>{isRefreshing ? '同期中' : '同期'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. メインヘッダー（ロゴ ＆ 厳選アクション） */}
      <div className="container main-header-clean">
        <div className="header-brand-block">
          <Logo size={28} onClick={onGoHome} />
        </div>

        {/* アクションボタン（スマホではマイ予報に集中、PCではフル表示） */}
        <div className="header-nav-actions">
          {/* ① 使い方ガイド（PC用） */}
          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="btn-header-ghost hide-on-mobile"
              title="未来レーダーの3ステップ使い方ガイド"
            >
              <HelpCircle size={13} className="text-cyan-400" />
              <span>使い方</span>
            </button>
          )}

          {/* ② 問いを提案（PC用・スマホはスクリーナー側の＋ボタンに集約） */}
          {onOpenPropose && (
            <button
              onClick={onOpenPropose}
              className="btn-header-propose hide-on-mobile"
              title="新しい未来の問いを提案する"
            >
              <PlusCircle size={13} />
              <span>問いを提案</span>
            </button>
          )}

          {/* ③ マイ予報（スマホ・PC共通の最重要ハブ） */}
          {onOpenMyForecast && (
            <button
              onClick={onOpenMyForecast}
              className="btn-header-forecast relative"
              title="あなたの投票履歴・ストリーク・全国ランキング"
            >
              <div className="btn-forecast-inner">
                <span className="btn-forecast-title">🏆 マイ予報</span>
                <span className="btn-forecast-count">({userVotesCount})</span>
                {streakDays > 0 && (
                  <span className="btn-forecast-streak">
                    <Flame size={10} className="fill-amber-400 text-amber-400" />
                    {streakDays}d
                  </span>
                )}
              </div>
              {resolvedNotificationsCount > 0 && (
                <span
                  className="notification-dot"
                  title="結果確定した銘柄があります"
                />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. ツールバー型カテゴリナビ */}
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
