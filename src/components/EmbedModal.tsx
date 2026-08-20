import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { X, Copy, Check, Code2, Sparkles } from 'lucide-react';

interface EmbedModalProps {
  item: MarketItem | null;
  onClose: () => void;
}

export const EmbedModal: React.FC<EmbedModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const [copied, setCopied] = useState(false);
  const embedUrl = `https://mirairadar.com/embed/${item.slug || item.id}`;
  const iframeHeight = '250';
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="${iframeHeight}" frameborder="0" style="border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; max-width: 600px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.4);" title="${item.titleJa || item.title} - 未来レーダー世論ウィジェット"></iframe>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="embed-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="modal-header">
          <div className="title-wrap flex items-center gap-2">
            <Code2 size={18} className="text-cyan-400" />
            <span className="font-extrabold text-sm">記事・ブログ埋め込みウィジェット（Embed）</span>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-scroll">
          <p className="embed-intro-desc">
            note、WordPress、はてなブログ、Zenn、ニュース記事等に以下のHTMLコードを貼り付けるだけで、<strong>常にリアルタイムで更新されるインタラクティブ世論ウィジェット</strong>を無料で設置できます。
          </p>

          {/* ライブプレビュー */}
          <div className="embed-preview-wrapper">
            <div className="preview-label flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles size={13} className="text-amber-400" />
                <span>実際の表示プレビュー</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">100% Responsive</span>
            </div>

            <div className="embed-preview-container">
              <iframe 
                src={`/embed/${item.slug || item.id}`} 
                style={{
                  width: '100%',
                  height: `${iframeHeight}px`,
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '12px',
                  background: '#040711'
                }}
                title="プレビュー"
              />
            </div>
          </div>

          {/* 埋め込みコード */}
          <div className="share-text-box mt-3">
            <div className="share-label-row flex justify-between items-center">
              <label>HTML埋め込みコード（iframe）:</label>
              <button 
                onClick={handleCopyCode} 
                className="btn-copy-code-inline"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? 'コピー完了！' : 'コードをコピー'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={iframeCode}
              rows={3}
              className="share-textarea font-mono text-xs"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>

          {/* 特典と規約 */}
          <div className="embed-benefit-box">
            <div className="benefit-item">
              <span className="check-icon">✓</span>
              <span>読者が記事内から直接1秒投票可能（離脱防止・滞在時間向上）</span>
            </div>
            <div className="benefit-item">
              <span className="check-icon">✓</span>
              <span>Polymarket世界オッズ ＆ 日本世論が完全自動でリアルタイム更新</span>
            </div>
            <div className="benefit-item">
              <span className="check-icon">✓</span>
              <span>商用利用・ニュース引用・個人ブログ掲載すべて無料（事前許諾不要）</span>
            </div>
          </div>
        </div>

        {/* フッターアクション */}
        <div className="modal-footer">
          <button onClick={handleCopyCode} className="btn-embed-copy-main">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? '埋め込みコードをコピーしました！' : '埋め込みHTMLコードをコピー'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
