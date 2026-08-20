import React, { useState } from 'react';
import { 
  X, 
  Award, 
  ArrowRight, 
  Target, 
  Flame, 
  Trophy, 
  User, 
  Share2, 
  Crown, 
  Lock, 
  CheckCircle2, 
  Layers
} from 'lucide-react';
import type { MarketItem, StreakData } from '../types';
import { calculateUserRank, RANK_TIERS } from '../utils/rankSystem';

interface MyForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  userVotes: Record<string, 'YES' | 'NO'>;
  events: MarketItem[];
  streak: StreakData;
  onSelectEvent: (event: MarketItem) => void;
}

export const MyForecastModal: React.FC<MyForecastModalProps> = ({
  isOpen,
  onClose,
  userVotes,
  events,
  streak,
  onSelectEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'ranks' | 'leaderboard'>('profile');

  if (!isOpen) return null;

  const votedEventIds = Object.keys(userVotes);
  const votedCount = votedEventIds.length;

  // 投票した銘柄一覧
  const votedItems = votedEventIds
    .map((id) => {
      const ev = events.find((e) => e.id === id || e.slug === id);
      return ev ? { event: ev, vote: userVotes[id] } : null;
    })
    .filter(Boolean) as { event: MarketItem; vote: 'YES' | 'NO' }[];

  // 的中判定の集計
  let resolvedCount = 0;
  let correctCount = 0;
  votedItems.forEach(({ event, vote }) => {
    if (event.resolvedChoice) {
      resolvedCount++;
      if (event.resolvedChoice === vote) correctCount++;
    }
  });

  const accuracyRate = resolvedCount > 0 ? Math.round((correctCount / resolvedCount) * 100) : null;

  // 🏆 サイバー予報士ランク計算 (Lv.1〜Lv.10)
  const currentRank = calculateUserRank(votedCount);

  // 🏆 リーダーボード（全国ランキング）
  const leaderboardData = [
    { rank: 1, name: 'Tokyo_Alpha_Quant', badge: '👑 Lv.10 伝説の予報神', accuracy: 88, votes: 124, streak: 18, isUser: false },
    { rank: 2, name: '兜町マクロウォッチャー', badge: '⏳ Lv.9 時間軸支配者', accuracy: 83, votes: 88, streak: 12, isUser: false },
    { rank: 3, name: 'シリコンバレー観測員', badge: '🧬 Lv.8 特異点サイファー', accuracy: 79, votes: 62, streak: 9, isUser: false },
    { rank: 4, name: 'あなた (You)', badge: `${currentRank.icon} Lv.${currentRank.level} ${currentRank.title}`, accuracy: accuracyRate ?? 75, votes: votedCount, streak: streak.currentStreak, isUser: true },
    { rank: 5, name: 'Crypto_Oracle_JP', badge: '🌐 Lv.7 深層シンジケート', accuracy: 72, votes: 35, streak: 5, isUser: false },
    { rank: 6, name: 'AI_Trend_Hunter', badge: '🔥 Lv.6 マーケット預言者', accuracy: 68, votes: 24, streak: 4, isUser: false },
    { rank: 7, name: 'Nagoya_Trader', badge: '🔮 Lv.5 凄腕オラクル', accuracy: 65, votes: 16, streak: 2, isUser: false },
  ];

  // X自慢シェアリンク生成
  const handleShareToX = () => {
    const accText = accuracyRate !== null ? `的中率: 🎯 ${accuracyRate}%` : `投票総数: 📊 ${votedCount}件`;
    const shareText = `【未来レーダー】私のサイバー予報士ステータス
称号: ${currentRank.icon} [ Lv.${currentRank.level} ${currentRank.title} ]
${accText}
連続観測ストリーク: 🔥 ${streak.currentStreak}日連続

世界のスマートマネー（Polymarket）vs 日本の生活者世論
あなたも1秒で直感投票！👇
https://mirairadar.com

#未来レーダー #サイバー予報士 #Polymarket #世論調査`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card forecast-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="forecast-modal-header">
          <div className="forecast-header-left">
            <Award className="forecast-header-icon" />
            <div>
              <div className="forecast-header-sub">CYBER FORECASTER // 予報士ハブ</div>
              <h2 className="forecast-header-title">予報士プロファイル ＆ 階級ステータス</h2>
            </div>
          </div>
          <button onClick={onClose} className="forecast-close-btn" aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        {/* タブ切り替え (3タブ構成) */}
        <div className="forecast-modal-tabs">
          <button
            className={`forecast-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={14} />
            <span>マイステータス</span>
          </button>

          <button
            className={`forecast-tab-btn ${activeTab === 'ranks' ? 'active' : ''}`}
            onClick={() => setActiveTab('ranks')}
          >
            <Crown size={14} />
            <span>全10階級一覧</span>
          </button>

          <button
            className={`forecast-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <Trophy size={14} />
            <span>全国ランキング</span>
          </button>
        </div>

        {/* タブ1: マイプロファイル */}
        {activeTab === 'profile' && (
          <div className="forecast-modal-body">
            {/* 🏆 サイバー予報士 ランクヒーローカード */}
            <div 
              className="cyber-rank-hero-card"
              style={{
                borderColor: currentRank.borderColor,
                boxShadow: `0 0 20px ${currentRank.borderColor}33`,
              }}
            >
              <div className="rank-badge-row">
                <div className="rank-level-tag">
                  <span>{currentRank.icon}</span>
                  <span className="font-mono font-black">LEVEL {currentRank.level}</span>
                </div>
                <div className="rank-name-main" style={{ color: currentRank.color }}>
                  {currentRank.title}
                </div>
              </div>

              <p className="rank-description-text">{currentRank.description}</p>

              {/* EXP プログレスバー */}
              <div className="rank-exp-section">
                <div className="exp-label-row font-mono text-xs">
                  <span className="text-slate-400">EXP (投票実績): {votedCount} 票</span>
                  <span style={{ color: currentRank.color }}>
                    {currentRank.isMaxLevel ? 'MAX RANK 達成！' : `次のランクまで: あと ${currentRank.nextLevelExp - currentRank.currentExp} 票`}
                  </span>
                </div>
                <div className="exp-bar-track">
                  <div 
                    className="exp-bar-fill" 
                    style={{ 
                      width: `${currentRank.progressPercent}%`,
                      background: currentRank.color,
                      boxShadow: `0 0 10px ${currentRank.color}`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3つの主要スタッツ */}
            <div className="forecast-stats-grid">
              <div className="forecast-stat-card">
                <div className="stat-card-label">
                  <Target size={14} className="text-cyan-400" />
                  <span>投票実績</span>
                </div>
                <div className="stat-card-value text-cyan-400 font-mono">
                  {votedCount}
                  <span className="stat-unit">問</span>
                </div>
                <div className="stat-card-sub">参加マーケット数</div>
              </div>

              <div className="forecast-stat-card">
                <div className="stat-card-label">
                  <Flame size={14} className="text-amber-400" />
                  <span>連続ストリーク</span>
                </div>
                <div className="stat-card-value text-amber-400 font-mono">
                  {streak.currentStreak}
                  <span className="stat-unit">日</span>
                </div>
                <div className="stat-card-sub">最高: {streak.maxStreak} 日連続</div>
              </div>

              <div className="forecast-stat-card">
                <div className="stat-card-label">
                  <Award size={14} className="text-rose-400" />
                  <span>予想的中率</span>
                </div>
                <div className="stat-card-value text-rose-400 font-mono">
                  {accuracyRate !== null ? `${accuracyRate}%` : '---'}
                </div>
                <div className="stat-card-sub">
                  {resolvedCount > 0 ? `${resolvedCount}問中 ${correctCount}問的中` : '結果確定待ち'}
                </div>
              </div>
            </div>

            {/* 投票履歴リスト */}
            <div className="forecast-history-section">
              <div className="history-header flex justify-between items-center mb-2">
                <h3 className="history-title text-sm font-bold flex items-center gap-1.5">
                  <Layers size={14} className="text-cyan-400" />
                  <span>あなたが投票したマーケット ({votedCount}件)</span>
                </h3>
              </div>

              {votedItems.length === 0 ? (
                <div className="forecast-empty-state">
                  <p className="empty-text">まだ投票したマーケットがありません。</p>
                  <p className="empty-sub">
                    気になるテーマに「YES」か「NO」で投票すると、あなたの予報士データが記録されランクが上がります！
                  </p>
                </div>
              ) : (
                <div className="forecast-history-list">
                  {votedItems.map(({ event, vote }) => (
                    <div
                      key={event.id}
                      className="history-item-row"
                      onClick={() => {
                        onSelectEvent(event);
                        onClose();
                      }}
                    >
                      <div className="history-item-left">
                        <span className={`history-vote-badge ${vote.toLowerCase()}`}>
                          {vote}
                        </span>
                        <div className="history-item-info">
                          <div className="history-item-title">{event.titleJa || event.title}</div>
                          <div className="history-item-meta font-mono">
                            世界オッズ YES {event.worldProbYes}%  |  日本支持 YES {event.japanVotes.percentYes}%
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={14} className="history-arrow" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* X自慢シェアボタン */}
            <button onClick={handleShareToX} className="btn-share-forecast-x">
              <Share2 size={16} />
              <span>この予報士ステータスを 𝕏 で自慢シェア</span>
            </button>
          </div>
        )}

        {/* タブ2: 全10階級一覧 */}
        {activeTab === 'ranks' && (
          <div className="forecast-modal-body">
            <p className="text-xs text-slate-400 mb-3">
              未来レーダーで投票を重ねることでEXPが獲得でき、サイバー予報士としての階級がアンロックされます。
            </p>

            <div className="rank-tier-grid">
              {RANK_TIERS.map((tier) => {
                const isUnlocked = votedCount >= tier.minVotes;
                const isCurrent = currentRank.level === tier.level;

                return (
                  <div
                    key={tier.level}
                    className={`rank-tier-card ${isCurrent ? 'current' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
                    style={{
                      borderColor: isCurrent ? tier.color : undefined,
                    }}
                  >
                    <div className="tier-header-row">
                      <div className="flex items-center gap-2">
                        <span className="tier-icon">{tier.icon}</span>
                        <div>
                          <div className="tier-level-num font-mono text-xs text-slate-400">
                            LEVEL {tier.level}
                          </div>
                          <div className="tier-title font-bold text-sm" style={{ color: tier.color }}>
                            {tier.title}
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="badge-current-rank">現在</span>
                      ) : isUnlocked ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <Lock size={14} className="text-slate-500" />
                      )}
                    </div>

                    <p className="tier-desc text-xs text-slate-300 mt-2">{tier.description}</p>

                    <div className="tier-req-bar mt-2 font-mono text-[11px] text-slate-400">
                      必要投票数: {tier.minVotes} 票 〜 {tier.maxVotes === Infinity ? '無制限' : `${tier.maxVotes} 票`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* タブ3: リーダーボード */}
        {activeTab === 'leaderboard' && (
          <div className="forecast-modal-body">
            <p className="text-xs text-slate-400 mb-3">
              全国のトップクォンツ・予報士たちの的中率と活動ランキングです。
            </p>

            <div className="leaderboard-table">
              {leaderboardData.map((item) => (
                <div
                  key={item.rank}
                  className={`leaderboard-row ${item.isUser ? 'user-row' : ''}`}
                >
                  <div className="leaderboard-rank font-mono font-black">
                    {item.rank === 1 ? '👑 1' : item.rank === 2 ? '🥈 2' : item.rank === 3 ? '🥉 3' : item.rank}
                  </div>

                  <div className="leaderboard-user-info">
                    <div className="leaderboard-name font-bold flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {item.isUser && <span className="you-badge font-mono">YOU</span>}
                    </div>
                    <div className="leaderboard-badge text-xs text-slate-400">{item.badge}</div>
                  </div>

                  <div className="leaderboard-stats font-mono text-right">
                    <div className="stat-acc text-cyan-400 font-bold">{item.accuracy}%</div>
                    <div className="stat-sub text-[11px] text-slate-400">{item.votes}票 / 🔥{item.streak}日</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
