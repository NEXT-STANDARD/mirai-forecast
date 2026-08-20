import React from 'react';
import { RefreshCw, HelpCircle, PlusCircle, Volume2, VolumeX, Flame } from 'lucide-react';
import { Logo } from './Logo';
import { cyberSound } from '../utils/cyberSound';
import { calculateUserRank } from '../utils/rankSystem';

interface HeaderProps {
  totalMarketsCount: number;
  totalJapanVotes: number;
  totalVolume: number;
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
  const [isMuted, setIsMuted] = React.useState(() => cyberSound.getIsMuted());
  const currentRank = calculateUserRank(userVotesCount);

  return (
    <header className="header-container-slim">
      {/* 1. 一体型スリム・メインバー */}
      <div className="container header-main-bar">
        {/* 左側: ロゴ ＋ 控えめサブタイトル ＋ LIVEステータス */}
        <div className="header-left-cluster">
          <h1 className="m-0 p-0 text-inherit text-base font-normal flex items-center">
            <Logo size={24} onClick={onGoHome} />
          </h1>
          
          <div className="header-status-badge hide-on-mobile" title={`観測総高: $${Math.round(totalVolume / 1000000).toLocaleString()}M ｜ 国内投票: ${totalJapanVotes.toLocaleString()}票`}>
            <span className="live-dot-green"></span>
            <span className="status-text">LIVE ({totalMarketsCount}銘柄 ｜ {totalJapanVotes.toLocaleString()}票)</span>
          </div>
        </div>

        {/* 右側: 厳選アクション群 */}
        <div className="header-right-cluster">
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
    </header>
  );
};
