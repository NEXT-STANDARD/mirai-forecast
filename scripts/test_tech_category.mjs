import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const localEnv = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) localEnv[k.trim()] = v.join('=').trim();
});

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY || localEnv.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data } = await supabase.from('events').select('*').order('updated_at', { ascending: false }).limit(30);
  
  console.log(`取得件数: ${data?.length}`);
  const techItems = data?.filter(e => e.category === 'tech') || [];
  console.log(`最新30件中の tech 件数: ${techItems.length}`);
  techItems.forEach(t => console.log(` - ID: ${t.id} | ${t.title_ja}`));
}

test();
