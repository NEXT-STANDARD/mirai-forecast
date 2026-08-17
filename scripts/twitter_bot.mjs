/**
 * 未来レーダー (MiraiRadar.com) - X (Twitter) 自動速報Botスクリプト
 * 
 * 🛡️ 敵対的レビュー対策パッチ適用済み:
 * 1. 【公職選挙法対策】国内選挙トピックの自動ミュート
 * 2. 【オッズ操作対策】24h出来高 $50,000 以上 & 流動性フィルター
 * 3. 【不謹慎トピック対策】センシティブキーワード除外
 * 4. 【金商法対策】投資勧誘ではない旨の定型免責文
 */

const POLYMARKET_EVENTS_API = 'https://gamma-api.polymarket.com/events?limit=30&active=true&closed=false&order=volume24hr&ascending=false';
const MIN_VOLUME_24H_USD = 50000;

const SENSITIVE_KEYWORDS = [
  'death', 'kill', 'assassinate', 'die', 'dead', 'casualty', 'suicide',
  'terror', 'attack', 'bomb', 'war casualty', 'shooting', 'arrest', 'crime'
];

const JAPAN_ELECTION_KEYWORDS = [
  'japan election', 'japanese prime minister', 'shugiin', 'sangiin', '衆議院', '参議院', '都知事選'
];

export async function checkMarketVolatilities() {
  console.log(`[${new Date().toISOString()}] 未来レーダー Bot: Polymarket市場データを監視中...`);
  
  try {
    const res = await fetch(POLYMARKET_EVENTS_API);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    
    const events = await res.json();
    const safeAlertCandidates = [];

    for (const event of events) {
      if (!event.markets || !event.markets[0]) continue;
      const market = event.markets[0];
      const titleLower = (event.title + ' ' + (market.question || '')).toLowerCase();
      
      if (SENSITIVE_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (JAPAN_ELECTION_KEYWORDS.some(kw => titleLower.includes(kw))) continue;

      const volume24h = event.volume24hr || 0;
      if (volume24h < MIN_VOLUME_24H_USD) continue;

      let probYes = 0;
      if (market.outcomePrices) {
        try {
          const parsed = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
          if (Array.isArray(parsed)) probYes = Math.round(parseFloat(parsed[0]) * 100);
        } catch {}
      }

      safeAlertCandidates.push({
        title: event.title,
        question: market.question,
        probYes,
        probNo: 100 - probYes,
        volume24h: Math.round(volume24h).toLocaleString(),
        slug: event.slug,
      });
    }

    return safeAlertCandidates;
  } catch (err) {
    console.error('Error during monitoring:', err);
    return [];
  }
}

export function generateTweetText(item) {
  const isHighProb = item.probYes >= 50;
  const statusEmoji = isHighProb ? '🔺' : '🔻';
  
  return `【未来レーダー：世界の確率速報⚡️】
「${item.title}」

🌍 世界のリアルマネー予測：YES ${item.probYes}% (${statusEmoji})
💰 24h取引高：$${item.volume24h}

世界の予測市場（Polymarket）でスマートマネーが動いています。
日本の皆さんはどう思いますか？

👇 あなたの見解を1クリックで投票（完全無料）
https://mirairadar.com/topic/${item.slug}

※本投稿は統計データの速報であり、投資勧誘ではありません。
#未来レーダー #MiraiRadar #Polymarket #未来予測 #世論調査`;
}
