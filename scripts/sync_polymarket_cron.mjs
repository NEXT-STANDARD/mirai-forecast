/**
 * 未来レーダー (MiraiRadar.com) - Polymarket ➔ Gemini 3.7 Flash 【深層個別カタリスト分析】 ➔ Supabase & JSON 自動同期
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const envPath = path.join(ROOT, '.env');
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY || localEnv.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing, skipping sync');
  process.exit(0);
}

// 使用中の鍵のロールを検証する。
// anon に落ちると RLS が書き込みを黙って捨て、「成功したのに0件」という失敗の仕方をするため、ここで止める。
const supabaseKeyRole = (() => {
  try {
    const payload = supabaseKey.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString()).role || 'unknown';
  } catch {
    return 'unknown';
  }
})();

if (supabaseKeyRole !== 'service_role') {
  console.error(`Supabase key role is "${supabaseKeyRole}", expected "service_role".`);
  console.error('SUPABASE_SERVICE_ROLE_KEY を .env または GitHub Actions Secrets に設定してください。');
  process.exit(1);
}

console.log(`Supabase auth role: ${supabaseKeyRole}`);

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

/**
 * Polymarket イベントから、多肢銘柄・単一銘柄を適切に判別して高精度オッズを抽出
 * (N-34: markets[0] の安易な代表値選択を廃止し、タイトル対象または本命候補を厳密抽出。0%クランプ廃止)
 */
export function resolvePolymarketOdds(ev, dbTitleJa = '', dbTitleEn = '') {
  if (!ev || !ev.markets || ev.markets.length === 0) return null;
  const markets = ev.markets;
  let targetMarket = markets[0];
  let isMultiChoice = markets.length > 1;
  let leaderName = null;

  if (isMultiChoice) {
    const lowerJa = (dbTitleJa || '').toLowerCase();
    const lowerEn = (dbTitleEn || ev.title || '').toLowerCase();

    const matchedMarket = markets.find(m => {
      const itemTitle = (m.groupItemTitle || m.question || '').toLowerCase();
      if (!itemTitle) return false;
      if (lowerEn.includes(itemTitle)) return true;
      if (itemTitle.length > 3 && lowerJa.includes(itemTitle)) return true;
      if (/mbapp[eé]/i.test(itemTitle) && /エムバペ|mbapp/i.test(lowerJa)) return true;
      if (/vinicius/i.test(itemTitle) && /ヴィニシウス|vinicius/i.test(lowerJa)) return true;
      if (/kane/i.test(itemTitle) && /ケイン|kane/i.test(lowerJa)) return true;
      if (/bellingham/i.test(itemTitle) && /ベリンガム|bellingham/i.test(lowerJa)) return true;
      if (/rodri/i.test(itemTitle) && /ロドリ|rodri/i.test(lowerJa)) return true;
      if (/paris\s*saint-germain|psg/i.test(itemTitle) && /パリ・サンジェルマン|psg/i.test(lowerJa)) return true;
      if (/arsenal/i.test(itemTitle) && /アーセナル/i.test(lowerJa)) return true;
      if (/real\s*madrid/i.test(itemTitle) && /レアル・マドリード/i.test(lowerJa)) return true;
      if (/manchester\s*city/i.test(itemTitle) && /マンチェスター・シティ/i.test(lowerJa)) return true;
      if (/50\+?\s*bps\s*decrease/i.test(itemTitle) && /50bp/i.test(lowerJa)) return true;
      if (/25\s*bps\s*decrease/i.test(itemTitle) && /25bp/i.test(lowerJa)) return true;
      if (/100,?000/i.test(itemTitle) && /100,?000|10万/i.test(lowerJa)) return true;
      if (/150,?000/i.test(itemTitle) && /150,?000|15万/i.test(lowerJa)) return true;
      if (/Match Winner/i.test(m.question || '') && /勝敗予測/i.test(lowerJa)) return true;
      return false;
    });

    if (matchedMarket) {
      targetMarket = matchedMarket;
    } else {
      let maxProb = -1;
      let topM = markets[0];
      markets.forEach(m => {
        let p = 0;
        if (m.outcomePrices) {
          try {
            const parsed = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            if (Array.isArray(parsed) && parsed[0]) p = parseFloat(parsed[0]);
          } catch {}
        }
        if (p > maxProb) {
          maxProb = p;
          topM = m;
        }
      });
      targetMarket = topM;
      leaderName = targetMarket.groupItemTitle || targetMarket.question || null;
    }
  }

  let probYes = 50;
  if (targetMarket.outcomePrices) {
    try {
      const parsed = typeof targetMarket.outcomePrices === 'string' ? JSON.parse(targetMarket.outcomePrices) : targetMarket.outcomePrices;
      if (Array.isArray(parsed) && parsed[0]) {
        // N-34: 0% を 1% にクランプせず、実測 0% をそのまま保持
        probYes = Math.min(100, Math.max(0, Math.round(parseFloat(parsed[0]) * 100)));
      }
    } catch {}
  }

  const volume24h = ev.volume24hr || (targetMarket.volume24hr ? parseFloat(targetMarket.volume24hr) : 0);
  const totalVolume = ev.volume || (targetMarket.volume ? parseFloat(targetMarket.volume) : volume24h * 3.5);
  const probChange24h = targetMarket.oneDayPriceChange ? Math.round(parseFloat(targetMarket.oneDayPriceChange) * 100) : 0;
  
  let clobTokenId = undefined;
  if (targetMarket.clobTokenIds) {
    try {
      const ids = typeof targetMarket.clobTokenIds === 'string' ? JSON.parse(targetMarket.clobTokenIds) : targetMarket.clobTokenIds;
      if (Array.isArray(ids) && ids[0]) clobTokenId = String(ids[0]);
    } catch {}
  }

  return {
    probYes,
    volume24h: Math.round(volume24h),
    totalVolume: Math.round(totalVolume),
    probChange24h,
    clobTokenId,
    isMultiChoice,
    leaderName,
    marketQuestion: targetMarket.question || targetMarket.groupItemTitle
  };
}

