import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#')) {
    env[key.trim()] = vals.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection with URL:', supabaseUrl);
console.log('Anon Key exists?', !!supabaseAnonKey, 'length:', supabaseAnonKey ? supabaseAnonKey.length : 0);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('\n--- 1. Testing insert into japan_vote_logs ---');
  const { data, error } = await supabase
    .from('japan_vote_logs')
    .insert({
      event_id: '1',
      choice: 'YES',
      device_type: 'DESKTOP',
      referrer: 'test_script'
    })
    .select();

  if (error) {
    console.error('Insert failed with error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Insert success! Inserted record:', data);
  }

  console.log('\n--- 2. Querying japan_vote_logs ---');
  const { data: selectData, error: selectError } = await supabase
    .from('japan_vote_logs')
    .select('*')
    .limit(5);

  if (selectError) {
    console.error('Select failed with error:', selectError);
  } else {
    console.log(`Select success! Found ${selectData.length} records:`, selectData);
  }
}

testInsert();
