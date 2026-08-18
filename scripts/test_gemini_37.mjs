import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && k.trim() === 'GEMINI_API_KEY') {
    apiKey = v.join('=').trim();
  }
});

async function test37() {
  const model = 'gemini-3.7-flash';
  console.log(`モデル [${model}] の呼び出しテスト中...`);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "こんにちは！未来レーダー（MiraiRadar.com）の最先端AIとして、自己紹介と意気込みを1言で教えてください。" }] }]
      })
    });

    const data = await res.json();
    if (res.ok && data.candidates && data.candidates[0]) {
      console.log(`\n🎉 【大成功！】 最新鋭モデル [${model}] は即座に利用可能です！`);
      console.log(`🤖 AI応答: ${data.candidates[0].content.parts[0].text.trim()}\n`);
    } else {
      console.error('エラー:', data);
    }
  } catch (err) {
    console.error('通信エラー:', err);
  }
}

test37();
