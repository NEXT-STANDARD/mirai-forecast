-- ========================================================
-- Polymarket自動同期用 INSERT / UPDATE RLSポリシー追加
-- ========================================================

-- events テーブルの公開 INSERT / UPDATE を許可
DROP POLICY IF EXISTS "Allow public insert events" ON events;
CREATE POLICY "Allow public insert events" ON events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update events" ON events;
CREATE POLICY "Allow public update events" ON events FOR UPDATE USING (true);

-- polymarket_price_history の公開 INSERT を許可
DROP POLICY IF EXISTS "Allow public insert poly hist" ON polymarket_price_history;
CREATE POLICY "Allow public insert poly hist" ON polymarket_price_history FOR INSERT WITH CHECK (true);
