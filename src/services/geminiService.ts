/**
 * 未来レーダー (MiraiRadar.com) - Gemini 3.6 Flash 変動要因＆カタリスト分析エンジン
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-3.7-flash';

export interface AiInsightResult {
  summaryJa: string;
  whyMovedJa: string;
}

export async function generateAiInsightForEvent(
  titleEn: string,
  probYes: number,
  probChange24h: number
): Promise<AiInsightResult | null> {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const prompt = `あなたは予測市場・金融ターミナル「未来レーダー（MiraiRadar.com）」の専属チーフアナリストです。
以下のPolymarket市場データについて、日本人の投資家・ビジネスパーソン向けに「なぜオッズが動いているのか」「最大の注目カタリスト」を簡潔・シャープに2行で解説してください。

【市場タイトル】: ${titleEn}
【現在のYES確率】: ${probYes}%
【24時間変動幅】: ${probChange24h > 0 ? `+${probChange24h}%` : `${probChange24h}%`}

以下のJSON形式のみを出力してください（Markdownのバッククォート不要）:
{
  "summaryJa": "要約・現状の市場心理（30文字以内）",
  "whyMovedJa": "なぜ動いているかの要因・今後の注目イベント（50文字以内）"
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    return {
      summaryJa: parsed.summaryJa,
      whyMovedJa: parsed.whyMovedJa,
    };
  } catch (err) {
    console.error('Gemini 3.6 Flash generation error:', err);
    return null;
  }
}
