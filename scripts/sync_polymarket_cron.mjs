/**
 * 未来レーダー (MiraiRadar.com) - Polymarket ➔ Gemini 3.7 Flash 【深層個別カタリスト分析】 ➔ Supabase & JSON 自動同期
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
const INSIGHTS_JSON_PATH = path.join(process.cwd(), 'public', 'data', 'ai_insights.json');

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

async function generateInsightsWithGemini(items) {
  if (!geminiApiKey || items.length === 0) {
    return items.map(i => ({
      id: i.id,
      titleJa: i.rawQuestion,
      summaryJa: `世界の予測市場で24時間取引高 $${Math.round(i.volume24h).toLocaleString()} を記録中。`,
      whyMovedJa: `直近のニュース・指標発表を受けたスマートマネーのリアルタイム織り込み。`,
      keyCatalysts: ['重要公式発表・経済指標', '市場流動性の集中']
    }));
  }

  const prompt = `あなたは世界最高峰のマクロ経済・国際情勢ヘッジファンドのチーフストラテジスト（日本語）です。
以下のPolymarket予測市場のリアルタイムデータ一覧について、最新の確率（オッズ）水準と市場心理に完全に即した、切れ味鋭いプロフェッショナル分析を作成してください。

【厳格な指示】:
1. 「スマートマネーが集中」「大口取引の流入」といった抽象的な定型文は【完全使用禁止】。
2. そのトピック固有の具体的な人物名、経済指標名（CPI、PCE、NFP等）、政策、競合他社、地政学イベントを必ず盛り込むこと。
3. 日本語タイトル（titleJa）は、日本の読者がパッと見て1秒で理解でき、「YES/NO」で自然に答えられる魅力的な疑問文（〜か？）にすること。
4. 今後のオッズ変動を左右する「具体的な次回カタリスト（何月何日の何の発表/イベントか）」を2〜3個提示すること。

【入力データ一覧】:
${JSON.stringify(items.map(i => ({
  id: i.id,
  rawQuestion: i.rawQuestion,
  probYes: i.probYes,
  volume24hUsd: i.volume24h,
  category: i.catLabel
})), null, 2)}

以下のJSON配列形式のみを出力してください（Markdownのバッククォート不要）:
[
  {
    "id": "ID",
    "titleJa": "日本語疑問文タイトル（〜か？）",
    "summaryJa": "現在の確率水準に対する市場コンセンサス・心理（40〜60文字程度）",
    "whyMovedJa": "なぜこの確率になっているのかの具体的ファンダメンタルズ要因（60〜90文字程度）",
    "keyCatalysts": ["具体的な次回カタリスト1（日付や指標名）", "具体的な次回カタリスト2", "具体的な次回カタリスト3"]
  }
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
    console.error('Gemini deep insight generation error:', err.message);
    return items.map(i => ({
      id: i.id,
      titleJa: i.rawQuestion,
      summaryJa: `世界の予測市場で24時間取引高 $${Math.round(i.volume24h).toLocaleString()} を記録中。`,
      whyMovedJa: `直近のニュース・指標発表を受けたスマートマネーのリアルタイム織り込み。`,
      keyCatalysts: ['重要公式発表・経済指標', '市場流動性の集中']
    }));
  }
}

async function syncPolymarket() {
  console.log(`[${new Date().toISOString()}] Polymarket ➔ 【Gemini 3.7 Flash リアルタイム深層カタリスト分析】同期開始...`);

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
      let catLabel = '📊 経済・金利・暗号資産';

      if (
        titleLower.includes('election') ||
        titleLower.includes('president') ||
        titleLower.includes('minister') ||
        titleLower.includes('senate') ||
        titleLower.includes('war') ||
        titleLower.includes('treaty') ||
        titleLower.includes('china') ||
        titleLower.includes('russia') ||
        titleLower.includes('putin') ||
        titleLower.includes('iran') ||
        titleLower.includes('israel') ||
        titleLower.includes('ceasefire') ||
        titleLower.includes('hormuz') ||
        titleLower.includes('governor')
      ) {
        cat = 'politics';
        catLabel = '🌐 国際・社会';
      } else if (
        titleLower.includes('ai') ||
        titleLower.includes('gpt') ||
        titleLower.includes('openai') ||
        titleLower.includes('spacex') ||
        titleLower.includes('nvidia') ||
        titleLower.includes('apple') ||
        titleLower.includes('tech') ||
        titleLower.includes('nintendo') ||
        titleLower.includes('switch')
      ) {
        cat = 'tech';
        catLabel = '⚡ AI・テック';
      } else if (
        titleLower.includes('ohtani') ||
        titleLower.includes('dodgers') ||
        titleLower.includes('cardinals') ||
        titleLower.includes('orioles') ||
        titleLower.includes('wings') ||
        titleLower.includes('ballon d\'or') ||
        titleLower.includes('epl') ||
        titleLower.includes('champion') ||
        titleLower.includes('uefa') ||
        titleLower.includes('psg') ||
        titleLower.includes('tennis') ||
        titleLower.includes('cincinnati') ||
        titleLower.includes('itf') ||
        titleLower.includes('mlb') ||
        titleLower.includes('soccer') ||
        titleLower.includes('football')
      ) {
        cat = 'sports';
        catLabel = '⚾ スポーツ';
      } else if (
        titleLower.includes('ghibli') ||
        titleLower.includes('movie') ||
        titleLower.includes('anime') ||
        titleLower.includes('lol:') ||
        titleLower.includes('league of legends') ||
        titleLower.includes('counter-strike') ||
        titleLower.includes('kespa') ||
        titleLower.includes('lck') ||
        titleLower.includes('esport') ||
        titleLower.includes('musk # tweets') ||
        titleLower.includes('box office') ||
        titleLower.includes('grammy') ||
        titleLower.includes('oscar')
      ) {
        cat = 'entertainment';
        catLabel = '🎬 エンタメ・カルチャー';
      } else {
        cat = 'economy';
        catLabel = '📊 経済・金利・暗号資産';
      }

      const volume24h = ev.volume24hr || 0;
      const jScore = calculateJRelevance(titleLower, volume24h);

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

    // Gemini 3.7 Flash でタイトルと個別深層カタリストを一括生成
    console.log(`🤖 ${topCandidates.length}件の市場データについて Gemini 3.7 Flash がリアルタイム情勢分析を生成中...`);
    const insights = await generateInsightsWithGemini(topCandidates);
    const insightMap = new Map();
    const insightsJsonStore = {};

    insights.forEach(item => {
      insightMap.set(item.id, item);
      insightsJsonStore[item.id] = {
        titleJa: item.titleJa,
        summaryJa: item.summaryJa,
        whyMovedJa: item.whyMovedJa,
        keyCatalysts: item.keyCatalysts,
        urgencyLevel: 'high',
        lastUpdated: 'Gemini 3.7 Flash リアルタイム解析済み'
      };
    });

    // public/data/ai_insights.json に保存
    fs.writeFileSync(INSIGHTS_JSON_PATH, JSON.stringify(insightsJsonStore, null, 2));
    console.log(`✅ ${INSIGHTS_JSON_PATH} に深層カタリスト分析を保存完了`);

    // src/data/aiInsightsMaster.ts にTypeScriptマスターとして出力
    const tsPath = path.join(process.cwd(), 'src', 'data', 'aiInsightsMaster.ts');
    const tsContent = `/**
 * 未来レーダー (MiraiRadar.com) - Gemini 3.7 Flash 深層カタリスト分析マスター
 * 自動生成ファイル (sync_polymarket_cron.mjs により更新)
 */

