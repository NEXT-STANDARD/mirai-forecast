import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const localEnv = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) localEnv[k.trim()] = v.join('=').trim();
});

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY || localEnv.VITE_SUPABASE_ANON_KEY);

async function enrichTech() {
  console.log('⚡ AI・テックカテゴリーの銘柄を最新化・充実中...');

  // 既存テック銘柄の updated_at を最新化
  await supabase
    .from('events')
    .update({ updated_at: new Date().toISOString(), is_active: true })
    .eq('category', 'tech');

  const { data: techEvents } = await supabase
    .from('events')
    .select('id, title_ja, category')
    .eq('category', 'tech');

  console.log(`現在の tech 銘柄数: ${techEvents?.length}件`);
  techEvents?.forEach(t => console.log(` - [${t.id}] ${t.title_ja}`));
}

enrichTech();
