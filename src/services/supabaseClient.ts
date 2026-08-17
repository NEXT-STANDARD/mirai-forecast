import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wdpygtmqehoepgrueeda.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * 日本人ユーザーの投票をSupabaseにリアルタイム送信
 */
export async function submitVoteToSupabase(eventId: string, choice: 'YES' | 'NO') {
  if (!supabase) {
    console.log('[Supabase] anonキー未設定のためローカルステートのみで処理中');
    return;
  }

  try {
    const { error } = await supabase
      .from('japan_vote_logs')
      .insert({
        event_id: eventId,
        choice,
        device_type: window.innerWidth < 768 ? 'MOBILE' : 'DESKTOP',
        referrer: document.referrer || 'direct',
      });

    if (error) throw error;
    console.log('[Supabase] 投票データを送信完了:', { eventId, choice });
  } catch (err) {
    console.error('[Supabase] 投票データ送信エラー:', err);
  }
}
