import { TwitterApi } from 'twitter-api-v2';
import http from 'http';
import url from 'url';
import fs from 'fs';

const envPath = '/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env';
let apiKey = '';
let apiSecret = '';

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

const client = new TwitterApi({
  appKey: apiKey,
  appSecret: apiSecret,
});

let oauthSecretTemp = '';

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/') {
    // 1. 認証開始
    try {
      const authLink = await client.generateAuthLink('http://127.0.0.1:3000/callback', { linkMode: 'authorize' });
      oauthSecretTemp = authLink.oauth_token_secret;
      res.writeHead(302, { Location: authLink.url });
      res.end();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h3>認証リンク生成エラー: ${err.message}</h3><p>Developer PortalのCallback URLに <code>http://127.0.0.1:3000/callback</code> を追加してください。</p>`);
    }
  } else if (parsedUrl.pathname === '/callback') {
    // 2. コールバック処理
    const { oauth_token, oauth_verifier } = parsedUrl.query;
    
    if (!oauth_token || !oauth_verifier) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h3>パラメータが不足しています</h3>');
      return;
    }

    try {
      const callbackClient = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: oauth_token,
        accessSecret: oauthSecretTemp,
      });

      const { accessToken, accessSecret, screenName, userId } = await callbackClient.login(oauth_verifier);

      // .env を自動更新
      let envText = fs.readFileSync(envPath, 'utf-8');
      envText = envText.replace(/TWITTER_ACCESS_TOKEN=.*/, `TWITTER_ACCESS_TOKEN=${accessToken}`);
      envText = envText.replace(/TWITTER_ACCESS_SECRET=.*/, `TWITTER_ACCESS_SECRET=${accessSecret}`);
      fs.writeFileSync(envPath, envText);

      console.log(`\n🎉 @${screenName} の認証とトークン保存が完了しました！`);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #10b981;">🎉 認証が成功しました！</h1>
          <p>アカウント: <strong>@${screenName}</strong></p>
          <p>Access Token を <code>.env</code> に自動保存しました。このタブを閉じて大丈夫です。</p>
        </div>
      `);

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 2000);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h3>トークン取得エラー: ${err.message}</h3>`);
    }
  }
});

server.listen(3000, () => {
  console.log('認証サーバーが起動しました: http://127.0.0.1:3000');
});
