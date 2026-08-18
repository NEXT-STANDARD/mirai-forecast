/**
 * 未来レーダー (MiraiRadar.com) - Polymarket ➔ データ完全一致 Gemini 3.7 Flash 日本語化 ➔ Supabase 自動同期
 * 
 * 🛡️ 推奨アプローチA（完全データ整合性保証）:
 * 確率（outcomePrices）が直接紐づいている `market.question`（または `ev.title + groupItemTitle`）を
 * Gemini 3.7 Flash に渡すことで、データと質問文のズレを物理的にゼロにし、
 * すべての銘柄で「YES (そう思う) / NO (違う)」の投票が100%筋の通った形で成立するように設計。
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
const geminiApiKey = process.env.GEMINI_API_KEY || localEnv.GEMINI_API_KEY;

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

function calculateJRelevance(titleLower, volume24h) {
  let multiplier = 1.0;
  for (const boost of J_RELEVANCE_BOOSTS) {
    if (boost.keywords.some(kw => titleLower.includes(kw))) {
      multiplier = Math.max(multiplier, boost.multiplier);
    }
  }
  return volume24h * multiplier;
}

/**
 * Gemini 3.7 Flash でオッズ直結の質問文をYES/NO完結の自然な日本語に変換
 */
async function translateQuestionsWithGemini(items) {
  if (!geminiApiKey || items.length === 0) {
    return items.map(i => ({ id: i.id, ja: i.rawQuestion }));
  }

  const prompt = `あなたは金融・経済メディア（日経新聞、Bloomberg日本語版）の敏腕編集デスクです。
以下のPolymarket予測市場の「確率データに直接紐づく英語質問文（rawQuestion）」を、日本の読者がパッと見て1秒で理解でき、なおかつ「YES (そう思う) / NO (違う)」で自然に答えられる、魅力的で正確な日本語の疑問文タイトルに翻訳してください。

【厳格な翻訳ルール】:
1. 英語の主語（候補者名・企業名・数値など）を勝手に変更せず、必ず明記すること。
2. 必ず文末を「〜か？」の疑問文にすること。
3. 25文字〜40文字程度の簡潔で引き締まったニュース見出しにすること。

【入力データ】:
${JSON.stringify(items.map(i => ({ id: i.id, rawQuestion: i.rawQuestion })), null, 2)}

以下のJSON配列形式のみを出力してください（Markdownのバッククォート不要）:
[
  { "id": "ID", "ja": "日本語タイトル" }
]`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${geminiApiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!res.ok) throw new Error(`Gemini API responded with status ${res.status}`);
    const data = await res.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error('Empty Gemini response');

    return JSON.parse(resultText);
  } catch (err) {
    console.error('Gemini translation error, fallback to raw:', err.message);
    return items.map(i => ({ id: i.id, ja: i.rawQuestion }));
  }
}

async function syncPolymarket() {
  console.log(`[${new Date().toISOString()}] Polymarket ➔ 【推奨アプローチA 完全データ一致】同期開始...`);

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

      // 【核心】オッズ数値と100%直結している具体的な質問文を抽出
      let rawQuestion = market.question || ev.title;
      if (market.groupItemTitle && !rawQuestion.includes(market.groupItemTitle)) {
        rawQuestion = `${ev.title}: ${market.groupItemTitle}?`;
      }

      const eventId = String(ev.id || ev.slug);

      candidateList.push({
        id: eventId,
        ev,
        market,
        rawQuestion,
        probYes,
        cat,
        catLabel,
        volume24h,
        score: jScore,
      });
    }

    // 日本親和性スコア順で上位25件を厳選
    candidateList.sort((a, b) => b.score - a.score);
    const topCandidates = candidateList.slice(0, 25);

    // Gemini 3.7 Flash でオッズ直結の質問文を一括翻訳
    console.log(`🤖 ${topCandidates.length}件のオッズ直結質問文を Gemini 3.7 Flash でデータ完全一致の日本語に変換中...`);
    const translationInputs = topCandidates.map(c => ({ id: c.id, rawQuestion: c.rawQuestion }));
    const translationMap = new Map();

    const translatedResults = await translateQuestionsWithGemini(translationInputs);
    translatedResults.forEach(item => {
      translationMap.set(item.id, item.ja);
    });

    const selectedRecords = topCandidates.map(c => {
      const titleJa = translationMap.get(c.id) || c.rawQuestion;
      return {
        id: c.id,
        slug: c.ev.slug,
        title_ja: titleJa,
        title_en: c.rawQuestion,
        question_ja: titleJa,
        question_en: c.rawQuestion,
        category: c.cat,
        category_label: c.catLabel,
        icon_url: c.ev.image || c.ev.icon || '',
        end_date: c.market.endDate || '2026-12-31',
        is_active: true,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from('events')
      .upsert(selectedRecords, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error.message);
    } else {
      console.log(`\n🎉 【推奨アプローチA 完全一致日本語化 成功！】 厳選 ${selectedRecords.length}件 を同期完了！`);
      console.log('✅ データ・オッズ整合サンプル:');
      selectedRecords.slice(0, 6).forEach((r, i) => {
        const original = topCandidates.find(c => c.id === r.id);
        console.log(`  ${i + 1}. [${r.category_label}] (YES ${original?.probYes}%) ${r.title_ja}`);
      });
    }
  } catch (err) {
    console.error('Sync Error:', err);
  }
}

syncPolymarket();
