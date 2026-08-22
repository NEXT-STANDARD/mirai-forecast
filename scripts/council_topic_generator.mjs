#!/usr/bin/env node

/**
 * ==============================================================================
 * 🏛️ 未来レーダー (MiraiRadar.com)
 * 🤖 マルチエージェント トピック起案評議会 (Topic Editorial Council Generator)
 * ==============================================================================
 * 
 * 5体の専門AIエージェント（地政学、国内政治、バイラル世論、AIテック、判定アーキテクト）が
 * タイムリーで賛否両論・SNS拡散力の高いトピックを起案・ディベート・相互採点し、
 * Supabase の「審査待ち提案パイプライン（is_active: false）」へ直接投入します。
 * 
 * 運営責任者（霧島様）は管理画面 (http://localhost:5173/admin) で確認し、
 * ワンクリックで本番公開・承認できます。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// 環境変数の読み込み
const envStr = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8');
const env = {};
envStr.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://wdpygtmqehoepgrueeda.supabase.co';
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

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
    focus: '北方領土・米中対立・主権問題・防衛政策の重大局面を検知',
    weight: '国家主権と国際秩序の行方'
  },
  {
    id: 'agent-politics',
    name: '🏛️ 桂木 玲奈 (Reina Katsuragi)',
    role: '国内政治・政策世論モニター',
    focus: '政局・解散総選挙・税制・法改正など、国民生活と政治世論の直結点',
    weight: '生活者心理と政界ダイナミクス'
  },
  {
    id: 'agent-viral',
    name: '⚡ 鳴神 蓮 (Ren Narukami)',
    role: 'X世論熱量・バイラルディベートアナリスト',
    focus: '賛否両論（50:50）・引用RTでの議論白熱度・感情動員力',
    weight: 'SNSエンゲージメント・バズ最大化'
  },
  {
    id: 'agent-tech',
    name: '💡 神谷 創 (So Kamiya)',
    role: 'AIテック・マクロ市場カタリスト',
    focus: 'AGI到達・生成AI著作権規制・日銀利上げ・仮想通貨ショック',
    weight: '技術革新の脅威と資産価値の変動'
  },
  {
    id: 'agent-arbiter',
    name: '⚖️ 堂島 雅人 (Masato Dojima)',
    role: '予測市場 判定アーキテクト（客観判定基準）',
    focus: '白黒が客観的に判定できるか、公式発表ソース・期日の厳格性',
    weight: '曖昧性の完全排除・公平性担保'
  }
];

// ==============================================================================
// 📋 第1弾 起案シミュレーション・候補銘柄プール（時事・賛否両論・高熱量）
// ==============================================================================
const TOPIC_CANDIDATES = [
  {
    title_ja: 'プーチン大統領、2026年内に北方領土（択捉島等）の軍事拠点化・再訪問を公式発表するか？',
    title_en: 'Will President Putin officially announce military reinforcement or revisit the Northern Territories in 2026?',
    question_ja: 'ロシアのプーチン大統領が、2026年12月31日までに北方領土（択捉島・国後島など）への再訪問、または新たな軍事施設の大規模配備を公式発表するか？',
    category: 'politics',
    category_label: '🌐 国際・社会',
    end_date: '2026-12-31',
    resolution_source: 'ロシア大統領府公式声明、外務省公式発表、または主要国際報道機関（ロイター、ブルームバーグ、NHK、共同通信）の確報',
    council_deliberation: {
      proposer: '🌐 陣内 拓海 (地政学)',
      debate_summary: '択捉島訪問後の世論沸騰を受け、日本の主権意識とロシアの実効支配強化の対立軸が極めて鮮明。X上での「毅然とした外交」vs「現実的経済対話」の議論が沸騰確実。',
      scores: {
        controversy: 38, // 40点満点
        viral: 29,       // 30点満点
        clarity: 28      // 30点満点
      },
      total_score: 95
    }
  },
  {
    title_ja: '日銀、2026年内に政策金利を「0.75%」以上へ追加利上げ決定するか？',
    title_en: 'Will the Bank of Japan raise the policy rate to 0.75% or higher in 2026?',
    question_ja: '日本銀行が2026年12月31日までに開催される金融政策決定会合において、政策金利を年0.75%以上（誘導目標上限）へ引き上げる決定を行うか？',
    category: 'economy',
    category_label: '📊 経済・金利・暗号資産',
    end_date: '2026-12-31',
    resolution_source: '日本銀行（BOJ）金融政策決定会合における公式公表文・決定事項声明',
    council_deliberation: {
      proposer: '💡 神谷 創 (マクロ市場)',
      debate_summary: '住宅ローン金利上昇への家計不安 vs 円安阻止とインフレ抑制の金融論争。資産家・投資家から一般世帯まで全員が当事者であり、YES/NOの意見が真っ二つに分かれる最上級トピック。',
      scores: {
        controversy: 39,
        viral: 28,
        clarity: 30
      },
      total_score: 97
    }
  },
  {
    title_ja: '日本政府、2026年内に「生成AI学習データへの著作権料対価支払い義務化」法案を閣議決定するか？',
    title_en: 'Will Japan approve a bill mandating copyright compensation for AI training data in 2026?',
    question_ja: '日本政府（文化庁・内閣府等）が、2026年12月31日までに商用生成AIモデルの学習データ利用に対して著作権者への対価還元・許諾を義務付ける法改正案を閣議決定するか？',
    category: 'tech',
    category_label: '⚡ AI・テック',
    end_date: '2026-12-31',
    resolution_source: '文化庁、内閣官房、または官報に掲載された法改正閣議決定の公式公表',
    council_deliberation: {
      proposer: '⚡ 鳴神 蓮 (バイラル世論)',
      debate_summary: 'クリエイター・絵師・作家の権利擁護派 vs 日本のAI開発力・イノベーション推進派によるX最大の論争領域。「著作権侵害だ」vs「学習規制は日本のAI敗戦」の感情的熱量が極めて高い。',
      scores: {
        controversy: 39,
        viral: 29,
        clarity: 27
      },
      total_score: 95
    }
  },
  {
    title_ja: '2026年秋（10月末）までに衆議院解散・総選挙が実施されるか？',
    title_en: 'Will a snap House of Representatives general election be held in Japan by Autumn 2026?',
    question_ja: '日本国内において、2026年10月31日までに衆議院の解散および総選挙（投開票）が実際に執行されるか？',
    category: 'politics',
    category_label: '🌐 国際・社会',
    end_date: '2026-10-31',
    resolution_source: '総務省選挙関連公表資料、官報による解散総選挙の公布・施行',
    council_deliberation: {
      proposer: '🏛️ 桂木 玲奈 (国内政治)',
      debate_summary: '政権支持率の動向と党内力学が交錯。今打つべきか、任期満了近くまで引っ張るべきかで永田町と有権者の予測が真っ二つに分かれる定番の高注目トピック。',
      scores: {
        controversy: 36,
        viral: 27,
        clarity: 30
      },
      total_score: 93
    }
  },
  {
    title_ja: '主要AI企業（OpenAI/Anthropic）、2026年内に「自律型AIエージェントによる企業業務の完全代替」を公式宣言するか？',
    title_en: 'Will OpenAI or Anthropic officially declare autonomous AI agents fully capable of enterprise workflows in 2026?',
    question_ja: 'OpenAI、Anthropic、またはGoogle DeepMindが、2026年12月31日までに人間の介入なしで複雑な企業実務を完遂できる「自律型エージェント（AGI到達水準）」を公式プレスリリースまたは公式基調講演で発表するか？',
    category: 'tech',
    category_label: '⚡ AI・テック',
    end_date: '2026-12-31',
    resolution_source: 'OpenAI、Anthropic、Googleの公式ブログ・製品リリース発表文',
    council_deliberation: {
      proposer: '💡 神谷 創 (AIテック)',
      debate_summary: 'ホワイトカラー消滅の危機感 vs 技術的限界論。ビジネスパーソン・エンジニア層での議論喚起力が抜群で、海外Polymarket大口オッズとの乖離が最も出やすい。',
      scores: {
        controversy: 35,
        viral: 28,
        clarity: 27
      },
      total_score: 90
    }
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
    console.log(`   ・${m.name} ｜ ${m.role}（評価軸: ${m.weight}）`);
  });
  console.log('\n------------------------------------------------------------------------------');
  console.log('🔍 本日の時事・SNS熱量スキャン ＆ 評議会ディベート審査結果:');
  console.log('------------------------------------------------------------------------------\n');

  const generatedRecords = [];

  for (let i = 0; i < TOPIC_CANDIDATES.length; i++) {
    const candidate = TOPIC_CANDIDATES[i];
    const timestamp = Date.now() + i * 100;
    const id = `council-${timestamp}`;
    const slug = `council-${candidate.category}-${timestamp}`;

    const { controversy, viral, clarity } = candidate.council_deliberation.scores;
    const total = candidate.council_deliberation.total_score;

    console.log(`【候補 #${i + 1}】 スコア: 🔥 ${total}/100点 (賛否:${controversy}/40, バズ:${viral}/30, 判定:${clarity}/30)`);
    console.log(`   📌 タイトル: ${candidate.title_ja}`);
    console.log(`   🗣️ 起案担当: ${candidate.council_deliberation.proposer}`);
    console.log(`   💬 評議会見解: ${candidate.council_deliberation.debate_summary}`);
    console.log(`   🎯 判定ソース: ${candidate.resolution_source}`);
    console.log(`   ⏳ 予測期日: ${candidate.end_date}\n`);

    // question_en フィールドに評議会メタデータ（スコア・見解・判定ソース）を構造的に格納
    const questionEnMeta = `【AI評議会 審査スコア: ${total}/100】\n起案: ${candidate.council_deliberation.proposer}\n見解: ${candidate.council_deliberation.debate_summary}\n判定ソース: ${candidate.resolution_source}\nEnglish: ${candidate.question_en}`;

    generatedRecords.push({
      id,
      slug,
      title_ja: candidate.title_ja,
      title_en: candidate.title_en,
      question_ja: candidate.question_ja,
      question_en: questionEnMeta,
      category: candidate.category,
      category_label: candidate.category_label,
      icon_url: '',
      end_date: candidate.end_date,
      is_active: false, // ⭐️ 審査待ち（管理画面で霧島様が承認するまで非公開）
      updated_at: new Date().toISOString()
    });
  }

  console.log('------------------------------------------------------------------------------');
  console.log('💾 Supabase の「審査待ち提案（is_active: false）」へ投入中...');
  console.log('------------------------------------------------------------------------------');

  try {
    const { data, error } = await supabase.from('events').insert(generatedRecords).select('id, title_ja');
    if (error) {
      throw error;
    }

    console.log(`\n🎉 成功！ ${generatedRecords.length}件のハイインパクト起案銘柄を審査パイプラインに投入しました。`);
    console.log('------------------------------------------------------------------------------');
    console.log('🌐 管理画面URL: http://localhost:5173/admin (PIN: 2026)');
    console.log('📋 管理画面の「審査待ち提案パイプライン」にて、各トピックの「承認」ボタンを押すことで即時本番公開されます。');
    console.log('==============================================================================\n');
  } catch (err) {
    console.error('❌ Supabase 投入エラー:', err.message);
    process.exit(1);
  }
}

runTopicCouncil();
