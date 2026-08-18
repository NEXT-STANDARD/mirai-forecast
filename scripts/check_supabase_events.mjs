import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const localEnv = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) localEnv[k.trim()] = v.join('=').trim();
});

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('events').select('id, slug, title_ja').limit(10);
  if (error) console.error('Error:', error);
  else console.log('Supabase events sample:', data);
}

check();
