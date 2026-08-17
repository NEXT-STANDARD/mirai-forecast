import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && k.trim() === 'GEMINI_API_KEY') {
    apiKey = v.join('=').trim();
  }
});

async function test36() {
  const model = 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "こんにちは！未来レーダーのAIアシスタントとして1言で挨拶してください。" }] }]
    })
  });

  const data = await res.json();
  if (res.ok && data.candidates && data.candidates[0]) {
    console.log(`🎉 最新モデル [${model}] への接続・生成に大成功！`);
    console.log(`   AI応答: ${data.candidates[0].content.parts[0].text.trim()}`);
  } else {
    console.log(`エラー:`, data);
  }
}

test36();
