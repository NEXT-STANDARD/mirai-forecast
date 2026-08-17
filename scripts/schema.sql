-- ========================================================
-- 未来予報 (Mirai Forecast / World VS / SmartRadar)
-- Supabase / PostgreSQL スキーマ定義
-- 🛡️ フェーズ3（B2Bデータ販売・SmartRadar Pro）対応版
-- ========================================================

-- 1. イベントマスタ
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(128) NOT NULL UNIQUE,
    title_ja VARCHAR(256) NOT NULL,
    title_en VARCHAR(256) NOT NULL,
    question_ja TEXT,
    question_en TEXT,
    category VARCHAR(32) NOT NULL,
    category_label VARCHAR(64) NOT NULL,
    icon_url TEXT,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 世界の時系列オッズ履歴（1分〜1時間足・ヒストリカルデータ）
CREATE TABLE IF NOT EXISTS polymarket_price_history (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    prob_yes NUMERIC(5, 2) NOT NULL,
    prob_no NUMERIC(5, 2) NOT NULL,
    best_bid NUMERIC(5, 2),
    best_ask NUMERIC(5, 2),
    volume_24h_usd NUMERIC(15, 2) NOT NULL,
    total_volume_usd NUMERIC(15, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_poly_hist ON polymarket_price_history (event_id, recorded_at DESC);

-- 3. 大口クジラ取引ログ（SmartRadar Pro用）
CREATE TABLE IF NOT EXISTS polymarket_whale_trades (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(id),
    trade_timestamp TIMESTAMPTZ NOT NULL,
    amount_usd NUMERIC(12, 2) NOT NULL,
    side VARCHAR(10) NOT NULL, -- 'BUY_YES' | 'BUY_NO'
    prob_before NUMERIC(5, 2),
    prob_after NUMERIC(5, 2),
    wallet_hash VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_whale_trades ON polymarket_whale_trades (trade_timestamp DESC);

-- 4. 日本世論の個別投票トランザクションログ（匿名化・地域推定）
CREATE TABLE IF NOT EXISTS japan_vote_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(64) NOT NULL REFERENCES events(id),
    voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    choice VARCHAR(4) NOT NULL, -- 'YES' | 'NO'
    region_code VARCHAR(10),    -- 'JP-13' (東京都) 等
    device_type VARCHAR(10),    -- 'MOBILE' | 'DESKTOP'
    referrer VARCHAR(64)        -- 'x.com' | 'direct'
);
CREATE INDEX IF NOT EXISTS idx_vote_logs ON japan_vote_logs (event_id, voted_at DESC);

-- 5. 1時間ごとの世論対比スナップショット（B2Bオルタナティブデータ販売用）
CREATE TABLE IF NOT EXISTS consensus_hourly_snapshots (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(id),
    snapshot_at TIMESTAMPTZ NOT NULL,
    world_prob_yes NUMERIC(5, 2) NOT NULL,
    japan_percent_yes NUMERIC(5, 2) NOT NULL,
    spread_gap NUMERIC(5, 2) NOT NULL,
    total_japan_votes INT NOT NULL,
    hourly_vote_velocity INT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots ON consensus_hourly_snapshots (event_id, snapshot_at DESC);

-- 6. 市場の最終結果と予測正解率レコード（学術・メディア検証用）
CREATE TABLE IF NOT EXISTS market_resolution_records (
    event_id VARCHAR(64) PRIMARY KEY REFERENCES events(id),
    resolved_at TIMESTAMPTZ NOT NULL,
    final_outcome VARCHAR(4) NOT NULL, -- 'YES' | 'NO'
    world_accuracy_score NUMERIC(5, 4),
    japan_accuracy_score NUMERIC(5, 4),
    winner VARCHAR(10) -- 'WORLD' | 'JAPAN' | 'TIE'
);

-- 7. Gemini AI 要因速報ログ
CREATE TABLE IF NOT EXISTS ai_catalyst_logs (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    delta_prob_pct NUMERIC(5, 2),
    summary_ja TEXT NOT NULL,
    why_moved_ja TEXT NOT NULL,
    key_catalysts JSONB
);
