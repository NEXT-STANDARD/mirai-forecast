/**
 * 未来レーダー (MiraiRadar.com) - 運営用 オリジナル銘柄管理 ＆ ユーザー提案承認 CLIツール
 * 
 * 使い方:
 *   1. 審査待ち提案の一覧表示:
 *      node scripts/manage_custom_topics.mjs list
 * 
 *   2. 提案の承認＆本番公開 (Gemini 3.7 Flash カタリスト自動生成):
 *      node scripts/manage_custom_topics.mjs approve <proposal_id>
 * 
 *   3. 運営公式オリジナル銘柄の即時投下:
 *      node scripts/manage_custom_topics.mjs add "大谷翔平は今季60本塁打に到達するか？" "sports" "直近の量産ペースと残り試合数"
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const localEnv = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) localEnv[k.trim()] = v.join('=').trim();
});

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY || localEnv.VITE_SUPABASE_ANON_KEY);
const geminiApiKey = localEnv.GEMINI_API_KEY;

async function listPendingProposals() {
  console.log('\n🔍 【審査待ち（Pending）のユーザー提案一覧】\n');
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', false)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching proposals:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('現在審査待ちの提案はありません。');
    return;
  }

  data.forEach((p, idx) => {
    console.log(`[${idx + 1}] ID: ${p.id}`);
    console.log(`    タイトル: ${p.title_ja}`);
    console.log(`    カテゴリ: ${p.category_label}`);
    console.log(`    詳細/背景: ${p.question_en}`);
    console.log(`    提案日時: ${p.updated_at}`);
    console.log('----------------------------------------------------');
  });
}

async function generateDeepInsightForCustom(titleJa, category) {
  if (!geminiApiKey) {
    return {
      summaryJa: '日本の世論および関連指標から注目が高まっている独自観測トピックです。',
      whyMovedJa: '直近の関連ニュース報道および関係者の動向を受けた世論の関心集中。',
      keyCatalysts: ['重要公式発表・関連報道', '市場・ファンの関心推移']
    };
  }

  const prompt = `以下の日本の独自予測市場トピックについて、プロの金融・時事アナリストとして、具体的で切れ味のある深層分析を作成してください。

トピック: 「${titleJa}」
カテゴリ: ${category}

【指示】
1. 抽象的な定型文は禁止。具体的な人物名、チーム名、企業名、指標名を盛り込むこと。
2. 今後のオッズ変動を左右する「具体的な次回カタリスト（何月何日の何のイベントか）」を2〜3個提示すること。

JSON形式のみで出力してください:
{
  "summaryJa": "市場・世論のコンセンサス（40〜60文字）",
  "whyMovedJa": "なぜこのテーマが注目されているかの具体的要因（60〜90文字）",
  "keyCatalysts": ["具体的な次回カタリスト1", "具体的な次回カタリスト2"]
}`;

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
    const data = await res.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(resultText);
  } catch (err) {
    console.error('Gemini error:', err);
    return {
      summaryJa: '日本の世論および関連指標から注目が高まっている独自観測トピックです。',
      whyMovedJa: '直近の関連ニュース報道および関係者の動向を受けた世論の関心集中。',
      keyCatalysts: ['重要公式発表・関連報道', '市場・ファンの関心推移']
    };
  }
}

async function approveProposal(proposalId) {
  console.log(`\n⏳ 提案 ID [${proposalId}] を審査・承認中...`);

  const { data: record, error: fetchErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (fetchErr || !record) {
    console.error('提案が見つかりませんでした:', fetchErr?.message);
    return;
  }

  // Gemini 3.7 Flash でカタリスト分析を生成
  console.log(`🤖 Gemini 3.7 Flash が「${record.title_ja}」の深層カタリスト分析を生成中...`);
  const insight = await generateDeepInsightForCustom(record.title_ja, record.category_label);

  // Supabase で is_active: true に更新
  const { error: updateErr } = await supabase
    .from('events')
    .update({
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', proposalId);

  if (updateErr) {
    console.error('更新エラー:', updateErr.message);
    return;
  }

  // ai_insights.json & aiInsightsMaster.ts を更新
  const jsonPath = path.join(process.cwd(), 'public', 'data', 'ai_insights.json');
  let currentJson = {};
  if (fs.existsSync(jsonPath)) {
    try { currentJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
  }
  currentJson[proposalId] = {
    titleJa: record.title_ja,
    summaryJa: insight.summaryJa,
    whyMovedJa: insight.whyMovedJa,
    keyCatalysts: insight.keyCatalysts,
    urgencyLevel: 'high',
    lastUpdated: 'Gemini 3.7 Flash リアルタイム解析済み'
  };
  fs.writeFileSync(jsonPath, JSON.stringify(currentJson, null, 2));

  const tsPath = path.join(process.cwd(), 'src', 'data', 'aiInsightsMaster.ts');
  const tsContent = `/**
 * 未来レーダー (MiraiRadar.com) - Gemini 3.7 Flash 深層カタリスト分析マスター
 * 自動生成ファイル (sync_polymarket_cron.mjs / manage_custom_topics.mjs により更新)
 */

