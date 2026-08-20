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

async function fix() {
  console.log('Supabase の銘柄カテゴリ＆カタリスト分析を整合中...');

  // 大谷翔平のカテゴリラベルを更新
  await supabase.from('events').update({ category_label: '⚾ スポーツ', category: 'sports' }).ilike('title_ja', '%大谷%');
  // 任天堂のカテゴリラベルを更新
  await supabase.from('events').update({ category_label: '⚡ AI・テック', category: 'tech' }).ilike('title_ja', '%任天堂%');
  // 日銀のカテゴリラベルを更新
  await supabase.from('events').update({ category_label: '📊 経済・金利・暗号資産', category: 'economy' }).ilike('title_ja', '%日銀%');

  const { data: records } = await supabase.from('events').select('id, slug, title_ja, category');
  
  const jsonPath = path.join(process.cwd(), 'public', 'data', 'ai_insights.json');
  let currentJson = {};
  if (fs.existsSync(jsonPath)) {
    try { currentJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
  }

  // 大谷翔平の専用インサイト
  records.filter(r => r.title_ja.includes('大谷')).forEach(r => {
    currentJson[r.id] = {
      titleJa: r.title_ja,
      summaryJa: '前人未到の50-50達成後、ジャッジ以来の60発到達へ期待高まるも、四球増と日程消化で市場は慎重な見方。',
      whyMovedJa: '直近の打撃フォーム・驚異的な量産ペースと、対戦相手の敬遠策・球場特性（打者天国クアーズ）による世論の急騰。',
      keyCatalysts: [
        '8月下旬：打者天国クアーズ・フィールドでの対ロッキーズ3連戦（固め打ち期待）',
        '9月中旬：地区優勝争いが激化する直接対決（勝負避け・敬遠リスク）',
        '9月29日：レギュラーシーズン最終戦'
      ],
      urgencyLevel: 'high',
      lastUpdated: 'AI事前分析 (2026年8月最新)'
    };
    if (r.slug) currentJson[r.slug] = currentJson[r.id];
  });

  // 任天堂の専用インサイト
  records.filter(r => r.title_ja.includes('任天堂')).forEach(r => {
    currentJson[r.id] = {
      titleJa: r.title_ja,
      summaryJa: '次世代機に関するアナウンス動向や年末商戦の販売戦略に対する市場の思惑が拮抗。',
      whyMovedJa: '直近のサプライチェーンリーク報道と、世界的なゲームカンファレンス開催日程への市場の思惑。',
      keyCatalysts: [
        '11月上旬：任天堂 2027年3月期中間決算発表・経営方針説明会での公式発言',
        '12月中旬：世界最大級のゲーム表彰式「The Game Awards 2026」での電撃ティザー公開有無'
      ],
      urgencyLevel: 'high',
      lastUpdated: 'AI事前分析 (2026年8月最新)'
    };
    if (r.slug) currentJson[r.slug] = currentJson[r.id];
  });

  // 日銀の専用インサイト
  records.filter(r => r.title_ja.includes('日銀')).forEach(r => {
    currentJson[r.id] = {
      titleJa: r.title_ja,
      summaryJa: '植田総裁のタカ派姿勢や円安是正圧力が強まる一方、政局不透明感や物価指標の波及見極めで市場の織り込みは拮抗。',
      whyMovedJa: '全国消費者物価指数（コアCPI）の高止まりと、実質賃金・個人消費の持続性に対する金融機関の織り込み。',
      keyCatalysts: [
        '9月19日〜20日開催：日銀「金融政策決定会合」および植田和男総裁記者会見',
        '10月30日〜31日開催：日銀「展望レポート（経済・物価情勢の展望）」公表',
        '12月18日〜19日開催：日銀「年内最終・金融政策決定会合」'
      ],
      urgencyLevel: 'high',
      lastUpdated: 'AI事前分析 (2026年8月最新)'
    };
    if (r.slug) currentJson[r.slug] = currentJson[r.id];
  });

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

  console.log('✅ Supabaseおよび aiInsightsMaster.ts の整合完了！');
}

fix();
