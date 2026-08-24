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
 * N-54: 匿名の投票者キー。
 *
 * japan_vote_logs には利用者を識別する列が無く、同一人物の重複を後から
 * 取り除けなかった（実データ48件中に2.2秒差の YES→YES が1組）。
 *
 * 種は localStorage の UUID ひとつだけ。ただし種をそのまま送ると、
 * 1人の投票が銘柄をまたいで紐づけられてしまう。世論を扱う以上それは避けたいので、
 * 銘柄ごとに sha256(種 + ':' + 銘柄ID) を取って送る。
 * DB は「同じ銘柄に同じキーが二度来た」ことは判定できるが、
 * 別の銘柄の投票が同じ人物のものかは判定できない。
 *
 * localStorage を消せば別人として投票できる。これは連打と気まぐれな二重投票を
 * 止めるための仕組みで、本気の攻撃者を止めるものではない。
 */
const VOTER_SEED_KEY = 'mirairadar_voter_seed';

const getVoterSeed = (): string => {
  try {
    const existing = localStorage.getItem(VOTER_SEED_KEY);
    if (existing) return existing;
    const seed = crypto.randomUUID();
    localStorage.setItem(VOTER_SEED_KEY, seed);
    return seed;
  } catch {
    return '';   // localStorage が使えない環境では匿名キー無しで送る
  }
};

const voterKeyFor = async (eventId: string): Promise<string | null> => {
  const seed = getVoterSeed();
  if (!seed || !crypto?.subtle) return null;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${seed}:${eventId}`));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  } catch {
    return null;
  }
};

/** DDL 適用前に voter_key を送ると列が無くて弾かれる。その場合だけ従来の形で送り直す。 */
const isMissingColumnError = (err: { code?: string; message?: string } | null): boolean =>
  !!err && (err.code === 'PGRST204' || /voter_key/i.test(err.message || ''));

/** 一意制約に当たった＝既にこの銘柄へ投票済み。異常ではない。 */
const isDuplicateVoteError = (err: { code?: string } | null): boolean => !!err && err.code === '23505';

/**
 * 日本人ユーザーの投票をSupabaseにリアルタイム送信
 */
export async function submitVoteToSupabase(eventId: string, choice: 'YES' | 'NO') {
  if (!supabaseAnonKey && !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('[Supabase] VITE_SUPABASE_ANON_KEY が未設定です');
    return;
  }

  const base = {
    event_id: eventId,
    choice,
    device_type: window.innerWidth < 768 ? 'MOBILE' : 'DESKTOP',
    referrer: document.referrer || 'direct',
  };

  try {
    const voterKey = await voterKeyFor(eventId);
    const insert = (payload: Record<string, unknown>) =>
      supabase.from('japan_vote_logs').insert(payload).select();

    let { error } = voterKey
      ? await insert({ ...base, voter_key: voterKey })
      : await insert(base);

    // 列がまだ無いなら（DDL 未適用）、従来の形で送り直す
    if (isMissingColumnError(error)) {
      ({ error } = await insert(base));
    }

    if (isDuplicateVoteError(error)) return;   // 二重投票は正常系
    if (error) console.warn('[Supabase] 投票送信に失敗しました:', error.message);
  } catch (err) {
    console.warn('[Supabase] 投票送信中にネットワークエラー:', err);
  }
}
