import React, { useState, useEffect, useRef } from 'react';
import type { MarketItem } from '../types';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  Sparkles, 
  Flame, 
  TrendingUp, 
  Target,
  Image as ImageIcon
} from 'lucide-react';
import { useFocusTrap } from '../utils/useFocusTrap';
import {
  renderInfographicCanvas,
  downloadInfographic,
  copyInfographicToClipboard,
  getInfographicTweetText,
  type InfographicTemplate,
} from '../utils/infographicGenerator';

interface InfographicStudioModalProps {
  item: MarketItem | null;
  onClose: () => void;
}

export const InfographicStudioModal: React.FC<InfographicStudioModalProps> = ({
  item,
  onClose,
}) => {
  const [template, setTemplate] = useState<InfographicTemplate>('spread');
  const [customNote, setCustomNote] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalRef = useFocusTrap(Boolean(item), onClose);

  useEffect(() => {
    if (!item) return;
    const canvas = renderInfographicCanvas({
      template,
      item,
      customNote: customNote.trim() || undefined,
    });
    canvasRef.current = canvas;
    setPreviewUrl(canvas.toDataURL('image/png'));
  }, [item, template, customNote]);

  if (!item) return null;

  const tweetText = getInfographicTweetText({
    template,
    item,
    customNote: customNote.trim() || undefined,
  });

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const filename = `mirai-radar-${template}-${item.slug || item.id}.png`;
    downloadInfographic(canvasRef.current, filename);
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    const success = await copyInfographicToClipboard(canvasRef.current);
    if (success) {
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(tweetText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleOpenTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="infographic-studio-title">
      <div 
        ref={modalRef}
        className="modal-content animate-scale-in"
        style={{ maxWidth: '980px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-900/50 mb-6">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles size={20} className="text-amber-400 animate-pulse" />
            <h2 id="infographic-studio-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
              𝕏速報インフォグラフィック・スタジオ
            </h2>
            <span className="badge-mcp-status font-mono text-xs">1200×675 HD</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* テンプレートセレクター */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setTemplate('spread')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
              template === 'spread'
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-950/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <Flame size={18} className={template === 'spread' ? 'text-amber-400' : 'text-slate-500'} />
            <div>
              <div className="text-xs font-bold font-mono">01. 世論ギャップ砲</div>
              <div className="text-[11px] text-slate-400">世界オッズと日本世論の激突</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTemplate('mover')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
              template === 'mover'
                ? 'bg-rose-950/80 border-rose-400 text-rose-300 shadow-lg shadow-rose-950/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <TrendingUp size={18} className={template === 'mover' ? 'text-rose-400' : 'text-slate-500'} />
            <div>
              <div className="text-xs font-bold font-mono">02. 急変アラート</div>
              <div className="text-[11px] text-slate-400">海外オッズの急動意速報</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTemplate('oracle')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
              template === 'oracle'
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <Target size={18} className={template === 'oracle' ? 'text-emerald-400' : 'text-slate-500'} />
            <div>
              <div className="text-xs font-bold font-mono">03. 的中オラクル</div>
              <div className="text-[11px] text-slate-400">結果確定・答え合わせ</div>
            </div>
          </button>
        </div>

        {/* プレビュー画像エリア */}
        <div className="mb-6 rounded-2xl overflow-hidden border border-cyan-900/70 shadow-2xl bg-black/80">
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt="インフォグラフィック速報プレビュー" 
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
              className="w-full h-auto block"
            />
          ) : (
            <div className="py-24 text-center text-slate-500 text-sm font-mono">
              レンダリング中...
            </div>
          )}
        </div>

        {/* 独自インテリジェンス所見（編集用） */}
        <div className="mb-6 bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <label className="block text-xs font-bold text-slate-300 mb-2">
            💡 編集部・独自インテリジェンス所見（画像内の①に即時反映 / 任意）:
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="（例：米連邦地裁の最新口頭弁論を受け、欧米スマートマネーが勝率を一気に織り込み開始）"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        {/* 𝕏 投稿用テキストエリア */}
        <div className="mb-6 bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">📝 𝕏（Twitter）投稿用テキスト:</span>
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-200 transition cursor-pointer"
            >
              {copiedText ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedText ? 'コピー完了！' : 'テキストをコピー'}</span>
            </button>
          </div>
          <textarea
            readOnly
            value={tweetText}
            rows={5}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 leading-relaxed focus:outline-none resize-none"
          />
        </div>

        {/* アクションボタン群 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition shadow-lg shadow-cyan-900/30 cursor-pointer"
          >
            <Download size={16} />
            <span>画像をダウンロード</span>
          </button>

          <button
            type="button"
            onClick={handleCopyImage}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm transition cursor-pointer"
          >
            {copiedImage ? <Check size={16} className="text-emerald-400" /> : <ImageIcon size={16} />}
            <span>{copiedImage ? '画像コピー完了！' : '画像をクリップボードにコピー'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenTwitter}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold text-sm transition shadow-lg cursor-pointer"
          >
            <Share2 size={16} />
            <span>𝕏 でポスト画面を開く</span>
          </button>
        </div>
      </div>
    </div>
  );
};
