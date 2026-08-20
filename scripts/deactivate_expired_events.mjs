import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync("/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env", "utf-8");
const parsed = {};
env.split("\n").forEach(l => { 
  const [k, ...v] = l.split("="); 
  if (k && !k.startsWith("#")) parsed[k.trim()] = v.join("=").trim(); 
});

const supabase = createClient(parsed.VITE_SUPABASE_URL, parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: events, error } = await supabase.from('events').select('id, title_ja, end_date, is_active');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  const now = new Date();
  let deactivatedCount = 0;

  for (const ev of events) {
    if (ev.end_date && new Date(ev.end_date) < now) {
      if (ev.is_active) {
        const { error: updateErr } = await supabase.from('events').update({ is_active: false }).eq('id', ev.id);
        if (updateErr) {
          console.error(`Error updating event [${ev.id}]:`, updateErr.message);
        } else {
          console.log(`🏁 [非活性化] [${ev.end_date.split('T')[0]}] ${ev.title_ja}`);
          deactivatedCount++;
        }
      }
    }
  }

  console.log(`✅ 完了: 締切切れの ${deactivatedCount} 件を is_active: false に更新しました！`);
}

run();
