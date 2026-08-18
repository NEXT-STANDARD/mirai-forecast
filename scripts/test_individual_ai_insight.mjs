import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && k.trim() === 'GEMINI_API_KEY') {
    apiKey = v.join('=').trim();
  }
});

const testTopics = [
  { titleJa: "米FRBは9月のFOMCで0.50%以上の利下げを決定するか？", probYes: 0, cat: "経済・金利" },
  { titleJa: "ギャビン・ニューサム氏は2028年米大統領選の民主党指名を獲得するか？", probYes: 16, cat: "国際・政治" },
  { titleJa: "ビットコイン価格は8月18日時点で5万4000ドルを上回っているか？", probYes: 100, cat: "暗号資産" }
];

async function generateDeepInsights() {
  console.log('Gemini 3.7 Flash による銘柄個別・深層カタリスト分析を生成中...\n');

  const prompt = `あなたは世界トップクラスのマクロ経済・国際情勢ヘッジファンドのチーフストラテジスト（日本語）です。
以下の各予測市場トピックについて、金融・経済のプロの視点から、具体的で切れ味のある個別分析を作成してください。

【厳格な指示】:
1. 「スマートマネーが集中」「大口取引の流入」といった抽象的な定型文は【絶対に使用禁止】。
2. そのトピック固有の具体的な人物名、経済指標名（CPI、PCE、失業率等）、政策、競合他社、地政学イベントを必ず盛り込むこと。
3. 今後の確率を左右する「具体的な次回カタリスト（何月何日の何の発表/イベントか）」を2〜3個提示すること。

【分析対象トピック】:
${JSON.stringify(testTopics, null, 2)}

以下のJSON配列形式のみを出力してください（Markdownのバッククォート不要）:
[
  {
    "titleJa": "トピック名",
    "summaryJa": "現状のオッズに対する市場心理・コンセンサス（40〜60文字程度）",
    "whyMovedJa": "なぜこの確率になっているのかの具体的ファンダメンタルズ要因（60〜90文字程度）",
    "keyCatalysts": ["具体的な注目カタリスト1（日付や指標名）", "具体的な注目カタリスト2", "具体的な注目カタリスト3"]
  }
]`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await res.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('🎉 銘柄個別 深層AIカタリスト分析（生成結果）:');
    console.log(JSON.stringify(JSON.parse(resultText), null, 2));
  } catch (err) {
    console.error('エラー:', err);
  }
}

generateDeepInsights();
