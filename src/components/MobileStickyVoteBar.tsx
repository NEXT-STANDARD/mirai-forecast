import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { Share2, CheckCircle2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MobileStickyVoteBarProps {
  event: MarketItem;
  userVote: 'YES' | 'NO' | null;
  onVote: (eventId: string, choice: 'YES' | 'NO') => void;
  onOpenShare: (event: MarketItem) => void;
}

export const MobileStickyVoteBar: React.FC<MobileStickyVoteBarProps> = ({
  event,
  userVote,
  onVote,
  onOpenShare,
}) => {
  const [animatingChoice, setAnimatingChoice] = useState<'YES' | 'NO' | null>(null);

  const isExpired = Boolean(event.isExpired || (event.endDate && new Date(event.endDate).getTime() < Date.now()));
  const isLocked = !userVote;
  const hasEnoughVotes = event.japanVotes.total >= 3;
  const gap = Math.abs(event.worldProbYes - event.japanVotes.percentYes);

  const handleVote = (choice: 'YES' | 'NO') => {
    if (isExpired) return;
    setAnimatingChoice(choice);
    onVote(event.id, choice);

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.85 }
      });
    } catch {}

    setTimeout(() => {
      setAnimatingChoice(null);
    }, 1200);
  };

  return (
    <aside aria-label="モバイルクイック投票バー" className="mobile-sticky-vote-bar">
      <div className="sticky-bar-inner">
        {isExpired ? (
          <div className="sticky-voted-layout">
            <div className="sticky-voted-status">
              <span className="voted-tag bg-slate-800 text-slate-400 border-slate-700 font-mono">
                🏁 投票受付終了（結果確定）
              </span>
            </div>

            <button
              onClick={() => onOpenShare(event)}
              className="sticky-share-cta-btn"
            >
              <Share2 size={13} />
              <span>結果・事前分析をXでシェア</span>
              <ArrowRight size={12} />
            </button>
          </div>
        ) : isLocked ? (
          <div className="sticky-unvoted-layout">
            <div className="sticky-topic-peek">
              <span className="lock-tag font-mono">🎯 観測中: </span>
              <span className="topic-title-short font-bold" title={event.titleJa}>
                {event.titleJa.length > 22 ? event.titleJa.slice(0, 21) + '...' : event.titleJa}
              </span>
            </div>

            <div className="sticky-vote-buttons">
              <button
                onClick={() => handleVote('YES')}
                className={`sticky-btn yes ${animatingChoice === 'YES' ? 'pop' : ''}`}
                title={`YESに投票: ${event.titleJa}`}
              >
                YES
              </button>
              <button
                onClick={() => handleVote('NO')}
                className={`sticky-btn no ${animatingChoice === 'NO' ? 'pop' : ''}`}
                title={`NOに投票: ${event.titleJa}`}
              >
                NO
              </button>
            </div>
          </div>
        ) : (
          <div className="sticky-voted-layout">
            <div className="sticky-voted-status">
              <span className="voted-tag">
                <CheckCircle2 size={12} /> [{userVote}] 投票済み
              </span>
              {/* N-60: 投票したかではなく、サンプル数で開示を判断する。
                  n=1（自分の1票だけ）で乖離を出すと、自分のクリックが
                  世論を作ったように見えてしまう。 */}
              <span className="spread-gap-pill">
                {hasEnoughVotes ? `ギャップ: ${gap}%（n=${event.japanVotes.total}）` : `世論集計中（n=${event.japanVotes.total}）`}
              </span>
            </div>

            <button
              onClick={() => onOpenShare(event)}
              className="sticky-share-cta-btn"
            >
              <Share2 size={13} />
              <span>世論スプレッドをXでシェア</span>
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
