import type { MarketItem } from '../types';

export type InfographicTemplate = 'spread' | 'mover' | 'oracle';

export interface InfographicOptions {
  template: InfographicTemplate;
  item: MarketItem;
  customNote?: string;
}

/**
 * 🎨 1200x675 (16:9) 高解像度インフォグラフィック速報カードを Canvas に描画
 */
export const renderInfographicCanvas = (
  options: InfographicOptions
): HTMLCanvasElement => {
  const { template, item, customNote } = options;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const worldYes = item.worldProbYes;
  const japanYes = item.japanVotes.percentYes;
  const hasValidJapanVotes = item.japanVotes.total >= 3;
  const gap = Math.abs(worldYes - japanYes);

  // 1. 背景（超深層サイバーグラデーション）
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 675);
  if (template === 'mover') {
    bgGrad.addColorStop(0, '#0f0728');
    bgGrad.addColorStop(0.5, '#090d24');
    bgGrad.addColorStop(1, '#030712');
  } else if (template === 'oracle') {
    bgGrad.addColorStop(0, '#06241a');
    bgGrad.addColorStop(0.5, '#05151e');
    bgGrad.addColorStop(1, '#030712');
  } else {
    bgGrad.addColorStop(0, '#040d21');
    bgGrad.addColorStop(0.5, '#07152b');
    bgGrad.addColorStop(1, '#020617');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 675);

  // 2. サイバーグリッド背景パターン
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1200; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 675);
    ctx.stroke();
  }
  for (let y = 0; y <= 675; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // 3. 上部ヘッダーストライプ ＆ ブランドロゴ
  ctx.fillStyle = '#0b1329';
  ctx.fillRect(40, 30, 1120, 50);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 30, 1120, 50);

  // テンプレート別バッジ
  let badgeText = '⚡ 世界観測速報 ｜ 世論ギャップ砲';
  let badgeColor = '#38bdf8';
  let badgeBg = 'rgba(56, 189, 248, 0.2)';
  if (template === 'mover') {
    badgeText = '🚨 急変アラート ｜ MARKET MOVER';
    badgeColor = '#f43f5e';
    badgeBg = 'rgba(244, 63, 94, 0.2)';
  } else if (template === 'oracle') {
    badgeText = '🎯 的中・決着レポート ｜ TRUTH ORACLE';
    badgeColor = '#10b981';
    badgeBg = 'rgba(16, 185, 129, 0.2)';
  }

  ctx.fillStyle = badgeBg;
  ctx.fillRect(52, 40, 270, 30);
  ctx.strokeStyle = badgeColor;
  ctx.strokeRect(52, 40, 270, 30);

  ctx.font = 'bold 13px "Courier New", monospace, sans-serif';
  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'left';
  ctx.fillText(badgeText, 64, 60);

  // 右上ブランド表記
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText('未来レーダー ｜ MiraiRadar.com', 1140, 60);

  // 4. メインタイトル
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  ctx.textAlign = 'left';
  const title = item.titleJa || item.title;
  const maxTitleLen = 42;
  const displayTitle = title.length > maxTitleLen ? `${title.slice(0, maxTitleLen)}…` : title;
  ctx.fillText(displayTitle, 40, 120);

  // 5. 左右比較ボックス（Polymarket vs 日本世論）
  const boxWidth = 545;
  const boxHeight = 195;
  const boxY = 145;

  // 5A. 左側: 世界のリアルマネー (Polymarket)
  const leftX = 40;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(leftX, boxY, boxWidth, boxHeight);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(leftX, boxY, boxWidth, boxHeight);

  // 左ヘッダー
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('🌐 世界の予測市場（Polymarket）', leftX + 20, boxY + 32);

  // 世界の確率数字
  ctx.font = 'bold 64px "Courier New", monospace, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`${worldYes}%`, leftX + 20, boxY + 110);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  const volFormatted = `$${((item.totalVolumeUsd || item.volume24hUsd || 0) / 1_000_000).toFixed(1)}M`;
  ctx.fillText(`身銭を切るリアルオッズ ｜ 市場規模: ${volFormatted}`, leftX + 20, boxY + 140);

  // ゲージバー（世界）
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.fillRect(leftX + 20, boxY + 155, boxWidth - 40, 16);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(leftX + 20, boxY + 155, (boxWidth - 40) * (worldYes / 100), 16);

  // 5B. 右側: 日本の生活者世論 (未来レーダー)
  const rightX = 615;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(rightX, boxY, boxWidth, boxHeight);
  ctx.strokeStyle = hasValidJapanVotes ? 'rgba(244, 63, 94, 0.4)' : 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rightX, boxY, boxWidth, boxHeight);

  // 右ヘッダー
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#f43f5e';
  ctx.fillText('🇯🇵 日本のリアル生世論（未来レーダー）', rightX + 20, boxY + 32);

  // 日本の確率数字
  ctx.font = 'bold 64px "Courier New", monospace, sans-serif';
  ctx.fillStyle = hasValidJapanVotes ? '#f43f5e' : '#94a3b8';
  ctx.fillText(hasValidJapanVotes ? `${japanYes}%` : '--%', rightX + 20, boxY + 110);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`完全無料・非胴元1秒投票 ｜ 投票数: n=${item.japanVotes.total}`, rightX + 20, boxY + 140);

  // ゲージバー（日本）
  ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
  ctx.fillRect(rightX + 20, boxY + 155, boxWidth - 40, 16);
  if (hasValidJapanVotes) {
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(rightX + 20, boxY + 155, (boxWidth - 40) * (japanYes / 100), 16);
  }

  // 6. 中央スプレッド乖離バッジ（帯）
  const bannerY = 360;
  ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
  ctx.fillRect(40, bannerY, 1120, 52);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, bannerY, 1120, 52);

  ctx.font = 'bold 18px "Hiragino Kaku Gothic ProN", sans-serif';
  ctx.fillStyle = '#f59e0b';
  ctx.textAlign = 'center';
  if (hasValidJapanVotes) {
    ctx.fillText(`🔥【 世界と日本の世論ギャップ（スプレッド）: ${gap}% の乖離 】`, 600, bannerY + 33);
  } else {
    ctx.fillText(`📊【 日本世論サンプル収集中 (現在 n=${item.japanVotes.total}) ｜ 今すぐ投票で世論形成 】`, 600, bannerY + 33);
  }

  // 7. インテリジェンス・ポイント解説ボックス
  const infoY = 430;
  ctx.fillStyle = 'rgba(11, 19, 38, 0.9)';
  ctx.fillRect(40, infoY, 1120, 155);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, infoY, 1120, 155);

  ctx.textAlign = 'left';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('💡 インテリジェンス・アナリシス（背景・オラクル）', 60, infoY + 28);

  ctx.font = '13px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  ctx.fillStyle = '#cbd5e1';

  let p1 = `① 世界の動意：米欧スマートマネーが織り込む勝率は ${worldYes}%（Polymarket 24時間データ）。`;
  let p2 = hasValidJapanVotes
    ? `② 日本の体感：国内世論は ${japanYes}%。世界との間に ${gap}% の認識格差が発生中。`
    : `② 日本の体感：国内世論は現在投票受付中（n=${item.japanVotes.total}）。`;
  let p3 = `③ 決着判定　：公的発表および公式発表資料に基づいて判定（締切: ${(item.endDate || '').split('T')[0]}）。`;

  if (customNote) {
    p1 = `① 速報所見　：${customNote}`;
  }

  ctx.fillText(p1, 60, infoY + 58);
  ctx.fillText(p2, 60, infoY + 88);
  ctx.fillText(p3, 60, infoY + 118);

  // 8. フッター（アクション導線 ＆ 著作権）
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fillRect(40, 600, 1120, 45);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.strokeRect(40, 600, 1120, 45);

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'left';
  ctx.fillText('🗳️ あなたはどう見る？ 1秒・0円投票で日本の世論を形成 ➔', 60, 628);

  ctx.font = 'bold 13px "Courier New", monospace, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  const marketSlugOrId = item.slug || item.id;
  ctx.fillText(`mirairadar.com/market/${marketSlugOrId}`, 1140, 628);

  return canvas;
};

