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
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`\n📊 【Supabase 実際の投票ログサンプル】\n`, logs);
}

inspectVotes();
