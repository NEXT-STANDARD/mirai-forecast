import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { ShieldCheck, Share2, CheckCircle2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OrderBookConsensusProps {
  event: MarketItem;
  userVote: 'YES' | 'NO' | null;
  onVote: (eventId: string, choice: 'YES' | 'NO') => void;
  onOpenShare: (event: MarketItem) => void;
}

export const OrderBookConsensus: React.FC<OrderBookConsensusProps> = ({
  event,
  userVote,
  onVote,
  onOpenShare,
}) => {
  const [animatingVote, setAnimatingVote] = useState<'YES' | 'NO' | null>(null);

  const handleVote = (choice: 'YES' | 'NO') => {
    setAnimatingVote(choice);
    onVote(event.id, choice);

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.75 }
      });
    } catch {}

    setTimeout(() => setAnimatingVote(null), 500);
  };

  const gap = Math.abs(event.worldProbYes - event.japanVotes.percentYes);

  return (
    <div className="terminal-pane orderbook-pane">
      <div className="pane-title-bar">
        <div className="title-text">
          <span className="dot-radar live"></span>
          <span>世論板情報 ｜ World vs Japan</span>
        </div>
        <span className="gap-spread-tag">ギャップ: {gap}%</span>
      </div>

      {/* 板情報（オーダーブック風対比） */}
      <div className="depth-book-container">
        {/* 世界のお金 */}
        <div className="depth-row world">
          <div className="depth-info">
            <span className="depth-label">🌍 世界のリアルマネー (Polymarket)</span>
            <span className="depth-price world-color">YES {event.worldProbYes}%</span>
          </div>
          <div className="depth-bar-track">
            <div className="depth-bar-fill world-fill" style={{ width: `${event.worldProbYes}%` }}></div>
          </div>
          <div className="depth-sub">
            <span>NO: {event.worldProbNo}%</span>
            <span>24h取引高: ${Math.round(event.volume24hUsd / 1000).toLocaleString()}k</span>
          </div>
        </div>

        {/* スプレッド（世論ギャップ） */}
        <div className="spread-divider">
          <div className="spread-line"></div>
          <span className="spread-label">⚡ SPREAD GAP: {gap}%</span>
          <div className="spread-line"></div>
        </div>

        {/* 日本の世論 */}
        <div className="depth-row japan">
          <div className="depth-info">
            <span className="depth-label">🇯🇵 日本の世論 (当サイト投票)</span>
            <span className="depth-price japan-color">YES {event.japanVotes.percentYes}%</span>
          </div>
          <div className="depth-bar-track">
            <div className="depth-bar-fill japan-fill" style={{ width: `${event.japanVotes.percentYes}%` }}></div>
          </div>
          <div className="depth-sub">
            <span>NO: {100 - event.japanVotes.percentYes}%</span>
            <span>有効投票数: {event.japanVotes.total.toLocaleString()} 票</span>
          </div>
        </div>
      </div>

      {/* 証券風ワンクリック投票パネル（Order Entry Panel） */}
      <div className="order-entry-panel">
        <div className="entry-header">
          <span className="entry-title">世論投票エントリー（無料・匿名）</span>
          {userVote && (
            <span className="voted-entry-badge">
              <CheckCircle2 size={13} /> [{userVote}] 確定済み
            </span>
          )}
        </div>

        <div className="entry-btn-grid">
          <button
            onClick={() => handleVote('YES')}
            className={`entry-btn yes ${userVote === 'YES' ? 'selected' : ''} ${animatingVote === 'YES' ? 'pop' : ''}`}
          >
            <div className="entry-btn-top">
              <span className="btn-main-label">YES (そう思う)</span>
              <span className="btn-sub-prob">{event.japanVotes.percentYes}%</span>
            </div>
            <span className="btn-action-hint">クリックで支持票を投入</span>
          </button>

          <button
            onClick={() => handleVote('NO')}
            className={`entry-btn no ${userVote === 'NO' ? 'selected' : ''} ${animatingVote === 'NO' ? 'pop' : ''}`}
          >
            <div className="entry-btn-top">
              <span className="btn-main-label">NO (違う)</span>
              <span className="btn-sub-prob">{100 - event.japanVotes.percentYes}%</span>
            </div>
            <span className="btn-action-hint">クリックで反対票を投入</span>
          </button>
        </div>

        {/* Xシェア導線 */}
        <button onClick={() => onOpenShare(event)} className="terminal-share-btn">
          <Share2 size={14} />
          <span>この世論スプレッド（{gap}%）をXでシェア</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* 免責ポリシー */}
      <div className="terminal-compliance-note">
        <ShieldCheck size={13} />
        <span>非ベッティング・公選法配慮済み情報端末</span>
      </div>
    </div>
  );
};
