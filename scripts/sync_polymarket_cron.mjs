/**
 * 未来レーダー (MiraiRadar.com) - Polymarket ➔ Supabase 日本市場特化 自動同期スクリプト
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

const supabaseUrl = process.env.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing, skipping sync');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const POLYMARKET_EVENTS_API = 'https://gamma-api.polymarket.com/events?limit=60&active=true&closed=false&order=volume24hr&ascending=false';

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

async function syncPolymarket() {
  console.log(`[${new Date().toISOString()}] Polymarket ➔ Supabase 日本市場特化 同期開始...`);

  try {
    const res = await fetch(POLYMARKET_EVENTS_API);
    if (!res.ok) throw new Error(`API response status: ${res.status}`);

    const events = await res.json();
    const candidateList = [];

    for (const ev of events) {
      if (!ev.markets || !ev.markets[0]) continue;
      const market = ev.markets[0];
      const titleLower = (ev.title + ' ' + (market.question || '')).toLowerCase();

      if (SENSITIVE_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (JAPAN_ELECTION_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (IRRELEVANT_KEYWORDS.some(kw => titleLower.includes(kw))) continue;

      let probYes = 50;
      if (market.outcomePrices) {
        try {
          const parsed = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
          if (Array.isArray(parsed) && parsed[0]) probYes = Math.round(parseFloat(parsed[0]) * 100);
        } catch {}
      }

      let cat = 'economy';
      let catLabel = '📊 マクロ経済';

      if (titleLower.includes('election') || titleLower.includes('president') || titleLower.includes('minister') || titleLower.includes('senate') || titleLower.includes('war') || titleLower.includes('treaty') || titleLower.includes('china')) {
        cat = 'politics';
        catLabel = '🌐 国際・選挙';
      } else if (titleLower.includes('ai') || titleLower.includes('gpt') || titleLower.includes('openai') || titleLower.includes('spacex') || titleLower.includes('nvidia') || titleLower.includes('apple') || titleLower.includes('tech')) {
        cat = 'tech';
        catLabel = '⚡ AI・テック';
      } else if (titleLower.includes('btc') || titleLower.includes('bitcoin') || titleLower.includes('eth') || titleLower.includes('crypto') || titleLower.includes('fed') || titleLower.includes('rate') || titleLower.includes('inflation')) {
        cat = 'economy';
        catLabel = '📊 金利・暗号資産';
      } else {
        cat = 'sports';
        catLabel = '🏆 カルチャー・注目トピック';
      }

      const volume24h = ev.volume24hr || 0;
      const jScore = calculateJRelevance(titleLower, volume24h);
      const titleJa = translateToJapanese(ev.title);

      const dbRecord = {
        id: String(ev.id || ev.slug),
        slug: ev.slug,
        title: ev.title,
        title_ja: titleJa,
        category: cat,
        category_label: catLabel,
        world_prob_yes: Math.min(99, Math.max(1, probYes)),
        world_prob_no: Math.min(99, Math.max(1, 100 - probYes)),
        volume_24h_usd: volume24h,
        total_volume_usd: ev.volume || volume24h * 3.5,
        end_date: market.endDate || '2026-12-31',
        is_trending: volume24h > 80000,
        updated_at: new Date().toISOString(),
      };

      candidateList.push({ record: dbRecord, score: jScore });
    }

    candidateList.sort((a, b) => b.score - a.score);
    const selectedRecords = candidateList.slice(0, 25).map(c => c.record);

    const { data, error } = await supabase
      .from('events')
      .upsert(selectedRecords, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error.message);
    } else {
      console.log(`✅ 日本市場特化 厳選マーケット ${selectedRecords.length}件 をSupabaseに同期完了！`);
    }
  } catch (err) {
    console.error('Sync Error:', err);
  }
}

syncPolymarket();
