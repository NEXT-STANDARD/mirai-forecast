import React, { useState } from 'react';
import { negativeLabel } from '../utils/probabilityLabel';
import type { MarketItem } from '../types';
import { ShieldCheck, Share2, CheckCircle2, ArrowRight, Lock, Sparkles } from 'lucide-react';
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
  const [justUnlocked, setJustUnlocked] = useState(false);

  const isLocked = !userVote;
  const gap = Math.abs(event.worldProbYes - event.japanVotes.percentYes);

  const handleVote = (choice: 'YES' | 'NO') => {
    setAnimatingVote(choice);
    onVote(event.id, choice);
    setJustUnlocked(true);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {}

    setTimeout(() => {
      setAnimatingVote(null);
      setJustUnlocked(false);
    }, 1500);
  };

  // 判定コメント（投票後）
  const isAlignedWithWorld = (userVote === 'YES' && event.worldProbYes >= 50) || (userVote === 'NO' && event.worldProbYes < 50);

  return (
    <div className="terminal-pane orderbook-pane">
      <div className="pane-title-bar">
        <div className="title-text">
          <span className={`dot-radar ${isLocked ? 'locked' : 'live'}`}></span>
          <span>世論板情報 ｜ World vs Japan</span>
        </div>
        {isLocked ? (
          <span className="gap-spread-tag locked"><Lock size={10} /> ロック中</span>
        ) : (
          <span className="gap-spread-tag unlocked">ギャップ: {gap}%</span>
        )}
      </div>

      {/* 板情報（オーダーブック風対比） */}
      <div className={`depth-book-container ${isLocked ? 'is-blurred' : 'is-revealed'} ${justUnlocked ? 'unlock-flash' : ''}`}>
        {/* 未投票時のすりガラス（ロックオーバーレイ） */}
        {isLocked && (
          <div className="depth-lock-overlay">
            <div className="lock-icon-glow">
              <Lock size={22} className="icon-lock" />
            </div>
            <p className="lock-prompt-title">バイアスフリー世論調査</p>
            <p className="lock-prompt-desc">
              先入観を防ぐため数値を非表示にしています。<br />
              <strong>下のボタンであなたの直感を投票</strong>すると、<br />
              世界と日本の世論スプレッドが解禁されます。
            </p>
          </div>
        )}

        {/* 世界のお金 */}
        <div className="depth-row world">
          <div className="depth-info">
            <span className="depth-label">
              {event.originType === 'domestic_poll' ? '🇯🇵 国内独自世論調査' : '🌍 世界のリアルマネー (Polymarket)'}
            </span>
            <span className="depth-price world-color">
              {isLocked
                ? '?? %'
                : event.hasWorldOdds
                ? `YES ${event.worldProbYes}%`
                : event.originType === 'domestic_poll'
                ? '世界オッズなし'
                : '取得なし (取引僅少)'}
            </span>
          </div>
          <div className="depth-bar-track">
            <div
              className="depth-bar-fill world-fill"
              style={{ width: isLocked ? '50%' : event.hasWorldOdds ? `${event.worldProbYes}%` : '0%' }}
            ></div>
          </div>
          <div className="depth-sub">
            {event.hasWorldOdds ? (
              <>
                <span>
                  {negativeLabel(event)}{': '}
                  {isLocked ? '?? %' : `${event.worldProbNo}%`}
                </span>
                <span>24h取引高: ${Math.round(event.volume24hUsd / 1000).toLocaleString()}k</span>
              </>
            ) : (
              <span>{event.originType === 'domestic_poll' ? '日本世論専用・直接投票受付中' : 'オーダーブック流動性待機中'}</span>
            )}
          </div>
        </div>

        {/* スプレッド（世論ギャップ） */}
        <div className="spread-divider">
          <div className="spread-line"></div>
          <span className="spread-label">
            {isLocked
              ? '⚡ SPREAD GAP: [ LOCKED ]'
              : event.hasWorldOdds
              ? `⚡ SPREAD GAP: ${gap}%`
              : `⚡ 日本世論支持率: YES ${event.japanVotes.percentYes}%`}
          </span>
          <div className="spread-line"></div>
        </div>

        {/* 日本の世論 */}
        <div className="depth-row japan">
          <div className="depth-info">
            <span className="depth-label">🇯🇵 日本の世論 (当サイト投票)</span>
            <span className="depth-price japan-color">
              {isLocked ? '?? %' : event.japanVotes.total > 0 ? `YES ${event.japanVotes.percentYes}%` : '投票受付中 (0票)'}
            </span>
          </div>
          <div className="depth-bar-track">
            <div
              className="depth-bar-fill japan-fill"
              style={{ width: isLocked ? '50%' : event.japanVotes.total > 0 ? `${event.japanVotes.percentYes}%` : '50%' }}
            ></div>
          </div>
          <div className="depth-sub">
            <span>NO: {isLocked ? '?? %' : event.japanVotes.total > 0 ? `${100 - event.japanVotes.percentYes}%` : '0%'}</span>
            <span className="flex items-center gap-1">
              実測投票数: {event.japanVotes.total.toLocaleString()} 票
              {event.japanVotes.total > 0 && event.japanVotes.total < 5 && (
                <span className="sample-badge">サンプル収集中</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 🏁 締切終了 または 🏛️ 公選法第138条の3 選挙期間中ブラックアウト安全バナー */}
      {event.isExpired || (event.endDate && new Date(event.endDate).getTime() < Date.now()) ? (
        <div className="election-blackout-banner opacity-80">
          <div className="blackout-icon">🏁</div>
          <div className="blackout-text">
            <strong>投票受付終了（判定結果確定・アーカイブ）</strong>
            <p>
              このテーマは対象期日（{event.endDate ? event.endDate.split('T')[0] : ''}）を満了したため、新たな世論投票の受付を終了しました。世界のオッズ推移および事前分析の記録を閲覧いただけます。
            </p>
          </div>
        </div>
      ) : event.isElectionBlackout ? (
        <div className="election-blackout-banner">
          <div className="blackout-icon">🏛️</div>
          <div className="blackout-text">
            <strong>公職選挙法第138条の3 遵守ステータス</strong>
            <p>
              選挙公示〜投開票期間中のため、新たな世論投票の受付を一時停止しています。
              世界のリアルマネー予測（Polymarket）の閲覧のみご利用いただけます。
            </p>
          </div>
        </div>
      ) : (
        /* 証券風ワンクリック投票パネル（Order Entry Panel） */
        <div className="order-entry-panel">
          <div className="entry-header">
            <span className="entry-title">
              {isLocked ? '🎯 あなたの直感は？（1秒・完全無料）' : '✅ 投票エントリー確定済み'}
            </span>
            {userVote && (
              <span className="voted-entry-badge">
                <CheckCircle2 size={13} /> [{userVote}] 投票済み
              </span>
            )}
          </div>

          <div className="entry-btn-grid">
            <button
              onClick={() => handleVote('YES')}
              className={`entry-btn yes ${userVote === 'YES' ? 'selected' : ''} ${animatingVote === 'YES' ? 'pop' : ''}`}
            >
              <div className="entry-btn-top">
                <span className="btn-main-label">YES</span>
                {!isLocked && <span className="btn-sub-prob">{event.japanVotes.percentYes}%</span>}
              </div>
              <span className="btn-action-hint">
                {isLocked ? '支持・買い予測' : '支持票投入済み'}
              </span>
            </button>

            <button
              onClick={() => handleVote('NO')}
              className={`entry-btn no ${userVote === 'NO' ? 'selected' : ''} ${animatingVote === 'NO' ? 'pop' : ''}`}
            >
              <div className="entry-btn-top">
                <span className="btn-main-label">NO</span>
                {!isLocked && <span className="btn-sub-prob">{100 - event.japanVotes.percentYes}%</span>}
              </div>
              <span className="btn-action-hint">
                {isLocked ? '反対・売り予測' : '反対票投入済み'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 投票後の分析インサイト ＆ Xシェア導線 */}
        {!isLocked ? (
          <div className="post-vote-block animate-fade-in">
            <div className="vote-alignment-badge">
              <Sparkles size={13} style={{ color: '#fbbf24' }} />
              <span>
                {isAlignedWithWorld
                  ? '🎯 あなたの直感は世界の大口予測と一致しています！'
                  : `⚡ 世界の大口と ${gap}% の見解ギャップがあります！`}
              </span>
            </div>

            <button onClick={() => onOpenShare(event)} className="terminal-share-btn">
              <Share2 size={14} />
              <span>この世論スプレッド（{gap}%）をXでシェア</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ) : (
          <div className="pre-vote-hint">
            <span>👆 どちらかをクリックすると、即座に世論が開示されます</span>
          </div>
        )}

      {/* 免責ポリシー */}
      <div className="terminal-compliance-note">
        <ShieldCheck size={13} />
        <span>非ベッティング・公選法配慮済み世論インテリジェンス</span>
      </div>
    </div>
  );
};
