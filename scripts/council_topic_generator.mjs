#!/usr/bin/env node

/**
 * ==============================================================================
 * 🏛️ 未来レーダー (MiraiRadar.com)
 * 🤖 マルチエージェント トピック起案評議会 (Topic Editorial Council Generator)
 * ==============================================================================
 * 
 * 5体の専門AIエージェント（地政学、国内政治、バイラル世論、AIテック、判定アーキテクト）が
 * Google Gemini 3.7 Flash を活用して最新時事から「賛否両論・高熱量」なトピックを自律起案し、
 * Supabase の「審査待ち提案パイプライン（is_active: false）」へ自動投入します。
 * 
 * 運営責任者（霧島様）は管理画面 (http://localhost:5173/admin) でワンクリック承認できます。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// 環境変数の読み込み
const env = {};
if (fs.existsSync(path.join(ROOT, '.env'))) {
  const envStr = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8');
  envStr.split('\n').forEach((line) => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim();
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://wdpygtmqehoepgrueeda.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が見つかりません。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==============================================================================
// 👥 評議会メンバー（5体のAIエージェント・ペルソナ定義）
// ==============================================================================
const COUNCIL_MEMBERS = [
  {
    id: 'agent-geopolitics',
    name: '🌐 陣内 拓海 (Takumi Jinnai)',
    role: '地政学・国家安全保障ストラテジスト',
    focus: '北方領土・米中対立・主権問題・防衛政策の重大局面を検知'
  },
  {
    id: 'agent-politics',
    name: '🏛️ 桂木 玲奈 (Reina Katsuragi)',
    role: '国内政治・政策世論モニター',
    focus: '政局・解散総選挙・税制・法改正など、国民生活と政治世論の直結点'
  },
  {
    id: 'agent-viral',
    name: '⚡ 鳴神 蓮 (Ren Narukami)',
    role: 'X世論熱量・バイラルディベートアナリスト',
    focus: '賛否両論（50:50）・引用RTでの議論白熱度・感情動員力'
  },
  {
    id: 'agent-tech',
    name: '💡 神谷 創 (So Kamiya)',
    role: 'AIテック・マクロ市場カタリスト',
    focus: 'AGI到達・生成AI著作権規制・日銀利上げ・仮想通貨ショック'
  },
  {
    id: 'agent-arbiter',
    name: '⚖️ 堂島 雅人 (Masato Dojima)',
    role: '予測市場 判定アーキテクト（客観判定基準）',
    focus: '白黒が客観的に判定できるか、公式発表ソース・期日の厳格性'
  }
];

// ==============================================================================
// 🤖 Gemini 3.7 Flash による動的AI評議会セッション
// ==============================================================================
async function generateCouncilTopicsWithGemini(existingTitles = []) {
  if (!geminiApiKey) {
    console.log('⚠️ GEMINI_API_KEY が未設定のため、組み込みの高品質評議会シミュレーションを使用します。');
    return null;
  }

  const prompt = `あなたは「未来レーダー (MiraiRadar.com)」のトピック起案評議会（AI Council）です。
Polymarketのリアルマネー確率と、日本の生活者による世論投票（YES/NO）を対比させる金融・予測プラットフォームのために、
X（旧Twitter）で拡散され、賛否両論が巻き起こり、国民の当事者意識を刺激する【新しい予測トピック 3〜4件】を起案してください。

【評議会メンバー】
1. 🌐 陣内 拓海（地政学・安全保障）：北方領土、ロシア・中国・米国動向、防衛、領土主権
2. 🏛️ 桂木 玲奈（国内政治・政策）：解散総選挙、内閣支持率、減税/増税、法改正、社会規範
3. ⚡ 鳴神 蓮（バイラル世論）：Xで引用RTや議論が白熱する賛否拮抗（50:50）テーマ
4. 💡 神谷 創（AIテック・市場）：日銀利上げ、為替、AGI登場、AI著作権規制、ビットコイン
5. ⚖️ 堂島 雅人（判定アーキテクト）：公式発表等で誰が見ても客観的に判定できる明確な基準と期日

【既存の重複を避けるべきタイトルリスト】:
${existingTitles.slice(0, 30).map(t => `・${t}`).join('\n')}

【最重要ルール: 完全二者択一（YES/NO回答可能）の義務化】
・タイトルおよび質問文は、ユーザーが「YES（賛成・そうなる）」または「NO（反対・そうならない）」で迷いなく回答できる文末（例: 「〜するか？」「〜となるか？」）にしてください。
・「何回」「どこ」「誰が」「いつ」「いくら」「どれくらい」「どうなるか」といったオープンクエスチョン（5W1H）は【厳禁・即時却下】です。必ず条件を絞り込んだ命題（例: 「〜のポスト数は20回未満となるか？」「〜は10万ドルに到達するか？」「〜が当選するか？」）にしてください。

【重要: 期日条件】
現在日は 2026年8月 です。end_date は必ず今日以降の未来の日付（例: "2026-10-31", "2026-12-31", "2027-03-31" などの YYYY-MM-DD 形式）を指定してください。過去の日付は不可です。

【出力フォーマット（必ずJSON配列として出力）】:
[
  {
    "title_ja": "〇〇は2026年内に△△するか？",
    "title_en": "Will ... by 2026?",
    "question_ja": "〜が2026年12月31日までに〜を公式発表するか？",
    "question_en": "Short English description",
    "category": "politics" | "economy" | "tech" | "sports" | "entertainment",
    "category_label": "🌐 国際・社会" | "📊 経済・金利・暗号資産" | "⚡ AI・テック" | "⚾ スポーツ" | "🎬 エンタメ",
    "end_date": "2026-12-31",
    "resolution_source": "判定に用いる公的機関・大手報道機関・公式発表",
    "proposer": "🌐 陣内 拓海 (地政学)",
    "debate_summary": "なぜこのトピックが今熱く、賛否が割れるかの評議会見解",
    "controversy_score": 38,
    "viral_score": 29,
    "clarity_score": 29,
    "total_score": 96
  }
]`;

  const models = ['gemini-3.7-flash', 'gemini-3.6-flash'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 3000
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        console.warn(`[Gemini ${model}] 呼び出し失敗:`, err.error?.message);
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(rawText.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`🤖 Gemini ${model} による自律評議会セッションが正常完了しました（${parsed.length}件生成）。`);
        return parsed;
      }
    } catch (e) {
      console.warn(`[Gemini ${model}] 解析エラー:`, e.message);
    }
  }

  return null;
}

// ==============================================================================
// 📋 高品質フォールバック候補プール
// ==============================================================================
const FALLBACK_CANDIDATES = [
  {
    title_ja: 'プーチン大統領、2026年内に北方領土（択捉島等）の軍事拠点化・再訪問を公式発表するか？',
    title_en: 'Will President Putin officially announce military reinforcement or revisit the Northern Territories in 2026?',
    question_ja: 'ロシアのプーチン大統領が、2026年12月31日までに北方領土（択捉島・国後島など）への再訪問、または新たな軍事施設の大規模配備を公式発表するか？',
    question_en: 'Will Russian President Vladimir Putin officially announce a revisit to the Northern Territories or major military deployment by Dec 31, 2026?',
    category: 'politics',
    category_label: '🌐 国際・社会',
    end_date: '2026-12-31',
    resolution_source: 'ロシア大統領府公式声明、外務省公式発表、または主要国際報道機関（ロイター、ブルームバーグ、NHK、共同通信）の確報',
    proposer: '🌐 陣内 拓海 (地政学)',
    debate_summary: '択捉島訪問後の世論沸騰を受け、日本の主権意識とロシアの実効支配強化の対立軸が極めて鮮明。X上での「毅然とした外交」vs「現実的対話」の議論が沸騰確実。',
    controversy_score: 38,
    viral_score: 29,
    clarity_score: 28,
    total_score: 95
  },
  {
    title_ja: '日銀、2026年内に政策金利を「0.75%」以上へ追加利上げ決定するか？',
    title_en: 'Will the Bank of Japan raise the policy rate to 0.75% or higher in 2026?',
    question_ja: '日本銀行が2026年12月31日までに開催される金融政策決定会合において、政策金利を年0.75%以上（誘導目標上限）へ引き上げる決定を行うか？',
    question_en: 'Will the Bank of Japan raise its policy rate to 0.75% or higher by Dec 31, 2026?',
    category: 'economy',
    category_label: '📊 経済・金利・暗号資産',
    end_date: '2026-12-31',
    resolution_source: '日本銀行（BOJ）金融政策決定会合における公式公表文・決定事項声明',
    proposer: '💡 神谷 創 (マクロ市場)',
    debate_summary: '住宅ローン金利上昇への家計不安 vs 円安阻止とインフレ抑制の金融論争。資産家・投資家から一般世帯まで全員が当事者であり、YES/NOの意見が真っ二つに分かれる最上級トピック。',
    controversy_score: 39,
    viral_score: 28,
    clarity_score: 30,
    total_score: 97
  },
  {
    title_ja: '日本政府、2026年内に「生成AI学習データへの著作権料対価支払い義務化」法案を閣議決定するか？',
    title_en: 'Will Japan approve a bill mandating copyright compensation for AI training data in 2026?',
    question_ja: '日本政府（文化庁・内閣府等）が、2026年12月31日までに商用生成AIモデルの学習データ利用に対して著作権者への対価還元・許諾を義務付ける法改正案を閣議決定するか？',
    question_en: 'Will the Japanese government approve a bill mandating copyright compensation for commercial AI training data by Dec 31, 2026?',
    category: 'tech',
    category_label: '⚡ AI・テック',
    end_date: '2026-12-31',
    resolution_source: '文化庁、内閣官房、または官報に掲載された法改正閣議決定の公式公表',
    proposer: '⚡ 鳴神 蓮 (バイラル世論)',
    debate_summary: 'クリエイター・絵師・作家の権利擁護派 vs 日本のAI開発力・イノベーション推進派によるX最大の論争領域。「著作権侵害だ」vs「学習規制は日本のAI敗戦」の感情的熱量が極めて高い。',
    controversy_score: 39,
    viral_score: 29,
    clarity_score: 27,
    total_score: 95
  }
];

// ==============================================================================
// 🚀 評議会実行 ＆ Supabase への下書き投入処理
// ==============================================================================
async function runTopicCouncil() {
  console.log('\n==============================================================================');
  console.log('🏛️ 未来レーダー AI評議会（Topic Editorial Council）セッション開始');
  console.log('==============================================================================\n');

  console.log('👥 出席評議会メンバー:');
  COUNCIL_MEMBERS.forEach((m) => {
    console.log(`   ・${m.name} ｜ ${m.role}`);
  });

  // 1. 既存タイトルの取得（重複防止）
  const { data: existingEvents } = await supabase.from('events').select('title_ja');
  const existingTitles = (existingEvents || []).map(e => e.title_ja);

  // 2. Gemini 3.7 Flash またはフォールバックプールから候補取得
  let candidates = await generateCouncilTopicsWithGemini(existingTitles);
  if (!candidates || candidates.length === 0) {
    candidates = FALLBACK_CANDIDATES;
  }

  // 3. 厳格な二者択一（Yes/No整合性）＆ 5W1H排除フィルター（意味が分からない質問の事前自動却下）
  const forbidden5W1H = /何回|どこで|どこが|どこに|誰が|誰を|いくらに|いくらで|いつに|どれくらい|どんな|どうなる/;
  const validBinaryCandidates = uniqueCandidates.filter(c => {
    if (!c.title_ja) return false;
    if (forbidden5W1H.test(c.title_ja)) {
      console.warn(`⚠️ [自動事前却下] 5W1Hオープンクエスチョンを検知: "${c.title_ja}" ➔ 審査パイプライン投入を拒否しました。`);
      return false;
    }
    if (!/(?:か|か？|か\?)$/.test(c.title_ja.trim())) {
      console.warn(`⚠️ [自動事前却下] Yes/No疑問文形式でないタイトルを検知: "${c.title_ja}" ➔ 審査パイプライン投入を拒否しました。`);
      return false;
    }
    return true;
  });

  console.log('\n------------------------------------------------------------------------------');
  console.log(`🔍 本日の評議会ディベート審査結果 (${validBinaryCandidates.length}件採択):`);
  console.log('------------------------------------------------------------------------------\n');

  if (validBinaryCandidates.length === 0) {
    console.log('ℹ️ 採択基準（二者択一Yes/No整合性・重複チェック）を満たす新規候補はありませんでした。');
    return;
  }

  const generatedRecords = [];

  for (let i = 0; i < validBinaryCandidates.length; i++) {
    const candidate = validBinaryCandidates[i];
    const timestamp = Date.now() + i * 100;
    const id = `council-${timestamp}`;
    const slug = `council-${candidate.category || 'topic'}-${timestamp}`;

    const controversy = candidate.controversy_score || 35;
    const viral = candidate.viral_score || 28;
    const clarity = candidate.clarity_score || 28;
    const total = candidate.total_score || (controversy + viral + clarity);

    const isFuture = candidate.end_date && new Date(candidate.end_date) > new Date();
    const validatedEndDate = isFuture ? candidate.end_date : '2026-12-31';

    console.log(`【候補 #${i + 1}】 スコア: 🔥 ${total}/100点 (賛否:${controversy}/40, バズ:${viral}/30, 判定:${clarity}/30)`);
    console.log(`   📌 タイトル: ${candidate.title_ja}`);
    console.log(`   🗣️ 起案担当: ${candidate.proposer || 'AI評議会'}`);
    console.log(`   💬 評議会見解: ${candidate.debate_summary || ''}`);
    console.log(`   🎯 判定ソース: ${candidate.resolution_source || '公式発表'}`);
    console.log(`   ⏳ 予測期日: ${validatedEndDate}\n`);

    const questionEnMeta = `【AI評議会 審査スコア: ${total}/100】\n起案: ${candidate.proposer || 'AI評議会'}\n見解: ${candidate.debate_summary || ''}\n判定ソース: ${candidate.resolution_source || '公式公表'}\nEnglish: ${candidate.question_en || candidate.title_en || ''}`;

    generatedRecords.push({
      id,
      slug,
      title_ja: candidate.title_ja,
      title_en: candidate.title_en || candidate.title_ja,
      question_ja: candidate.question_ja || candidate.title_ja,
      question_en: questionEnMeta,
      category: candidate.category || 'politics',
      category_label: candidate.category_label || '🌐 国際・社会',
      icon_url: '',
      end_date: validatedEndDate,
      is_active: false, // ⭐️ 審査待ち（管理画面で霧島様が承認するまで非公開）
      updated_at: new Date().toISOString()
    });
  }

  console.log('------------------------------------------------------------------------------');
  console.log('💾 Supabase の「審査待ち提案（is_active: false）」へ投入中...');
  console.log('------------------------------------------------------------------------------');

  try {
    const { error } = await supabase.from('events').insert(generatedRecords);
    if (error) throw error;

    console.log(`\n🎉 成功！ ${generatedRecords.length}件のハイインパクト起案銘柄を審査パイプラインに投入しました。`);
    console.log('------------------------------------------------------------------------------');
    console.log('🌐 管理画面URL: http://localhost:5173/admin (PIN: 2026)');
    console.log('📋 管理画面の「提案審査パイプライン」にて、各トピックの「承認」ボタンを押すことで即時本番公開されます。');
    console.log('==============================================================================\n');
  } catch (err) {
    console.error('❌ Supabase 投入エラー:', err.message);
    process.exit(1);
  }
}

runTopicCouncil();
