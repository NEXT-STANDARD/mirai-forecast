import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const width = 1200;
const height = 630;

const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="50%" stop-color="#070d1e"/>
      <stop offset="100%" stop-color="#030712"/>
    </linearGradient>

    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>

    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(15, 23, 42, 0.85)"/>
      <stop offset="100%" stop-color="rgba(2, 6, 23, 0.95)"/>
    </linearGradient>

    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- 背景 -->
  <rect width="100%" height="100%" fill="url(#bgGrad)"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>

  <!-- ヘッダーバッジ -->
  <g transform="translate(80, 70)">
    <rect x="0" y="0" width="310" height="34" rx="17" fill="rgba(56, 189, 248, 0.12)" stroke="rgba(56, 189, 248, 0.35)" stroke-width="1"/>
    <circle cx="18" cy="17" r="5" fill="#34d399"/>
    <text x="32" y="22" fill="#38bdf8" font-family="'Helvetica Neue', Arial, sans-serif" font-size="12" font-weight="bold" letter-spacing="1.5">MIRAIRADAR.COM // LIVE</text>
  </g>

  <!-- メインタイトル -->
  <g transform="translate(80, 165)">
    <text x="0" y="0" fill="#ffffff" font-family="'Helvetica Neue', Arial, sans-serif" font-size="50" font-weight="900" letter-spacing="-1">
      世界の集合知 <tspan fill="#38bdf8">×</tspan> 日本の世論
    </text>
    <text x="0" y="48" fill="#94a3b8" font-family="'Helvetica Neue', Arial, sans-serif" font-size="21" font-weight="bold">
      未来予測オルタナティブデータ ＆ リアルタイム世論ターミナル
    </text>
  </g>

  <!-- 3大特徴カード -->
  <g transform="translate(80, 260)">
    <!-- カード 1: 世界マネー vs 日本世論 -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="325" height="235" rx="14" fill="url(#cardGrad)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1"/>
      <rect x="20" y="20" width="65" height="22" rx="4" fill="rgba(56, 189, 248, 0.2)"/>
      <text x="52" y="35" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">GLOBAL</text>
      <text x="20" y="75" fill="#ffffff" font-family="'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="bold">Polymarket リアル連動</text>
      <text x="20" y="105" fill="#94a3b8" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13">世界最大の予測市場から</text>
      <text x="20" y="125" fill="#94a3b8" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13">数億ドルのリアルオッズを取得</text>
      
      <rect x="20" y="165" width="285" height="42" rx="8" fill="rgba(56, 189, 248, 0.08)" stroke="rgba(56, 189, 248, 0.2)" stroke-width="1"/>
      <text x="35" y="191" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold">WORLD ODDS: 50%〜99%</text>
    </g>

    <!-- カード 2: 1秒即時投票 -->
    <g transform="translate(355, 0)">
      <rect x="0" y="0" width="325" height="235" rx="14" fill="url(#cardGrad)" stroke="rgba(244, 63, 94, 0.3)" stroke-width="1"/>
      <rect x="20" y="20" width="60" height="22" rx="4" fill="rgba(244, 63, 94, 0.2)"/>
      <text x="50" y="35" fill="#fb7185" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">VOTE</text>
      <text x="20" y="75" fill="#ffffff" font-family="'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="bold">登録不要・1秒直感投票</text>
      <text x="20" y="105" fill="#94a3b8" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13">あなたのYES/NO投票で</text>
      <text x="20" y="125" fill="#94a3b8" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13">即座に日本のリアル世論が解禁</text>

      <rect x="20" y="165" width="285" height="42" rx="8" fill="rgba(244, 63, 94, 0.08)" stroke="rgba(244, 63, 94, 0.2)" stroke-width="1"/>
      <text x="35" y="191" fill="#fb7185" font-family="monospace" font-size="13" font-weight="bold">JAPAN CONSENSUS: LIVE</text>
    </g>

    <!-- カード 3: WebMCP & AI -->
    <g transform="translate(710, 0)">
      <rect x="0" y="0" width="325" height="235" rx="14" fill="url(#cardGrad)" stroke="rgba(245, 158, 11, 0.3)" stroke-width="1"/>
      <rect x="20" y="20" width="70" height="22" rx="4" fill="rgba(245, 158, 11, 0.2)"/>
      <text x="55" y="35" fill="#fbbf24" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">WEBMCP</text>
      <text x="20" y="75" fill="#ffffff" font-family="'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="bold">AI集合知エコシステム</text>
      <text x="20" y="105" fill="#94a3b8" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13">Claude / Cursor から</text>
      <text x="20" y="125" fill="#94a3b8" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13">直接呼出可能なオープンAPI</text>

      <rect x="20" y="165" width="285" height="42" rx="8" fill="rgba(245, 158, 11, 0.08)" stroke="rgba(245, 158, 11, 0.2)" stroke-width="1"/>
      <text x="35" y="191" fill="#fbbf24" font-family="monospace" font-size="13" font-weight="bold">ENDPOINT: /api/mcp</text>
    </g>
  </g>

  <!-- フッター -->
  <g transform="translate(80, 565)">
    <text x="0" y="0" fill="#64748b" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14">
      完全無料・登録不要 ｜ 経済・テック・国際・スポーツ・エンタメ
    </text>
    <text x="1040" y="0" fill="#38bdf8" font-family="monospace" font-size="14" font-weight="bold" text-anchor="end">
      https://mirairadar.com
    </text>
  </g>
</svg>
`;

async function generate() {
  await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toFile('./public/ogp-main.png');
  console.log('✅ Generated public/ogp-main.png successfully!');
}

generate();
