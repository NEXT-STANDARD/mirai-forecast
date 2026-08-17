-- ========================================================
-- RLSポリシー許可 ＆ 初期イベントデータ登録パッチ
-- ========================================================

-- 1. 匿名ユーザー（誰でも）による投票INSERT & SELECTを許可
ALTER TABLE japan_vote_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert for votes" ON japan_vote_logs;
CREATE POLICY "Allow public insert for votes" ON japan_vote_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read for votes" ON japan_vote_logs;
CREATE POLICY "Allow public read for votes" ON japan_vote_logs FOR SELECT USING (true);

-- 2. 全テーブルの読み取り（SELECT）を公開許可
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read events" ON events;
CREATE POLICY "Allow public read events" ON events FOR SELECT USING (true);

ALTER TABLE polymarket_price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read poly hist" ON polymarket_price_history;
CREATE POLICY "Allow public read poly hist" ON polymarket_price_history FOR SELECT USING (true);

ALTER TABLE consensus_hourly_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read snapshots" ON consensus_hourly_snapshots;
CREATE POLICY "Allow public read snapshots" ON consensus_hourly_snapshots FOR SELECT USING (true);

-- 3. 初期イベントデータ（8銘柄）を events テーブルに登録
INSERT INTO events (id, slug, title_ja, title_en, question_ja, question_en, category, category_label)
VALUES
  ('1', 'us-presidential-election-2028-vance', '米大統領選 2028：JDヴァンスが勝利するか？', 'Will JD Vance win the 2028 US Presidential Election?', '2028年の米大統領選挙において、JDヴァンスが当選するか？', 'Will JD Vance win the 2028 US Presidential Election?', 'politics', '🌐 国際・選挙'),
  ('2', 'boj-rate-hike-september-2026', '日銀：9月会合で追加利上げ（0.75%へ）を実施するか？', 'Will BOJ hike interest rate in Sep 2026?', '日銀が次回の金融政策決定会合で追加利上げに踏み切るか？', 'Will Bank of Japan raise interest rate in September 2026 meeting?', 'economy', '📊 経済・金利'),
  ('3', 'openai-gpt5-release-2026', 'OpenAI：年内にGPT-5（次世代フロンティアモデル）を発表するか？', 'Will OpenAI announce GPT-5 in 2026?', 'OpenAIが今年中に次世代フロンティアモデル「GPT-5」を公式発表するか？', 'Will OpenAI officially announce GPT-5 model in 2026?', 'tech', '⚡ AI・テック'),
  ('4', 'bitcoin-reaches-150k-in-2026', 'ビットコイン：年内に150,000ドルを突破するか？', 'Will Bitcoin reach $150k in 2026?', 'ビットコイン価格が年内に史上最高値150,000ドルに到達するか？', 'Will BTC reach $150,000 before December 31, 2026?', 'economy', '📊 暗号資産'),
  ('5', 'japan-lower-house-dissolution-2026', '日本の衆議院解散・総選挙は年内に行われるか？', 'Will Japan Lower House dissolve in 2026?', '日本の衆議院が年内に解散され、総選挙が実施されるか？', 'Will the Japanese House of Representatives be dissolved in 2026?', 'politics', '🌐 政治'),
  ('6', 'spacex-starship-orbital-landing', 'SpaceX：Starshipの完全軌道再突入・無傷回収が年内に成功するか？', 'Will SpaceX Starship orbital catch succeed in 2026?', 'SpaceXの超大型ロケットStarshipが軌道飛行からの完全無傷回収に成功するか？', 'Will SpaceX successfully catch Starship after orbital re-entry in 2026?', 'tech', '⚡ 宇宙・テクノロジー'),
  ('7', 'fed-rate-cut-50bps-2026', 'FRB：年内に累計1.0%以上の利下げを実施するか？', 'Will US Fed cut rates by 100bps+ in 2026?', '米連邦準備制度理事会（FRB）が年内に大幅利下げ（累計100bps以上）を行うか？', 'Will US Federal Reserve cut federal funds rate by 100bps or more in 2026?', 'economy', '📊 マクロ経済'),
  ('8', 'sam-altman-world-ai-summit-tokyo', 'AI国際サミット（東京開催）で主要7カ国が法的拘束力ある合意を結ぶか？', 'Will G7 sign binding AI treaty in Tokyo?', '東京で開催されるAI国際会議において、主要国が法的規制に合意するか？', 'Will G7 countries sign a legally binding AI governance treaty in Tokyo?', 'tech', '⚡ AIガバナンス')
ON CONFLICT (id) DO UPDATE SET
  title_ja = EXCLUDED.title_ja,
  category = EXCLUDED.category,
  category_label = EXCLUDED.category_label;