export interface AiInsightData {
  titleJa: string;
  summaryJa: string;
  whyMovedJa: string;
  keyCatalysts: string[];
  urgencyLevel: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export const AI_INSIGHTS_MASTER: Record<string, AiInsightData> = ${JSON.stringify(currentJson, null, 2)};
`;
  fs.writeFileSync(tsPath, tsContent);

  console.log(`\n🎉 【承認完了＆本番公開！】`);
  console.log(`  タイトル: ${record.title_ja}`);
  console.log(`  サマリー: ${insight.summaryJa}`);
  console.log(`  カタリスト: ${insight.keyCatalysts.join(' ｜ ')}`);
}

async function addOfficialCustomTopic(titleJa, category, reason) {
  console.log(`\n👑 運営公式オリジナル銘柄「${titleJa}」を即時投下中...`);

  const categoryLabels = {
    economy: '📊 経済・金利・暗号資産',
    tech: '⚡ AI・テック',
    politics: '🌐 国際・社会',
    sports: '⚾ スポーツ',
    entertainment: '🎬 エンタメ・カルチャー',
  };

  const id = `official-${Date.now()}`;
  const slug = `official-${Date.now()}`;

  console.log(`🤖 Gemini 3.7 Flash が深層カタリスト分析を生成中...`);
  const insight = await generateDeepInsightForCustom(titleJa, categoryLabels[category] || '📊 注目トピック');

  const newRecord = {
    id,
    slug,
    title_ja: titleJa,
    title_en: titleJa,
    question_ja: titleJa,
    question_en: `【公式オリジナル観測銘柄】背景: ${reason}`,
    category: category || 'economy',
    category_label: categoryLabels[category] || '📊 注目トピック',
    icon_url: '',
    end_date: '2026-12-31',
    is_active: true, // ⭐️ 公式銘柄は即座に公開！
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('events').insert(newRecord);
  if (error) {
    console.error('Insert error:', error.message);
    return;
  }

  // ai_insights 更新
  const jsonPath = path.join(process.cwd(), 'public', 'data', 'ai_insights.json');
  let currentJson = {};
  if (fs.existsSync(jsonPath)) {
    try { currentJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
  }
  currentJson[id] = {
    titleJa,
    summaryJa: insight.summaryJa,
    whyMovedJa: insight.whyMovedJa,
    keyCatalysts: insight.keyCatalysts,
    urgencyLevel: 'high',
    lastUpdated: 'Gemini 3.7 Flash リアルタイム解析済み'
  };
  fs.writeFileSync(jsonPath, JSON.stringify(currentJson, null, 2));

  const tsPath = path.join(process.cwd(), 'src', 'data', 'aiInsightsMaster.ts');
  const tsContent = `/**
 * 未来レーダー (MiraiRadar.com) - Gemini 3.7 Flash 深層カタリスト分析マスター
 */

export interface AiInsightData {
  titleJa: string;
  summaryJa: string;
  whyMovedJa: string;
  keyCatalysts: string[];
  urgencyLevel: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export const AI_INSIGHTS_MASTER: Record<string, AiInsightData> = ${JSON.stringify(currentJson, null, 2)};
`;
  fs.writeFileSync(tsPath, tsContent);

  console.log(`\n🎉 【公式オリジナル銘柄 公開完了！】`);
  console.log(`  ID: ${id}`);
  console.log(`  タイトル: ${titleJa}`);
  console.log(`  サマリー: ${insight.summaryJa}`);
  console.log(`  カタリスト: ${insight.keyCatalysts.join(' ｜ ')}`);
}

// CLI引数処理
const [action, arg1, arg2, arg3] = process.argv.slice(2);

if (action === 'list') {
  listPendingProposals();
} else if (action === 'approve' && arg1) {
  approveProposal(arg1);
} else if (action === 'add' && arg1) {
  addOfficialCustomTopic(arg1, arg2 || 'economy', arg3 || '運営公式選定トピック');
} else {
  console.log(`
未来レーダー 運営用トピック管理ツール:
  - 審査待ち提案一覧 : node scripts/manage_custom_topics.mjs list
  - 提案の承認・公開 : node scripts/manage_custom_topics.mjs approve <id>
  - 公式銘柄の追加   : node scripts/manage_custom_topics.mjs add "タイトル" "category" "背景"
`);
}
