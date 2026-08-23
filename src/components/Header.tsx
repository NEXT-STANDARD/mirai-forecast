import React from 'react';
import { RefreshCw, HelpCircle, PlusCircle, Volume2, VolumeX, Flame } from 'lucide-react';
import { Logo } from './Logo';
import { cyberSound } from '../utils/cyberSound';
import { UNIFIED_CATEGORIES, type CategoryType } from '../types';
import { calculateUserRank } from '../utils/rankSystem';

interface HeaderProps {
  totalMarketsCount: number;
  totalJapanVotes: number;
  totalVolume: number;
  selectedCategory?: CategoryType;
  onSelectCategory?: (category: CategoryType) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenLetter?: () => void;
  onOpenGuide?: (slug?: string) => void;
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
  onOpenGuide,
  onOpenPropose,
  onOpenMyForecast,
  onOpenOnboarding,
  onOpenAiConnector,
  userVotesCount = 0,
  streakDays = 1,
  resolvedNotificationsCount = 0,
  onGoHome,
}) => {
  const [isMuted, setIsMuted] = React.useState(() => cyberSound.getIsMuted());
  const currentRank = calculateUserRank(userVotesCount);

  return (
    <header className="header-container-slim">
      <div className="header-inner-slim">
        {/* 左側: ブランドロゴ ＆ ライブ統計 */}
        <div className="header-left-slim">
          <Logo onGoHome={onGoHome} />

          {/* 統計バッジ */}
          <div className="stats-badges-slim hide-on-mobile">
            <div className="stat-badge-item" title="現在リアルタイム観測中の未来予測銘柄数">
              <span className="stat-dot green pulse" />
              <span className="stat-label">観測銘柄</span>
              <span className="stat-value">{totalMarketsCount}件</span>
            </div>

            <div className="stat-badge-item" title="日本国内からの累計世論投票数">
              <span className="stat-dot cyan" />
              <span className="stat-label">日本世論</span>
              <span className="stat-value">{totalJapanVotes.toLocaleString()}票</span>
            </div>

            <div className="stat-badge-item" title="Polymarket 全世界リアルマネー累計市場規模">
              <span className="stat-dot amber" />
              <span className="stat-label">世界市場規模</span>
              <span className="stat-value">${(totalVolume / 1_000_000).toFixed(1)}M</span>
            </div>
          </div>
        </div>

        {/* 右側: アクション＆コントロール */}
        <div className="header-right-slim">
          {onOpenGuide && (
            <button
              onClick={() => onOpenGuide('polymarket-japan')}
              className="btn-header-subtle hide-on-mobile"
              title="Polymarketは日本から使えるのか？法規制と日本語での活用ガイド"
            >
              <span className="text-cyan-400 font-mono text-[10px]">📖</span>
              <span>Polymarket解説</span>
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

          {/* 🔊 サイバーUIサウンド切替 */}
          <button
            onClick={() => setIsMuted(cyberSound.toggleMute())}
            className="btn-header-subtle"
            title={isMuted ? 'サイバーUI効果音: OFF (クリックでON)' : 'サイバーUI効果音: ON (クリックでミュート)'}
          >
            {isMuted ? (
              <VolumeX size={13} className="text-slate-400" />
            ) : (
              <Volume2 size={13} className="text-cyan-400 animate-pulse" />
            )}
            <span className="hide-on-xs font-mono text-[10px]">{isMuted ? 'MUTE' : 'AUDIO'}</span>
          </button>

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
              className="btn-header-subtle"
              title="未来レーダーの使い方・ガイド"
              aria-label="未来レーダーの使い方"
            >
              <HelpCircle size={14} className="text-cyan-400" />
              <span className="hide-on-xs">使い方</span>
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

          {/* 🏆 サイバー予報士ランク ＆ マイ予報ハブ */}
          {onOpenMyForecast && (
            <button
              onClick={onOpenMyForecast}
              className="btn-header-forecast-slim relative"
              title={`あなたの予報士ランク: [ Lv.${currentRank.level} ${currentRank.title} ] (投票実績: ${userVotesCount}件)`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs flex items-center gap-1">
                  <span>{currentRank.icon}</span>
                  <span className="font-mono text-[11px] font-black" style={{ color: currentRank.color }}>
                    Lv.{currentRank.level}
                  </span>
                  <span className="hide-on-mobile">{currentRank.title}</span>
                </span>
                <span className="text-slate-400 font-mono text-[10px]">({userVotesCount})</span>
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

      {/* 2. スクロール追従・主要カテゴリナビバー（初期表示 50px 以内に配備） */}
      {onSelectCategory && (
        <div className="container nav-container-slim">
          <nav className="category-nav-slim custom-scroll" aria-label="カテゴリー絞り込み">
            {UNIFIED_CATEGORIES.map((cat) => (
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
      )}
    </header>
  );
};
