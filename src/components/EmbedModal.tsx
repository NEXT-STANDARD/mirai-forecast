import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { X, Copy, Check, Code2, Sparkles } from 'lucide-react';
import { useFocusTrap } from '../utils/useFocusTrap';

interface EmbedModalProps {
  item: MarketItem | null;
  onClose: () => void;
}

type EmbedTheme = 'dark' | 'light';
type EmbedLayout = 'card' | 'banner';

// レイアウトごとの推奨サイズ。コードとプレビューで同じ値を使い、見たままを配る。
// card 270: 375px幅（スマホの記事本文）でタイトルが2行になると実高263pxになる実測に基づく。
//   従来の推奨250では下端13pxが切れていた（配布済みの250は変えられないが、今後は切れない値を配る）
const LAYOUT_HEIGHT: Record<EmbedLayout, number> = { card: 270, banner: 160 };
const LAYOUT_MAX_WIDTH: Record<EmbedLayout, number> = { card: 600, banner: 720 };

export const EmbedModal: React.FC<EmbedModalProps> = ({ item, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<EmbedTheme>('dark');
  const [layout, setLayout] = useState<EmbedLayout>('card');
  const modalRef = useFocusTrap(Boolean(item), onClose);

  if (!item) return null;

  // 既定（ダーク・カード）はパラメータなし＝配布済みコードと同じ正規形を保つ
  const params = new URLSearchParams();
  if (theme === 'light') params.set('theme', 'light');
  if (layout === 'banner') params.set('layout', 'banner');
  const query = params.toString() ? `?${params.toString()}` : '';
  const embedPath = `/embed/${item.slug || item.id}${query}`;
  const embedUrl = `https://mirairadar.com${embedPath}`;

  const iframeHeight = LAYOUT_HEIGHT[layout];
  const borderStyle = theme === 'light'
    ? 'border: 1px solid rgba(15, 23, 42, 0.15); border-radius: 12px;'
    : 'border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px;';
  const shadowStyle = theme === 'light'
    ? 'box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08);'
    : 'box-shadow: 0 4px 20px rgba(0,0,0,0.4);';
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="${iframeHeight}" frameborder="0" style="${borderStyle} max-width: ${LAYOUT_MAX_WIDTH[layout]}px; width: 100%; ${shadowStyle}" title="${item.titleJa || item.title} - 未来レーダー世論ウィジェット"></iframe>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="記事・ブログ埋め込みウィジェット">
      <div className="embed-modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
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
            HTMLコードを1つ貼るだけで、<strong>リアルタイム更新されるインタラクティブ世論ウィジェット</strong>を無料で設置できます。
            WordPress（カスタムHTMLブロック）・はてなブログ（HTML編集）・自社サイトやCMSなど、iframe を貼れる媒体でご利用ください。
          </p>

          {/* 表示カスタマイズ */}
          <div className="embed-options-row" role="group" aria-label="ウィジェットの表示設定">
            <div className="embed-opt-group" role="group" aria-label="テーマ">
              <button
                onClick={() => setTheme('dark')}
                className={`embed-opt-btn ${theme === 'dark' ? 'active' : ''}`}
                aria-pressed={theme === 'dark'}
              >
                🌙 ダーク
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`embed-opt-btn ${theme === 'light' ? 'active' : ''}`}
                aria-pressed={theme === 'light'}
              >
                ☀️ ライト
              </button>
            </div>
            <div className="embed-opt-group" role="group" aria-label="レイアウト">
              <button
                onClick={() => setLayout('card')}
                className={`embed-opt-btn ${layout === 'card' ? 'active' : ''}`}
                aria-pressed={layout === 'card'}
              >
                🎴 カード
              </button>
              <button
                onClick={() => setLayout('banner')}
                className={`embed-opt-btn ${layout === 'banner' ? 'active' : ''}`}
                aria-pressed={layout === 'banner'}
              >
                📏 バナー
              </button>
            </div>
          </div>

          {/* ライブプレビュー */}
          <div className="embed-preview-wrapper">
            <div className="preview-label flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles size={13} className="text-amber-400" />
                <span>実際の表示プレビュー</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">{layout === 'banner' ? '100% × 160px' : '100% × 270px'}</span>
            </div>

            <div className="embed-preview-container">
              <iframe
                src={embedPath}
                style={{
                  width: '100%',
                  height: `${iframeHeight}px`,
                  border: theme === 'light' ? '1px solid rgba(15, 23, 42, 0.15)' : '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '12px',
                  background: theme === 'light' ? '#ffffff' : '#040711'
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
            <div className="benefit-item">
              <span className="check-icon">※</span>
              <span>note・Zenn など iframe 埋め込み非対応のサービスでは、スクリーンショット＋銘柄ページへのリンクをご利用ください</span>
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
