import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && k.trim() === 'GEMINI_API_KEY') {
    apiKey = v.join('=').trim();
  }
});

console.log('Gemini API Key loaded, length:', apiKey.length);

async function testGeminiModels() {
  const modelsToTest = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

  for (const model of modelsToTest) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "こんにちは。未来レーダーのAIアシスタントとして1言で挨拶してください。" }] }]
        })
      });

      const data = await res.json();
      if (res.ok && data.candidates && data.candidates[0]) {
        console.log(`✅ モデル [${model}]: 成功！`);
        console.log(`   応答: ${data.candidates[0].content.parts[0].text.trim()}`);
        return model;
      } else {
        console.log(`❌ モデル [${model}]: 失敗 (${data.error?.message || res.status})`);
      }
    } catch (err) {
      console.log(`❌ モデル [${model}]: エラー (${err.message})`);
    }
  }
}

testGeminiModels();
