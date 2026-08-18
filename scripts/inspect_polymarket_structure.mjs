const POLYMARKET_EVENTS_API = 'https://gamma-api.polymarket.com/events?limit=15&active=true&closed=false&order=volume24hr&ascending=false';

async function inspectStructure() {
  const res = await fetch(POLYMARKET_EVENTS_API);
  const events = await res.json();

  console.log('\n=== Polymarket イベントデータ構造の調査 ===\n');

  events.slice(0, 8).forEach((ev, i) => {
    console.log(`[イベント ${i + 1}] Title: "${ev.title}"`);
    console.log(`  markets数: ${ev.markets?.length || 0}`);
    
    if (ev.markets && ev.markets.length > 1) {
      console.log(`  🔥 【複数選択肢イベント（Multi-Choice）】`);
      ev.markets.slice(0, 4).forEach(m => {
        let prices = m.outcomePrices;
        try { prices = typeof prices === 'string' ? JSON.parse(prices) : prices; } catch {}
        const yesProb = prices ? Math.round(parseFloat(prices[0]) * 100) : 50;
        console.log(`     - 選択肢（Question/Outcome）: "${m.groupItemTitle || m.question}" ➔ 確率: ${yesProb}%`);
      });
    } else if (ev.markets && ev.markets.length === 1) {
      const m = ev.markets[0];
      let prices = m.outcomePrices;
      try { prices = typeof prices === 'string' ? JSON.parse(prices) : prices; } catch {}
      const yesProb = prices ? Math.round(parseFloat(prices[0]) * 100) : 50;
      console.log(`  ⚡ 【単一バイナリイベント（YES/NO）】`);
      console.log(`     - Question: "${m.question}" ➔ YES確率: ${yesProb}%`);
    }
    console.log('------------------------------------------------------------');
  });
}

inspectStructure();
