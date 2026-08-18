import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const localEnv = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) localEnv[k.trim()] = v.join('=').trim();
});

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY || localEnv.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { data: dbEvents, error } = await supabase
    .from('events')
    .select('id, title_ja, category, category_label, is_active')
    .order('category', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error.message);
    return;
  }

  console.log(`\n📋 【Supabase登録銘柄 全${dbEvents.length}件のカテゴリー分類一覧】\n`);
  
  const grouped = {};
  dbEvents.forEach(e => {
    const cat = e.category || 'uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(e);
  });

  Object.keys(grouped).forEach(cat => {
    console.log(`\n======================================================`);
    console.log(`📂 カテゴリー: [${cat}] (${grouped[cat].length}件)`);
    console.log(`======================================================`);
    grouped[cat].forEach((item, idx) => {
      console.log(`  [${idx + 1}] ID: ${item.id} | active: ${item.is_active}`);
      console.log(`      タイトル: ${item.title_ja}`);
      console.log(`      ラベル  : ${item.category_label}`);
    });
  });
}

inspect();