export interface AiInsightData {
  titleJa: string;
  summaryJa: string;
  whyMovedJa: string;
  keyCatalysts: string[];
  urgencyLevel: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export const AI_INSIGHTS_MASTER: Record<string, AiInsightData> = ${JSON.stringify(insightsJsonStore, null, 2)};
`;
    fs.writeFileSync(tsPath, tsContent);
    console.log(`✅ ${tsPath} にTypeScriptマスターとして出力完了`);

    const selectedRecords = topCandidates.map(c => {
      const insight = insightMap.get(c.id);
      const titleJa = insight?.titleJa || c.rawQuestion;

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
      console.log(`\n🎉 【深層個別カタリスト分析 完了！】 厳選 ${selectedRecords.length}件 を同期完了！`);
      console.log('✅ 個別分析サンプル:');
      selectedRecords.slice(0, 3).forEach((r, i) => {
        const ins = insightsJsonStore[r.id];
        console.log(`\n[${i + 1}] ${r.title_ja}`);
        console.log(`  💡 サマリー: ${ins?.summaryJa}`);
        console.log(`  🔍 要因: ${ins?.whyMovedJa}`);
        console.log(`  📅 カタリスト: ${ins?.keyCatalysts?.join(' ｜ ')}`);
      });
    }
  } catch (err) {
    console.error('Sync Error:', err);
  }
}

syncPolymarket();
