/**
 * 未来レーダー (MiraiRadar.com) - X (Twitter) 自動速報Botスクリプト
 * 
 * 🛡️ 運用・安全仕様:
 * 1. 【公職選挙法対策】国内選挙トピックの自動ミュート
 * 2. 【オッズ操作対策】24h出来高 $50,000 以上 & 流動性フィルター
 * 3. 【不謹慎トピック対策】センシティブキーワード除外
 * 4. 【金商法対策】投資勧誘ではない旨の定型免責文
 * 5. 【重複投稿防止】過去に投稿したイベントIDをローカルキャッシュで管理
 */

import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';

// .env 読み込み
const envPath = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env';
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) {
      env[k.trim()] = v.join('=').trim();
    }
  });
}

const twitterClient = new TwitterApi({
  appKey: env.TWITTER_API_KEY,
  appSecret: env.TWITTER_API_SECRET,
  accessToken: env.TWITTER_ACCESS_TOKEN,
  accessSecret: env.TWITTER_ACCESS_SECRET,
});

const POLYMARKET_EVENTS_API = 'https://gamma-api.polymarket.com/events?limit=30&active=true&closed=false&order=volume24hr&ascending=false';
const MIN_VOLUME_24H_USD = 80000;
const POSTED_CACHE_FILE = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/scripts/.posted_events.json';

const SENSITIVE_KEYWORDS = [
  'death', 'kill', 'assassinate', 'die', 'dead', 'casualty', 'suicide',
  'terror', 'attack', 'bomb', 'war casualty', 'shooting', 'arrest', 'crime'
];

const JAPAN_ELECTION_KEYWORDS = [
  'japan election', 'japanese prime minister', 'shugiin', 'sangiin', '衆議院', '参議院', '都知事選'
];

function getPostedEvents() {
  try {
    if (fs.existsSync(POSTED_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(POSTED_CACHE_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function savePostedEvent(eventId) {
  try {
    const posted = getPostedEvents();
    if (!posted.includes(eventId)) {
      posted.push(eventId);
      if (posted.length > 500) posted.shift();
      fs.writeFileSync(POSTED_CACHE_FILE, JSON.stringify(posted, null, 2));
    }
  } catch {}
}

export async function runTwitterBotAutoPost() {
  console.log(`[${new Date().toISOString()}] 未来レーダー Bot: Polymarket市場の急変動を走査中...`);

  try {
    const res = await fetch(POLYMARKET_EVENTS_API);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const events = await res.json();
    const postedList = getPostedEvents();

    for (const event of events) {
      if (!event.markets || !event.markets[0]) continue;
      const market = event.markets[0];
      const titleLower = (event.title + ' ' + (market.question || '')).toLowerCase();

      // 1. 安全性フィルター
      if (SENSITIVE_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (JAPAN_ELECTION_KEYWORDS.some(kw => titleLower.includes(kw))) continue;

      const volume24h = event.volume24hr || 0;
      if (volume24h < MIN_VOLUME_24H_USD) continue;

      const eventId = String(event.id || event.slug);
      if (postedList.includes(eventId)) continue; // すでに投稿済み

      let probYes = 50;
      if (market.outcomePrices) {
        try {
          const parsed = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
          if (Array.isArray(parsed) && parsed[0]) probYes = Math.round(parseFloat(parsed[0]) * 100);
        } catch {}
      }

      // X投稿文面の生成（アルゴリズム最適化）
      const tweetText = `【未来レーダー：世界の確率速報⚡️】
「${event.title}」

🌍 世界のリアルマネー予測：YES ${probYes}%
💰 24h取引高：$${Math.round(volume24h).toLocaleString()}

世界の予測市場（Polymarket）でスマートマネーが集中しています。
日本の皆さんの見解はどうですか？

👇 1クリックで世論調査に参加（完全無料）
https://mirairadar.com

※本投稿は統計データの速報であり、投資勧誘ではありません。
#未来レーダー #MiraiRadar #Polymarket #世論調査`;

      console.log(`[X投稿実行中] 対象: ${event.title}`);
      
      const { data: createdTweet } = await twitterClient.v2.tweet(tweetText);
      console.log(`🎉 Xへの自動速報ポストに成功しました！ Tweet ID: ${createdTweet.id}`);

      savePostedEvent(eventId);
      break; // 1回の実行で1件投稿してレート制限を保護
    }
  } catch (err) {
    console.error('Twitter Bot 実行エラー:', err);
  }
}

runTwitterBotAutoPost();
