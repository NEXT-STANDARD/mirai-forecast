import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { X, Copy, Check, Sparkles, Share2, ExternalLink } from 'lucide-react';

interface OgpPreviewModalProps {
  item: MarketItem | null;
  onClose: () => void;
  userVote?: 'YES' | 'NO' | null;
}

export const OgpPreviewModal: React.FC<OgpPreviewModalProps> = ({
  item,
  onClose,
}) => {
  if (!item) return null;

  const [copied, setCopied] = useState(false);

  const gap = Math.abs(item.worldProbYes - item.japanVotes.percentYes);
  const shareUrl = `https://mirairadar.com`;
  
  // Xアルゴリズム最適化テキスト
  const shareText = `【未来レーダー：世界の確率 vs 日本の世論⚡️】
「${item.titleJa}」

🌍 世界のお金（Polymarket）：YES ${item.worldProbYes}%
🇯🇵 日本の世論（当サイト）：YES ${item.japanVotes.percentYes}%
⚡️ 世論ギャップ：${gap}%

世界と日本で未来の見え方はどう違う？
👇 1クリック世論調査に参加（完全無料）
${shareUrl}

#未来レーダー #MiraiRadar #Polymarket #世論調査`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="ogp-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="modal-header">
          <div className="title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} style={{ color: '#38bdf8' }} />
            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>𝕏（Twitter）シェア ＆ 世論カード</span>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-scroll">
          {/* 自動生成される洗練されたOGPプレビューカード */}
          <div className="ogp-card-container">
            <div className="ogp-card-header">
              <div className="ogp-brand-badge">
                <span className="live-dot-cyan"></span>
                <span>未来レーダー ｜ MiraiRadar.com</span>
              </div>
              <span className="ogp-gap-badge">⚡ SPREAD GAP: {gap}%</span>
            </div>

            <h3 className="ogp-card-title">{item.titleJa}</h3>

            <div className="ogp-vs-grid">
              {/* 世界のお金 */}
              <div className="ogp-col world">
                <div className="ogp-col-label">🌍 世界のリアルマネー (Polymarket)</div>
                <div className="ogp-col-prob world-text">YES {item.worldProbYes}%</div>
                <div className="ogp-bar-track">
                  <div className="ogp-bar-fill world-bar" style={{ width: `${item.worldProbYes}%` }}></div>
                </div>
                <div className="ogp-col-sub">NO: {item.worldProbNo}% ｜ 24h: ${Math.round(item.volume24hUsd / 1000).toLocaleString()}k</div>
              </div>

              {/* VS セパレータ */}
              <div className="ogp-vs-middle">
                <div className="vs-badge">VS</div>
              </div>

              {/* 日本の世論 */}
              <div className="ogp-col japan">
                <div className="ogp-col-label">🇯🇵 日本の世論 (当サイト投票)</div>
                <div className="ogp-col-prob japan-text">YES {item.japanVotes.percentYes}%</div>
                <div className="ogp-bar-track">
                  <div className="ogp-bar-fill japan-bar" style={{ width: `${item.japanVotes.percentYes}%` }}></div>
                </div>
                <div className="ogp-col-sub">NO: {100 - item.japanVotes.percentYes}% ｜ 投票数: {item.japanVotes.total.toLocaleString()} 票</div>
              </div>
            </div>

            <div className="ogp-card-footer">
              <span>💡 あなたはどう思う？ 1クリックで世論調査に参加（完全無料）</span>
              <span className="ogp-url-hint">mirairadar.com</span>
            </div>
          </div>

          {/* 投稿テキストエリア */}
          <div className="share-text-box">
            <div className="share-label-row">
              <label>𝕏 投稿用テキスト（自動生成）:</label>
              <span className="text-hint">そのままポストできます</span>
            </div>
            <textarea
              readOnly
              value={shareText}
              rows={6}
              className="share-textarea"
            />
          </div>

          {/* アクションボタン */}
          <div className="ogp-modal-actions">
            <button onClick={handleCopy} className="copy-btn">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'コピーしました！' : 'テキストをコピー'}</span>
            </button>
            <button onClick={handleTwitterShare} className="x-post-btn">
              <Share2 size={16} />
              <span>𝕏 でポストする</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
