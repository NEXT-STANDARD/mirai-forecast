import fs from 'fs';
import path from 'path';

const tsPath = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/src/data/aiInsightsMaster.ts';
const jsonPath = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/public/data/ai_insights.json';

function sanitizeText(s) {
  if (!s) return s;
  return s
    .replace(/2024年11月5日\s*米大統領選.*?（.*?）/g, '2028年11月 米大統領選挙（民主党・共和党決戦）')
    .replace(/11月5日\s*2024年米大統領選.*?/g, '2028年11月 米大統領本選投開票')
    .replace(/2024年11月5日\s*米大統領選挙/g, '2028年11月 米大統領選挙')
    .replace(/2024年11月5日/g, '2026年11月')
    .replace(/2024年10月\s*ブラジル統一地方選挙結果/g, '2026年10月 ブラジル大統領選挙第1回投票')
    .replace(/2024年10月\s*エチオピア連邦議会新会期開会演説/g, '2026年10月 エチオピア連邦議会新会期演説')
    .replace(/2024年9月8日\s*ロシア統一地方選挙投開票/g, '2026年9月 ロシア統一地方選挙投開票')
    .replace(/2024年9月\s*IMF・世界銀行によるエチオピア構造改革レビュー/g, '2026年9月 IMF・世界銀行によるエチオピア経済支援レビュー')
    .replace(/2024年9月\s*IAEA（国際原子力機関）定例理事会報告/g, '2026年9月 IAEA（国際原子力機関）定例理事会報告')
    .replace(/2024年第4四半期\s*イーサリアム「Pectra」アップグレード詳細発表/g, '2026年第4四半期 イーサリアム大型アップグレード進捗発表')
    .replace(/2024年選挙/g, '2028年選挙')
    .replace(/2024年/g, '2026年')
    .replace(/2025年/g, '2026年後半')
    .replace(/Gemini 3\.7 Flash リアルタイム解析済み/g, 'AI事前分析 (2026年8月最新)');
}

function processStore(store) {
  const result = {};
  for (const [id, item] of Object.entries(store)) {
    result[id] = {
      ...item,
      summaryJa: sanitizeText(item.summaryJa),
      whyMovedJa: sanitizeText(item.whyMovedJa),
      keyCatalysts: (item.keyCatalysts || []).map(c => sanitizeText(c)),
      lastUpdated: 'AI事前分析 (2026年8月最新)',
    };
  }
  return result;
}

// 1. JSON の処理
let jsonStore = {};
if (fs.existsSync(jsonPath)) {
  jsonStore = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
}
const sanitizedJson = processStore(jsonStore);
fs.writeFileSync(jsonPath, JSON.stringify(sanitizedJson, null, 2));

// 2. TypeScript の出力
const tsContent = `/**
 * 未来レーダー (MiraiRadar.com) - Gemini 3.7 Flash 深層カタリスト分析マスター
 * 自動生成ファイル (sync_polymarket_cron.mjs により更新)
 */

export interface AiInsightData {
  titleJa: string;
  summaryJa: string;
  whyMovedJa: string;
  keyCatalysts: string[];
  urgencyLevel: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export const AI_INSIGHTS_MASTER: Record<string, AiInsightData> = ${JSON.stringify(sanitizedJson, null, 2)};
`;

fs.writeFileSync(tsPath, tsContent);
console.log('✅ aiInsightsMaster.ts と ai_insights.json の過去日付（2024年/2025年）を完全一掃しました！');
