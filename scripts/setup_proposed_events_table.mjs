import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const localEnv = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) localEnv[k.trim()] = v.join('=').trim();
});

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY || localEnv.VITE_SUPABASE_ANON_KEY);

async function setup() {
  console.log('proposed_events テーブルの疎通確認中...');
  // テスト挿入してテーブルが存在するか確認
  const testRecord = {
    id: `test-${Date.now()}`,
    title: 'テスト提案',
    category: 'economy',
    reason: 'システム疎通テスト',
    contributor_name: 'System',
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('proposed_events').insert(testRecord);
  if (error) {
    console.log('proposed_events テーブルは未作成または設定が必要です:', error.message);
    console.log('japan_vote_logs のような既存テーブル構造またはローカルフォールバックを用意します。');
  } else {
    console.log('✅ proposed_events テーブルが正常に利用可能です！');
    await supabase.from('proposed_events').delete().eq('id', testRecord.id);
  }
}

setup();
