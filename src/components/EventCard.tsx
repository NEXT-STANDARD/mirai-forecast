import React from 'react';
import type { MarketItem } from '../types';
import { TrendingUp, TrendingDown, Share2, Sparkles } from 'lucide-react';

interface EventCardProps {
  item: MarketItem;
  userVote: 'YES' | 'NO' | null;
  onVote: (eventId: string, choice: 'YES' | 'NO') => void;
  onOpenModal: (item: MarketItem) => void;
  onOpenShare: (item: MarketItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  item,
  userVote,
  onVote,
  onOpenModal,
  onOpenShare,
}) => {
  const isUp = item.probChange24h > 0;
  const gap = Math.abs(item.worldProbYes - item.japanVotes.percentYes);
  const isBigGap = gap >= 20;

  return (
    <div className="event-card">
      {/* カードヘッダー */}
      <div className="event-card-header">
        <div className="event-tag-group">
          <span className="category-pill-sm">{item.categoryLabel}</span>
          {isBigGap && (
            <span className="gap-tag">
              ⚡ ギャップ {gap}%
            </span>
          )}
        </div>
        <div className={`change-indicator ${isUp ? 'positive' : 'negative'}`}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isUp ? `+${item.probChange24h}%` : `${item.probChange24h}%`}</span>
        </div>
      </div>

      {/* タイトル */}
      <h3
        className="event-card-title"
        onClick={() => onOpenModal(item)}
      >
        {item.titleJa}
      </h3>

      {/* 2本の対比バー（世界 vs 日本） */}
      <div className="card-comparison-bars">
        {/* 世界 */}
        <div className="bar-row">
          <div className="bar-label">
            <span className="dot world"></span>
            <span>世界予測 (Polymarket)</span>
          </div>
          <div className="bar-value world">YES {item.worldProbYes}%</div>
        </div>
        <div className="mini-progress-track">
          <div
            className="mini-progress-fill world"
            style={{ width: `${item.worldProbYes}%` }}
          ></div>
        </div>

        {/* 日本 */}
        <div className="bar-row mt-2">
          <div className="bar-label">
            <span className="dot japan"></span>
            <span>日本世論 (投票集計)</span>
          </div>
          <div className="bar-value japan">YES {item.japanVotes.percentYes}%</div>
        </div>
        <div className="mini-progress-track">
          <div
            className="mini-progress-fill japan"
            style={{ width: `${item.japanVotes.percentYes}%` }}
          ></div>
        </div>
      </div>

      {/* AI一言要約 */}
      {item.aiInsight && (
        <div className="card-ai-snippet">
          <Sparkles size={13} className="sparkle-icon" />
          <p>{item.aiInsight.summaryJa.slice(0, 75)}...</p>
        </div>
      )}

      {/* カードフッター（投票＆アクション） */}
      <div className="event-card-footer">
        {item.isExpired || (item.endDate && new Date(item.endDate).getTime() < Date.now()) ? (
          <span className="font-mono text-xs text-slate-400">🏁 投票受付終了</span>
        ) : (
          <div className="card-vote-buttons">
            <button
              onClick={() => onVote(item.id, 'YES')}
              className={`card-vote-btn yes ${userVote === 'YES' ? 'active' : ''}`}
            >
              YES {userVote === 'YES' && '✓'}
            </button>
            <button
              onClick={() => onVote(item.id, 'NO')}
              className={`card-vote-btn no ${userVote === 'NO' ? 'active' : ''}`}
            >
              NO {userVote === 'NO' && '✓'}
            </button>
          </div>
        )}

        <div className="card-actions-right">
          <button
            onClick={() => onOpenShare(item)}
            className="card-icon-btn"
            title="Xで対比をシェア"
          >
            <Share2 size={15} />
          </button>
          <button
            onClick={() => onOpenModal(item)}
            className="card-detail-link"
          >
            詳細
          </button>
        </div>
      </div>
    </div>
  );
};
