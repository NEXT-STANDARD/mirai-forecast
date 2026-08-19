import React, { useMemo } from 'react';
import type { MarketItem } from '../types';
import { 
  Zap, 
  Globe2, 
  Sparkles, 
  Share2, 
  ExternalLink, 
  CheckCircle2, 
  Lock,
  Crown,
  Flame
} from 'lucide-react';

interface SpreadRankingSectionProps {
  events: MarketItem[];
  userVotes: Record<string, 'YES' | 'NO'>;
  onVote: (eventId: string, choice: 'YES' | 'NO') => void;
  onSelectEvent: (event: MarketItem) => void;
  onOpenDetail?: (event: MarketItem) => void;
  onOpenShare?: (event: MarketItem) => void;
}

export const SpreadRankingSection: React.FC<SpreadRankingSectionProps> = ({
  events,
  userVotes,
  onVote,
  onSelectEvent,
  onOpenDetail,
  onOpenShare,
}) => {
  // ⭐️ 世界オッズ vs 日本世論の乖離度（Gap）が大きいTOP 3〜4銘柄を自動抽出
  const topSpreadEvents = useMemo(() => {
    const scored = events.map(ev => {
      const worldYes = ev.worldProbYes;
      // 日本の投票があればその実数値、なければ50%を仮定
      const japanYes = ev.japanVotes.total > 0 ? ev.japanVotes.percentYes : 50;
      const gap = Math.abs(worldYes - japanYes);
      const totalVol = ev.volume24hUsd || 0;
      return {
        event: ev,
        gap,
        worldYes,
        japanYes,
        totalVol,
      };
    });

    // ギャップが大きい順（同率なら出来高順）にソート
    scored.sort((a, b) => {
      if (b.gap !== a.gap) return b.gap - a.gap;
      return b.totalVol - a.totalVol;
    });

    return scored.slice(0, 4);
  }, [events]);

  if (topSpreadEvents.length === 0) return null;

  return (
    <section className="spread-ranking-section">
      {/* ランキングヘッダー */}
      <div className="spread-ranking-header">
        <div className="flex items-center gap-2">
          <div className="ranking-flame-icon">
            <Flame size={18} className="text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="spread-ranking-title">注目の世論スプレッド乖離ランキング</h3>
              <span className="spread-live-badge font-mono">⚡ リアルタイム最大ギャップ</span>
            </div>
            <p className="spread-ranking-subtitle">
              世界のスマートマネー（Polymarket）とお茶の間の直感が最も激突している話題のテーマ
            </p>
          </div>
        </div>
      </div>

      {/* 4カラム・ランキングカードグリッド */}
      <div className="spread-ranking-grid">
        {topSpreadEvents.map(({ event, gap, worldYes, japanYes }, index) => {
          const userVote = userVotes[event.id] || userVotes[event.slug];
          const hasVoted = Boolean(userVote);
          const rankNumber = index + 1;

          // 順位メダル・バッジ装飾
          let rankBadgeClass = 'rank-badge-other';
          let rankIcon = <span className="font-mono">{rankNumber}</span>;
          if (rankNumber === 1) {
            rankBadgeClass = 'rank-badge-gold';
            rankIcon = <Crown size={14} className="text-amber-300" />;
          } else if (rankNumber === 2) {
            rankBadgeClass = 'rank-badge-silver';
          } else if (rankNumber === 3) {
            rankBadgeClass = 'rank-badge-bronze';
          }

          // なぜ乖離しているかのAIインサイト
          const reasonText = event.aiInsight?.whyMovedJa || event.aiInsight?.summaryJa;

          return (
            <div
              key={event.id}
              className={`spread-ranking-card ${rankNumber === 1 ? 'rank-first-card' : ''}`}
              onClick={() => onSelectEvent(event)}
            >
              {/* カード上部：順位バッジ ＆ 乖離ギャップ値 */}
              <div className="spread-card-header">
                <div className="flex items-center gap-1.5">
                  <div className={`rank-badge ${rankBadgeClass}`}>
                    {rankIcon}
                    <span>{rankNumber}位</span>
                  </div>
                  <span className="spread-category-label">{event.categoryLabel}</span>
                </div>

                <div className="spread-gap-pill">
                  <Zap size={11} className="text-amber-400" />
                  <span className="font-mono font-extrabold">{gap}% 乖離</span>
                </div>
              </div>

              {/* 銘柄タイトル */}
              <h4 className="spread-card-title" title={event.titleJa}>
                {event.titleJa}
              </h4>

              {/* ⭐️ デュアル世論スプレッドメーター（世界 vs 日本） */}
              <div className="spread-meter-box">
                <div className="spread-meter-row">
                  <div className="spread-meter-label">
                    <Globe2 size={12} className="text-cyan-400" />
                    <span>世界マネー</span>
                  </div>
                  <div className="spread-meter-track">
                    <div className="spread-meter-bar world-bar" style={{ width: `${worldYes}%` }}></div>
                  </div>
                  <span className="spread-meter-value font-mono text-cyan-400 font-bold">{worldYes}%</span>
                </div>

                <div className="spread-meter-row">
                  <div className="spread-meter-label">
                    <span className="text-xs">🇯🇵</span>
                    <span>日本世論</span>
                  </div>
                  {hasVoted ? (
                    <>
                      <div className="spread-meter-track">
                        <div className="spread-meter-bar japan-bar" style={{ width: `${japanYes}%` }}></div>
                      </div>
                      <span className="spread-meter-value font-mono text-emerald-400 font-bold">{japanYes}%</span>
                    </>
                  ) : (
                    <div className="spread-meter-locked">
                      <Lock size={10} />
                      <span>投票で解禁</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 🎯 1タップ即時投票ボタン */}
              <div className="spread-vote-group" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onVote(event.id, 'YES')}
                  className={`btn-ranking-vote btn-rank-yes ${userVote === 'YES' ? 'active' : ''}`}
                >
                  <span>YES (そう思う)</span>
                  {userVote === 'YES' && <CheckCircle2 size={12} className="text-emerald-400" />}
                </button>

                <button
                  onClick={() => onVote(event.id, 'NO')}
                  className={`btn-ranking-vote btn-rank-no ${userVote === 'NO' ? 'active' : ''}`}
                >
                  <span>NO (起きない)</span>
                  {userVote === 'NO' && <CheckCircle2 size={12} className="text-rose-400" />}
                </button>
              </div>

              {/* 💡 AI要因・カタリスト1行インサイト */}
              {reasonText && (
                <div className="spread-ai-snippet">
                  <Sparkles size={11} className="text-amber-400 flex-shrink-0" />
                  <p className="spread-ai-text">{reasonText}</p>
                </div>
              )}

              {/* カード下部：Xシェア ＆ 詳細リンク */}
              <div className="spread-card-footer" onClick={(e) => e.stopPropagation()}>
                {onOpenShare && (
                  <button
                    onClick={() => onOpenShare(event)}
                    className="btn-spread-share"
                    title="この世論ギャップをXで議論する"
                  >
                    <Share2 size={11} />
                    <span>Xで世論ギャップを議論</span>
                  </button>
                )}

                {onOpenDetail && (
                  <button
                    onClick={() => onOpenDetail(event)}
                    className="btn-spread-detail"
                    title="個別深層分析ページへ"
                  >
                    <span>詳細</span>
                    <ExternalLink size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
