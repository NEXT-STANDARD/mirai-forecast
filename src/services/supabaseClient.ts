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
/** JWT の形（3パート・payload に role）をしているかだけ確認する。値の正しさは検証しない */
const looksLikeJwt = (k: string): boolean => {
  const parts = k.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.role === 'string';
  } catch {
    return false;
  }
};

const readAdminKey = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const raw = (window.localStorage.getItem('mirairadar_admin_key') || '').trim();
    // プレースホルダのまま貼られた場合（'<service_role key>' 等）に、
    // 鍵が入っているように見えて書き込みだけ失敗する状態を防ぐ
    return looksLikeJwt(raw) ? raw : '';
  } catch {
    return '';
  }
};

export const hasAdminKey = (): boolean => readAdminKey().length > 0;

/** 保存されている値が JWT の形をしていない（プレースホルダ等）かどうか */
export const hasInvalidAdminKey = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = (window.localStorage.getItem('mirairadar_admin_key') || '').trim();
    return raw.length > 0 && !looksLikeJwt(raw);
  } catch {
    return false;
  }
};

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
