/**
 * 未来レーダー (MiraiRadar.com) - 動的OGP画像生成エッジエンドポイント
 * 
 * 1200×630px の超高解像度・金融ターミナル風OGP画像をオンザフライ生成
 * URL例: /api/og?title=米大統領選&world=25&japan=70&gap=45
 */

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const title = url.searchParams.get('title') || '世界の集合知（Polymarket）× 日本の世論';
  const worldProb = parseInt(url.searchParams.get('world') || '50', 10);
  const japanProb = parseInt(url.searchParams.get('japan') || '50', 10);
  const gap = Math.abs(worldProb - japanProb);

  // SVG生成 (1200 x 630 px)
  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#050811" />
        <stop offset="50%" stopColor="#0b1329" />
        <stop offset="100%" stopColor="#03050a" />
      </linearGradient>

      <linearGradient id="worldBarGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>

      <linearGradient id="japanBarGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#be123c" />
        <stop offset="100%" stopColor="#f43f5e" />
      </linearGradient>

      <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>

      <!-- グリッド背景パターン -->
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.8" opacity="0.35" />
      </pattern>
    </defs>

    <!-- 背景 -->
    <rect width="1200" height="630" fill="url(#bgGrad)" />
    <rect width="1200" height="630" fill="url(#grid)" />

    <!-- 装飾ボーダー -->
    <rect x="25" y="25" width="1150" height="580" rx="16" fill="none" stroke="#1e293b" stroke-width="1.5" />
    <rect x="25" y="25" width="1150" height="580" rx="16" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.15" />

    <!-- ヘッダー：ブランドロゴ & ギャップバッジ -->
    <g transform="translate(60, 65)">
      <!-- ロゴアイコン -->
      <rect width="44" height="44" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
      <path d="M 12 30 L 20 20 L 26 24 L 33 13" stroke="url(#logoGrad)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <circle cx="33" cy="13" r="3" fill="#38bdf8" />

      <!-- ブランドテキスト -->
      <text x="58" y="26" font-family="'Plus Jakarta Sans', 'Noto Sans JP', sans-serif" font-size="22" font-weight="900" fill="#ffffff">未来レーダー</text>
      <rect x="180" y="8" width="105" height="24" rx="4" fill="#1e293b" />
      <text x="188" y="24" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="700" fill="#38bdf8">MiraiRadar.com</text>
      <text x="300" y="25" font-family="'Noto Sans JP', sans-serif" font-size="14" font-weight="600" fill="#64748b">世界の集合知（Polymarket） × 日本の世論</text>

      <!-- SPREAD GAP BADGE -->
      <rect x="910" y="4" width="170" height="34" rx="6" fill="#be123c" fill-opacity="0.25" stroke="#f43f5e" stroke-width="1.2" />
      <text x="925" y="26" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="900" fill="#fb7185">⚡ SPREAD: ${gap}%</text>
    </g>

    <!-- メイントピックタイトル -->
    <g transform="translate(60, 155)">
      <rect x="0" y="0" width="1080" height="110" rx="12" fill="#080e1e" stroke="#1e293b" stroke-width="1" />
      <text x="30" y="42" font-family="'Noto Sans JP', sans-serif" font-size="13" font-weight="800" fill="#38bdf8" letter-spacing="1">観測トピック・世論対比</text>
      <text x="30" y="82" font-family="'Noto Sans JP', sans-serif" font-size="28" font-weight="900" fill="#ffffff">${escapeXml(title.slice(0, 42))}${title.length > 42 ? '...' : ''}</text>
    </g>

    <!-- 対比ボックス（世界 vs 日本） -->
    <g transform="translate(60, 290)">
      <!-- 左：世界のリアルマネー (Polymarket) -->
      <g transform="translate(0, 0)">
        <rect width="490" height="195" rx="12" fill="#080e1e" stroke="#1e3a8a" stroke-width="1.5" />
        <rect x="0" y="0" width="490" height="195" rx="12" fill="#0284c7" fill-opacity="0.04" />
        
        <text x="25" y="38" font-family="'Noto Sans JP', sans-serif" font-size="15" font-weight="800" fill="#94a3b8">🌍 世界のリアルマネー予測 (Polymarket)</text>
        <text x="25" y="98" font-family="'JetBrains Mono', monospace" font-size="52" font-weight="900" fill="#38bdf8">YES ${worldProb}%</text>
        
        <!-- プログレスバー -->
        <rect x="25" y="125" width="440" height="12" rx="6" fill="#050811" />
        <rect x="25" y="125" width="${(worldProb / 100) * 440}" height="12" rx="6" fill="url(#worldBarGrad)" />

        <text x="25" y="165" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="700" fill="#64748b">NO: ${100 - worldProb}% ｜ リアルタイム出来高連動</text>
      </g>

      <!-- 中央：VS バッジ -->
      <g transform="translate(505, 75)">
        <circle cx="35" cy="25" r="28" fill="#0f172a" stroke="#fbbf24" stroke-width="2" />
        <text x="24" y="32" font-family="'JetBrains Mono', monospace" font-size="18" font-weight="900" fill="#fbbf24">VS</text>
      </g>

      <!-- 右：日本の世論 (当サイト投票) -->
      <g transform="translate(590, 0)">
        <rect width="490" height="195" rx="12" fill="#080e1e" stroke="#881337" stroke-width="1.5" />
        <rect x="0" y="0" width="490" height="195" rx="12" fill="#f43f5e" fill-opacity="0.04" />

        <text x="25" y="38" font-family="'Noto Sans JP', sans-serif" font-size="15" font-weight="800" fill="#94a3b8">🇯🇵 日本の世論 (当サイト投票)</text>
        <text x="25" y="98" font-family="'JetBrains Mono', monospace" font-size="52" font-weight="900" fill="#f43f5e">YES ${japanProb}%</text>

        <!-- プログレスバー -->
        <rect x="25" y="125" width="440" height="12" rx="6" fill="#050811" />
        <rect x="25" y="125" width="${(japanProb / 100) * 440}" height="12" rx="6" fill="url(#japanBarGrad)" />

        <text x="25" y="165" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="700" fill="#64748b">NO: ${100 - japanProb}% ｜ 国内ユーザー意識調査</text>
      </g>
    </g>

    <!-- フッター -->
    <g transform="translate(60, 565)">
      <circle cx="10" cy="10" r="5" fill="#10b981" />
      <text x="26" y="15" font-family="'Noto Sans JP', sans-serif" font-size="14" font-weight="700" fill="#94a3b8">あなたはどう思う？ 1クリックで世論調査に参加（完全無料） 👉 https://mirairadar.com</text>
      <text x="1080" y="15" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="800" fill="#38bdf8" text-anchor="end">mirairadar.com</text>
    </g>
  </svg>
  `;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600', // 5分〜10分キャッシュ
    },
  });
};

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
