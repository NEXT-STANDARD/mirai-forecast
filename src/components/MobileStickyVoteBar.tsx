import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { Share2, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
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

  const isLocked = !userVote;
  const gap = Math.abs(event.worldProbYes - event.japanVotes.percentYes);

  const handleVote = (choice: 'YES' | 'NO') => {
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
        {isLocked ? (
          <div className="sticky-unvoted-layout">
            <div className="sticky-topic-peek">
              <span className="lock-tag"><Lock size={10} /> 未投票</span>
              <span className="topic-title-short" title={event.titleJa}>
                {event.titleJa.length > 20 ? event.titleJa.slice(0, 19) + '...' : event.titleJa}
              </span>
            </div>

            <div className="sticky-vote-buttons">
              <button
                onClick={() => handleVote('YES')}
                className={`sticky-btn yes ${animatingChoice === 'YES' ? 'pop' : ''}`}
              >
                YES
              </button>
              <button
                onClick={() => handleVote('NO')}
                className={`sticky-btn no ${animatingChoice === 'NO' ? 'pop' : ''}`}
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
              <span className="spread-gap-pill">ギャップ: {gap}%</span>
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
