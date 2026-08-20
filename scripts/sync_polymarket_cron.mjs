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
    };

    function translateFallback(id, raw) {
      if (DIRECT_MAP[id]) return DIRECT_MAP[id];
      if (!raw) return { titleJa: '観測銘柄' };
      let t = raw.trim();
      let category = null;

      if (/Dodgers|Rockies|Orioles|Rays|Cardinals|Reds|Tigers|Pirates|Marlins|Phillies|Yankees|Red Sox/i.test(t)) {
        return { titleJa: `MLB公式戦: ${t.replace(' - Exact Score', '').replace(' - More Markets', '')} 勝敗予測`, category: 'sports' };
      }
      if (/LoL:|League of Legends/i.test(t)) {
        let clean = t.replace(/LoL:\s*/i, 'LoL公式戦: ').replace(/\(BO3\)/g, '（3本勝負）').replace(/\(BO5\)/g, '（5本勝負）');
        return { titleJa: `${clean} 勝敗予測`, category: 'entertainment' };
      }
      if (/EWC 2026 CS2|Counter-Strike|CS2/i.test(t)) {
        if (/Winner/i.test(t)) return { titleJa: 'EWC 2026（eスポーツW杯）CS2部門 優勝チーム予測', category: 'entertainment' };
        return { titleJa: `${t.replace(/Counter-Strike:\s*/i, 'CS2公式戦: ')} 勝敗予測`, category: 'entertainment' };
      }
      if (/Cincinnati Open:/i.test(t)) {
        return { titleJa: `テニス シンシナティOP: ${t.replace(/Cincinnati Open:\s*/i, '')} 勝敗予測`, category: 'sports' };
      }
      if (/ITF M25/i.test(t)) {
        return { titleJa: `国際テニスITFツアー: ${t.replace(/ITF M25.*?:\s*/, '')} 勝敗予測`, category: 'sports' };
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
      if (/vs\.?|対/i.test(t) && !t.startsWith('LoL') && !t.startsWith('CS2')) {
        let clean = t.replace(' - Exact Score', '（スコア予想）').replace(' - More Markets', '');
        if (/Lynx|Valkyries/i.test(t)) return { titleJa: `WNBA公式戦: ${clean} 勝敗予測`, category: 'sports' };
        return { titleJa: `欧州サッカー: ${clean} 勝敗予測`, category: 'sports' };
      }
      if (/Fed Decision in September.*?50\+?\s*bps decrease/i.test(t)) {
        return { titleJa: '米FRB：9月FOMCで50bp以上の大幅利下げを実施するか？', category: 'economy' };
      }
      if (/What will WTI Crude Oil.*?hit in August 2026/i.test(t)) {
        return { titleJa: '2026年8月 WTI原油先物価格の到達水準予測', category: 'economy' };
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
        return { titleJa: '米イラン和平交渉：次期協議の開催地はどこになるか？', category: 'politics' };
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
        return { titleJa: `イーロン・マスクは8月${m[1]}日〜${m[2]}日に何回ポストするか？`, category: 'entertainment' };
      }

      if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(t) && !t.includes('vs.') && !t.includes('Winner')) {
        return { titleJa: t, category };
      }

      return { titleJa: t, category };
    }

    const selectedRecords = topCandidates.map(c => {
      const insight = insightMap.get(c.id);
      let titleJa = insight?.titleJa;
      
      // 厳密な日本語検証: 日本語文字が含まれない、または英語の機能語が3つ以上ある場合はフォールバック翻訳を適用
      const hasJp = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(titleJa || '');
      const englishFuncCount = ((titleJa || '').match(/\b(will|the|be|in|on|by|to|of|and|or|is|are|win|hit|nomination|election)\b/gi) || []).length;
      
      const fb = translateFallback(c.id, c.rawQuestion);
      if (!titleJa || !hasJp || englishFuncCount >= 3) {
        titleJa = fb.titleJa;
      }

      const finalCat = fb.category || c.cat || 'economy';
      const catLabels = {
        economy: '📊 経済・金利・暗号資産',
        tech: '⚡ AI・テック',
        politics: '🌐 国際・社会',
        sports: '⚾ スポーツ',
        entertainment: '🎬 エンタメ',
      };

      const endDateStr = c.market.endDate || '2026-12-31';
      const isExpired = new Date(endDateStr) < new Date();

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
        is_active: !isExpired,
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
