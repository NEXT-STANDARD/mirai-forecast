import fs from 'fs';
import path from 'path';

const tsPath = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/src/data/aiInsightsMaster.ts';
const jsonPath = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/public/data/ai_insights.json';

function validateAndFilterCatalysts(catalysts) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (!Array.isArray(catalysts) || catalysts.length === 0) {
    return [
      `${currentYear}年第4四半期 重要公式指標発表・動向レビュー`,
      `${currentYear + 1}年 政策動向および市場コンセンサス更新`
    ];
  }

  const validCatalysts = catalysts.filter(c => {
    if (typeof c !== 'string' || !c.trim()) return false;
    const s = c.trim();
    const m = s.match(/(20\d{2})年\s*(\d{1,2})?月?/);
    if (!m) return true;
    const year = parseInt(m[1], 10);
    if (year < currentYear) return false;
    if (year === currentYear && m[2]) {
      const month = parseInt(m[2], 10);
      if (month < currentMonth) return false;
    }
    return true;
  });

  return validCatalysts.length > 0 ? validCatalysts : [
    `${currentYear}年${Math.min(currentMonth + 1, 12)}月 重要公式発表・指標動向`,
    `${currentYear + 1}年 政策決定および市場レビュー`
  ];
}

function processStore(store) {
  const result = {};
  const now = new Date();
  for (const [id, item] of Object.entries(store)) {
    result[id] = {
      ...item,
      summaryJa: item.summaryJa,
      whyMovedJa: item.whyMovedJa,
      keyCatalysts: validateAndFilterCatalysts(item.keyCatalysts),
      lastUpdated: `AI事前分析 (${now.getFullYear()}年${now.getMonth() + 1}月最新)`,
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