async function syncPolymarket() {
  console.log(`[${new Date().toISOString()}] Polymarket ➔ 【Gemini 3.7 Flash リアルタイム深層カタリスト分析】同期開始...`);

  try {
    // 1. Polymarket API から複数ページ (最大500件) を取得して全市場オッズを網羅
    const allEvents = [];
    const polyMap = new Map();

    for (const offset of [0, 100, 200, 300, 400]) {
      try {
        const pageUrl = `https://gamma-api.polymarket.com/events?limit=100&offset=${offset}&active=true&closed=false&order=volume24hr&ascending=false`;
        const res = await fetch(pageUrl);
        if (res.ok) {
          const pageData = await res.json();
          if (Array.isArray(pageData)) {
            allEvents.push(...pageData);
            pageData.forEach(ev => {
              polyMap.set(String(ev.id), ev);
              if (ev.slug) polyMap.set(ev.slug, ev);
            });
          }
        }
      } catch (err) {
        console.warn(`Polymarket API page offset ${offset} failed:`, err.message);
      }
    }

    if (allEvents.length === 0) throw new Error('No Polymarket events fetched');

    // 2. Supabase 上の既存イベントで未取得の数値ID銘柄を直接補完 (N-33: 蓄積銘柄の100%オッズ網羅)
    const { data: dbRows } = await supabase.from('events').select('id, slug, title_ja, title_en, is_active').eq('is_active', true);
    if (dbRows && dbRows.length > 0) {
      for (const row of dbRows) {
        if (!polyMap.has(String(row.id)) && !polyMap.has(row.slug) && /^\d+$/.test(String(row.id))) {
          try {
            const res = await fetch(`https://gamma-api.polymarket.com/events/${row.id}`);
            if (res.ok) {
              const directEv = await res.json();
              allEvents.push(directEv);
              polyMap.set(String(directEv.id), directEv);
              if (directEv.slug) polyMap.set(directEv.slug, directEv);
            }
          } catch (err) {
            // direct fetch error ignore
          }
        }
      }
    }

    // 全Polymarketオッズ辞書を構築 (IDとslug双方でルックアップ可能)
    const marketOddsStore = {};
    const dbRowMap = new Map((dbRows || []).map(r => [String(r.id), r]));

    polyMap.forEach((ev, key) => {
      const dbRow = dbRowMap.get(String(ev.id)) || (ev.slug ? dbRowMap.get(ev.slug) : null);
      const odds = resolvePolymarketOdds(ev, dbRow?.title_ja, dbRow?.title_en);
      if (odds) {
        marketOddsStore[key] = odds;
      }
    });

    // market_odds.json および marketOddsMaster.ts を出力
    const oddsJsonPath = path.join(ROOT, 'public', 'data', 'market_odds.json');
    fs.writeFileSync(oddsJsonPath, JSON.stringify(marketOddsStore, null, 2), 'utf-8');
    console.log(`✅ ${oddsJsonPath} に市場オッズ辞書 (${Object.keys(marketOddsStore).length}エントリ) を保存完了`);

    const oddsTsPath = path.join(ROOT, 'src', 'data', 'marketOddsMaster.ts');
    const oddsTsContent = `// Polymarket リアルタイムオッズマスター (自動生成)\nexport const MARKET_ODDS_MASTER: Record<string, { probYes: number; volume24h: number; totalVolume: number; probChange24h?: number; clobTokenId?: string; isMultiChoice?: boolean; leaderName?: string | null; marketQuestion?: string }> = ${JSON.stringify(marketOddsStore, null, 2)};\n`;
    fs.writeFileSync(oddsTsPath, oddsTsContent, 'utf-8');

    const candidateList = [];

    for (const ev of allEvents) {
      if (!ev.markets || !ev.markets[0]) continue;
      const odds = resolvePolymarketOdds(ev);
      if (!odds) continue;

      const market = ev.markets[0];
      const titleLower = (ev.title + ' ' + (market.question || '')).toLowerCase();

      if (SENSITIVE_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (JAPAN_ELECTION_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (IRRELEVANT_KEYWORDS.some(kw => titleLower.includes(kw))) continue;

      // 過去日付・締切切れ銘柄の同期を完全除外（過去を占う銘柄の混入防止）
      const nowMs = Date.now();
      const mEndDate = market.endDate || ev.endDate;
      if (mEndDate && new Date(mEndDate).getTime() <= nowMs) continue;

      let probYes = odds.probYes;
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
        titleLower.includes('baseball') ||
        titleLower.includes('soccer') ||
        titleLower.includes('football') ||
        titleLower.includes('ufc') ||
        titleLower.includes('fight night') ||
        titleLower.includes('prague') ||
        titleLower.includes('cancun') ||
        titleLower.includes('sion') ||
        titleLower.includes('monterrey') ||
        titleLower.includes('braves') ||
        titleLower.includes('mets') ||
        titleLower.includes('white sox') ||
        titleLower.includes('angels') ||
        titleLower.includes('rangers') ||
        titleLower.includes('cubs') ||
        titleLower.includes('mariners') ||
        titleLower.includes('brighton') ||
        titleLower.includes('albion')
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

    function validateAndFilterCatalysts(catalysts, fallbackTopic = '') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12

      if (!Array.isArray(catalysts) || catalysts.length === 0) {
        return [
          `${currentYear}年第4四半期 重要公式指標発表・動向レビュー`,
          `${currentYear + 1}年 政策動向および市場コンセンサス更新`
        ];
      }

      const validCatalysts = catalysts.filter(c => {
        if (typeof c !== 'string' || !c.trim()) return false;
        const s = c.trim();
        // 年月パターンを抽出（例: 2024年11月, 2025年9月, 2026年3月）
        const m = s.match(/(20\d{2})年\s*(\d{1,2})?月?/);
        if (!m) return true; // 年が明示されていない場合は保持
        
        const year = parseInt(m[1], 10);
        if (year < currentYear) return false; // 過去の年は破棄
        if (year === currentYear && m[2]) {
          const month = parseInt(m[2], 10);
          if (month < currentMonth) return false; // 今月より前の月は破棄
        }
        return true;
      });

      if (validCatalysts.length === 0) {
        return [
          `${currentYear}年${Math.min(currentMonth + 1, 12)}月 重要公式発表・指標動向`,
          `${currentYear + 1}年 政策決定および市場レビュー`
        ];
      }

      return validCatalysts;
    }

    insights.forEach(item => {
      insightMap.set(item.id, item);
      const validCatalysts = validateAndFilterCatalysts(item.keyCatalysts, item.titleJa);
      insightsJsonStore[item.id] = {
        titleJa: item.titleJa,
        summaryJa: item.summaryJa,
        whyMovedJa: item.whyMovedJa,
        keyCatalysts: validCatalysts,
        urgencyLevel: 'high',
        lastUpdated: `AI事前分析 (${new Date().getFullYear()}年${new Date().getMonth() + 1}月最新)`
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

    // 翻訳辞書 ＆ ルールベース翻訳フォールバック
    const DIRECT_MAP = {
      '1': { titleJa: '米大統領選 2028：JDヴァンスが勝利するか？', category: 'politics' },
      '2': { titleJa: '日銀：9月会合で追加利上げ（0.75%へ）を実施するか？', category: 'economy' },
      '3': { titleJa: 'OpenAI：年内にGPT-5（次世代フロンティアモデル）を発表するか？', category: 'tech' },
      '4': { titleJa: 'ビットコイン：年内に150,000ドルを突破するか？', category: 'economy' },
      '5': { titleJa: '日本の衆議院解散・総選挙は年内に行われるか？', category: 'politics' },
      '6': { titleJa: 'SpaceX：Starshipの完全軌道再突入・無傷回収が年内に成功するか？', category: 'tech' },
      '7': { titleJa: 'FRB：年内に累計1.0%以上の利下げを実施するか？', category: 'economy' },
      '8': { titleJa: 'AI国際サミット（東京開催）で主要7カ国が法的拘束力ある合意を結ぶか？', category: 'tech' },
      'proposal-1787044134976': { titleJa: '大谷翔平は今季60本塁打を達成するか？', category: 'sports' },
      '79987': { titleJa: 'マリーヌ・ル・ペンは2027年フランス大統領選挙で勝利するか？', category: 'politics' },
      '31195': { titleJa: 'プーチン大統領は2026年末までにロシア大統領を退任するか？', category: 'politics' },
      '51456': { titleJa: 'FRBは2026年に利下げを0回（見送り）にとどめるか？', category: 'economy' },
      '455875': { titleJa: 'ホルムズ海峡の通航量は12月31日までに正常化するか？', category: 'politics' },
      '833254': { titleJa: 'MLB公式戦: ドジャース vs ロッキーズ 勝敗予測', category: 'sports' },
      '833209': { titleJa: 'MLB公式戦: オリオールズ vs レイズ 勝敗予測', category: 'sports' },
      '281145': { titleJa: '中国は2027年12月31日までに台湾へ武力侵攻するか？', category: 'politics' },
      '826222': { titleJa: '欧州サッカー: エルチェCF ハンデ勝利予測 (スプレッド -1.5)', category: 'sports' },
      '48361': { titleJa: '欧州サッカー: キリアン・エムバペは2026年バロンドールを受賞するか？', category: 'sports' },
      '881232': { titleJa: 'イーロン・マスクのXポスト数：8月22日〜24日に「40件未満」となるか？', category: 'entertainment' },
      '826000': { titleJa: '欧州サッカー: エルチェCFは2026年8月23日の試合で勝利するか？', category: 'sports' },
      '825567': { titleJa: '欧州サッカー: ニューカッスル・ユナイテッドFCは2026年8月23日の試合で勝利するか？', category: 'sports' },
      '825561': { titleJa: '欧州サッカー: ブライトン・アンド・ホーヴ・アルビオンFCは2026年8月23日の試合で勝利するか？', category: 'sports' },
      '139236': { titleJa: 'テニス全米オープン: ヤニック・シナーは2026年男子シングルスで優勝するか？', category: 'sports' },
      '649201': { titleJa: 'eスポーツ: Aurora GamingはDota 2世界大会「The International 2026」で優勝するか？', category: 'entertainment' },
    };

    function translateFallback(id, raw) {
      if (DIRECT_MAP[id]) return DIRECT_MAP[id];
      if (!raw) return { titleJa: '観測銘柄', category: 'economy' };
      let t = raw.trim();
      let category = null;

      // 1. eスポーツ判定（N-29: サッカーより前に配置し、The International の誤判定を完全防止）
      if (/The International|Dota 2|Valorant|Apex Legends/i.test(t)) {
        return { titleJa: `eスポーツ: ${t.replace(/^Will\s+/i, '').replace(/\s+Win\s+/i, 'は').replace(/\?/g, '')}で優勝するか？`, category: 'entertainment' };
      }
      if (/LoL:|League of Legends/i.test(t)) {
        let clean = t.replace(/LoL:\s*/i, 'LoL公式戦: ').replace(/\(BO3\)/g, '（3本勝負）').replace(/\(BO5\)/g, '（5本勝負）');
        return { titleJa: `${clean} 勝敗予測`, category: 'entertainment' };
      }
      if (/EWC 2026 CS2|Counter-Strike|CS2/i.test(t)) {
        if (/Winner/i.test(t)) return { titleJa: 'EWC 2026（eスポーツW杯）CS2部門 優勝チーム予測', category: 'entertainment' };
        return { titleJa: `${t.replace(/Counter-Strike:\s*/i, 'CS2公式戦: ')} 勝敗予測`, category: 'entertainment' };
      }

      // 2. 総合格闘技 (UFC / MMA) 判定
      if (/UFC|Fight Night|Bellator|PFL|Heavyweight|Lightweight|Middleweight|Welterweight|Featherweight|Bantamweight|Flyweight|Main Card|Prelims/i.test(t)) {
        let clean = t.replace(/^UFC Fight Night:\s*/i, '').replace(' - Exact Score', '').replace(' - More Markets', '').trim();
        return { titleJa: `総合格闘技 UFC: ${clean} 勝敗予測`, category: 'sports' };
      }

      // 3. テニス判定 (N-28: Prague, Cancun, Sion, Monterrey Open, ITF, ATP, WTA等)
      if (/Cincinnati Open|ITF M25|US Open|Wimbledon|Roland Garros|Prague|Cancun|Sion|Monterrey|Challenger|ATP|WTA|Grand Slam/i.test(t) || /Sebastian Baez|Lloyd Harris|Lorenzo Giustino|Benjamin Hassan|Norbert Gombos|Radu Mihai Papoe|Maya Joint|Jessica Hinojosa|Jannik Sinner|Carlos Alcaraz|Novak Djokovic/i.test(t)) {
        let clean = t.replace(/^(?:Prague\s*\d*:|Cancun:|Sion:|Monterrey Open.*?:|Cincinnati Open:|ITF M25.*?:\s*)/i, '').replace(' - More Markets', '').replace(' - Exact Score', '').trim();
        if (/^Will\s+/i.test(clean)) {
          return { titleJa: `テニス公式戦: ${clean.replace(/^Will\s+/i, '').replace(/\s+win\s+the\s+/i, 'は').replace(/\?/g, '').trim()}で優勝するか？`, category: 'sports' };
        }
        return { titleJa: `テニス公式戦: ${clean} 勝敗予測`, category: 'sports' };
      }

      // 4. MLB / 野球判定 (N-28: 全30球団の完全網羅)
      if (/\b(?:Dodgers|Rockies|Orioles|Rays|Cardinals|Reds|Tigers|Pirates|Marlins|Phillies|Yankees|Red Sox|Braves|Brewers|White Sox|Giants|Guardians|Angels|Rangers|Cubs|Mariners|Nationals|Athletics|Royals|Astros|Twins|Blue Jays|Padres|Diamondbacks|Mets)\b/i.test(t)) {
        let clean = t.replace(' - Exact Score', '').replace(' - More Markets', '').replace(/^MLB:\s*/i, '').trim();
        return { titleJa: `MLB公式戦: ${clean} 勝敗予測`, category: 'sports' };
      }

      // 5. WNBA / バスケ判定
      if (/\b(?:Lynx|Valkyries|Sparks|Aces|Liberty|Sky|Sun|Fever|Storm|Wings|Mystics|Mercury|Dream|NBA|WNBA)\b/i.test(t)) {
        let clean = t.replace(' - Exact Score', '').replace(' - More Markets', '').trim();
        return { titleJa: `WNBA公式戦: ${clean} 勝敗予測`, category: 'sports' };
      }

      // 6. 欧州サッカー / サッカー判定 (N-29: \bInter\b, \bMilan\b, \bArsenal\b で単語境界を厳格化)
      if (/Spread:\s*(.+)/i.test(t)) {
        return { titleJa: `欧州サッカー: ${t.replace(/^Spread:\s*/i, '').trim()} ハンデ勝利予測`, category: 'sports' };
      }
      if (/\b(?:Elche CF|Newcastle United|Barcelona|Real Madrid|Manchester|Liverpool|Arsenal|Chelsea|Bayern|Dortmund|Juventus|Inter|Milan|Brighton|Tottenham|Aston Villa|PSG|Paris Saint-Germain|Fulham|Brentford|Crystal Palace|Everton|West Ham|Leicester|Ipswich|Southampton|Girona|Sociedad|Betis|Villarreal|Sevilla|Valencia|Mallorca|Osasuna|Celta|Alaves|Espanyol|Valladolid|Leganes|Las Palmas|Getafe|Monaco|Marseille|Lille|Lyon|Nice|Rennes|Leverkusen|Stuttgart|Leipzig|Frankfurt|Atalanta|Roma|Lazio|Fiorentina|Napoli)\b/i.test(t)) {
        let clean = t.replace(/^Will\s+/i, '').replace(/\s+win\s+on\s+/i, '（').replace(/\?/g, '').trim();
        if (clean.includes('（')) clean += '）';
        return { titleJa: `欧州サッカー: ${clean} 勝敗予測`, category: 'sports' };
      }
      if (/Ballon d'Or Winner (\d+)/i.test(t)) {
        const year = t.match(/Ballon d'Or Winner (\d+)/i)[1];
        return { titleJa: `${year}年 サッカー・バロンドール受賞者予測`, category: 'sports' };
      }
      if (/EPL:\s*(\d+)\s*Champion|Premier League/i.test(t)) {
        return { titleJa: 'イングランド・プレミアリーグ 2026-27 優勝クラブ予測', category: 'sports' };
      }
      if (/Pro Football:\s*(\d+)\s*Champion|Super Bowl/i.test(t)) {
        return { titleJa: 'NFL 第61回スーパーボウル 優勝チーム予測', category: 'sports' };
      }
      if (/UEFA Champions League/i.test(t)) {
        if (/Paris Saint-Germain|PSG/i.test(t)) return { titleJa: 'パリ・サンジェルマンは2026-27 UEFAチャンピオンズリーグで優勝するか？', category: 'sports' };
        return { titleJa: '2026-27 UEFAチャンピオンズリーグ 優勝クラブ予測', category: 'sports' };
      }

      // 7. Will [チーム/人] win on [日付]? 構文の自動自然翻訳（流入英語の構造的日本語化）
      const willWinDateMatch = t.match(/^Will\s+(.+?)\s+win\s+on\s+(\d{4}-\d{2}-\d{2})\??/i);
      if (willWinDateMatch) {
        return { titleJa: `スポーツ勝敗予測: ${willWinDateMatch[1].trim()} は ${willWinDateMatch[2]} の試合で勝利するか？`, category: 'sports' };
      }

      // 8. 汎用 vs カード判定 (N-28: 欧州サッカーではなく中立表現)
      if (/vs\.?|対/i.test(t)) {
        let clean = t.replace(' - Exact Score', '（スコア予想）').replace(' - More Markets', '').trim();
        return { titleJa: `対戦カード予測: ${clean} 勝敗予測`, category: 'sports' };
      }
      if (/Fed Decision in September.*?50\+?\s*bps decrease/i.test(t)) {
        return { titleJa: '米FRB：9月FOMCで50bp以上の大幅利下げを実施するか？', category: 'economy' };
      }
      if (/What will WTI Crude Oil.*?hit in August 2026/i.test(t)) {
        return { titleJa: '2026年8月 WTI原油先物価格の到達水準予測', category: 'economy' };
      }
      if (/(Bitcoin|Ethereum|Solana|BTC|ETH|SOL)\s+price\s+on\s+([A-Za-z]+)\s*(\d+)?\??:\s*(.+)/i.test(t)) {
        const m = t.match(/(Bitcoin|Ethereum|Solana|BTC|ETH|SOL)\s+price\s+on\s+([A-Za-z]+)\s*(\d+)?\??:\s*(.+)/i);
        const nameMap = { Bitcoin: 'ビットコイン', BTC: 'ビットコイン', Ethereum: 'イーサリアム', ETH: 'イーサリアム', Solana: 'ソラナ', SOL: 'ソラナ' };
        const monthMap = { January: '1月', February: '2月', March: '3月', April: '4月', May: '5月', June: '6月', July: '7月', August: '8月', September: '9月', October: '10月', November: '11月', December: '12月' };
        const name = nameMap[m[1]] || m[1];
        const month = monthMap[m[2]] || m[2];
        const day = m[3] ? `${m[3]}日` : '';
        const target = m[4].replace(/^[<>=]+/, '').replace(/[?？]+$/, '').trim();
        const symbol = m[4].includes('<') ? '未満' : m[4].includes('>') ? '以上' : '到達';
        return { titleJa: `${name}価格：${month}${day}に${target}ドル${symbol}となるか？`, category: 'economy' };
      }
      if (/Bitcoin above ___ on August (\d+)/i.test(t)) {
        const day = t.match(/August (\d+)/i)[1];
        return { titleJa: `ビットコイン価格：8月${day}日の目標価格水準予測`, category: 'economy' };
      }
      if (/Ethereum above ___ on August (\d+)/i.test(t)) {
        const day = t.match(/August (\d+)/i)[1];
        return { titleJa: `イーサリアム価格：8月${day}日の目標価格水準予測`, category: 'economy' };
      }
      if (/Bitcoin Up or Down on August (\d+)/i.test(t)) {
        const day = t.match(/August (\d+)/i)[1];
        return { titleJa: `ビットコイン：8月${day}日に前日比プラスで引けるか？`, category: 'economy' };
      }
      if (/Will the price of Bitcoin be above \$?([\d,]+) on August (\d+)/i.test(t)) {
        const m = t.match(/Will the price of Bitcoin be above \$?([\d,]+) on August (\d+)/i);
        return { titleJa: `ビットコイン価格は8月${m[2]}日に${m[1]}ドルを上回るか？`, category: 'economy' };
      }
      if (/Will the price of Ethereum be above \$?([\d,]+) on August (\d+)/i.test(t)) {
        const m = t.match(/Will the price of Ethereum be above \$?([\d,]+) on August (\d+)/i);
        return { titleJa: `イーサリアム価格は8月${m[2]}日に${m[1]}ドルを上回るか？`, category: 'economy' };
      }
      if (/What price will Bitcoin hit in August.*?[↑↓]?\s*([\d,]+)/i.test(t)) {
        const m = t.match(/([\d,]+)/);
        return { titleJa: `ビットコインは8月中に${m ? m[1] : ''}ドルに到達するか？`, category: 'economy' };
      }
      if (/What price will Ethereum hit in August.*?[↑↓]?\s*([\d,]+)/i.test(t)) {
        const m = t.match(/([\d,]+)/);
        return { titleJa: `イーサリアムは8月中に${m ? m[1] : ''}ドルに到達するか？`, category: 'economy' };
      }
      if (/What price will Bitcoin hit in (\d+).*?[↑↓]?\s*([\d,]+)/i.test(t)) {
        const m = t.match(/What price will Bitcoin hit in (\d+).*?[↑↓]?\s*([\d,]+)/i);
        return { titleJa: `ビットコインは${m[1]}年に${m[2]}ドルに到達するか？`, category: 'economy' };
      }
      if (/What price will Ethereum hit in (\d+).*?[↑↓]?\s*([\d,]+)/i.test(t)) {
        const m = t.match(/What price will Ethereum hit in (\d+).*?[↑↓]?\s*([\d,]+)/i);
        return { titleJa: `イーサリアムは${m[1]}年に${m[2]}ドルに到達するか？`, category: 'economy' };
      }
      if (/What price will Bitcoin hit August (\d+)-(\d+).*?[↑↓]?\s*([\d,]+)/i.test(t)) {
        const m = t.match(/August (\d+)-(\d+).*?[↑↓]?\s*([\d,]+)/i);
        return { titleJa: `ビットコインは8月${m[1]}〜${m[2]}日に${m[3]}ドルに到達するか？`, category: 'economy' };
      }
      if (/What price will Ethereum hit August (\d+)-(\d+).*?[↑↓]?\s*([\d,]+)/i.test(t)) {
        const m = t.match(/August (\d+)-(\d+).*?[↑↓]?\s*([\d,]+)/i);
        return { titleJa: `イーサリアムは8月${m[1]}〜${m[2]}日に${m[3]}ドルに到達するか？`, category: 'economy' };
      }
      if (/Gavin Newsom win the 2028/i.test(t)) {
        return { titleJa: 'ギャビン・ニューサムは2028年米民主党大統領候補に選出されるか？', category: 'politics' };
      }
      if (/Donald Trump win the 2028/i.test(t)) {
        return { titleJa: 'ドナルド・トランプは2028年米共和党大統領候補に選出されるか？', category: 'politics' };
      }
      if (/JD Vance win the 2028/i.test(t)) {
        return { titleJa: '米大統領選 2028：JDヴァンスが勝利するか？', category: 'politics' };
      }
      if (/Tarcisio de Freitas win the 2026/i.test(t)) {
        return { titleJa: 'タルシシオ・デ・フレイタスは2026年ブラジル大統領選挙で勝利するか？', category: 'politics' };
      }
      if (/Florida Governor Republican Primary Winner/i.test(t)) {
        return { titleJa: '米フロリダ州知事選：共和党予備選で勝利する候補は？', category: 'politics' };
      }
      if (/Where will the next next round of US-Iran peace talks be/i.test(t)) {
        return { titleJa: '米イラン和平交渉：2026年9月30日までに公式協議は開催されないか？', category: 'politics' };
      }
      if (/US-Iran 60 day negotiation period extended/i.test(t)) {
        return { titleJa: '米イラン間の60日間交渉期間はさらに延長されるか？', category: 'politics' };
      }
      if (/Israel x Iran ceasefire continues through/i.test(t)) {
        return { titleJa: 'イスラエル・イラン間の停戦合意は継続するか？', category: 'politics' };
      }
      if (/US announces end of Iranian blockade by July 24, 2026/i.test(t)) {
        return { titleJa: '米国は2026年7月24日までにイラン海上封鎖の解除を発表するか？', category: 'politics' };
      }
      if (/US ceasefire against Iran continues through August 22/i.test(t)) {
        return { titleJa: '米国の対イラン停戦措置は8月22日まで継続するか？', category: 'politics' };
      }
      if (/Strait of Hormuz traffic returns to normal by (August|September|December) (\d+)/i.test(t)) {
        const m = t.match(/by (August|September|December) (\d+)/i);
        const months = { August: '8月', September: '9月', December: '12月' };
        return { titleJa: `ホルムズ海峡の通航量は${months[m[1]] || m[1]}${m[2]}日までに正常化するか？`, category: 'politics' };
      }
      if (/Abiy Ahmed be the next Prime Minister of Ethiopia/i.test(t)) {
        return { titleJa: 'アビィ・アハメドは次期エチオピア首相に留任するか？', category: 'politics' };
      }
      if (/United Russia \(ER\) gain the most seats/i.test(t)) {
        return { titleJa: '統一ロシアは次期ロシア下院選で最多議席を獲得するか？', category: 'politics' };
      }
      if (/Marine Le Pen win the 2027/i.test(t)) {
        return { titleJa: 'マリーヌ・ル・ペンは2027年フランス大統領選挙で勝利するか？', category: 'politics' };
      }
      if (/Putin out as President of Russia/i.test(t)) {
        return { titleJa: 'プーチン大統領は2026年末までにロシア大統領を退任するか？', category: 'politics' };
      }
      if (/Elon Musk # tweets August (\d+) - August (\d+)/i.test(t)) {
        const m = t.match(/August (\d+) - August (\d+)/i);
        const mNum = t.match(/([<>=]+)?\s*(\d+)/);
        const target = mNum ? mNum[2] : '20';
        const symbol = (mNum && mNum[1] && mNum[1].includes('>')) ? '以上' : '未満';
        return { titleJa: `イーロン・マスクのポスト数：8月${m[1]}日〜${m[2]}日に「${target}回${symbol}」となるか？`, category: 'entertainment' };
      }

      if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(t) && !t.includes('vs.') && !t.includes('Winner')) {
        return { titleJa: t, category };
      }

      // 構造的フェイルセーフ: 未知の英語タイトルにはカテゴリに応じた自動日本語化プレフィックスを付与
      const fallbackCat = category || 'economy';
      const prefix = fallbackCat === 'sports' ? 'スポーツ予測: ' : fallbackCat === 'politics' ? '国際政治動向: ' : fallbackCat === 'tech' ? 'AI・テック予測: ' : fallbackCat === 'entertainment' ? 'エンタメ予測: ' : '経済・市場予測: ';
      return { titleJa: `${prefix}${t}`, category: fallbackCat };
    }

    // 既存DBの高品質な日本語タイトル・カテゴリを事前取得し、同期による上書きを構造的に防止 (N-20類似の件数上限破綻を防ぐため range(0, 9999) を明示)
    const { data: existingRows } = await supabase.from('events').select('id, title_ja, category').range(0, 9999);
    const existingMap = new Map((existingRows || []).map(r => [r.id, r]));

    const selectedRecords = topCandidates.map(c => {
      const insight = insightMap.get(c.id);
      let titleJa = insight?.titleJa;
      
      // 厳密な日本語検証: 日本語文字が含まれない、または英語の機能語が3つ以上ある場合はフォールバック翻訳を適用
      const hasJp = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(titleJa || '');
      const englishFuncCount = ((titleJa || '').match(/\b(will|the|be|in|on|by|to|of|and|or|is|are|win|hit|nomination|election)\b/gi) || []).length;
      
      const fb = translateFallback(c.id, c.rawQuestion);

      const existing = existingMap.get(c.id);
      const existingHasJp = existing?.title_ja && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(existing.title_ja);
      const existingIsClean = existingHasJp &&
        !existing.title_ja.includes('Will ') &&
        !existing.title_ja.includes('Spread:') &&
        !existing.title_ja.startsWith('経済・市場予測: Will') &&
        !existing.title_ja.startsWith('経済・市場予測: Spread:');

      // 既存DBにすでに綺麗な日本語タイトルが存在する場合は、LLMやフォールバックによる破壊・上書きを防止して最優先保持
      if (existingIsClean) {
        titleJa = existing.title_ja;
      } else if (!titleJa || !hasJp || englishFuncCount >= 3) {
        titleJa = fb.titleJa;
      }

      titleJa = (titleJa || '').replace(/\s{2,}/g, ' ').trim();

      const finalCat = (existingIsClean && existing?.category) ? existing.category : (fb.category || c.cat || 'economy');
      const catLabels = {
        economy: '📊 経済・金利・暗号資産',
        tech: '⚡ AI・テック',
        politics: '🌐 国際・社会',
        sports: '⚾ スポーツ',
        entertainment: '🎬 エンタメ',
      };

      const endDateStr = c.market.endDate || '2026-12-31';
      const isExpired = new Date(endDateStr) < new Date();
      const hasJpFinal = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(titleJa || '');

      return {
        id: c.id,
        slug: c.ev.slug,
        title_ja: titleJa,
        title_en: c.rawQuestion,
        question_ja: titleJa,
        question_en: c.rawQuestion,
        category: finalCat,
        category_label: catLabels[finalCat] || c.catLabel,
        icon_url: c.ev.image || c.ev.icon || '',
        end_date: endDateStr,
        is_active: !isExpired && hasJpFinal,
        updated_at: new Date().toISOString(),
      };
    });

    // DB自己修復ルーチン: 二重空白や既知の誤プレフィックスを自動修復
    if (existingRows) {
      for (const r of existingRows) {
        if (r.title_ja && r.title_ja.includes('  ')) {
          const cleaned = r.title_ja.replace(/\s{2,}/g, ' ').trim();
          await supabase.from('events').update({ title_ja: cleaned, question_ja: cleaned }).eq('id', r.id);
        }
      }
    }

    const { error } = await supabase
      .from('events')
      .upsert(selectedRecords, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error.message);
    } else {
      // 期限切れ銘柄を自動的に非アクティブ化
      await supabase.from('events').update({ is_active: false }).lt('end_date', new Date().toISOString()).eq('is_active', true);
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
