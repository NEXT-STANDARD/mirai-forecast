import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';

const envPath = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env';
const env = {};
const content = fs.readFileSync(envPath, 'utf-8');
content.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) {
    env[k.trim()] = v.join('=').trim();
  }
});

console.log('Twitter API設定確認:');
console.log('API_KEY exists?', !!env.TWITTER_API_KEY);
console.log('ACCESS_TOKEN exists?', !!env.TWITTER_ACCESS_TOKEN);

const client = new TwitterApi({
  appKey: env.TWITTER_API_KEY,
  appSecret: env.TWITTER_API_SECRET,
  accessToken: env.TWITTER_ACCESS_TOKEN,
  accessSecret: env.TWITTER_ACCESS_SECRET,
});

async function checkAndPost() {
  try {
    const me = await client.v2.me();
    console.log(`\n✅ 認証アカウント確認成功: @${me.data.username} (名前: ${me.data.name})`);
  } catch (err) {
    console.error('❌ アカウント情報取得エラー:', err);
  }
}

checkAndPost();
