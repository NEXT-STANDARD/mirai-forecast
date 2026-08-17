/**
 * 未来レーダー (MiraiRadar.com) - X (Twitter) 日本市場特化 自動速報Botスクリプト
 */

import { TwitterApi } from 'twitter-api-v2';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// .env 読み込み (フォールバック)
const envPath = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env';
const localEnv = {};
if (fs.existsSync(envPath)) {
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && !k.startsWith('#')) {
        localEnv[k.trim()] = v.join('=').trim();
      }
    });
  } catch {}
}

const apiKey = process.env.TWITTER_API_KEY || localEnv.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET || localEnv.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_ACCESS_TOKEN || localEnv.TWITTER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_ACCESS_SECRET || localEnv.TWITTER_ACCESS_SECRET;

if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
  console.log('Twitter credentials missing, skipping tweet post');
  process.exit(0);
}

const twitterClient = new TwitterApi({
  appKey: apiKey,
  appSecret: apiSecret,
  accessToken: accessToken,
  accessSecret: accessSecret,
});

const POLYMARKET_EVENTS_API = 'https://gamma-api.polymarket.com/events?limit=60&active=true&closed=false&order=volume24hr&ascending=false';
const MIN_VOLUME_24H_USD = 50000;
const POSTED_CACHE_FILE = path.join(process.cwd(), 'scripts', '.posted_events.json');

const SENSITIVE_KEYWORDS = [
  'death', 'kill', 'assassinate', 'die', 'dead', 'casualty', 'suicide',
  'terror', 'attack', 'bomb', 'war casualty', 'shooting', 'arrest', 'crime'
];

const JAPAN_ELECTION_KEYWORDS = [
  'japan election', 'japanese prime minister', 'shugiin', 'sangiin', '衆議院', '参議院', '都知事選'
];

const IRRELEVANT_KEYWORDS = [
  'nfl', 'ncaa', 'wnba', 'lol', 'dota', 'esports', 'college football', 'college basketball',
  'cricket', 'nascar', 'mls', 'golf', 'pga', 'challenger', 'cs2', 'valorant',
  'touchdown', 'interception', 'rebound', 'quarterback'
];

const J_RELEVANCE_BOOSTS = [
  { keywords: ['japan', 'japanese', 'ohtani', 'dodgers', 'sony', 'toyota', 'nintendo', 'boj', 'yen'], multiplier: 6.0 },
  { keywords: ['fed', 'rate cut', 'rate hike', 'interest rate', 'inflation', 'cpi', 'recession', 'bitcoin', 'btc', 'eth', 'crypto', 'dollar', 'gold', 's&p'], multiplier: 4.5 },
  { keywords: ['ai', 'openai', 'gpt', 'gpt-5', 'nvidia', 'musk', 'elon', 'tesla', 'apple', 'google', 'meta', 'spacex', 'starship', 'robot'], multiplier: 4.0 },
  { keywords: ['president', 'trump', 'harris', 'election', 'white house', 'china', 'taiwan', 'tariff', 'putin', 'ukraine'], multiplier: 3.5 },
  { keywords: ['world series', 'mlb', 'oscar', 'grammy', 'nobel', 'tiktok'], multiplier: 3.0 }
];

function translateToJapanese(enTitle) {
  let title = enTitle;
  title = title.replace(/Fed interest rate cut in (.*)\?/i, '米FRBは$1に利下げを実施するか？');
  title = title.replace(/Fed decreases interest rates by (.*) bps in (.*)\?/i, 'FRBは$2に$1bpの利下げを行うか？');
  title = title.replace(/Will Donald Trump win the (\d{4}) US Presidential Election\?/i, '$1年米大統領選：ドナルド・トランプが勝利するか？');
  title = title.replace(/Will Kamala Harris win the (\d{4}) US Presidential Election\?/i, '$1年米大統領選：カマラ・ハリスが勝利するか？');
  title = title.replace(/Bitcoin reach \$(.*) in (\d{4})\?/i, 'ビットコインは$2年内に$1万ドルに到達するか？');
  title = title.replace(/Will OpenAI release (.*) in (\d{4})\?/i, 'OpenAIは$2年内に$1を一般公開するか？');
  title = title.replace(/Shohei Ohtani win (.*) in (\d{4})\?/i, '大谷翔平は$2年に$1を獲得するか？');
  return title;
}

function calculateJRelevance(titleLower, volume24h) {
  let multiplier = 1.0;
  for (const boost of J_RELEVANCE_BOOSTS) {
    if (boost.keywords.some(kw => titleLower.includes(kw))) {
      multiplier = Math.max(multiplier, boost.multiplier);
    }
  }
  return volume24h * multiplier;
}

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

