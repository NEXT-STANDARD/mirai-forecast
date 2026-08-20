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
    // A. まず Supabase から日本語タイトルを取得
    const supaUrl = `https://wdpygtmqehoepgrueeda.supabase.co/rest/v1/events?or=(slug.eq.${encodeURIComponent(slug)},id.eq.${encodeURIComponent(slug)})&select=title_ja,title_en,question_ja&limit=1`;
    const supaRes = await fetch(supaUrl, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcHlndG1xZWhvZXBncnVlZWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjM5OTQsImV4cCI6MjEwMjUzOTk5NH0.5-uu23zsXOOubjsrVJqK0DfeBkds52uoXxCdpUWHGBU',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcHlndG1xZWhvZXBncnVlZWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjM5OTQsImV4cCI6MjEwMjUzOTk5NH0.5-uu23zsXOOubjsrVJqK0DfeBkds52uoXxCdpUWHGBU'
      }
    });
    if (supaRes.ok) {
      const dbData: any = await supaRes.json();
      if (Array.isArray(dbData) && dbData[0]?.title_ja) {
        title = dbData[0].title_ja;
      }
    }

    // B. Polymarket APIからリアルタイムオッズを取得
    const polyRes = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`);
    if (polyRes.ok) {
      const events: any = await polyRes.json();
      if (events && events[0] && events[0].markets && events[0].markets[0]) {
        if (!title || title === '世界の集合知 × 日本の世論 金融ターミナル') {
          title = events[0].title || title;
        }
        const market = events[0].markets[0];
        if (market.outcomePrices) {
          const parsed = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
          if (Array.isArray(parsed) && parsed[0]) {
            worldProb = Math.round(parseFloat(parsed[0]) * 100);
          }
        }
      }
    }

    // C. 英語タイトルの動的日本語化フォールバック
    if (title && !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(title)) {
      if (/(Bitcoin|Ethereum|Solana|BTC|ETH|SOL)\s+price\s+on\s+([A-Za-z]+)\s*(\d+)?\??:\s*(.+)/i.test(title)) {
        const m = title.match(/(Bitcoin|Ethereum|Solana|BTC|ETH|SOL)\s+price\s+on\s+([A-Za-z]+)\s*(\d+)?\??:\s*(.+)/i)!;
        const nameMap: Record<string, string> = { Bitcoin: 'ビットコイン', BTC: 'ビットコイン', Ethereum: 'イーサリアム', ETH: 'イーサリアム', Solana: 'ソラナ', SOL: 'ソラナ' };
        const monthMap: Record<string, string> = { January: '1月', February: '2月', March: '3月', April: '4月', May: '5月', June: '6月', July: '7月', August: '8月', September: '9月', October: '10月', November: '11月', December: '12月' };
        const name = nameMap[m[1]] || m[1];
        const month = monthMap[m[2]] || m[2];
        const day = m[3] ? `${m[3]}日` : '';
        const target = m[4].replace(/^[<>=]+/, '').replace(/[?？]+$/, '').trim();
        const symbol = m[4].includes('<') ? '未満' : m[4].includes('>') ? '以上' : '到達';
        title = `${name}価格：${month}${day}に${target}ドル${symbol}となるか？`;
      } else {
        title = `【国際市場動向】${title}`;
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
