import { TwitterApi } from 'twitter-api-v2';
import readline from 'readline';
import fs from 'fs';

// .env から読み込み
let apiKey = process.env.TWITTER_API_KEY;
let apiSecret = process.env.TWITTER_API_SECRET;

const envPath = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) {
      const key = k.trim();
      const val = v.join('=').trim();
      if (key === 'TWITTER_API_KEY') apiKey = val;
      if (key === 'TWITTER_API_SECRET') apiSecret = val;
    }
  });
}

if (!apiKey || !apiSecret) {
  console.log('------------------------------------------------------------');
  console.log('⚠️ .env 内の TWITTER_API_KEY と TWITTER_API_SECRET が空です。');
  console.log('先に .env に控えた API Key と API Key Secret を貼り付けて保存してください。');
  console.log('------------------------------------------------------------');
  process.exit(1);
}

const client = new TwitterApi({
  appKey: apiKey,
  appSecret: apiSecret,
});

async function main() {
  console.log('\n--- 🐦 @MiraiRadar 用 Access Token 発行プロセス開始 ---');
  
  // 1. 認証URLの生成 (oob = Out Of Band / PIN認証)
  const authLink = await client.generateAuthLink('oob', { linkMode: 'authorize' });
  
  console.log('\n============================================================');
  console.log('👉 以下のURLをブラウザで開いてください（@MiraiRadar でログインした状態で）:');
  console.log(authLink.url);
  console.log('============================================================\n');
  console.log('「アプリにアクセスを許可」をクリックすると、7桁のPINコードが表示されます。\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('画面に表示された PIN コードを入力してください: ', async (pin) => {
    rl.close();
    try {
      // 2. PINを使って Access Token と Secret を取得
      const { accessToken, accessSecret, screenName, userId } = await client.login(pin.trim());
      
      console.log('\n🎉 認証成功！');
      console.log(`アカウント: @${screenName} (ID: ${userId})`);
      console.log('------------------------------------------------------------');
      console.log(`TWITTER_ACCESS_TOKEN=${accessToken}`);
      console.log(`TWITTER_ACCESS_SECRET=${accessSecret}`);
      console.log('------------------------------------------------------------');

      // .env を自動更新
      let envText = fs.readFileSync(envPath, 'utf-8');
      envText = envText.replace(/TWITTER_ACCESS_TOKEN=.*/, `TWITTER_ACCESS_TOKEN=${accessToken}`);
      envText = envText.replace(/TWITTER_ACCESS_SECRET=.*/, `TWITTER_ACCESS_SECRET=${accessSecret}`);
      fs.writeFileSync(envPath, envText);
      console.log('✅ .env に @MiraiRadar 専用の Access Token を自動保存しました！');
    } catch (err) {
      console.error('❌ 認証エラー:', err.message);
    }
  });
}

main();
