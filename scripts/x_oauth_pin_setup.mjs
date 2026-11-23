/**
 * @MiraiRadar 用の X アクセストークンを PIN 方式（OAuth 1.0a・oob）で取り、GitHub secrets と .env に入れる。
 *
 * 鍵の値は画面にもログにも出さない。入力は表示されない欄で受け、書き込みは gh の標準入力経由。
 * 開発者コンソールで発行できるのはアプリの持ち主（@KrsmPhoenix）用のトークンだけなので、
 * 別アカウント（@MiraiRadar）用はこの手続きで取る。
 *
 * 使い方（ターミナルで、人が実行する）:
 *   node scripts/x_oauth_pin_setup.mjs
 *   1. zero-mcp のコンシューマーキーとシークレットを貼り付ける（表示されない）
 *   2. 出てきた URL を、@MiraiRadar でログインしたブラウザで開き「連携アプリを認証」→ PIN を入力
 *   3. 認可したアカウントが @MiraiRadar であることを確かめてから、登録する（y）
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { TwitterApi } from 'twitter-api-v2';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env');
const REPO = 'NEXT-STANDARD/mirai-forecast';
const EXPECTED_SCREEN_NAME = 'MiraiRadar';

function ask(question, { hidden = false } = {}) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    }
    rl.question(question, answer => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

function setSecret(name, value) {
  execFileSync('gh', ['secret', 'set', name, '--repo', REPO], { input: value, stdio: ['pipe', 'ignore', 'inherit'] });
}

/** .env の TWITTER_* を新しい値に置き換える（他の行は触らない）。無ければ末尾に足す */
function updateEnvFile(values) {
  const lines = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8').split('\n') : [];
  const done = new Set();
  const out = lines.map(line => {
    const m = /^([A-Z_]+)=/.exec(line);
    if (m && values[m[1]] !== undefined) { done.add(m[1]); return `${m[1]}=${values[m[1]]}`; }
    return line;
  });
  for (const [k, v] of Object.entries(values)) if (!done.has(k)) out.push(`${k}=${v}`);
  fs.writeFileSync(ENV_FILE, out.join('\n'), { mode: 0o600 });
}

async function main() {
  console.log('zero-mcp のコンシューマーキーとシークレットを貼り付けてください（入力は表示されません）。');
  const appKey = await ask('コンシューマーキー: ', { hidden: true });
  const appSecret = await ask('コンシューマーシークレット: ', { hidden: true });
  if (!appKey || !appSecret) throw new Error('コンシューマーキーかシークレットが空です');

  const { url, oauth_token, oauth_token_secret } = await new TwitterApi({ appKey, appSecret }).generateAuthLink('oob');
  console.log('\n次の URL を、@MiraiRadar でログインしたブラウザで開き、「連携アプリを認証」を押してください。');
  console.log(url);
  const pin = await ask('\n表示された PIN: ');
  if (!/^\d{4,10}$/.test(pin)) throw new Error('PIN は数字で入力してください');

  const temp = new TwitterApi({ appKey, appSecret, accessToken: oauth_token, accessSecret: oauth_token_secret });
  const { accessToken, accessSecret, screenName, userId } = await temp.login(pin);
  console.log(`\n認可したアカウント: @${screenName}（ID ${userId}）`);
  if (screenName.toLowerCase() !== EXPECTED_SCREEN_NAME.toLowerCase()) {
    throw new Error(`@${EXPECTED_SCREEN_NAME} ではありません。登録せずに終了します（ブラウザのログインを切り替えてやり直してください）`);
  }

  const ok = await ask(`GitHub（${REPO}）の secrets と .env の TWITTER_* 4つを、この値で置き換えます。よろしいですか？ (y/N): `);
  if (ok.toLowerCase() !== 'y') { console.log('登録せずに終了しました。'); return; }

  const values = {
    TWITTER_API_KEY: appKey,
    TWITTER_API_SECRET: appSecret,
    TWITTER_ACCESS_TOKEN: accessToken,
    TWITTER_ACCESS_SECRET: accessSecret,
  };
  for (const [k, v] of Object.entries(values)) setSecret(k, v);
  updateEnvFile(values);
  console.log('✅ GitHub secrets 4つと .env を更新しました（値は表示していません）。');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
