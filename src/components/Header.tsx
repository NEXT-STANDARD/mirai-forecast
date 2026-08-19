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
  onOpenAiConnector?: () => void;
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
  onOpenAiConnector,
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
    <header className="header-container-slim">
      {/* 1. 一体型スリム・メインバー */}
      <div className="container header-main-bar">
        {/* 左側: ロゴ ＋ 控えめサブタイトル ＋ LIVEステータス */}
        <div className="header-left-cluster">
          <Logo size={24} onClick={onGoHome} />
          
          <div className="header-status-badge hide-on-mobile" title={`観測総高: $${Math.round(totalVolume / 1000000).toLocaleString()}M ｜ 国内投票: ${totalJapanVotes.toLocaleString()}票`}>
            <span className="live-dot-green"></span>
            <span className="status-text">LIVE ({totalMarketsCount}銘柄 ｜ {totalJapanVotes.toLocaleString()}票)</span>
          </div>
        </div>

        {/* 右側: 厳選アクション群 */}
        <div className="header-right-cluster">
          {onOpenLetter && (
            <button
              onClick={onOpenLetter}
              className="btn-header-subtle hide-on-xs"
              title="Polymarket Mike氏への公開書簡"
            >
              <span className="dot-gold-mini"></span>
              <span>📨 to Mike</span>
            </button>
          )}

          {onOpenAiConnector && (
            <button
              onClick={onOpenAiConnector}
              className="btn-header-subtle hide-on-mobile"
              title="Claude / Cursor / ChatGPT 向け WebMCP 連携ガイド"
            >
              <span className="text-emerald-400 font-mono text-[10px]">🤖</span>
              <span>AI連携</span>
            </button>
          )}

          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="btn-header-subtle hide-on-mobile"
              title="未来レーダーの使い方"
            >
              <HelpCircle size={12} className="text-cyan-400" />
              <span>使い方</span>
            </button>
          )}

          {onOpenPropose && (
            <button
              onClick={onOpenPropose}
              className="btn-header-amber hide-on-mobile"
              title="新しい未来の問いを提案する"
            >
              <PlusCircle size={12} />
              <span>問いを提案</span>
            </button>
          )}

          {/* 🏆 マイ予報ハブ */}
          {onOpenMyForecast && (
            <button
              onClick={onOpenMyForecast}
              className="btn-header-forecast-slim relative"
              title="あなたの投票履歴・ストリーク・全国ランキング"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs">🏆 マイ予報</span>
                <span className="text-cyan-400 font-mono text-[11px]">({userVotesCount})</span>
                {streakDays > 0 && (
                  <span className="streak-mini-badge">
                    <Flame size={9} className="fill-amber-400 text-amber-400" />
                    {streakDays}d
                  </span>
                )}
              </div>
              {resolvedNotificationsCount > 0 && (
                <span className="notification-dot-mini" title="結果確定通知" />
              )}
            </button>
          )}

          {/* 同期ボタン */}
          <button
            onClick={onRefresh}
            className={`btn-header-refresh ${isRefreshing ? 'spinning' : ''}`}
            title="最新データを同期"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {/* 2. カテゴリナビバー */}
      <div className="container nav-container-slim">
        <nav className="category-nav-slim custom-scroll">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`nav-tab-item ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
