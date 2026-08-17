import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wdpygtmqehoepgrueeda.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy'
);

/**
 * 日本人ユーザーの投票をSupabaseにリアルタイム送信
 */
export async function submitVoteToSupabase(eventId: string, choice: 'YES' | 'NO') {
  if (!supabaseAnonKey && !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('[Supabase] VITE_SUPABASE_ANON_KEY が未設定です');
    return;
  }

  try {
    const payload = {
      event_id: eventId,
      choice,
      device_type: window.innerWidth < 768 ? 'MOBILE' : 'DESKTOP',
      referrer: document.referrer || 'direct',
    };

    console.log('[Supabase] 投票データを送信中...', payload);

    const { data, error } = await supabase
      .from('japan_vote_logs')
      .insert(payload)
      .select();

    if (error) {
      console.error('[Supabase] 投票送信エラー:', error);
    } else {
      console.log('[Supabase] 投票データがSupabaseに正常記録されました (200 OK):', data);
    }
  } catch (err) {
    console.error('[Supabase] ネットワークエラー:', err);
  }
}