async function generateCardImagePng(title, worldProb) {
  const safeTitle = title.replace(/[<>&'"]/g, '');
  const displayTitle = safeTitle.length > 38 ? safeTitle.slice(0, 36) + '...' : safeTitle;

  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#050811" />
        <stop offset="50%" stop-color="#0b1329" />
        <stop offset="100%" stop-color="#03050a" />
      </linearGradient>
      <linearGradient id="worldBar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0284c7" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
      <linearGradient id="japanBar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#be123c" />
        <stop offset="100%" stop-color="#f43f5e" />
      </linearGradient>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0284c7" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
    </defs>

    <style>
      .font-jp { font-family: 'Noto Sans CJK JP', 'Noto Sans JP', 'IPAGothic', 'IPAexGothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', 'DejaVu Sans', sans-serif; }
      .font-mono { font-family: 'JetBrains Mono', 'DejaVu Sans Mono', 'Courier New', monospace; }
    </style>

    <!-- 背景 -->
    <rect width="1200" height="630" fill="url(#bgGrad)" />

    <!-- 装飾ボーダー -->
    <rect x="25" y="25" width="1150" height="580" rx="16" fill="none" stroke="#1e293b" stroke-width="2" />
    <rect x="25" y="25" width="1150" height="580" rx="16" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.2" />

    <!-- ヘッダー -->
    <g transform="translate(60, 65)">
      <rect width="44" height="44" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
      <path d="M 12 30 L 20 20 L 26 24 L 33 13" stroke="url(#logoGrad)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <circle cx="33" cy="13" r="3" fill="#38bdf8" />

      <text x="58" y="28" class="font-jp" font-size="22" font-weight="bold" fill="#ffffff">未来レーダー</text>
      <rect x="195" y="8" width="125" height="26" rx="4" fill="#1e293b" />
      <text x="203" y="25" class="font-mono" font-size="13" font-weight="bold" fill="#38bdf8">MiraiRadar.com</text>

      <rect x="860" y="4" width="220" height="34" rx="6" fill="#0284c7" fill-opacity="0.2" stroke="#38bdf8" stroke-width="1.2" />
      <text x="875" y="26" class="font-mono" font-size="14" font-weight="bold" fill="#38bdf8">REALTIME MARKET FEED</text>
    </g>

    <!-- タイトル -->
    <g transform="translate(60, 155)">
      <rect width="1080" height="110" rx="12" fill="#080e1e" stroke="#1e293b" stroke-width="1" />
      <text x="30" y="40" class="font-jp" font-size="13" font-weight="bold" fill="#38bdf8" letter-spacing="1">観測トピック・オッズ速報</text>
      <text x="30" y="82" class="font-jp" font-size="28" font-weight="bold" fill="#ffffff">${displayTitle}</text>
    </g>

    <!-- 対比ボックス -->
    <g transform="translate(60, 290)">
      <!-- 世界のリアルマネー -->
      <g transform="translate(0, 0)">
        <rect width="490" height="195" rx="12" fill="#080e1e" stroke="#1e3a8a" stroke-width="1.5" />
        <text x="25" y="38" class="font-jp" font-size="15" font-weight="bold" fill="#94a3b8">世界のリアルマネー予測 (Polymarket)</text>
        <text x="25" y="98" class="font-mono" font-size="52" font-weight="bold" fill="#38bdf8">YES ${worldProb}%</text>
        
        <rect x="25" y="125" width="440" height="12" rx="6" fill="#050811" />
        <rect x="25" y="125" width="${(worldProb / 100) * 440}" height="12" rx="6" fill="url(#worldBar)" />

        <text x="25" y="165" class="font-mono" font-size="14" font-weight="bold" fill="#64748b">NO: ${100 - worldProb}% ｜ スマートマネー集中</text>
      </g>

      <!-- VS バッジ -->
      <g transform="translate(505, 75)">
        <circle cx="35" cy="25" r="28" fill="#0f172a" stroke="#fbbf24" stroke-width="2" />
        <text x="24" y="32" class="font-mono" font-size="18" font-weight="bold" fill="#fbbf24">VS</text>
      </g>

      <!-- 日本の世論（ブラインドロック中） -->
      <g transform="translate(590, 0)">
        <rect width="490" height="195" rx="12" fill="#080e1e" stroke="#881337" stroke-width="1.5" />
        <text x="25" y="38" class="font-jp" font-size="15" font-weight="bold" fill="#94a3b8">日本の世論 (バイアスフリー投票)</text>
        <text x="25" y="98" class="font-mono" font-size="52" font-weight="bold" fill="#f43f5e">YES [ ??% ]</text>
        
        <rect x="25" y="125" width="440" height="12" rx="6" fill="#050811" />
        <rect x="25" y="125" width="220" height="12" rx="6" fill="url(#japanBar)" opacity="0.4" />

        <text x="25" y="165" class="font-jp" font-size="14" font-weight="bold" fill="#fbbf24">投票すると真実の世論が開示されます</text>
      </g>
    </g>

    <!-- フッター -->
    <g transform="translate(60, 565)">
      <circle cx="10" cy="10" r="5" fill="#10b981" />
      <text x="26" y="15" class="font-jp" font-size="14" font-weight="bold" fill="#94a3b8">あなたはどう思う？ 1クリックで世論調査に参加（完全無料）</text>
      <text x="1080" y="15" class="font-mono" font-size="14" font-weight="bold" fill="#38bdf8" text-anchor="end">mirairadar.com</text>
    </g>
  </svg>
  `;

  return await sharp(Buffer.from(svg)).png().toBuffer();
}

export async function runTwitterBotAutoPost() {
  console.log(`[${new Date().toISOString()}] 未来レーダー Bot: 日本市場特化 Polymarket市場を走査中...`);

  try {
    const res = await fetch(POLYMARKET_EVENTS_API);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const events = await res.json();
    const postedList = getPostedEvents();
    const candidateList = [];

    for (const event of events) {
      if (!event.markets || !event.markets[0]) continue;
      const market = event.markets[0];
      const titleLower = (event.title + ' ' + (market.question || '')).toLowerCase();

      // 1. 安全性 ＆ 不適合フィルター
      if (SENSITIVE_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (JAPAN_ELECTION_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (IRRELEVANT_KEYWORDS.some(kw => titleLower.includes(kw))) continue;

      const volume24h = event.volume24hr || 0;
      if (volume24h < MIN_VOLUME_24H_USD) continue;

      const eventId = String(event.id || event.slug);
      if (postedList.includes(eventId)) continue;

      const jScore = calculateJRelevance(titleLower, volume24h);
      candidateList.push({ event, market, volume24h, eventId, score: jScore });
    }

    // 2. 日本親和性スコア順で最上位の未投稿イベントをピックアップ
    candidateList.sort((a, b) => b.score - a.score);

    if (candidateList.length === 0) {
      console.log('現在投稿対象となる新しい日本向け市場はありません。');
      return;
    }

    const topCandidate = candidateList[0];
    const event = topCandidate.event;
    const market = topCandidate.market;
    const eventId = topCandidate.eventId;
    const volume24h = topCandidate.volume24h;

    let probYes = 50;
    if (market.outcomePrices) {
      try {
        const parsed = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
        if (Array.isArray(parsed) && parsed[0]) probYes = Math.round(parseFloat(parsed[0]) * 100);
      } catch {}
    }

    const titleJa = translateToJapanese(event.title);
    console.log(`[X投稿開始] 日本市場特化 対象: ${titleJa} (Score: ${topCandidate.score})`);

    // 3. 特製カード画像 (PNG) を生成
    const pngBuffer = await generateCardImagePng(titleJa, probYes);
    console.log('特製カード画像の生成完了 (1200x630px)');

    // 4. Xに画像をアップロード
    const mediaId = await twitterClient.v1.uploadMedia(pngBuffer, { mimeType: 'image/png' });
    console.log(`画像アップロード完了: Media ID = ${mediaId}`);

    // 5. 【1投稿目】URL完全排除 ＋ 画像添付
    const mainTweetText = `【未来レーダー：世界の確率速報⚡️】
「${titleJa}」

🌍 世界のリアルマネー予測（Polymarket）：YES ${probYes}%
💰 24h取引高：$${Math.round(volume24h).toLocaleString()}（約${Math.round(volume24h * 155 / 10000).toLocaleString()}万円）

世界の予測市場で大口スマートマネーが集中しています。
日本の皆さんの見解はどうですか？

※本投稿は統計データの速報であり、投資勧誘ではありません。
#未来レーダー #MiraiRadar #Polymarket #世論調査`;

    const { data: mainTweet } = await twitterClient.v2.tweet(mainTweetText, {
      media: { media_ids: [mediaId] },
    });
    console.log(`🎉 1投稿目（親ポスト・画像付き）投稿完了: Tweet ID = ${mainTweet.id}`);

    // 6. 【2投稿目】自己リプライ（ツリー）としてURLを投稿
    const replyTweetText = `👇 1クリックで世論調査に参加（完全無料・登録不要）
https://mirairadar.com/topic/${event.slug}

あなたの直感は世界のお金と一致しているか？投票後に世論スプレッドが開示されます。`;

    const { data: replyTweet } = await twitterClient.v2.tweet(replyTweetText, {
      reply: { in_reply_to_tweet_id: mainTweet.id },
    });
    console.log(`💬 2投稿目（ツリー・URLリプライ）投稿完了: Tweet ID = ${replyTweet.id}`);

    savePostedEvent(eventId);
  } catch (err) {
    console.error('Twitter Bot 実行エラー:', err);
  }
}

runTwitterBotAutoPost();
