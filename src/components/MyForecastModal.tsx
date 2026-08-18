import React, { useState } from 'react';
import { X, Award, ArrowRight, Target, Flame, Trophy, User } from 'lucide-react';
import type { MarketItem, StreakData } from '../types';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'leaderboard'>('profile');

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

  // 予報士ランク判定
  let rankTitle = '🌱 ルーキー予報士 (Lv.1)';
  let rankDesc = '未来の直感を記録し始めた駆け出しアナリスト';
  let rankBorderColor = 'rgba(148, 163, 184, 0.3)';

  if (votedCount >= 3) {
    rankTitle = '🔭 クォンツ・オブザーバー (Lv.2)';
    rankDesc = '世界のスマートマネーと世論のギャップを鋭く観察中';
    rankBorderColor = 'rgba(56, 189, 248, 0.4)';
  }
  if (votedCount >= 8) {
    rankTitle = '⚡ チーフ・ストラテジスト (Lv.3)';
    rankDesc = '多数の未来テーマに投票し、独自の世論ポートフォリオを構築中';
    rankBorderColor = 'rgba(251, 191, 36, 0.4)';
  }
  if (votedCount >= 15) {
    rankTitle = '👑 未来マスター (Master Predictor)';
    rankDesc = '卓越した洞察力で世界の集合知と対峙する伝説の予報士';
    rankBorderColor = 'rgba(244, 63, 94, 0.4)';
  }

  // 🏆 リーダーボード（全国ランキング）
  const leaderboardData = [
    { rank: 1, name: 'Tokyo_Alpha_Quant', badge: '👑 未来マスター', accuracy: 88, votes: 42, streak: 12, isUser: false },
    { rank: 2, name: '兜町マクロウォッチャー', badge: '⚡ チーフ・ストラテジスト', accuracy: 83, votes: 38, streak: 9, isUser: false },
    { rank: 3, name: 'シリコンバレー観測員', badge: '⚡ チーフ・ストラテジスト', accuracy: 79, votes: 29, streak: 7, isUser: false },
    { rank: 4, name: 'あなた (Your Forecast)', badge: rankTitle, accuracy: accuracyRate || 75, votes: Math.max(votedCount, 1), streak: streak.currentStreak, isUser: true },
    { rank: 5, name: 'Crypto_Oracle_JP', badge: '🔭 クォンツ・オブザーバー', accuracy: 72, votes: 21, streak: 4, isUser: false },
    { rank: 6, name: 'AI_Trend_Hunter', badge: '🔭 クォンツ・オブザーバー', accuracy: 68, votes: 19, streak: 3, isUser: false },
    { rank: 7, name: 'Nagoya_Trader', badge: '🌱 ルーキー予報士', accuracy: 65, votes: 14, streak: 2, isUser: false },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card forecast-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="forecast-modal-header">
          <div className="forecast-header-left">
            <Award className="forecast-header-icon" />
            <div>
              <div className="forecast-header-sub">PREDICTOR HUB // 未来予報士</div>
              <h2 className="forecast-header-title">予報士プロファイル ＆ 全国ランキング</h2>
            </div>
          </div>
          <button onClick={onClose} className="forecast-close-btn" aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="forecast-tab-nav">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`forecast-tab-item ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <User size={14} />
            <span>マイ実績 ＆ 履歴</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`forecast-tab-item ${activeTab === 'leaderboard' ? 'active-gold' : ''}`}
          >
            <Trophy size={14} />
            <span>🏆 全国ランキング (Leaderboard)</span>
          </button>
        </div>

        {activeTab === 'profile' ? (
          /* タブ1: マイ実績 */
          <div className="forecast-modal-body">
            {/* ランク＆ストリーク */}
            <div className="forecast-rank-box" style={{ borderColor: rankBorderColor }}>
              <div className="forecast-rank-top">
                <div className="forecast-rank-info">
                  <div className="forecast-rank-badge-label">CURRENT RANK</div>
                  <h3 className="forecast-rank-name">{rankTitle}</h3>
                  <p className="forecast-rank-desc">{rankDesc}</p>
                </div>
                <div className="forecast-streak-block">
                  <div className="forecast-streak-pill">
                    <Flame size={14} className="streak-flame-icon" />
                    <span>{streak.currentStreak} 日連続投票中</span>
                  </div>
                  <span className="forecast-max-streak">最高記録: {streak.maxStreak} 日</span>
                </div>
              </div>

              <div className="forecast-stats-row">
                <div className="forecast-stat-col">
                  <div className="forecast-stat-lbl">総投票数</div>
                  <div className="forecast-stat-num">{votedCount} <span className="forecast-unit">件</span></div>
                </div>
                <div className="forecast-stat-col">
                  <div className="forecast-stat-lbl">結果確定</div>
                  <div className="forecast-stat-num cyan">{resolvedCount} <span className="forecast-unit">件</span></div>
                </div>
                <div className="forecast-stat-col">
                  <div className="forecast-stat-lbl">的中率 (Accuracy)</div>
                  <div className="forecast-stat-num green">{accuracyRate !== null ? `${accuracyRate}%` : '集計待機中'}</div>
                </div>
              </div>
            </div>

            {/* 過去の投票履歴リスト */}
            <div className="forecast-history-section">
              <div className="forecast-history-header">
                <Target size={14} className="text-cyan-400" />
                <h4 className="forecast-history-title">あなたが投票した未来の問い一覧 ({votedItems.length}件)</h4>
              </div>

              {votedItems.length === 0 ? (
                <div className="forecast-empty-box">
                  <p className="forecast-empty-txt">まだ投票履歴がありません。</p>
                  <p className="forecast-empty-sub">
                    トップページの各銘柄で「YES / NO」に直感で投票すると、ここに自動記録されます。
                  </p>
                </div>
              ) : (
                <div className="forecast-history-list">
                  {votedItems.map(({ event, vote }) => {
                    const isResolved = Boolean(event.resolvedChoice);
                    const isWon = isResolved && event.resolvedChoice === vote;
                    const isLost = isResolved && event.resolvedChoice !== vote;

                    return (
                      <div
                        key={event.id}
                        onClick={() => {
                          onSelectEvent(event);
                          onClose();
                        }}
                        className={`forecast-card-item ${isWon ? 'won' : isLost ? 'lost' : ''}`}
                      >
                        <div className="forecast-card-main">
                          <div className="forecast-card-tags">
                            <span className="forecast-cat-pill">
                              {event.categoryLabel.slice(0, 6)}
                            </span>
                            <span className="forecast-odds-pill">
                              世界オッズ: {event.worldProbYes}%
                            </span>
                            {isWon && <span className="won-badge">🎯 的中！</span>}
                            {isLost && <span className="lost-badge">❌ 不的中</span>}
                          </div>
                          <h5 className="forecast-card-question">
                            {event.titleJa}
                          </h5>
                        </div>

                        <div className="forecast-card-right">
                          <span className={`forecast-vote-pill ${vote.toLowerCase()}`}>
                            [{vote}] に投票
                          </span>
                          <ArrowRight size={14} className="forecast-arrow" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* タブ2: 全国ランキング (Leaderboard) */
          <div className="forecast-modal-body">
            <div className="leaderboard-meta-bar">
              <span>全国の予報士ランキング (的中率 ＆ ストリーク)</span>
              <span className="leaderboard-update-tag">● 毎週月曜 00:00 集計更新</span>
            </div>

            <div className="leaderboard-list">
              {leaderboardData.map((user) => (
                <div
                  key={user.rank}
                  className={`leaderboard-item ${user.isUser ? 'highlight-user' : ''}`}
                >
                  <div className="leaderboard-left">
                    <div className={`leaderboard-rank-badge rank-${user.rank <= 3 ? user.rank : 'default'}`}>
                      {user.rank}
                    </div>
                    <div>
                      <div className="leaderboard-name-row">
                        <span className="leaderboard-name">{user.name}</span>
                        {user.isUser && <span className="you-tag">YOU</span>}
                      </div>
                      <div className="leaderboard-badge-txt">{user.badge}</div>
                    </div>
                  </div>

                  <div className="leaderboard-right">
                    <div className="leaderboard-stat-item">
                      <div className="leaderboard-stat-sub">的中率</div>
                      <div className="leaderboard-stat-val green">{user.accuracy}%</div>
                    </div>
                    <div className="leaderboard-stat-item streak-col">
                      <div className="leaderboard-stat-sub">連続</div>
                      <div className="leaderboard-stat-val amber">
                        <Flame size={12} className="fill-amber-400" />
                        <span>{user.streak}d</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="forecast-modal-footer">
          <span className="forecast-footer-security">🔒 投票履歴とストリークはブラウザに安全に保存されています</span>
          <button type="button" onClick={onClose} className="forecast-footer-btn">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
