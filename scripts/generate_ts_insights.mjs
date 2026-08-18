import fs from 'fs';
import path from 'path';

const jsonPath = path.join(process.cwd(), 'public', 'data', 'ai_insights.json');
const tsPath = path.join(process.cwd(), 'src', 'data', 'aiInsightsMaster.ts');

if (fs.existsSync(jsonPath)) {
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
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

export const AI_INSIGHTS_MASTER: Record<string, AiInsightData> = ${jsonContent};
`;

  fs.writeFileSync(tsPath, tsContent);
  console.log(`✅ ${tsPath} にTypeScriptマスターとして出力完了`);
}
