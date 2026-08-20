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
  // ⭐️ SNSクローラー（Twitter, Facebook, LINEボット, Discord, Slack等）のみを対象にし、LINEアプリ内ブラウザやGooglebotはSPA index.htmlへ通す
  const isSnsBot = /twitterbot|facebookexternalhit|linespider|line-poker|discordbot|slackbot|applebot|telegrambot/i.test(userAgent);
  const url = new URL(context.request.url);
  const slug = context.params.slug as string;

  // 1. 一般ユーザー（LINEブラウザ含む）および検索エンジンクローラー（Googlebot等）は、SPAの index.html を返す
  if (!isSnsBot) {
    return context.env.ASSETS.fetch(new URL('/', context.request.url));
  }

  // 2. SNSクローラー（Twitterbot等）の場合は、動的OGPメタタグ付きHTMLを生成して返す
  let title = '世界の集合知 × 日本の世論 金融ターミナル';
  let worldProb: number | null = null;

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

  const probLabel = worldProb !== null ? `YES ${worldProb}%` : 'リアルタイム確率';
  const descText = worldProb !== null
    ? `🌍 世界のリアルマネー予測：YES ${worldProb}% ｜ あなたの直感は？未来レーダーで世論投票！`
    : `🌍 世界最大の予測市場 Polymarket と日本の世論をリアルタイム比較。未来レーダーで直感投票！`;

  const ogImageUrl = worldProb !== null
    ? `https://mirairadar.com/api/og?title=${encodeURIComponent(title)}&world=${worldProb}`
    : `https://mirairadar.com/ogp-main.png`;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} ｜ 未来レーダー (MiraiRadar.com)</title>
  <meta name="description" content="世界のスマートマネー予測（${probLabel}）と日本の生活者世論。未来レーダーで1秒直感投票！">
  
  <!-- Open Graph / X Card Meta Tags -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="未来レーダー ｜ MiraiRadar">
  <meta property="og:title" content="【世界の確率】${escapeHtml(title)}">
  <meta property="og:description" content="${descText}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:url" content="${url.href}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@MiraiRadar">
  <meta name="twitter:creator" content="@MiraiRadar">
  <meta name="twitter:title" content="【世界の確率】${escapeHtml(title)}">
  <meta name="twitter:description" content="${descText}">
  <meta name="twitter:image" content="${ogImageUrl}">
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>世界のリアルマネー確率: ${probLabel}</p>
  <p><a href="${url.href}">未来レーダーで詳細と世論投票を見る</a></p>
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
