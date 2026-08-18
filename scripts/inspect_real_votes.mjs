import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const localEnv = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) localEnv[k.trim()] = v.join('=').trim();
});

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY || localEnv.VITE_SUPABASE_ANON_KEY);

async function inspectVotes() {
  const { data: logs, error } = await supabase
    .from('japan_vote_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`\n📊 【Supabase 実際の投票ログ総数: ${logs?.length || 0} 件】\n`);
  logs?.slice(0, 10).forEach((l, idx) => {
    console.log(`[${idx + 1}] Event: ${l.event_id} | Choice: ${l.choice} | Time: ${l.created_at}`);
  });
}

inspectVotes();
