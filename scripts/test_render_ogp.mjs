import sharp from 'sharp';
import fs from 'fs';

async function testRender() {
  const title = "米連邦準備制度（FRB）は9月に0.5%利下げを実施するか？";
  const worldProb = 68;

  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#050811" />
        <stop offset="50%" stop-color="#0b1329" />
        <stop offset="100%" stop-color="#03050a" />
      </linearGradient>
      <linearGradient id="worldBar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0284c7" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0284c7" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
    </defs>

    <style>
      .font-jp { font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans CJK JP', 'Noto Sans JP', 'Meiryo', 'Yu Gothic', sans-serif; }
      .font-mono { font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace; }
    </style>

    <!-- 背景 -->
    <rect width="1200" height="630" fill="url(#bgGrad)" />
    <rect x="25" y="25" width="1150" height="580" rx="16" fill="none" stroke="#1e293b" stroke-width="2" />
    <rect x="25" y="25" width="1150" height="580" rx="16" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.2" />

    <!-- ヘッダー -->
    <g transform="translate(60, 65)">
      <rect width="44" height="44" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
      <path d="M 12 30 L 20 20 L 26 24 L 33 13" stroke="url(#logoGrad)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <circle cx="33" cy="13" r="3" fill="#38bdf8" />

      <text x="58" y="28" class="font-jp" font-size="22" font-weight="bold" fill="#ffffff">未来レーダー</text>
      <rect x="195" y="8" width="120" height="26" rx="4" fill="#1e293b" />
      <text x="203" y="25" class="font-mono" font-size="13" font-weight="bold" fill="#38bdf8">MiraiRadar.com</text>

      <rect x="880" y="4" width="200" height="34" rx="6" fill="#0284c7" fill-opacity="0.2" stroke="#38bdf8" stroke-width="1.2" />
      <text x="895" y="26" class="font-mono" font-size="14" font-weight="bold" fill="#38bdf8">⚡ REALTIME MARKET</text>
    </g>

    <!-- タイトル -->
    <g transform="translate(60, 155)">
      <rect width="1080" height="110" rx="12" fill="#080e1e" stroke="#1e293b" stroke-width="1" />
      <text x="30" y="40" class="font-jp" font-size="13" font-weight="bold" fill="#38bdf8" letter-spacing="1">観測トピック・オッズ速報</text>
      <text x="30" y="82" class="font-jp" font-size="28" font-weight="bold" fill="#ffffff">${title}</text>
    </g>

    <!-- 対比ボックス -->
    <g transform="translate(60, 290)">
      <!-- 世界のリアルマネー -->
      <g transform="translate(0, 0)">
        <rect width="490" height="195" rx="12" fill="#080e1e" stroke="#1e3a8a" stroke-width="1.5" />
        <text x="25" y="38" class="font-jp" font-size="15" font-weight="bold" fill="#94a3b8">世界のリアルマネー予測 (Polymarket)</text>
        <text x="25" y="98" class="font-mono" font-size="52" font-weight="bold" fill="#38bdf8">YES ${worldProb}%</text>
        
        <rect x="25" y="125" width="440" height="12" rx="6" fill="#050811" />
        <rect x="25" y="125" width="${(worldProb / 100) * 440}" height="12" rx="6" fill="url(#worldBar)" />

        <text x="25" y="165" class="font-mono" font-size="14" font-weight="bold" fill="#64748b">NO: ${100 - worldProb}% ｜ スマートマネー集中</text>
      </g>

      <!-- VS バッジ -->
      <g transform="translate(505, 75)">
        <circle cx="35" cy="25" r="28" fill="#0f172a" stroke="#fbbf24" stroke-width="2" />
        <text x="24" y="32" class="font-mono" font-size="18" font-weight="bold" fill="#fbbf24">VS</text>
      </g>

      <!-- 日本の世論 -->
      <g transform="translate(590, 0)">
        <rect width="490" height="195" rx="12" fill="#080e1e" stroke="#881337" stroke-width="1.5" />
        <text x="25" y="38" class="font-jp" font-size="15" font-weight="bold" fill="#94a3b8">日本の世論 (バイアスフリー投票)</text>
        <text x="25" y="98" class="font-mono" font-size="52" font-weight="bold" fill="#f43f5e">YES [ ??% ]</text>
        
        <rect x="25" y="125" width="440" height="12" rx="6" fill="#050811" />
        <rect x="25" y="125" width="220" height="12" rx="6" fill="#be123c" opacity="0.3" />

        <text x="25" y="165" class="font-jp" font-size="14" font-weight="bold" fill="#fbbf24">🔒 投票すると真実の世論が開示されます</text>
      </g>
    </g>

    <!-- フッター -->
    <g transform="translate(60, 565)">
      <circle cx="10" cy="10" r="5" fill="#10b981" />
      <text x="26" y="15" class="font-jp" font-size="14" font-weight="bold" fill="#94a3b8">あなたはどう思う？ 1クリックで世論調査に参加（完全無料）</text>
      <text x="1080" y="15" class="font-mono" font-size="14" font-weight="bold" fill="#38bdf8" text-anchor="end">mirairadar.com</text>
    </g>
  </svg>
  `;

  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/public/assets/test_ogp_output.png', buf);
  console.log('✅ test_ogp_output.png generated successfully!');
}

testRender();
