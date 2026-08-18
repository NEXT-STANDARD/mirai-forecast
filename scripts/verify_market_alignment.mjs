const POLYMARKET_EVENTS_API = 'https://gamma-api.polymarket.com/events?limit=25&active=true&closed=false&order=volume24hr&ascending=false';

async function verifyAlignment() {
  const res = await fetch(POLYMARKET_EVENTS_API);
  const events = await res.json();

  console.log('\n=== Polymarket データ紐付け整合性（データと質問のズレ）検証 ===\n');

  events.slice(0, 10).forEach((ev, i) => {
    if (!ev.markets || !ev.markets[0]) return;

    // 最も出来高の高い、または1番目のマーケット
    const market = ev.markets[0];
    let prices = market.outcomePrices;
    try { prices = typeof prices === 'string' ? JSON.parse(prices) : prices; } catch {}
    const probYes = prices ? Math.round(parseFloat(prices[0]) * 100) : 50;

    console.log(`[銘柄 ${i + 1}]`);
    console.log(`  親イベント (ev.title)         : "${ev.title}"`);
    console.log(`  子マーケット (market.question): "${market.question}"`);
    console.log(`  選択肢名 (groupItemTitle)     : "${market.groupItemTitle || 'N/A'}"`);
    console.log(`  直結しているYES確率           : ${probYes}%`);
    
    // 判定
    const isSingle = ev.markets.length === 1;
    console.log(`  構造タイプ                   : ${isSingle ? '単一バイナリ (Single)' : `複数選択肢 (${ev.markets.length}候補)`}`);
    console.log(`  紐付け検証                   : ${market.question.includes('?') ? '✅ market.questionそのものにYES確率が完全直結' : '⚠️ 親タイトルと結合が必要'}`);
    console.log('------------------------------------------------------------');
  });
}

verifyAlignment();
