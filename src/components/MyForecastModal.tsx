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

  // 🏆 リアルタイム・シミュレーション リーダーボード（全国ランキング）
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
      <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="forecast-modal-header">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider">PREDICTOR HUB // 未来予報士</span>
              <h2 className="text-sm font-bold text-slate-100">予報士プロファイル ＆ 全国ランキング</h2>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="forecast-tab-bar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`forecast-tab-btn ${activeTab === 'profile' ? 'active-profile' : ''}`}
          >
            <User size={13} />
            <span>マイ実績 ＆ 履歴</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`forecast-tab-btn ${activeTab === 'leaderboard' ? 'active-leaderboard' : ''}`}
          >
            <Trophy size={13} />
            <span>🏆 全国ランキング (Leaderboard)</span>
          </button>
        </div>

        {activeTab === 'profile' ? (
          /* タブ1: マイ実績 */
          <div className="forecast-body">
            {/* ランク＆ストリーク */}
            <div className="forecast-rank-banner" style={{ borderColor: rankBorderColor }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-400">CURRENT RANK</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{rankTitle}</h3>
                  <p className="text-xs text-slate-300 mt-1">{rankDesc}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="forecast-streak-badge animate-pulse">
                    <Flame size={13} className="text-amber-400 fill-amber-400" />
                    <span>{streak.currentStreak} 日連続投票中</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">最高記録: {streak.maxStreak} 日</span>
                </div>
              </div>

              <div className="forecast-stats-grid">
                <div>
                  <div className="text-[10px] text-slate-400">総投票数</div>
                  <div className="text-base font-bold font-mono text-white">{votedCount} <span className="text-[10px] text-slate-400">件</span></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">結果確定</div>
                  <div className="text-base font-bold font-mono text-cyan-400">{resolvedCount} <span className="text-[10px] text-slate-400">件</span></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">的中率 (Accuracy)</div>
                  <div className="text-base font-bold font-mono text-emerald-400">{accuracyRate !== null ? `${accuracyRate}%` : '集計待機中'}</div>
                </div>
              </div>
            </div>

            {/* 過去の投票履歴リスト */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Target size={13} className="text-cyan-400" />
                  <span>あなたが投票した未来の問い一覧 ({votedItems.length}件)</span>
                </h4>
              </div>

              {votedItems.length === 0 ? (
                <div className="py-8 px-4 text-center border border-dashed border-slate-800 rounded-lg">
                  <p className="text-xs text-slate-400">まだ投票履歴がありません。</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    トップページの各銘柄で「YES / NO」に直感で投票すると、ここに自動記録されます。
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scroll pr-1">
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
                        className={`forecast-history-item ${isWon ? 'border-emerald-500/40 bg-emerald-950/20' : isLost ? 'border-rose-500/30' : ''}`}
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {event.categoryLabel.slice(0, 6)}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400">
                              世界オッズ: {event.worldProbYes}%
                            </span>
                            {isWon && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-500/50 rounded font-bold">
                                🎯 的中！
                              </span>
                            )}
                            {isLost && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-rose-950 text-rose-400 border border-rose-500/50 rounded">
                                ❌ 不的中
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs font-medium text-slate-100 truncate">
                            {event.titleJa}
                          </h5>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${vote === 'YES' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50' : 'bg-rose-950 text-rose-400 border border-rose-800/50'}`}>
                            [{vote}] に投票
                          </span>
                          <ArrowRight size={13} className="text-slate-500" />
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
          <div className="forecast-body">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>全国の予報士ランキング (的中率 ＆ ストリーク)</span>
              <span className="text-[10px] font-mono text-amber-400">● 毎週月曜 00:00 集計更新</span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scroll pr-1">
              {leaderboardData.map((user) => (
                <div
                  key={user.rank}
                  className={`leaderboard-row ${user.isUser ? 'is-user' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`rank-number-pill ${user.rank === 1 ? 'rank-gold' : user.rank === 2 ? 'rank-silver' : user.rank === 3 ? 'rank-bronze' : 'rank-default'}`}>
                      {user.rank}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${user.isUser ? 'text-amber-300' : 'text-white'}`}>
                          {user.name}
                        </span>
                        {user.isUser && (
                          <span className="text-[9px] px-1 bg-amber-400 text-slate-950 rounded font-bold">YOU</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{user.badge}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400">的中率</div>
                      <div className="text-xs font-bold text-emerald-400">{user.accuracy}%</div>
                    </div>
                    <div className="w-12">
                      <div className="text-[10px] text-slate-400">連続</div>
                      <div className="text-xs font-bold text-amber-400 flex items-center justify-end gap-0.5">
                        <Flame size={11} className="text-amber-400 fill-amber-400" />
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
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center text-[11px] text-slate-400">
          <span>🔒 投票履歴とストリークはブラウザに安全に保存されています</span>
          <button onClick={onClose} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-all">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
