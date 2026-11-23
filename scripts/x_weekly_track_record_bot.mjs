/**
 * 週次の答え合わせ（X 投稿）
 *
 * 公開中の的中記録（public/data/track_record.json）から、直近7日に決着した予測だけを集計して1本投稿する。
 * 旧 x_weekly_award_bot.mjs は文面と画像が日付以外すべて固定文で、架空の「S級予報士」や
 * 「日本世論88%が圧勝」を7週連続で投稿していた（AR-2）。ここではデータから出せる数字しか書かない。
 *   ・個人別の的中率は出さない（票を銘柄をまたいでつなげない設計なので計算できない）
 *   ・日本世論の数字は出さない（票が少なく、開発機の票も混ざっている。AR-17）
 *   ・英語のままの題名の銘柄は例に使わない
 *
 * 使い方:
 *   node scripts/x_weekly_track_record_bot.mjs            # 文面を表示するだけ（既定）
 *   node scripts/x_weekly_track_record_bot.mjs --post     # 投稿。ただし WEEKLY_BOT_ENABLED=true のときだけ
 *   --now=2026-11-24T00:00:00Z                             # 集計の基準時刻を変える（確認用）
 *
 * 決着が0件の週は投稿しない。失敗は非0で終える（CI の通知に乗せる。AR-7）。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TRACK_RECORD = path.join(ROOT, 'public', 'data', 'track_record.json');
const SITE_URL = 'https://mirairadar.com/track-record';
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_WEIGHT = 280;          // X の上限（全角は2、URL は23として数える）
const TITLE_MAX = 28;

const POST = process.argv.includes('--post');
const ENABLED = process.env.WEEKLY_BOT_ENABLED === 'true';
const nowArg = (process.argv.find(a => a.startsWith('--now=')) || '').slice('--now='.length);
const NOW = nowArg ? Date.parse(nowArg) : Date.now();

const CATEGORY_PREFIX_RE = /^(?:経済・市場予測|国際政治動向|AI・テック予測|エンタメ予測|スポーツ予測)[:：]\s*/;
const JP_RE = /[぀-ヿ㐀-䶿一-鿿]/;
const isJapaneseTitle = (t) => {
  const body = String(t || '').replace(CATEGORY_PREFIX_RE, '');
  return JP_RE.test(body) && !/\bWill\b/.test(body);
};

/** X の文字数（全角2・半角1・URL は23） */
export function tweetWeight(text) {
  let w = 0;
  const urls = text.match(/https?:\/\/\S+/g) || [];
  let rest = text;
  for (const u of urls) { rest = rest.replace(u, ''); w += 23; }
  for (const ch of rest) w += ch.codePointAt(0) > 0x10ff ? 2 : 1;
  return w;
}

const fmtDate = (ms) => {
  const d = new Date(ms + 9 * 3600 * 1000);   // JST
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

const JST_MS = 9 * 3600 * 1000;
/** now の直前の「月曜 00:00 JST」。集計は前の週の月曜 00:00〜この時刻（JST の月〜日） */
export function weekEnd(now) {
  const jst = new Date(now + JST_MS);
  const daysSinceMonday = (jst.getUTCDay() + 6) % 7;
  const mondayJst = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - daysSinceMonday);
  return mondayJst - JST_MS;
}

/** 前の週（JST の月〜日）に決着した記録を集計し、投稿文を作る。0件なら null */
export function buildWeeklyPost(trackRecord, at = NOW) {
  const now = weekEnd(at);
  const from = now - WINDOW_MS;
  const week = (trackRecord.records || []).filter(r => {
    const t = Date.parse(r.closedAt || '');
    return !Number.isNaN(t) && t >= from && t < now;
  });
  if (week.length === 0) return null;

  const hits = week.filter(r => r.worldCorrect).length;
  const pct = Math.round((hits / week.length) * 100);
  // 決着24時間前に既に 0% か 100% だったものは、予測というより結果。除いた数字も並べる（不利な数字を先に出す）
  const live = week.filter(r => !r.isDegenerate);
  const liveHits = live.filter(r => r.worldCorrect).length;

  // 例：外れた中で市場が最も強く言い切っていたもの。外れが無ければ、当たった中で最も迷っていたもの
  const jp = week.filter(r => isJapaneseTitle(r.titleJa));
  const misses = jp.filter(r => !r.worldCorrect).sort((a, b) => Math.abs(b.world.prob - 50) - Math.abs(a.world.prob - 50));
  const closeCalls = jp.filter(r => r.worldCorrect).sort((a, b) => Math.abs(a.world.prob - 50) - Math.abs(b.world.prob - 50));
  const example = misses[0] || closeCalls[0] || null;
  const exampleLabel = misses[0] ? '外れた例' : '際どかった例';

  const head = `【未来レーダー 週次の答え合わせ】${fmtDate(from)}〜${fmtDate(now - 1)}`;
  const liveNote = live.length > 0 && live.length < week.length
    ? `24時間前に0%か100%だったものを除くと ${liveHits}/${live.length}件。`
    : '';
  const body = `決着した予測 ${week.length}件。決着の24時間前の世界のマネー（Polymarket）の予想が当たったのは ${hits}件（${pct}%）。${liveNote}`;
  const tail = `全記録（外れも消さずに公開）\n${SITE_URL}`;

  const withExample = example
    ? `${head}\n\n${body}\n\n${exampleLabel}：「${cut(String(example.titleJa).replace(CATEGORY_PREFIX_RE, ''), TITLE_MAX)}」市場は${example.world.prob}% → ${example.happened ? '起きた' : '起きなかった'}\n\n${tail}`
    : null;
  const plain = `${head}\n\n${body}\n\n${tail}`;
  const text = withExample && tweetWeight(withExample) <= MAX_WEIGHT ? withExample : plain;
  if (tweetWeight(text) > MAX_WEIGHT) throw new Error(`投稿文が長すぎます（${tweetWeight(text)}/${MAX_WEIGHT}）`);

  return { text, count: week.length, hits, exampleId: text === withExample ? example?.id ?? null : null };
}

async function main() {
  if (Number.isNaN(NOW)) throw new Error(`--now の形式が不正です: ${nowArg}`);
  const tr = JSON.parse(fs.readFileSync(TRACK_RECORD, 'utf-8'));
  const post = buildWeeklyPost(tr, NOW);

  if (!post) {
    console.log('直近7日に決着した予測が無いため、投稿しません。');
    return;
  }
  console.log(`集計: ${post.count}件中 ${post.hits}件的中 / 例: ${post.exampleId ?? 'なし'} / 文字数 ${tweetWeight(post.text)}/${MAX_WEIGHT}`);
  console.log('----- 投稿文 -----');
  console.log(post.text);
  console.log('------------------');

  if (!POST) { console.log('（表示のみ。投稿するには --post）'); return; }
  if (!ENABLED) { console.log('WEEKLY_BOT_ENABLED が true ではないため、投稿しません。'); return; }

  const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET } = process.env;
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    throw new Error('X の資格情報（TWITTER_*）が設定されていません');
  }
  const { TwitterApi } = await import('twitter-api-v2');
  const client = new TwitterApi({
    appKey: TWITTER_API_KEY, appSecret: TWITTER_API_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN, accessSecret: TWITTER_ACCESS_SECRET,
  });
  const { data } = await client.v2.tweet(post.text);
  console.log(`投稿しました: Tweet ID = ${data.id}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error('週次の答え合わせの投稿に失敗:', err.message); process.exit(1); });
}
