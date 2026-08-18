import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && k.trim() === 'GEMINI_API_KEY') {
    apiKey = v.join('=').trim();
  }
});

const sampleEnglishTitles = [
  "Fed decreases interest rates by 50+ bps in September 2024?",
  "Will Donald Trump win the 2024 US Presidential Election?",
  "OpenAI to release GPT-5 before December 31?",
  "Shohei Ohtani to hit 50+ Home Runs and steal 50+ bases in 2024?",
  "Bitcoin reach $100,000 in 2024?",
  "US Recession in 2024?",
  "Bank of Japan raises policy rate again in 2024?"
];

async function testBatchTranslation() {
  const prompt = `あなたは経済・金融メディア（日経新聞やBloomberg日本語版）の敏腕編集デスクです。
以下のPolymarket予測市場の英語タイトル一覧を、日本人の一般読者・ビジネスパーソンがパッと見て1秒で理解できる、自然で引きのある日本語の疑問文タイトルに翻訳・要約してください。

【英語タイトル一覧】:
${JSON.stringify(sampleEnglishTitles, null, 2)}

以下のJSON配列形式のみを出力してください（Markdownのバッククォート不要）:
[
  { "en": "英語タイトル", "ja": "日本語タイトル" }
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
    console.log('\n🎉 Gemini 3.7 Flash による日本語タイトル自動翻訳結果:');
    console.log(JSON.parse(resultText));
  } catch (err) {
    console.error('エラー:', err);
  }
}

testBatchTranslation();
