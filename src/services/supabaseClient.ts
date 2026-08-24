import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wdpygtmqehoepgrueeda.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy'
);

/**
 * 🛡️ ローカル管理者コンソール（localhost:5173/admin）用の管理者権限クライアント
 *
 * service_role キーは **バンドルに埋め込まない**。
 * `import.meta.env.VITE_*` は Vite がビルド時に文字列として埋め込むため、
 * ローカルでビルドした dist をそのまま配ると全権キーが公開される。
 * （実測：ローカル dist に service_role の JWT が1件混入していた／本番は anon のみで無事）
 *
 * 代わりに、管理者がブラウザの localStorage に一度だけ入れた鍵を実行時に読む。
 *   localStorage.setItem('mirairadar_admin_key', '<service_role key>')
 * 鍵が無ければ anon クライアントにフォールバックし、書き込みは RLS に弾かれる。
 */
const readAdminKey = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem('mirairadar_admin_key') || '';
  } catch {
    return '';
  }
};

export const hasAdminKey = (): boolean => readAdminKey().length > 0;

export const getAdminClient = () =>
  createClient(supabaseUrl, readAdminKey() || supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy');

/** 後方互換：呼び出し側は getAdminClient() を使うこと */
export const adminSupabase = null as ReturnType<typeof createClient> | null;

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
