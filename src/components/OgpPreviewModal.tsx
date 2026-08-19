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
  if (!item) return null;

  const [copied, setCopied] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const worldYes = item.worldProbYes;
  const japanYes = item.japanVotes.percentYes;
  const gap = Math.abs(worldYes - japanYes);
  const shareUrl = `https://mirairadar.com/market/${item.slug}`;

  // ユーザーの立場（YES/NO/未投票）に応じた熱いパーソナライズ文面
  let stanceHeadline = '🚨【世論乖離警報】世界とお茶の間の見解が激突中⚡️';
  let opinionHook = `海外のスマートマネーと日本の世論で大きな温度差が生まれています。\nあなたの直感はどちらが正しいと思いますか？👇`;

  if (userVote === 'YES') {
    stanceHeadline = '【私はYES（そう思う）に投票しました⚡️】';
    opinionHook = worldYes < 50
      ? `世界（Polymarket）はYES ${worldYes}%と慎重派だけど、私は絶対起きる派！\nあなたの直感は世界を上回れるか？👇`
      : `世界マネーもYES ${worldYes}%で過熱中！あなたも同じ見解？👇`;
  } else if (userVote === 'NO') {
    stanceHeadline = '【私はNO（起きない）に投票しました⚡️】';
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

  // 🎨 HTML5 Canvas による 1200x630px 高画質 OGP カード画像のクライアント側即時生成＆ダウンロード
  const handleDownloadImage = () => {
    setIsGeneratingImage(true);
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 背景グラデーション
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGrad.addColorStop(0, '#050811');
    bgGrad.addColorStop(0.5, '#0b1329');
    bgGrad.addColorStop(1, '#03050a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // 2. 外枠ボーダー
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 1140, 570);

    // 3. ヘッダー (ロゴ ＆ ブランド)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('未来レーダー', 70, 85);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('MiraiRadar.com', 230, 85);

    // 乖離バッジ
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.fillRect(800, 55, 330, 42);
    ctx.strokeStyle = '#fbbf24';
    ctx.strokeRect(800, 55, 330, 42);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`⚡ SPREAD ALERT: ${gap}% GAP`, 820, 82);

    // 4. タイトルボックス
    ctx.fillStyle = '#080e1e';
    ctx.fillRect(70, 130, 1060, 120);
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(70, 130, 1060, 120);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('⚡ 世界とお茶の間の見解が激突中！', 100, 165);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    const displayTitle = item.titleJa.length > 34 ? item.titleJa.slice(0, 32) + '...' : item.titleJa;
    ctx.fillText(displayTitle, 100, 215);

    // 5. 対比ボックス（左: 世界マネー / 右: 日本世論）
    // 世界マネー
    ctx.fillStyle = '#080e1e';
    ctx.fillRect(70, 280, 510, 200);
    ctx.strokeStyle = '#1e3a8a';
    ctx.strokeRect(70, 280, 510, 200);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('世界のリアルマネー確率 (Polymarket)', 100, 320);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 58px monospace';
    ctx.fillText(`YES ${worldYes}%`, 100, 390);

    ctx.fillStyle = '#050811';
    ctx.fillRect(100, 420, 450, 14);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(100, 420, (worldYes / 100) * 450, 14);

    // 日本世論
    ctx.fillStyle = '#080e1e';
    ctx.fillRect(620, 280, 510, 200);
    ctx.strokeStyle = '#065f46';
    ctx.strokeRect(620, 280, 510, 200);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('日本の生活者世論 (未来レーダー)', 650, 320);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 58px monospace';
    ctx.fillText(`YES ${japanYes}%`, 650, 390);

    ctx.fillStyle = '#050811';
    ctx.fillRect(650, 420, 450, 14);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(650, 420, (japanYes / 100) * 450, 14);

    // 6. フッター
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(70, 510, 1060, 55);
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(70, 510, 1060, 55);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('⚡ あなたの直感はどちらが正しいと思いますか？', 100, 545);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('1秒投票 ➔ mirairadar.com', 820, 545);

    // ダウンロード実行
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `mirairadar_${item.slug}_spread.png`;
    a.click();
    setIsGeneratingImage(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
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
          <div className="ogp-modal-actions">
            <button onClick={handleDownloadImage} className="btn-download-ogp-image">
              <Download size={15} />
              <span>{isGeneratingImage ? '画像生成中...' : '対比画像を保存 (1200x630)'}</span>
            </button>

            <button onClick={handleCopy} className="copy-btn">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? 'コピー完了！' : '文章をコピー'}</span>
            </button>

            <button onClick={handleTwitterShare} className="x-post-btn">
              <Share2 size={15} />
              <span>𝕏 でポストする</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
