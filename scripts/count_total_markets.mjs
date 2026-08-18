async function countTotal() {
  // Polymarketの全アクティブイベント数をざっくりページングで調査
  let totalEvents = 0;
  let offset = 0;
  const limit = 100;
  let keepFetching = true;

  while (keepFetching && offset < 2000) {
    const res = await fetch(`https://gamma-api.polymarket.com/events?active=true&closed=false&limit=${limit}&offset=${offset}`);
    const data = await res.json();
    totalEvents += data.length;
    if (data.length < limit) {
      keepFetching = false;
    } else {
      offset += limit;
    }
  }

  console.log(`\n🌐 Polymarket 現在稼働中の全アクティブイベント総数: 約 ${totalEvents} 件以上`);
}

countTotal();
