import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  Share2, 
  ExternalLink, 
  Download, 
  Globe2 
} from 'lucide-react';

interface OgpPreviewModalProps {
  item: MarketItem | null;
  onClose: () => void;
  userVote?: 'YES' | 'NO' | null;
}

export const OgpPreviewModal: React.FC<OgpPreviewModalProps> = ({
  item,
  onClose,
  userVote,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // ⌨️ Esc キーでモーダルを閉じるアクセシビリティ対応
  React.useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const worldYes = item.worldProbYes;
  const japanYes = item.japanVotes.percentYes;
  const gap = Math.abs(worldYes - japanYes);
  const shareUrl = `https://mirairadar.com/market/${item.slug || item.id}`;

  // ユーザーの立場（YES/NO/未投票）に応じた熱いパーソナライズ文面
  let stanceHeadline = '🚨【世論乖離警報】世界とお茶の間の見解が激突中⚡️';
  let opinionHook = `海外のスマートマネーと日本の世論で大きな温度差が生まれています。\nあなたの直感はどちらが正しいと思いますか？👇`;

  if (userVote === 'YES') {
    stanceHeadline = '【私はYESに投票しました⚡️】';
    opinionHook = worldYes < 50
      ? `世界（Polymarket）はYES ${worldYes}%と慎重派だけど、私は絶対起きる派！\nあなたの直感は世界を上回れるか？👇`
      : `世界マネーもYES ${worldYes}%で過熱中！あなたも同じ見解？👇`;
  } else if (userVote === 'NO') {
    stanceHeadline = '【私はNOに投票しました⚡️】';
    opinionHook = worldYes >= 50
      ? `世界（Polymarket）はYES ${worldYes}%と強気だけど、私は逆張りのNO派！\nあなたの直感はどちらを支持する？👇`
      : `世界もNO ${item.worldProbNo}%で一致！日本の皆さんはどう思いますか？👇`;
  }

  const shareText = `${stanceHeadline}
「${item.titleJa}」

🌍 世界のリアルマネー（Polymarket）：YES ${worldYes}%
🇯🇵 日本の生活者世論（未来レーダー）：YES ${japanYes}%
⚡️ 世論ギャップ：【 ${gap}% の乖離 】

${opinionHook}
${shareUrl}

#未来レーダー #MiraiRadar #Polymarket #世論調査`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 🎨 1200x630px 高解像度 CyberQuant ＆ RGB Chroma Canvas 画像を生成
  const generateCanvasImage = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // 1. 背景（超深層ダークグラデーション）
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.5, '#070d1e');
    bgGrad.addColorStop(1, '#030712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // 2. サイバーグリッド背景
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 630);
      ctx.stroke();
    }
    for (let y = 0; y < 630; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // 3. RGB レインボー外枠ボーダー
    const borderGrad = ctx.createLinearGradient(30, 30, 1170, 600);
    borderGrad.addColorStop(0, '#38bdf8');
    borderGrad.addColorStop(0.25, '#a855f7');
    borderGrad.addColorStop(0.5, '#f43f5e');
    borderGrad.addColorStop(0.75, '#fbbf24');
    borderGrad.addColorStop(1, '#10b981');

    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, 1140, 570);

    // 4. ヘッダー（ブランドロゴ ＆ 乖離アラート）
    // ブランドピル
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(60, 55, 330, 42);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(60, 55, 330, 42);

    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(82, 76, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Noto Sans JP", sans-serif';
    ctx.fillText('未来レーダー', 100, 83);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('// MIRAIRADAR.COM', 220, 82);

    // 乖離アラートバッジ
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.fillRect(800, 55, 340, 42);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(800, 55, 340, 42);

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 18px monospace';
    ctx.fillText(`⚡ SPREAD GAP: ${gap}% 乖離`, 825, 82);

    // 5. 銘柄タイトルブロック
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(60, 120, 1080, 120);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(60, 120, 1080, 120);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px "Noto Sans JP", sans-serif';
    ctx.fillText(item.categoryLabel || '📊 観測マーケット', 85, 152);

    if (userVote) {
      ctx.fillStyle = userVote === 'YES' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
      ctx.fillRect(850, 135, 270, 36);
      ctx.strokeStyle = userVote === 'YES' ? '#10b981' : '#f43f5e';
      ctx.strokeRect(850, 135, 270, 36);

      ctx.fillStyle = userVote === 'YES' ? '#34d399' : '#fb7185';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`あなたの投票: [ ${userVote} ]`, 870, 159);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Noto Sans JP", sans-serif';
    const displayTitle = item.titleJa.length > 38 ? item.titleJa.slice(0, 37) + '...' : item.titleJa;
    ctx.fillText(displayTitle, 85, 205);

    // 6. デュアル対比ブロック（世界 vs 日本）
    // 世界マネー
    ctx.fillStyle = 'rgba(8, 14, 30, 0.95)';
    ctx.fillRect(60, 260, 520, 230);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.strokeRect(60, 260, 520, 230);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px "Noto Sans JP", sans-serif';
    ctx.fillText('🌍 世界のスマートマネー (Polymarket)', 85, 298);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 64px monospace';
    ctx.fillText(`YES ${worldYes}%`, 85, 375);

    // 世界バー
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(85, 410, 470, 16);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(85, 410, (worldYes / 100) * 470, 16);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`24h取引高: $${Math.round((item.volume24hUsd || 0) / 1000).toLocaleString()}k  |  NO: ${100 - worldYes}%`, 85, 455);

    // 日本世論
    ctx.fillStyle = 'rgba(8, 14, 30, 0.95)';
    ctx.fillRect(620, 260, 520, 230);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.strokeRect(620, 260, 520, 230);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px "Noto Sans JP", sans-serif';
    ctx.fillText('🇯🇵 日本の生活者世論 (未来レーダー)', 645, 298);

    ctx.fillStyle = '#10b981';
    ctx.font = '900 64px monospace';
    ctx.fillText(`YES ${japanYes}%`, 645, 375);

    // 日本バー
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(645, 410, 470, 16);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(645, 410, (japanYes / 100) * 470, 16);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`投票総数: ${item.japanVotes.total.toLocaleString()} 票  |  NO: ${100 - japanYes}%`, 645, 455);

    // 7. フッター
    ctx.fillStyle = 'rgba(8, 13, 26, 0.98)';
    ctx.fillRect(60, 510, 1080, 65);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(60, 510, 1080, 65);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 17px "Noto Sans JP", sans-serif';
    ctx.fillText('⚡ あなたの直感はどちらを支持する？ 1秒で投票参加（登録不要・完全無料）', 85, 549);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('https://mirairadar.com', 890, 549);

    return canvas;
  };

  // 画像ダウンロード
  const handleDownloadImage = () => {
    setIsGeneratingImage(true);
    const canvas = generateCanvasImage();
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `mirairadar_${item.slug || item.id}_spread.png`;
    a.click();
    setIsGeneratingImage(false);
  };

  // 画像をクリップボードに直接コピー（Twitter等に即座にCtrl+V可能）
  const handleCopyImage = async () => {
    setIsGeneratingImage(true);
    try {
      const canvas = generateCanvasImage();
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ 'image/png': blob })
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2500);
        } else {
          // フォールバック: 通常ダウンロード
          handleDownloadImage();
        }
        setIsGeneratingImage(false);
      });
    } catch {
      handleDownloadImage();
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ogp-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="modal-header">
          <div className="title-wrap flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-400" />
            <span className="font-extrabold text-sm">𝕏（Twitter）シェア ＆ 世論対比カード</span>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-scroll">
          {/* ⭐️ 自動生成される世論対比プレビューカード */}
          <div className="ogp-card-container">
            <div className="ogp-card-header">
              <div className="ogp-brand-badge">
                <span className="live-dot-cyan"></span>
                <span>未来レーダー ｜ MiraiRadar.com</span>
              </div>
              <span className="ogp-gap-badge">⚡ SPREAD ALERT: {gap}% GAP</span>
            </div>

            <h3 className="ogp-card-title">{item.titleJa}</h3>

            <div className="ogp-vs-grid">
              {/* 世界のお金 */}
              <div className="ogp-col world">
                <div className="ogp-col-label flex items-center gap-1">
                  <Globe2 size={12} className="text-cyan-400" />
                  <span>世界のリアルマネー (Polymarket)</span>
                </div>
                <div className="ogp-col-prob world-text font-mono">YES {worldYes}%</div>
                <div className="ogp-bar-track">
                  <div className="ogp-bar-fill world-bar" style={{ width: `${worldYes}%` }}></div>
                </div>
                <div className="ogp-col-sub font-mono">24h取引高: ${Math.round((item.volume24hUsd || 0) / 1000).toLocaleString()}k</div>
              </div>

              {/* VS セパレータ */}
              <div className="ogp-vs-middle">
                <div className="vs-badge">VS</div>
              </div>

              {/* 日本の世論 */}
              <div className="ogp-col japan">
                <div className="ogp-col-label flex items-center gap-1">
                  <span>🇯🇵</span>
                  <span>日本の生活者世論 (当サイト投票)</span>
                </div>
                <div className="ogp-col-prob japan-text font-mono">YES {japanYes}%</div>
                <div className="ogp-bar-track">
                  <div className="ogp-bar-fill japan-bar" style={{ width: `${japanYes}%` }}></div>
                </div>
                <div className="ogp-col-sub font-mono">投票総数: {item.japanVotes.total.toLocaleString()} 票</div>
              </div>
            </div>

            <div className="ogp-card-footer">
              <span>⚡ あなたの直感はどちらが正しい？ 1秒で投票参加（完全無料）</span>
              <span className="ogp-url-hint font-mono">mirairadar.com</span>
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
              className="share-textarea font-mono"
            />
          </div>

          {/* アクションボタングループ */}
          {/* アクションボタングループ */}
          <div className="ogp-modal-actions">
            <button onClick={handleCopyImage} className="btn-download-ogp-image highlight-copy">
              {copiedImage ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
              <span>{copiedImage ? '画像をコピーしました！' : '🖼️ 画像をコピー (X貼付用)'}</span>
            </button>

            <button onClick={handleDownloadImage} className="btn-download-ogp-image">
              <Download size={15} />
              <span>{isGeneratingImage ? '生成中...' : '💾 画像保存 (1200x630)'}</span>
            </button>

            <button onClick={handleCopy} className="copy-btn">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? 'コピー完了！' : '📝 文章をコピー'}</span>
            </button>

            <button onClick={handleTwitterShare} className="x-post-btn">
              <Share2 size={15} />
              <span>🚀 𝕏 でポストする</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
