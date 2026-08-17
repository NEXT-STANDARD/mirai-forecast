import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';

let apiKey = '';
let apiSecret = '';
let accessToken = '';
let accessSecret = '';

const envPath = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env';
const content = fs.readFileSync(envPath, 'utf-8');
content.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) {
    const key = k.trim();
    const val = v.join('=').trim();
    if (key === 'TWITTER_API_KEY') apiKey = val;
    if (key === 'TWITTER_API_SECRET') apiSecret = val;
    if (key === 'TWITTER_ACCESS_TOKEN') accessToken = val;
    if (key === 'TWITTER_ACCESS_SECRET') accessSecret = val;
  }
});

console.log('API Key length:', apiKey ? apiKey.length : 0);
console.log('API Secret length:', apiSecret ? apiSecret.length : 0);

const client = new TwitterApi({
  appKey: apiKey,
  appSecret: apiSecret,
});

async function check() {
  try {
    const appInfo = await client.appLogin();
    console.log('App-only authentication test: SUCCESS!');
  } catch (err) {
    console.error('App authentication error:', err.message);
  }
}

check();
