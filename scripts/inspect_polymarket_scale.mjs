async function inspectScale() {
  console.log('\n=== Polymarket 全体規模・統計データの調査 ===\n');

  try {
    // 1. アクティブなイベント一覧を取得
    const res = await fetch('https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100&order=volume24hr&ascending=false');
    const events = await res.json();

    let total24hVol = 0;
    let totalAllTimeVol = 0;
    let totalMarketsCount = 0;
    const categoryStats = {};

    events.forEach(ev => {
      const vol24 = parseFloat(ev.volume24hr || 0);
      const volTotal = parseFloat(ev.volume || 0);
      const marketsCount = ev.markets?.length || 1;

      total24hVol += vol24;
      totalAllTimeVol += volTotal;
      totalMarketsCount += marketsCount;

      const cat = ev.tags?.[0]?.label || ev.category || 'Other';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, vol24: 0, volTotal: 0 };
      }
      categoryStats[cat].count += 1;
      categoryStats[cat].vol24 += vol24;
      categoryStats[cat].volTotal += volTotal;
    });

    console.log(`📊 【上位100イベントの集計データ】`);
    console.log(`- 観測イベント数: ${events.length} 件`);
    console.log(`- 内包される個別マーケット（選択肢）総数: ${totalMarketsCount} 件`);
    console.log(`- 上位100件の24時間取引高: $${Math.round(total24hVol).toLocaleString()} (約 ${Math.round(total24hVol * 155 / 100000000).toLocaleString()} 億円/日)`);
    console.log(`- 上位100件の累計取引高: $${Math.round(totalAllTimeVol).toLocaleString()} (約 ${Math.round(totalAllTimeVol * 155 / 100000000).toLocaleString()} 億円)\n`);

    console.log(`🏆 【世界の上位メガイベント TOP 5】`);
    events.slice(0, 5).forEach((ev, i) => {
      console.log(`  ${i + 1}. "${ev.title}"`);
      console.log(`     24h出来高: $${Math.round(ev.volume24hr || 0).toLocaleString()} | 累計出来高: $${Math.round(ev.volume || 0).toLocaleString()}`);
    });

    console.log(`\n📂 【カテゴリ別内訳（上位100件）】`);
    Object.entries(categoryStats)
      .sort((a, b) => b[1].vol24 - a[1].vol24)
      .forEach(([cat, data]) => {
        console.log(`  - [${cat}]: ${data.count}イベント | 24h出来高: $${Math.round(data.vol24).toLocaleString()}`);
      });

  } catch (err) {
    console.error('Error fetching scale data:', err);
  }
}

inspectScale();
