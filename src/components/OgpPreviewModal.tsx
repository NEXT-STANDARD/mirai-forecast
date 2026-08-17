import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { X, Copy, Check, Sparkles } from 'lucide-react';

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
  const shareText = `【未来予報：世界の確率 vs 日本の世論】\n「${item.titleJa}」\n\n🌍 世界のお金の予測：YES ${item.worldProbYes}%\n🇯🇵 日本人の投票結果：YES ${item.japanVotes.percentYes}%\n⚡ 世論ギャップ：${gap}%\n\n${item.aiInsight ? `💡 要因：${item.aiInsight.summaryJa.slice(0, 45)}...\n\n` : ''}#未来予報 #Polymarket #集合知 #未来予測`;

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
        <div className="modal-header">
          <div className="title-wrap">
            <Sparkles size={16} className="sparkle-icon" />
            <span>X（Twitter）シェア用 OGP対比画像シミュレーター</span>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* 自動生成されるOGPカードプレビュー */}
        <div className="ogp-card-preview">
          <div className="ogp-inner">
            <div className="ogp-top">
              <div className="ogp-brand">未来予報 <span>Mirai Forecast</span></div>
              <div className="ogp-badge">世界予測 vs 日本世論</div>
            </div>

            <h3 className="ogp-title">{item.titleJa}</h3>

            <div className="ogp-vs-container">
              {/* 世界 */}
              <div className="ogp-box world">
                <div className="ogp-box-label">🌍 世界の予測 (Polymarket)</div>
                <div className="ogp-box-prob">{item.worldProbYes}%</div>
                <div className="ogp-box-sub">YES 確率</div>
              </div>

              <div className="ogp-vs-divider">VS</div>

              {/* 日本 */}
              <div className="ogp-box japan">
                <div className="ogp-box-label">🇯🇵 日本の世論 (当サイト)</div>
                <div className="ogp-box-prob">{item.japanVotes.percentYes}%</div>
                <div className="ogp-box-sub">YES 支持率</div>
              </div>
            </div>

            <div className="ogp-footer">
              <span>⚡ 認識ギャップ {gap}% 発生中</span>
              <span>あなたはどう思う？ 投票に参加</span>
            </div>
          </div>
        </div>

        {/* 投稿テキスト */}
        <div className="share-text-box">
          <label>シェア用テキスト（自動生成）:</label>
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
            <span>𝕏 でポストする</span>
          </button>
        </div>
      </div>
    </div>
  );
};
