import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { X, Sparkles, Share2, MessageSquare, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { TerminalChart } from './TerminalChart';

interface EventModalProps {
  item: MarketItem | null;
  onClose: () => void;
  userVote: 'YES' | 'NO' | null;
  onVote: (eventId: string, choice: 'YES' | 'NO') => void;
  onOpenShare: (item: MarketItem) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  item,
  onClose,
  userVote,
  onVote,
  onOpenShare,
}) => {
  if (!item) return null;

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(item.comments || []);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: `c-${Date.now()}`,
      author: '名無しのインサイト探求者',
      avatar: userVote === 'YES' ? '👍' : userVote === 'NO' ? '👎' : '🤔',
      vote: (userVote || 'YES') as 'YES' | 'NO',
      text: commentText.trim(),
      createdAt: 'たった今',
      likes: 1,
    };

    setComments([newComment, ...comments]);
    setCommentText('');
  };

  const gap = Math.abs(item.worldProbYes - item.japanVotes.percentYes);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="modal-header">
          <div className="modal-header-badges">
            <span className="category-pill">{item.categoryLabel}</span>
            <span className="vol-pill">
              総出来高: ${Math.round(item.totalVolumeUsd / 1000).toLocaleString()}k
            </span>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* タイトルと元の問い */}
        <div className="modal-body-scroll">
          <h2 className="modal-title">{item.titleJa}</h2>
          <p className="modal-question-en">
            <strong>Original Question:</strong> {item.question}
          </p>

          {/* 株価ターミナル風 高機能インタラクティブチャート */}
          <TerminalChart
            currentProb={item.worldProbYes}
            isPositive={item.probChange24h >= 0}
            probChange24h={item.probChange24h}
            totalVolumeUsd={item.totalVolumeUsd}
          />

          {/* 世界 vs 日本 比較ダッシュボード */}
          <div className="modal-comparison-grid">
            {/* 世界 */}
            <div className="modal-metric-card world">
              <div className="source-label">
                <span className="dot world"></span>
                <span>世界のお金（Polymarket）</span>
              </div>
              <div className="prob-number world">
                {item.worldProbYes}% <span>YES</span>
              </div>
              <div className="sub-stat">
                NO: {item.worldProbNo}% | 24h: {item.probChange24h > 0 ? `+${item.probChange24h}%` : `${item.probChange24h}%`}
              </div>
            </div>

            {/* 日本 */}
            <div className="modal-metric-card japan">
              <div className="source-label">
                <span className="dot japan"></span>
                <span>日本の世論調査（当サイト集計）</span>
              </div>
              <div className="prob-number japan">
                {item.japanVotes.percentYes}% <span>YES</span>
              </div>
              <div className="sub-stat">
                NO: {100 - item.japanVotes.percentYes}% | {item.japanVotes.total.toLocaleString()} 票集計
              </div>
            </div>
          </div>

          {/* 乖離度の解説 */}
          <div className="gap-explanation-banner">
            <strong>⚡ 世論ギャップ：{gap}%</strong>
            <p>
              {item.worldProbYes > item.japanVotes.percentYes
                ? '世界の予測市場は「実現の可能性が高い」と見ていますが、国内世論は慎重な姿勢を示しています。'
                : '日本の世論調査では高い支持・実現予測が集まっていますが、世界のリアルマネーはより冷静な確率をつけています。'}
            </p>
          </div>

          {/* AI要因分析セクション */}
          {item.aiInsight && (
            <div className="modal-ai-section">
              <div className="ai-section-title">
                <Sparkles size={16} className="sparkle-icon" />
                <span>AIによる変動要因＆背景分析（Gemini 2.5）</span>
              </div>
              <p className="ai-summary">{item.aiInsight.summaryJa}</p>

              <div className="ai-why-box">
                <strong>💡 なぜ今オッズが動いているのか？</strong>
                <p>{item.aiInsight.whyMovedJa}</p>
              </div>

              {item.aiInsight.keyCatalysts && item.aiInsight.keyCatalysts.length > 0 && (
                <div className="ai-catalysts">
                  <strong>📌 今後注視すべき重要カタリスト・日程：</strong>
                  <ul>
                    {item.aiInsight.keyCatalysts.map((cat, idx) => (
                      <li key={idx}>{cat}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 投票セクション */}
          <div className="modal-vote-area">
            <div className="vote-title-row">
              <h4>あなたの見解は？（完全無料・匿名投票）</h4>
              {userVote && (
                <span className="voted-tag">
                  <CheckCircle2 size={14} /> [{userVote}] 投票済み
                </span>
              )}
            </div>
            <div className="modal-vote-buttons">
              <button
                onClick={() => onVote(item.id, 'YES')}
                className={`modal-vote-btn yes ${userVote === 'YES' ? 'active' : ''}`}
              >
                👍 YES
              </button>
              <button
                onClick={() => onVote(item.id, 'NO')}
                className={`modal-vote-btn no ${userVote === 'NO' ? 'active' : ''}`}
              >
                👎 NO
              </button>
            </div>
          </div>

          {/* コメント・考察タイムライン */}
          <div className="modal-comments-section">
            <div className="comments-header">
              <div className="title">
                <MessageSquare size={16} />
                <span>コミュニティの考察・議論 ({comments.length})</span>
              </div>
              <button onClick={() => onOpenShare(item)} className="share-link-btn">
                <Share2 size={14} /> Xで結果をシェア
              </button>
            </div>

            <form onSubmit={handleAddComment} className="comment-form">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="あなたの予測の根拠や意見を書き込む..."
                className="comment-input"
              />
              <button type="submit" className="comment-submit-btn">
                投稿
              </button>
            </form>

            <div className="comment-list">
              {comments.map((c) => (
                <div key={c.id} className="comment-bubble">
                  <div className="comment-top">
                    <span className="comment-avatar">{c.avatar}</span>
                    <span className="comment-author">{c.author}</span>
                    <span className={`comment-vote-badge ${c.vote.toLowerCase()}`}>
                      {c.vote}支持
                    </span>
                    <span className="comment-time">{c.createdAt}</span>
                  </div>
                  <p className="comment-body">{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 免責事項 */}
          <div className="modal-disclaimer">
            <ShieldCheck size={14} />
            <span>
              当サイトはPolymarketの公開データを活用した情報キュレーションおよび意識調査メディアです。賭博の提供や投資の勧誘は一切行っていません。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
