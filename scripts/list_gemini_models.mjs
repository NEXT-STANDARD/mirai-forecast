import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && k.trim() === 'GEMINI_API_KEY') {
    apiKey = v.join('=').trim();
  }
});

async function listModels() {
  console.log('Gemini API の利用可能モデル一覧を取得中...');
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (res.ok && data.models) {
      console.log(`\n✅ 取得成功！ 利用可能なモデル数: ${data.models.length} 件\n`);
      const generateModels = data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => ({
          name: m.name.replace('models/', ''),
          displayName: m.displayName,
          description: m.description?.slice(0, 60) + '...',
        }));

      console.table(generateModels);
    } else {
      console.error('取得エラー:', data);
    }
  } catch (err) {
    console.error('通信エラー:', err);
  }
}

listModels();
