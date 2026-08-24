-- ============================================================================
-- N-54: 同一人物が同じ銘柄に何度でも投票できる問題への恒久対策
-- ============================================================================
--
-- 【何が起きていたか】
--   japan_vote_logs には利用者を識別する列が1つも無く、
--   同じ人の重複投票を後から取り除く手段がなかった。
--   実測（2026-08-24 / 全48件）:
--     - 列: id, event_id, voted_at, choice, region_code, device_type, referrer
--     - 5秒以内の連続投票が1組（2.2秒差の YES→YES、同一銘柄）
--     - 本番UIの投票ボタン64個すべてに disabled が無かった
--
-- 【クライアント側は対応済み】
--   - handleVote に絞り込みガード（同一レンダー内の連打も ref で同期的に遮断）
--   - 投票ボタンに disabled
--   - 銘柄ごとの匿名キー voter_key = sha256(localStorage の UUID + ':' + event_id)
--     を送信（この SQL 適用前は列が無いため自動的に従来形へフォールバックする）
--
-- 【この SQL の役割】
--   クライアントのガードは localStorage を消せば回避できる。
--   DB 側に一意制約を置いて、同じ銘柄に同じキーが二度入らないようにする。
--
-- 【限界（正直に）】
--   localStorage を消せば別人として投票できる。これは連打と気まぐれな
--   二重投票を止めるためのもので、本気の攻撃者は止まらない。
--   本当に固めるなら IP ハッシュや Turnstile が要るが、
--   現在の規模（総投票48件）に対しては過剰と判断した。
--
-- 【プライバシー】
--   送るのは銘柄ごとにハッシュした値なので、DB は
--   「同じ銘柄に同じキーが二度来た」ことは判定できるが、
--   別の銘柄の投票が同じ人物のものかは判定できない。
--
-- 実行場所: Supabase ダッシュボード → SQL Editor
-- ============================================================================

-- 1) 匿名の投票者キー列を足す
ALTER TABLE public.japan_vote_logs
  ADD COLUMN IF NOT EXISTS voter_key text;

-- 2) 同じ銘柄に同じキーで二度入れられないようにする
--    既存48行は voter_key が NULL。部分インデックスなので既存行は影響を受けない。
--    （Postgres の通常の一意インデックスでは NULL 同士は衝突しないが、
--      意図を明示するため WHERE 句で対象を絞る）
CREATE UNIQUE INDEX IF NOT EXISTS japan_vote_logs_event_voter_uniq
  ON public.japan_vote_logs (event_id, voter_key)
  WHERE voter_key IS NOT NULL;

-- ============================================================================
-- 適用後の確認（そのまま貼って実行できる）
-- ============================================================================
--
--   -- 列が増えたか
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'japan_vote_logs' ORDER BY ordinal_position;
--
--   -- 一意インデックスが張られたか
--   SELECT indexname, indexdef FROM pg_indexes
--    WHERE tablename = 'japan_vote_logs';
--
--   -- 既存行が壊れていないか（48件のままのはず）
--   SELECT count(*) FROM public.japan_vote_logs;
--
-- ============================================================================
-- 任意: voter_key を匿名ユーザーから隠す
-- ============================================================================
--
-- 現在 anon は japan_vote_logs を SELECT できる（LiveTape 等が読むため）。
-- voter_key は銘柄ごとのハッシュなので、公開されても
-- 銘柄をまたいだ紐づけはできず、他人のキーを真似ても一意制約に弾かれる。
-- そのため必須ではない。気になる場合のみ以下を実行する。
--
-- ⚠️ 列単位の GRANT は表単位の GRANT を上書きできないため、
--    いったん表全体の SELECT を落としてから列を列挙し直す必要がある。
--    今後列を足したときに GRANT し忘れると読めなくなるので、
--    運用の手間が1つ増えることを承知のうえで選ぶこと。
--
--   REVOKE SELECT ON public.japan_vote_logs FROM anon;
--   GRANT SELECT (id, event_id, voted_at, choice, region_code, device_type, referrer)
--     ON public.japan_vote_logs TO anon;
