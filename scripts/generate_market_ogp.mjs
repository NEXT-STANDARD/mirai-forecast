#!/usr/bin/env node

/**
 * ==============================================================================
 * 🖼️ 未来レーダー (MiraiRadar.com) - 銘柄別OGP画像 静的一括生成スクリプト
 * ==============================================================================
 * 1200x630 の高品質OGP画像を全有効銘柄向けに静的生成します（sharp + SVG）。
 * n<3 ガードを厳格に適用し、統計的一貫性を保ちます。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { resolvePolymarketOdds } from './resolvePolymarketOdds.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.resolve(ROOT, 'public', 'ogp', 'market');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 環境変数読み込み
const env = {};
if (fs.existsSync(path.join(ROOT, '.env'))) {
  const envStr = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8');
  envStr.split('\n').forEach((line) => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim();
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://wdpygtmqehoepgrueeda.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// テキストのXMLエスケープ
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// タイトルの折り返し分割（最大2行）
function wrapTitle(text, maxCharsPerLine = 24) {
  if (!text) return [''];
  const clean = text.trim();
  if (clean.length <= maxCharsPerLine) {
    return [clean];
  }
  
  // 句読点やスペースで区切りを試みる
  const line1 = clean.slice(0, maxCharsPerLine);
  let line2 = clean.slice(maxCharsPerLine);
  if (line2.length > maxCharsPerLine) {
    line2 = line2.slice(0, maxCharsPerLine - 1) + '…';
  }
  return [line1, line2];
}

async function generateAllMarketOgps() {
  console.log('🖼️ 銘柄別OGP画像の生成を開始します...');

  // 1. 有効銘柄の取得
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ events 取得エラー:', error.message);
    process.exit(1);
  }

  // 2. 投票ログの集計
  const { data: voteLogs } = await supabase
    .from('japan_vote_logs')
    .select('event_id, choice');

  const voteStats = new Map();
  (voteLogs || []).forEach(v => {
    if (!v.event_id) return;
    const stat = voteStats.get(v.event_id) || { yes: 0, no: 0, total: 0 };
    if (v.choice === 'YES') stat.yes++;
    else if (v.choice === 'NO') stat.no++;
    stat.total++;
    voteStats.set(v.event_id, stat);
  });

  // 3. Polymarket リアルタイム市場オッズの読み込み＆多段取得 (N-30, N-33, N-34, N-35, N-36: 単一共有エンジン)
  let marketOdds = {};
  const oddsJsonPath = path.resolve(ROOT, 'public', 'data', 'market_odds.json');
  if (fs.existsSync(oddsJsonPath)) {
    try {
      marketOdds = JSON.parse(fs.readFileSync(oddsJsonPath, 'utf-8'));
    } catch {}
  }

  const oddsMap = new Map(Object.entries(marketOdds));
  try {
    const polyMap = new Map();
    for (const offset of [0, 100, 200, 300, 400]) {
      const pageUrl = `https://gamma-api.polymarket.com/events?limit=100&offset=${offset}&active=true&closed=false&order=volume24hr&ascending=false`;
      const res = await fetch(pageUrl);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          list.forEach(ev => {
            polyMap.set(String(ev.id), ev);
            if (ev.slug) polyMap.set(ev.slug, ev);
          });
        }
      }
    }

    for (const event of events) {
      if (!polyMap.has(String(event.id)) && !polyMap.has(event.slug) && /^\d+$/.test(String(event.id))) {
        try {
          const directRes = await fetch(`https://gamma-api.polymarket.com/events/${event.id}`);
          if (directRes.ok) {
            const directEv = await directRes.json();
            polyMap.set(String(directEv.id), directEv);
            if (directEv.slug) polyMap.set(directEv.slug, directEv);
          }
        } catch {}
      }
    }

    polyMap.forEach((ev, key) => {
      const dbEv = events.find(e => String(e.id) === String(ev.id) || e.slug === ev.slug);
      const odds = resolvePolymarketOdds(ev, dbEv?.title_ja, dbEv?.title_en);
      if (odds) oddsMap.set(key, odds);
    });
  } catch (err) {
    console.warn('Live odds fetch warning in OGP generation:', err.message);
  }

  const width = 1200;
  const height = 630;

  console.log(`🚀 全 ${events.length}件 の有効銘柄 OGP を生成中...`);

  let count = 0;
  for (const event of events) {
    const slug = event.slug || event.id;
    const title = event.title_ja || event.title_en || '未来予測銘柄';
    const lines = wrapTitle(title, 25);
    const categoryLabel = event.category_label || '📊 経済・金利・暗号資産';
    const isDomestic = String(event.id).startsWith('council-') || String(event.id).startsWith('official-') || String(event.id).startsWith('proposal-') || ['japan-lower-house-dissolution-2026', 'sam-altman-world-ai-summit-tokyo', 'boj-rate-hike-september-2026'].includes(String(event.id));

    // 実オッズの厳密解決 (N-30, N-33, N-34)
    const oddsEntry = oddsMap.get(String(event.id)) || oddsMap.get(slug);
    const isPolymarketObserved = !isDomestic && oddsEntry && typeof oddsEntry.probYes === 'number';
    const worldProb = isPolymarketObserved ? oddsEntry.probYes : null;

    // 日本世論
    const stat = voteStats.get(String(event.id)) || { yes: 0, no: 0, total: 0 };
    const n = stat.total;
    const japanProb = n > 0 ? Math.round((stat.yes / n) * 100) : 50;
    const hasConsensus = n >= 3;
    const gap = isPolymarketObserved ? Math.abs(worldProb - japanProb) : null;

    const titleSvg = lines.length === 1
      ? `<text x="80" y="210" fill="#ffffff" font-family="'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif" font-size="38" font-weight="900" letter-spacing="-0.5">${escapeXml(lines[0])}</text>`
      : `<text x="80" y="190" fill="#ffffff" font-family="'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif" font-size="36" font-weight="900" letter-spacing="-0.5">${escapeXml(lines[0])}</text>
         <text x="80" y="240" fill="#ffffff" font-family="'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif" font-size="36" font-weight="900" letter-spacing="-0.5">${escapeXml(lines[1])}</text>`;

    let worldValueText = '';
    if (isPolymarketObserved) {
      worldValueText = `<text x="40" y="105" fill="#38bdf8" font-family="monospace, sans-serif" font-size="52" font-weight="bold">YES ${worldProb}%</text>
         <text x="40" y="150" fill="#94a3b8" font-family="'Noto Sans JP', sans-serif" font-size="17">NO ${100 - worldProb}% ｜ 24h価格連動中</text>`;
    } else if (isDomestic) {
      worldValueText = `<text x="40" y="105" fill="#94a3b8" font-family="'Noto Sans JP', sans-serif" font-size="30" font-weight="bold">日本世論独自調査</text>
         <text x="40" y="150" fill="#64748b" font-family="'Noto Sans JP', sans-serif" font-size="16">世論専用（世界オッズなし）</text>`;
    } else {
      worldValueText = `<text x="40" y="105" fill="#94a3b8" font-family="'Noto Sans JP', sans-serif" font-size="30" font-weight="bold">世界オッズ 取得なし</text>
         <text x="40" y="150" fill="#64748b" font-family="'Noto Sans JP', sans-serif" font-size="16">Polymarket 流動性待機中</text>`;
    }

    const japanValueText = hasConsensus
      ? `<text x="40" y="85" fill="#34d399" font-family="monospace, sans-serif" font-size="44" font-weight="bold">YES ${japanProb}%</text>
         <text x="40" y="130" fill="#94a3b8" font-family="'Noto Sans JP', sans-serif" font-size="16">NO ${100 - japanProb}% ｜ 有効投票: n=${n}</text>`
      : `<text x="40" y="85" fill="#fbbf24" font-family="'Noto Sans JP', sans-serif" font-size="34" font-weight="bold">集計中 (n=${n})</text>
         <text x="40" y="130" fill="#94a3b8" font-family="'Noto Sans JP', sans-serif" font-size="16">あなたの1票で世論オッズ解禁</text>`;

    let gapText = '⚡ SPREAD GAP: 観測中';
    if (isPolymarketObserved) {
      gapText = hasConsensus ? `⚡ SPREAD GAP: ${gap}pt` : `⚡ SPREAD GAP: 観測中`;
    } else if (isDomestic) {
      gapText = hasConsensus ? `⚡ 日本世論YES: ${japanProb}%` : `⚡ 日本世論独自調査`;
    } else {
      gapText = hasConsensus ? `⚡ 日本世論YES: ${japanProb}%` : `⚡ 世界オッズ 取得なし`;
    }

    const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#030712"/>
      <stop offset="50%" stop-color="#080f24"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>

    <linearGradient id="cardBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(15, 23, 42, 0.9)"/>
      <stop offset="100%" stop-color="rgba(2, 6, 23, 0.95)"/>
    </linearGradient>

    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.05)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- 背景 -->
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>

  <!-- 上部メタヘッダー -->
  <g transform="translate(80, 65)">
    <!-- サイトブランドバッジ -->
    <rect x="0" y="0" width="220" height="32" rx="16" fill="rgba(56, 189, 248, 0.12)" stroke="rgba(56, 189, 248, 0.4)" stroke-width="1"/>
    <circle cx="16" cy="16" r="4.5" fill="#38bdf8"/>
    <text x="30" y="21" fill="#38bdf8" font-family="monospace, sans-serif" font-size="12" font-weight="bold" letter-spacing="1">MIRAIRADAR.COM</text>

    <!-- カテゴリバッジ -->
    <rect x="235" y="0" width="190" height="32" rx="16" fill="rgba(255, 255, 255, 0.07)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1"/>
    <text x="330" y="21" fill="#e2e8f0" font-family="'Noto Sans JP', sans-serif" font-size="12" font-weight="bold" text-anchor="middle">${escapeXml(categoryLabel)}</text>
  </g>

  <!-- タイトル -->
  ${titleSvg}

  <!-- メトリクスカード 2連 (N-31: バッジの重なりを完全解消) -->
  <g transform="translate(80, 290)">
    <!-- カード1: 世界オッズ (Polymarket) -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="490" height="210" rx="14" fill="url(#cardBg)" stroke="rgba(56, 189, 248, 0.35)" stroke-width="1.5"/>
      <rect x="25" y="20" width="145" height="24" rx="6" fill="rgba(56, 189, 248, 0.2)"/>
      <text x="97" y="36" fill="#38bdf8" font-family="monospace, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">GLOBAL CONSENSUS</text>
      <text x="180" y="37" fill="#94a3b8" font-family="'Noto Sans JP', sans-serif" font-size="13">${isPolymarketObserved ? '世界のリアルマネー (Polymarket)' : '世界の予測市場 (該当なし)'}</text>

      ${worldValueText}
    </g>

    <!-- カード2: 日本世論 (当サイト投票) -->
    <g transform="translate(550, 0)">
      <rect x="0" y="0" width="490" height="210" rx="14" fill="url(#cardBg)" stroke="${hasConsensus ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.35)'}" stroke-width="1.5"/>
      <rect x="25" y="20" width="135" height="24" rx="6" fill="${hasConsensus ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)'}"/>
      <text x="92" y="36" fill="${hasConsensus ? '#34d399' : '#fbbf24'}" font-family="monospace, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">JAPAN CONSENSUS</text>
      <text x="170" y="37" fill="#94a3b8" font-family="'Noto Sans JP', sans-serif" font-size="13">日本のリアル世論 (当サイト投票)</text>

      <g transform="translate(0, 20)">
        ${japanValueText}
      </g>
    </g>

    <!-- 中央スプレッドバッジ (N-31: 上部中央に配置し文字との重なりを0にする) -->
    <g transform="translate(415, -18)">
      <rect x="0" y="0" width="210" height="36" rx="18" fill="#0f172a" stroke="rgba(244, 63, 94, 0.75)" stroke-width="1.5"/>
      <text x="105" y="23" fill="#fb7185" font-family="monospace, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">${gapText}</text>
    </g>
  </g>

  <!-- フッター -->
  <g transform="translate(80, 565)">
    <text x="0" y="0" fill="#64748b" font-family="'Noto Sans JP', sans-serif" font-size="13.5">
      世界の集合知（Polymarket） × 日本の世論 ｜ 無料・登録不要で1秒投票
    </text>
    <text x="1040" y="0" fill="#38bdf8" font-family="monospace, sans-serif" font-size="14" font-weight="bold" text-anchor="end">
      https://mirairadar.com/market/${escapeXml(slug)}
    </text>
  </g>
</svg>
`;

    const outPath = path.join(OUT_DIR, `${slug}.png`);
    await sharp(Buffer.from(svg))
      .png({ quality: 90 })
      .toFile(outPath);

    count++;
  }

  console.log(`✅ ${count}件 の銘柄別OGP画像を出力完了 (${OUT_DIR})！`);
}

generateAllMarketOgps();
