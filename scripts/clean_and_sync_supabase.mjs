import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const localEnv = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) localEnv[k.trim()] = v.join('=').trim();
});

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY || localEnv.VITE_SUPABASE_ANON_KEY);

async function clean() {
  console.log('Supabase events テーブルをクリーンアップ中...');
  // 古いID '1'〜'8' を削除
  const { error } = await supabase.from('events').delete().in('id', ['1', '2', '3', '4', '5', '6', '7', '8']);
  if (error) console.log('削除情報:', error.message);
  else console.log('✅ 古いテストデータを削除完了');
}

clean();
