#!/usr/bin/env node

/**
 * ==============================================================================
 * 掲載銘柄の選定（Phase 2-A: 絞り込み ／ Phase 2-E: 週次リバランス）
 * ==============================================================================
 * DB の有効銘柄に N-64 の選定ルール（curation_rules.mjs）を当て、
 * 「サイトに出す20件（国内8・グローバル12）」を機械選定する。
 *
 * モード:
 *   （引数なし）  提案モード。DB に書かず、提案MDとSQLを書き出す（Phase 2-A の一回目で使用）
 *   --dry-run    ファイルも書かず、標準出力に提案だけを出す
 *   --apply      週次リバランス（Phase 2-E）。service_role で is_listed を直接更新する。
 *                同期が足す新銘柄で掲載数が20から漂流するのを、週1回ここで戻す。
 *                安全弁: 変更が12件を超える場合は異常とみなし中止（--force で解除）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { isDomesticEvent } from './resolvePolymarketOdds.mjs';
import { resolvePolymarketOdds } from './resolvePolymarketOdds.mjs';
import {
  GLOBAL_QUOTA, DOMESTIC_QUOTA, SPORTS_QUOTA, SUBJECT_QUOTA,
  subjectWords, curationReject, isSportsCandidate,
} from './curation_rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const MAX_APPLY_CHANGES = 12;   // 週次の自然な入れ替えは数件。これを超えたらデータ異常を疑って止まる
const TODAY = new Date().toISOString().slice(0, 10);

// CI（GitHub Actions）には .env が無く、環境変数で渡される
const env = {};
if (fs.existsSync(path.join(ROOT, '.env'))) {
  const envStr = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8');
  envStr.split('\n').forEach((l) => {
    const [k, ...v] = l.split('=');
    if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim();
  });
}
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

// --apply は service_role 必須。anon で走ると「成功したのに0件」になるため先に落とす（sync と同じガード）
const keyRole = (key) => {
  try { return JSON.parse(Buffer.from(String(key).split('.')[1], 'base64').toString()).role; } catch { return null; }
};
const supabaseKey = APPLY ? serviceKey : (anonKey || serviceKey);
if (APPLY && keyRole(supabaseKey) !== 'service_role') {
  console.error('❌ --apply には SUPABASE_SERVICE_ROLE_KEY が必要です（現在のロール: ' + keyRole(supabaseKey) + '）');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ------------------------------------------------------------------------------
// 国内銘柄の重複クラスタリング
// ------------------------------------------------------------------------------
// council 生成の銘柄は「防衛増税」「年収の壁」などほぼ同文の言い換えが2〜3本ずつある。
// 主題リストは持たず、文字バイグラムの Jaccard 類似度で機械的に束ねる。
// しきい値 0.35 は実データ26件で検算（防衛増税×2・年収の壁×2・ライドシェア×2・
// 著作権×2・ドル円×2・大谷×2・日銀×2 の7クラスタを正しく束ね、無関係な結合なし）。
function bigrams(s) {
  const t = String(s).replace(/[\s、。・「」『』（）()？?：:]/g, '');
  const set = new Set();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
}
function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}
function clusterDomestic(events) {
  const clusters = [];
  for (const e of events) {
    const bg = bigrams(e.title_ja || '');
    const hit = clusters.find(c => c.some(m => jaccard(bg, m._bg) >= 0.35));
    const entry = { ...e, _bg: bg };
    if (hit) hit.push(entry); else clusters.push([entry]);
  }
  return clusters;
}

async function main() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', true);
  if (error) { console.error('events 取得エラー:', error.message); process.exit(1); }

  const { data: voteLogs, error: vErr } = await supabase
    .from('japan_vote_logs').select('event_id');
  if (vErr) { console.error('vote_logs 取得エラー:', vErr.message); process.exit(1); }
  const votes = new Map();
  for (const v of voteLogs || []) {
    if (v.event_id) votes.set(String(v.event_id), (votes.get(String(v.event_id)) || 0) + 1);
  }
  const n = (e) => votes.get(String(e.id)) || 0;

  let marketOdds = {};
  try { marketOdds = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/market_odds.json'), 'utf-8')); } catch {}

  const domestic = events.filter(e => isDomesticEvent(e.id));
  const global = events.filter(e => !isDomesticEvent(e.id));
  console.log(`有効 ${events.length}件 = 国内 ${domestic.length} ＋ グローバル ${global.length}`);

  // ----------------------------------------------------------------------------
  // グローバル：Polymarket の生イベントを取り直して N-64 ルールを当てる
  // ----------------------------------------------------------------------------
  const keepGlobal = [];
  const dropGlobal = [];   // { e, why }
  const candidates = [];

  for (const e of global) {
    const id = String(e.id);
    // 初期シード（1桁ID）は Polymarket 非連動。世界オッズを一度も持てず、
    // 後から入った実市場連動の同型銘柄と重複している。
    if (/^\d{1,3}$/.test(id)) { dropGlobal.push({ e, why: '初期シード（Polymarket非連動・実市場版と重複）' }); continue; }

    let ev = null;
    try {
      const res = await fetch(`https://gamma-api.polymarket.com/events/${id}`);
      if (res.ok) ev = await res.json();
    } catch {}
    if (!ev || !ev.markets || !ev.markets[0]) { dropGlobal.push({ e, why: 'Polymarket 側にイベントが見つからない' }); continue; }
    if (ev.closed === true || ev.active === false) { dropGlobal.push({ e, why: 'Polymarket 側で決着・終了（次回同期で is_active=false になる）' }); continue; }

    const odds = resolvePolymarketOdds(ev, e.title_ja, e.title_en);
    if (!odds || odds.probYes === null) { dropGlobal.push({ e, why: '世界オッズを解決できない（読者に判断材料が出せない）' }); continue; }

    // markets[0] は API の並び順しだいで別のバケットになる（同期との判定食い違いの原因）。
    // resolver が実際に照合した market があればそれで判定する。
    const matched = odds.matchedMarketId
      ? ev.markets.find(m => String(m.id) === String(odds.matchedMarketId)) || ev.markets[0]
      : ev.markets[0];
    const why = curationReject(ev, matched);
    if (why) { dropGlobal.push({ e, why }); continue; }

    // 掲載直後に決着して入れ替えになる銘柄は「厳選20」に載せない
    const endMs = e.end_date ? new Date(e.end_date).getTime() : Infinity;
    if (endMs - Date.now() < 48 * 3600 * 1000) { dropGlobal.push({ e, why: '締切まで48時間未満（掲載直後に決着・入れ替えになる）' }); continue; }

    const dict = marketOdds[id] || {};
    candidates.push({
      e, ev,
      n: n(e),
      volume24h: dict.volume24h || ev.volume24hr || 0,
      isSports: isSportsCandidate(ev, ev.markets[0]),
      words: subjectWords(ev),
    });
  }

  // 票数優先（読者が実際に反応した銘柄）、同数なら24h出来高。そこに枠制約を重ねる。
  candidates.sort((a, b) => b.n - a.n || b.volume24h - a.volume24h);
  let sportsTaken = 0;
  const wordSeen = new Map();
  for (const c of candidates) {
    if (keepGlobal.length >= GLOBAL_QUOTA) { dropGlobal.push({ e: c.e, why: `グローバル枠 ${GLOBAL_QUOTA}件の枠外（票数・出来高順）` }); continue; }
    if (c.isSports && sportsTaken >= SPORTS_QUOTA) { dropGlobal.push({ e: c.e, why: `スポーツ枠 ${SPORTS_QUOTA}件の枠外` }); continue; }
    const hit = c.words.find(w => (wordSeen.get(w) || 0) >= SUBJECT_QUOTA);
    if (hit) { dropGlobal.push({ e: c.e, why: `同一主体の上限 ${SUBJECT_QUOTA}件超（${hit}）` }); continue; }
    c.words.forEach(w => wordSeen.set(w, (wordSeen.get(w) || 0) + 1));
    if (c.isSports) sportsTaken++;
    keepGlobal.push(c);
  }

  // ----------------------------------------------------------------------------
  // 国内：重複クラスタを束ね、各クラスタの代表を票数順に採る
  // ----------------------------------------------------------------------------
  const clusters = clusterDomestic(domestic);
  const reps = [];
  const dropDomestic = [];
  for (const c of clusters) {
    const sorted = [...c].sort((a, b) => n(b) - n(a) || String(a.end_date).localeCompare(String(b.end_date)));
    reps.push(sorted[0]);
    for (const dup of sorted.slice(1)) dropDomestic.push({ e: dup, why: `重複（代表: ${sorted[0].title_ja.slice(0, 22)}…）` });
  }
  // カテゴリ上限2件で多様性を確保しつつ票数順に8件。
  // 同数（ほぼ全部 n=0）のタイは「締切が近い＝早く白黒がつく」順、次に短い題名を機械的に採る。
  reps.sort((a, b) =>
    n(b) - n(a) ||
    String(a.end_date).localeCompare(String(b.end_date)) ||
    (a.title_ja || '').length - (b.title_ja || '').length);
  const keepDomestic = [];
  const catCount = new Map();
  for (const r of reps) {
    if (keepDomestic.length >= DOMESTIC_QUOTA) { dropDomestic.push({ e: r, why: `国内枠 ${DOMESTIC_QUOTA}件の枠外（票数順）` }); continue; }
    const cat = r.category || 'other';
    if ((catCount.get(cat) || 0) >= 2) { dropDomestic.push({ e: r, why: `カテゴリ ${cat} の上限2件超` }); continue; }
    catCount.set(cat, (catCount.get(cat) || 0) + 1);
    keepDomestic.push(r);
  }

  // ----------------------------------------------------------------------------
  // 出力
  // ----------------------------------------------------------------------------
  const keeps = [
    ...keepDomestic.map(e => ({ id: String(e.id), title: e.title_ja, kind: '国内', n: n(e), end: String(e.end_date).slice(0, 10) })),
    ...keepGlobal.map(c => ({ id: String(c.e.id), title: c.e.title_ja, kind: 'グローバル', n: c.n, end: String(c.e.end_date).slice(0, 10) })),
  ];
  const drops = [
    ...dropDomestic.map(d => ({ id: String(d.e.id), title: d.e.title_ja, kind: '国内', n: n(d.e), why: d.why })),
    ...dropGlobal.map(d => ({ id: String(d.e.id), title: d.e.title_ja, kind: 'グローバル', n: n(d.e), why: d.why })),
  ];

  // 検算：keep + drop = 母集団全数。1件でも取りこぼしたら出力しない。
  if (keeps.length + drops.length !== events.length) {
    console.error(`❌ 検算不一致: keep ${keeps.length} + drop ${drops.length} ≠ 有効 ${events.length}`);
    process.exit(1);
  }

  console.log(`\n■ 残す ${keeps.length}件（国内 ${keepDomestic.length} ／ グローバル ${keepGlobal.length}）`);
  for (const k of keeps) console.log(`  [${k.kind}] n=${k.n} 〜${k.end} ${k.title.slice(0, 46)}`);
  console.log(`\n■ 外す ${drops.length}件`);
  for (const d of drops) console.log(`  [${d.kind}] n=${d.n} ${d.title.slice(0, 36)} — ${d.why}`);

  if (DRY_RUN) { console.log('\n🧪 [dry-run] ファイルは書きません（書く予定: 提案MD 1本・SQL 1本）'); return; }

  // ----------------------------------------------------------------------------
  // --apply: 週次リバランス（Phase 2-E）。現在の is_listed と選定結果の差分だけを更新する
  // ----------------------------------------------------------------------------
  if (APPLY) {
    const currentListed = new Map(events.map(e => [String(e.id), e.is_listed !== false]));
    const keepIds = new Set(keeps.map(k => k.id));
    const toList = keeps.filter(k => currentListed.get(k.id) === false);
    const toDelist = drops.filter(d => currentListed.get(d.id) === true);
    const changes = toList.length + toDelist.length;

    console.log(`\n■ リバランス差分: 掲載へ ${toList.length}件 ／ 観測対象外へ ${toDelist.length}件`);
    for (const c of toList) console.log(`  + 掲載: ${c.title.slice(0, 40)}`);
    for (const c of toDelist) console.log(`  - 対象外: ${c.title.slice(0, 40)} — ${c.why}`);

    if (changes === 0) { console.log('変更なし。DB には書きません。'); return; }
    if (changes > MAX_APPLY_CHANGES && !FORCE) {
      console.error(`❌ 変更が ${changes}件 と多すぎます（上限 ${MAX_APPLY_CHANGES}件）。データ異常の疑いがあるため中止します。意図的なら --force を付けてください。`);
      process.exit(1);
    }

    if (toList.length > 0) {
      const { error } = await supabase.from('events').update({ is_listed: true }).in('id', toList.map(c => c.id));
      if (error) { console.error('❌ 掲載更新エラー:', error.message); process.exit(1); }
    }
    if (toDelist.length > 0) {
      const { error } = await supabase.from('events').update({ is_listed: false }).in('id', toDelist.map(c => c.id));
      if (error) { console.error('❌ 対象外更新エラー:', error.message); process.exit(1); }
    }

    // 検算：適用後の掲載数が意図（keeps 件数）と一致すること
    const { data: after, error: vErr2 } = await supabase
      .from('events').select('id').eq('is_active', true).eq('is_listed', true);
    if (vErr2) { console.error('❌ 検算クエリエラー:', vErr2.message); process.exit(1); }
    if (!after || after.length !== keeps.length) {
      console.error(`❌ 検算不一致: 適用後の掲載 ${after?.length}件 ≠ 選定 ${keeps.length}件`);
      process.exit(1);
    }
    console.log(`✅ リバランス適用完了。掲載 ${after.length}件（国内 ${keepDomestic.length} ／ グローバル ${keepGlobal.length}）`);
    return;
  }

  const mdPath = path.join(ROOT, 'docs', `shiborikomi-teian-${TODAY}.md`);
  const md = [
    `# 絞り込み提案（73→20銘柄・Phase 2-A） ${TODAY}`,
    '',
    `有効 ${events.length}件を、N-64 と同じルール（curation_rules.mjs 共有）で 20件に絞る提案。`,
    `採用順位は「日本の読者が実際に投票した数（n）」を最優先、同数は24h出来高。`,
    '',
    `## 残す ${keeps.length}件（国内 ${keepDomestic.length} ／ グローバル ${keepGlobal.length}）`,
    '',
    '| 区分 | n | 締切 | 銘柄 | id |',
    '|---|---:|---|---|---|',
    ...keeps.map(k => `| ${k.kind} | ${k.n} | ${k.end} | ${k.title} | \`${k.id}\` |`),
    '',
    `## 外す ${drops.length}件（is_listed=false ＝【観測対象外】表示・noindex。404にはしない）`,
    '',
    '| 区分 | n | 銘柄 | 理由 | id |',
    '|---|---:|---|---|---|',
    ...drops.map(d => `| ${d.kind} | ${d.n} | ${d.title} | ${d.why} | \`${d.id}\` |`),
    '',
    '## 編集メモ（機械選定が拾えない判断。変えるならここだけ見ればよい）',
    '',
    '- **タルシシオ（n=4）とPSG（n=4）は「20択以上のレース切り出し」ルールの犠牲。**',
    '  票が付いている銘柄だが、残すなら §0 のバロンドール注記と同じく明示的な例外指定が要る。',
    '- **長期の地政学（中国台湾侵攻・米イラン和平）は票ゼロで枠外に落ちた。**',
    '  XRP（8月末決着）やマスク週次と編集判断で差し替える選択はある。ルール上はどちらも適格。',
    '- **国内は politics 1件・entertainment 2件。** 夫婦別姓・防衛増税を優先するなら',
    '  ジブリか鬼滅を1件譲る。タイ（n=0）の順位は「締切が近い順」で機械的に決めている。',
    '- **ホルムズ8/31版（n=6）は6日で決着する。** 決着後は次回同期がグローバル枠を埋め直す。',
    '',
    '## 適用手順',
    '',
    '1. ユーザーが Supabase SQL Editor で `scripts/patch_is_listed.sql` を実行（DDL＋UPDATE）',
    '2. アプリ側の is_listed 対応をデプロイ（一覧・sitemap から除外、詳細ページは【観測対象外】＋noindex で残す）',
    '3. そのあとトラックレコードの見出し数字を確定させる（母集団が動くため、順番厳守）',
    '',
  ].join('\n');
  fs.writeFileSync(mdPath, md, 'utf-8');

  const sqlPath = path.join(ROOT, 'scripts', 'patch_is_listed.sql');
  const sql = [
    `-- 絞り込み（Phase 2-A・${TODAY}）: ユーザーが Supabase SQL Editor で実行する`,
    '-- is_active＝まだ走っているか ／ is_listed＝サイトに出すか。決着していない銘柄を',
    '-- is_active=false で隠すと「決着・終了」と表示され事実に反するため、列を分ける。',
    '',
    'ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;',
    '',
    `-- 外す ${drops.length}件（詳細は docs/shiborikomi-teian-${TODAY}.md）`,
    'UPDATE public.events SET is_listed = false WHERE id IN (',
    drops.map(d => `  '${d.id}'`).join(',\n'),
    ');',
    '',
    '-- 検算：残りの掲載数が 20 になっていること',
    'SELECT is_listed, count(*) FROM public.events WHERE is_active = true GROUP BY is_listed;',
    '',
  ].join('\n');
  fs.writeFileSync(sqlPath, sql, 'utf-8');

  console.log(`\n✅ 提案を書き出しました:\n  - ${mdPath}\n  - ${sqlPath}`);
}

main();
