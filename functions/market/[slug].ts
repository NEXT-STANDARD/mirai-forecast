/**
 * 未来レーダー (MiraiRadar.com) - 個別トピック用 SSR メタタグ ＆ OGPルーター
 * 
 * Twitterbot / クローラーに対して、動的OGP画像とメタタグを即時注入
 */

interface Env {
  ASSETS: {
    fetch: (request: Request | URL) => Promise<Response>;
  };
}

export const onRequest = async (context: {
  request: Request;
  params: { slug: string };
  env: Env;
}) => {
  const userAgent = context.request.headers.get('user-agent') || '';
  const isBot = /twitterbot|facebookexternalhit|line|discordbot|slackbot|applebot|googlebot/i.test(userAgent);
  const url = new URL(context.request.url);
  const slug = context.params.slug as string;

  // 1. 一般ユーザー（ブラウザ）からのアクセスの場合は、SPAの index.html を返す
  if (!isBot) {
    return context.env.ASSETS.fetch(new URL('/', context.request.url));
  }

  // 2. クローラー（Twitterbot等）の場合は、動的OGPメタタグ付きHTMLを生成して返す
  let title = '世界の集合知 × 日本の世論 金融ターミナル';
  let worldProb = 50;
  let japanProb = 50;

  try {
    const polyRes = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`);
    if (polyRes.ok) {
      const events = await polyRes.json();
      if (events && events[0] && events[0].markets && events[0].markets[0]) {
        title = events[0].title;
        const market = events[0].markets[0];
        if (market.outcomePrices) {
          const parsed = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
          if (Array.isArray(parsed) && parsed[0]) {
            worldProb = Math.round(parseFloat(parsed[0]) * 100);
          }
        }
      }
    }
  } catch {}

  const ogImageUrl = `https://mirairadar.com/api/og?title=${encodeURIComponent(title)}&world=${worldProb}&japan=${japanProb}`;
  const gap = Math.abs(worldProb - japanProb);

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} ｜ 未来レーダー (MiraiRadar.com)</title>
  <meta name="description" content="世界のリアルマネー予測（YES ${worldProb}%）と日本の世論（YES ${japanProb}%）。世論ギャップ ${gap}% を観測中。あなたはどう思う？">
  
  <!-- Open Graph / X Card Meta Tags -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="未来レーダー ｜ MiraiRadar">
  <meta property="og:title" content="【世界の確率 vs 日本の世論】${escapeHtml(title)}">
  <meta property="og:description" content="🌍 世界のリアルマネー：YES ${worldProb}% ⚡ 🇯🇵 日本の世論：YES ${japanProb}%（ギャップ ${gap}%）">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:url" content="${url.href}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@MiraiRadar">
  <meta name="twitter:creator" content="@MiraiRadar">
  <meta name="twitter:title" content="【世界の確率 vs 日本の世論】${escapeHtml(title)}">
  <meta name="twitter:description" content="🌍 世界のリアルマネー：YES ${worldProb}% ⚡ 🇯🇵 日本の世論：YES ${japanProb}%">
  <meta name="twitter:image" content="${ogImageUrl}">

  <meta http-equiv="refresh" content="0;url=${url.href}">
</head>
<body>
  <p>リダイレクト中... <a href="${url.href}">${escapeHtml(title)}</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=120, s-maxage=300',
    },
  });
};

function escapeHtml(unsafe: string) {
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
