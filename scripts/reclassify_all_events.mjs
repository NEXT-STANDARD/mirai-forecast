import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const localEnv = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) localEnv[k.trim()] = v.join('=').trim();
});

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY || localEnv.VITE_SUPABASE_ANON_KEY);

function determineCategory(title, currentCat) {
  const t = (title || '').toLowerCase();

  // 1. スポーツ (sports)
  if (
    t.includes('大谷') ||
    t.includes('本塁打') ||
    t.includes('ドジャース') ||
    t.includes('カージナルス') ||
    t.includes('オリオールズ') ||
    t.includes('ウィングス') ||
    t.includes('ballon d\'or') ||
    t.includes('バロンドール') ||
    t.includes('epl') ||
    t.includes('プレミアリーグ') ||
    t.includes('チャンピオンズリーグ') ||
    t.includes('uefa') ||
    t.includes('パリ・サンジェルマン') ||
    t.includes('cincinnati open') ||
    t.includes('tennis') ||
    t.includes('テニス') ||
    t.includes('itf') ||
    t.includes('mlb') ||
    t.includes('野球') ||
    t.includes('サッカー')
  ) {
    return { category: 'sports', label: '⚾ スポーツ' };
  }

  // 2. エンタメ・カルチャー (entertainment)
  if (
    t.includes('ジブリ') ||
    t.includes('宮崎駿') ||
    t.includes('紅白') ||
    t.includes('yoasobi') ||
    t.includes('新しい学校のリーダーズ') ||
    t.includes('鬼滅') ||
    t.includes('呪術') ||
    t.includes('映画') ||
    t.includes('興行収入') ||
    t.includes('lol:') ||
    t.includes('league of legends') ||
    t.includes('counter-strike') ||
    t.includes('kespa') ||
    t.includes('lck') ||
    t.includes('eスポーツ') ||
    t.includes('esports') ||
    t.includes('elon musk # tweets') ||
    t.includes('マスクのx投稿') ||
    t.includes('x投稿')
  ) {
    return { category: 'entertainment', label: '🎬 エンタメ・カルチャー' };
  }

  // 3. テック・AI (tech)
  if (
    t.includes('任天堂') ||
    t.includes('switch') ||
    t.includes('次世代機') ||
    t.includes('gpt') ||
    t.includes('openai') ||
    t.includes('ai') ||
    t.includes('spacex') ||
    t.includes('starship') ||
    t.includes('apple') ||
    t.includes('nvidia')
  ) {
    return { category: 'tech', label: '⚡ AI・テック' };
  }

  // 4. 国際・社会・時事 (politics)
  if (
    t.includes('大統領') ||
    t.includes('選挙') ||
    t.includes('プーチン') ||
    t.includes('ロシア') ||
    t.includes('フランス') ||
    t.includes('ブラジル') ||
    t.includes('エチオピア') ||
    t.includes('衆議院') ||
    t.includes('総選挙') ||
    t.includes('iran') ||
    t.includes('イラン') ||
    t.includes('israel') ||
    t.includes('イスラエル') ||
    t.includes('ceasefire') ||
    t.includes('停戦') ||
    t.includes('ホルムズ') ||
    t.includes('governor') ||
    t.includes('知事')
  ) {
    return { category: 'politics', label: '🌐 国際・社会' };
  }

  // 5. 経済・金利・暗号資産 (economy)
  return { category: 'economy', label: '📊 経済・金利・暗号資産' };
}

async function reclassifyAll() {
  console.log('全銘柄のカテゴリーを精密に再分類中...');

  const { data: dbEvents, error } = await supabase.from('events').select('*');
  if (error) {
    console.error('Fetch error:', error.message);
    return;
  }

  let updatedCount = 0;
  for (const item of dbEvents) {
    const { category, label } = determineCategory(item.title_ja || item.title_en, item.category);

    if (item.category !== category || item.category_label !== label) {
      await supabase
        .from('events')
        .update({
          category,
          category_label: label,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
      
      console.log(`✅ [${item.id}] 「${item.title_ja}」 ➔ ${label} (${category})`);
      updatedCount++;
    }
  }

  console.log(`\n🎉 合計 ${updatedCount} 件の銘柄カテゴリーを精密更新いたしました！`);
}

reclassifyAll();
