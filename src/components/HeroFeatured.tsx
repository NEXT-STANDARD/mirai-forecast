import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { Sparkles, CheckCircle2, Share2, Flame, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HeroFeaturedProps {
  event: MarketItem;
  onVote: (eventId: string, choice: 'YES' | 'NO') => void;
  userVote: 'YES' | 'NO' | null;
  onOpenModal: (event: MarketItem) => void;
  onOpenShare: (event: MarketItem) => void;
}

export const HeroFeatured: React.FC<HeroFeaturedProps> = ({
  event,
  onVote,
  userVote,
  onOpenModal,
  onOpenShare,
}) => {
  const [animatingVote, setAnimatingVote] = useState<'YES' | 'NO' | null>(null);

  const handleVote = (choice: 'YES' | 'NO') => {
    setAnimatingVote(choice);
    onVote(event.id, choice);
    
    try {
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.75 }
      });
    } catch {}

    setTimeout(() => setAnimatingVote(null), 600);
  };

  const gap = Math.abs(event.worldProbYes - event.japanVotes.percentYes);
  const isGapSignificant = gap >= 15;

  return (
    <section className="hero-featured-card">
      {/* 上部バッジ */}
      <div className="hero-badge-row">
        <div className="hot-topic-badge">
          <Flame size={14} />
          <span>注目の未来予報</span>
        </div>
        <span className="category-pill">{event.categoryLabel}</span>
        {isGapSignificant && (
          <span className="gap-alert-badge">
            ⚡ ギャップ {gap}%
          </span>
        )}
      </div>

      {/* タイトル */}
      <h2 className="hero-title" onClick={() => onOpenModal(event)}>
        {event.titleJa}
      </h2>

      {/* 対比バーエリア */}
      <div className="hero-comparison-panel">
        {/* 世界 */}
        <div className="comparison-metric-box world">
          <div className="metric-header">
            <div className="metric-source">
              <span className="source-dot world-dot"></span>
              <strong>世界のお金</strong> (Polymarket)
            </div>
            <div className="metric-pct world-pct">
              YES <strong>{event.worldProbYes}%</strong>
            </div>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill world-fill"
              style={{ width: `${event.worldProbYes}%` }}
            ></div>
          </div>
          <div className="metric-footer">
            <span>NO: {event.worldProbNo}%</span>
            <span>24h: {event.probChange24h > 0 ? `+${event.probChange24h}%` : `${event.probChange24h}%`}</span>
          </div>
        </div>

        {/* 日本 */}
        <div className="comparison-metric-box japan">
          <div className="metric-header">
            <div className="metric-source">
              <span className="source-dot japan-dot"></span>
              <strong>日本の世論</strong> (当サイト投票)
            </div>
            <div className="metric-pct japan-pct">
              YES <strong>{event.japanVotes.percentYes}%</strong>
            </div>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill japan-fill"
              style={{ width: `${event.japanVotes.percentYes}%` }}
            ></div>
          </div>
          <div className="metric-footer">
            <span>NO: {100 - event.japanVotes.percentYes}%</span>
            <span>集計: {event.japanVotes.total.toLocaleString()} 票</span>
          </div>
        </div>

        {/* 親指ゾーン：大型投票ボタン & 投票後の1タップシェア導線 */}
        <div className="vote-section-mobile">
          <div className="vote-prompt-row">
            {userVote ? (
              <span className="voted-status-badge">
                <CheckCircle2 size={14} /> 投票済み: <strong>[{userVote}]</strong>
              </span>
            ) : (
              <span className="vote-prompt-text">あなたはどう思う？（親指1タップ投票）</span>
            )}
          </div>

          <div className="vote-buttons-grid">
            <button
              onClick={() => handleVote('YES')}
              className={`vote-btn-large vote-yes ${userVote === 'YES' ? 'selected' : ''} ${animatingVote === 'YES' ? 'pop' : ''}`}
            >
              <span className="btn-icon">👍</span>
              <div className="btn-text-group">
                <span className="btn-main">YES</span>
                <span className="btn-sub">{event.japanVotes.percentYes}% 支持</span>
              </div>
            </button>

            <button
              onClick={() => handleVote('NO')}
              className={`vote-btn-large vote-no ${userVote === 'NO' ? 'selected' : ''} ${animatingVote === 'NO' ? 'pop' : ''}`}
            >
              <span className="btn-icon">👎</span>
              <div className="btn-text-group">
                <span className="btn-main">NO</span>
                <span className="btn-sub">{100 - event.japanVotes.percentYes}% 支持</span>
              </div>
            </button>
          </div>

          {/* 投票後に現れる即座シェアボタン */}
          {userVote && (
            <button
              onClick={() => onOpenShare(event)}
              className="instant-share-btn"
            >
              <Share2 size={16} />
              <span>この世論ギャップ（{gap}%）をXでシェアする</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* AI背景分析スニペット */}
      {event.aiInsight && (
        <div className="hero-ai-snippet-mobile" onClick={() => onOpenModal(event)}>
          <div className="ai-snippet-title">
            <Sparkles size={14} className="sparkle-icon" />
            <span>AI要因分析（タップして全文表示）</span>
          </div>
          <p className="ai-snippet-text">{event.aiInsight.summaryJa}</p>
        </div>
      )}
    </section>
  );
};
