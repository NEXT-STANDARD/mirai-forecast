import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  try {
    const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...vals] = line.split('=');
      if (key && !key.startsWith('#')) {
        const k = key.trim();
        const v = vals.join('=').trim();
        if (k === 'VITE_SUPABASE_URL') supabaseUrl = v;
        if (k === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = v;
      }
    });
  } catch {}
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCounts() {
  const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
  const { count: priceHistCount } = await supabase.from('polymarket_price_history').select('*', { count: 'exact', head: true });
  const { count: votesCount } = await supabase.from('japan_vote_logs').select('*', { count: 'exact', head: true });

  console.log('--- 📊 Supabase データベース現在のデータ格納状況 ---');
  console.log(`✅ events (市場マスタ)                 : ${eventsCount} 件`);
  console.log(`✅ polymarket_price_history (オッズ時系列) : ${priceHistCount} 件`);
  console.log(`✅ japan_vote_logs (国内世論投票ログ)     : ${votesCount} 件`);
}

checkCounts();
