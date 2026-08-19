/**
 * ⚡ 未来レーダー (MiraiRadar.com) - 公式X (Twitter) 【世論スプレッド乖離警報】自動速報Botスクリプト
 * 
 * 役割: 世界マネー確率（Polymarket）と日本世論の最大乖離銘柄を自動検知し、
 * インパクト抜群の対比画像（1200x630px）を添付してXへ自動ツリー投稿する。
 */

import { TwitterApi } from 'twitter-api-v2';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// .env 読み込み
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
const geminiApiKey = process.env.GEMINI_API_KEY || localEnv.GEMINI_API_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY;

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

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const POLYMARKET_EVENTS_API = 'https://gamma-api.polymarket.com/events?limit=60&active=true&closed=false&order=volume24hr&ascending=false';
const MIN_VOLUME_24H_USD = 30000;
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

async function translateSingleWithGemini(rawQuestion) {
  if (!geminiApiKey) return rawQuestion;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
  const prompt = `あなたは金融・オルタナティブデータメディア「未来レーダー」の主任翻訳クォンツです。
以下のPolymarketの市場テーマを、日本の一般読者・投資家が直感的に理解できる自然で洗練された日本語の問い（タイトル）に翻訳してください。

【原文】: "${rawQuestion}"

【出力フォーマット】:
必ず以下のJSON形式のみを出力してください。
{"ja": "〜するか？"}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!res.ok) return rawQuestion;
    const data = await res.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(resultText);
    return parsed.ja || rawQuestion;
  } catch {
    return rawQuestion;
  }
}

/**
 * 🎨 世論スプレッド対比カード画像 (1200x630px PNG) を生成
 */
async function generateSpreadCardImagePng(title, worldProb, japanProb, gap) {
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
        <stop offset="0%" stop-color="#059669" />
        <stop offset="100%" stop-color="#10b981" />
      </linearGradient>
      <linearGradient id="gapGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#fbbf24" />
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

    <!-- 外枠ボーダー -->
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

      <!-- 乖離速報バッジ -->
      <rect x="830" y="4" width="250" height="34" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="#fbbf24" stroke-width="1.2" />
      <text x="845" y="26" class="font-mono" font-size="14" font-weight="bold" fill="#fbbf24">⚡ SPREAD ALERT: ${gap}% GAP</text>
    </g>

    <!-- タイトル -->
    <g transform="translate(60, 150)">
      <rect width="1080" height="105" rx="12" fill="#080e1e" stroke="#1e293b" stroke-width="1" />
      <text x="30" y="36" class="font-jp" font-size="13" font-weight="bold" fill="#fbbf24" letter-spacing="1">⚡ 世界とお茶の間の見解が激突中！</text>
      <text x="30" y="78" class="font-jp" font-size="26" font-weight="bold" fill="#ffffff">${displayTitle}</text>
    </g>

    <!-- 対比ボックス（2カラム） -->
    <g transform="translate(60, 280)">
      <!-- 世界マネー -->
      <g transform="translate(0, 0)">
        <rect width="490" height="195" rx="12" fill="#080e1e" stroke="#1e3a8a" stroke-width="1.5" />
        <text x="25" y="38" class="font-jp" font-size="15" font-weight="bold" fill="#94a3b8">世界のリアルマネー確率 (Polymarket)</text>
        <text x="25" y="98" class="font-mono" font-size="52" font-weight="bold" fill="#38bdf8">YES ${worldProb}%</text>
        
        <rect x="25" y="125" width="440" height="12" rx="6" fill="#050811" />
        <rect x="25" y="125" width="${(worldProb / 100) * 440}" height="12" rx="6" fill="url(#worldBar)" />
        <text x="25" y="165" class="font-jp" font-size="12" fill="#64748b">世界中の機関投資家・クォンツのリアル約定値</text>
      </g>

      <!-- 日本世論 -->
      <g transform="translate(590, 0)">
        <rect width="490" height="195" rx="12" fill="#080e1e" stroke="#065f46" stroke-width="1.5" />
        <text x="25" y="38" class="font-jp" font-size="15" font-weight="bold" fill="#94a3b8">日本の生活者世論 (未来レーダー)</text>
        <text x="25" y="98" class="font-mono" font-size="52" font-weight="bold" fill="#10b981">YES ${japanProb}%</text>
        
        <rect x="25" y="125" width="440" height="12" rx="6" fill="#050811" />
        <rect x="25" y="125" width="${(japanProb / 100) * 440}" height="12" rx="6" fill="url(#japanBar)" />
        <text x="25" y="165" class="font-jp" font-size="12" fill="#64748b">完全無料・非賭博オピニオン意識調査集計</text>
      </g>
    </g>

    <!-- フッター -->
    <g transform="translate(60, 525)">
      <rect width="1080" height="50" rx="8" fill="#080d1a" stroke="#1e293b" stroke-width="1" />
      <text x="30" y="30" class="font-jp" font-size="14" font-weight="bold" fill="#fbbf24">⚡ あなたの直感はどちらが正しいと思いますか？</text>
      <text x="750" y="30" class="font-mono" font-size="13" font-weight="bold" fill="#38bdf8">1秒投票 ➔ mirairadar.com</text>
    </g>
  </svg>`;

  return await sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * ⚡ メイン処理: 世論スプレッド乖離警報の自動ポスト
 */
async function runTwitterSpreadAlertBot() {
  try {
    console.log('⚡【未来レーダー】公式X 世論スプレッド乖離警報Bot 起動...');

    // 1. Supabaseから日本の投票集計を取得
    const voteMap = new Map();
    if (supabase) {
      const { data: voteLogs } = await supabase.from('japan_vote_logs').select('event_id, choice');
      if (voteLogs) {
        voteLogs.forEach(v => {
          if (!voteMap.has(v.event_id)) voteMap.set(v.event_id, { yes: 0, no: 0 });
          const curr = voteMap.get(v.event_id);
          if (v.choice === 'YES') curr.yes += 1;
          if (v.choice === 'NO') curr.no += 1;
        });
      }
    }

    // 2. Polymarket APIから最新市場を取得
    const res = await fetch(POLYMARKET_EVENTS_API);
    if (!res.ok) {
      console.error('Polymarket API 取得失敗');
      return;
    }

    const events = await res.json();
    const postedList = getPostedEvents();
    const candidateList = [];

    for (const event of events) {
      if (!event.markets || event.markets.length === 0) continue;
      const market = event.markets[0];
      const titleLower = (event.title + ' ' + (market.question || '')).toLowerCase();

      if (SENSITIVE_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (JAPAN_ELECTION_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (IRRELEVANT_KEYWORDS.some(kw => titleLower.includes(kw))) continue;

      const volume24h = event.volume24hr || 0;
      if (volume24h < MIN_VOLUME_24H_USD) continue;

      const eventId = String(event.id || event.slug);
      if (postedList.includes(eventId)) continue;

      let rawQuestion = market.question || event.title;
      if (market.groupItemTitle && !rawQuestion.includes(market.groupItemTitle)) {
        rawQuestion = `${event.title}: ${market.groupItemTitle}?`;
      }

      let worldProb = 50;
      if (market.outcomePrices) {
        try {
          const parsed = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
          if (Array.isArray(parsed) && parsed[0]) worldProb = Math.round(parseFloat(parsed[0]) * 100);
        } catch {}
      }

      // 日本の世論集計
      const dbVotes = voteMap.get(eventId) || voteMap.get(event.slug);
      let japanProb = 50;
      let totalVotes = 0;
      if (dbVotes) {
        totalVotes = dbVotes.yes + dbVotes.no;
        if (totalVotes > 0) japanProb = Math.round((dbVotes.yes / totalVotes) * 100);
      }

      // 乖離率ギャップ
      const gap = Math.abs(worldProb - japanProb);
      const jScore = calculateJRelevance(titleLower, volume24h);

      // 乖離率が大きい、またはJ-スコアが高いものを評価
      const spreadScore = jScore * (1 + gap / 50);
      candidateList.push({
        event,
        market,
        rawQuestion,
        volume24h,
        eventId,
        worldProb,
        japanProb,
        totalVotes,
        gap,
        score: spreadScore,
      });
    }

    candidateList.sort((a, b) => b.score - a.score);

    if (candidateList.length === 0) {
      console.log('現在投稿対象となる新しい乖離市場はありません。');
      return;
    }

    const topCandidate = candidateList[0];
    const event = topCandidate.event;
    const worldProb = topCandidate.worldProb;
    const japanProb = topCandidate.japanProb;
    const gap = topCandidate.gap;
    const volume24h = topCandidate.volume24h;

    // Gemini 3.7 Flash でタイトルを自然な日本語に翻訳
    const titleJa = await translateSingleWithGemini(topCandidate.rawQuestion);
    console.log(`[X速報開始] 乖離テーマ: ${titleJa}`);
    console.log(`- 世界マネー: YES ${worldProb}% ｜ 日本世論: YES ${japanProb}% ｜ 乖離: ⚡ ${gap}%`);

    // 特製世論対比カード画像 (1200x630px) を生成
    const pngBuffer = await generateSpreadCardImagePng(titleJa, worldProb, japanProb, gap);
    console.log('特製世論対比画像の生成完了 (1200x630px)');

    // Xに画像をアップロード
    const mediaId = await twitterClient.v1.uploadMedia(pngBuffer, { mimeType: 'image/png' });
    console.log(`画像アップロード完了: Media ID = ${mediaId}`);

    // 【1投稿目】親ポスト（画像付き・URLなしでアルゴリズム拡散最大化）
    const mainTweetText = `🚨【世論乖離警報】世界とお茶の間の見解が激突中⚡️
「${titleJa}」

🌍 世界のリアルマネー（Polymarket）：YES ${worldProb}%
🇯🇵 日本の生活者世論（未来レーダー）：YES ${japanProb}%
⚡️ 世論ギャップ：【 ${gap}% の乖離 】が発生中！

💰 24h取引高：$${Math.round(volume24h).toLocaleString()}（約${Math.round(volume24h * 155 / 10000).toLocaleString()}万円）

海外のスマートマネーと日本の世論で大きな温度差が生まれています。
あなたの直感はどちらが正しいと思いますか？

※統計データの客観的速報であり、賭博や投資勧誘ではありません。
#未来レーダー #MiraiRadar #Polymarket #世論調査`;

    const { data: mainTweet } = await twitterClient.v2.tweet(mainTweetText, {
      media: { media_ids: [mediaId] },
    });
    console.log(`🎉 1投稿目（親ポスト・世論乖離画像付き）投稿完了: Tweet ID = ${mainTweet.id}`);

    // 【2投稿目】自己リプライ（ツリー）として個別銘柄URLを投稿
    const replyTweetText = `👇 1クリックで世論調査に参加（完全無料・登録不要）
https://mirairadar.com/market/${event.slug}

投票すると、世界のオッズと日本のリアルタイム世論スプレッドが開示されます。`;

    const { data: replyTweet } = await twitterClient.v2.tweet(replyTweetText, {
      reply: { in_reply_to_tweet_id: mainTweet.id },
    });
    console.log(`💬 2投稿目（ツリー・URLリプライ）投稿完了: Tweet ID = ${replyTweet.id}`);

    savePostedEvent(topCandidate.eventId);
    console.log('✅ 世論乖離警報Botの投稿が正常に完了しました！');
  } catch (err) {
    console.error('Twitter Bot 実行エラー:', err);
  }
}

runTwitterSpreadAlertBot();