/**
 * 📥 Canvas を PNG ファイルとしてダウンロード
 */
export const downloadInfographic = (
  canvas: HTMLCanvasElement,
  filename: string = 'mirai-radar-breaking-news.png'
): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 📋 Canvas をクリップボードに画像としてコピー
 */
export const copyInfographicToClipboard = async (
  canvas: HTMLCanvasElement
): Promise<boolean> => {
  try {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve(true);
        } catch (e) {
          console.warn('Clipboard write failed:', e);
          resolve(false);
        }
      }, 'image/png');
    });
  } catch {
    return false;
  }
};

/**
 * 📝 X（Twitter）投稿用の最適化テキストを生成
 */
export const getInfographicTweetText = (
  options: InfographicOptions
): string => {
  const { template, item, customNote } = options;
  const worldYes = item.worldProbYes;
  const japanYes = item.japanVotes.percentYes;
  const hasValidJapanVotes = item.japanVotes.total >= 3;
  const gap = Math.abs(worldYes - japanYes);
  const shareUrl = `https://mirairadar.com/market/${item.slug || item.id}`;

  let header = '⚡️【世界観測速報】世界のリアルマネー vs 日本の生世論';
  if (template === 'mover') {
    header = '🚨【急変アラート】海外予測市場でオッズ急動意！';
  } else if (template === 'oracle') {
    header = '🎯【的中オラクル】予測市場の確率通りに決着！';
  }

  const gapText = hasValidJapanVotes
    ? `🔥 世論ギャップ：【 ${gap}% の激突乖離 (n=${item.japanVotes.total}) 】`
    : `🇯🇵 日本世論：現在投票受付中 (n=${item.japanVotes.total})`;

  const noteText = customNote ? `\n💡 考察：${customNote}\n` : '';

  return `${header}
「${item.titleJa || item.title}」

🌍 世界のリアルマネー（Polymarket）：YES ${worldYes}%
🇯🇵 日本の生活者世論（未来レーダー）：YES ${japanYes}%
${gapText}
${noteText}
あなたはどう見ますか？1クリックで世論に投票👇
${shareUrl}

#未来レーダー #MiraiRadar #Polymarket #世論調査 #予測市場`;
};
