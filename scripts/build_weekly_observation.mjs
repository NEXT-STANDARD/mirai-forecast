#!/usr/bin/env node

/**
 * ==============================================================================
 * 週次の定点観測ドラフト生成（Phase 2-E）
 * ==============================================================================
 * 「今週、世界と日本が最もズレた話題」を docs/weekly/<日付>.md に書き出す。
 * 毎週月曜朝の GitHub Actions（weekly-observatory.yml）から呼ばれる。
 *
 * トーン3原則（2026-08-25 合意）に従う：
 *   ①数字は母集団と一緒にしか出さない ②外れを先に言う ③賭けに誘導しない
 *
 * 生成物は「下書き」。X への投稿はユーザーが当日値を確認してから行う。
 *
 * 使い方:
 *   node scripts/build_weekly_observation.mjs [--prev /path/to/old_track_record.json]
 *   --prev を渡すと、旧トラックレコードとの差分から「今週の決着」を作る
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { isDomesticEvent, resolvePolymarketOdds } from './resolvePolymarketOdds.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TODAY = new Date().toISOString().slice(0, 10);
const MIN_VOTES = 3;

const prevIdx = process.argv.indexOf('--prev');
const prevPath = prevIdx >= 0 ? process.argv[prevIdx + 1] : null;

const env = {};
if (fs.existsSync(path.join(ROOT, '.env'))) {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf-8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 1. 掲載銘柄と投票
  const { data: events, error } = await supabase
    .from('events').select('*').eq('is_active', true);
  if (error) { console.error('events 取得エラー:', error.message); process.exit(1); }
  const listed = events.filter(e => e.is_listed !== false);

  const { data: voteLogs, error: vErr } = await supabase.from('japan_vote_logs').select('event_id, choice');
  if (vErr) { console.error('vote_logs 取得エラー:', vErr.message); process.exit(1); }
  const tally = new Map();
  for (const v of voteLogs || []) {
    if (!v.event_id) continue;
    const t = tally.get(String(v.event_id)) || { yes: 0, total: 0 };
    t.total++;
    if (v.choice === 'YES') t.yes++;
    tally.set(String(v.event_id), t);
  }

  // 2. 掲載グローバル銘柄の世界オッズ（当日値）
  const rows = [];
  for (const e of listed) {
    const t = tally.get(String(e.id)) || { yes: 0, total: 0 };
    const japanN = t.total;
    const japanYes = japanN > 0 ? Math.round((t.yes / japanN) * 100) : null;
    let worldYes = null;
    if (!isDomesticEvent(e.id) && /^\d{4,}$/.test(String(e.id))) {
      try {
        const res = await fetch(`https://gamma-api.polymarket.com/events/${e.id}`);
        if (res.ok) {
          const odds = resolvePolymarketOdds(await res.json(), e.title_ja, e.title_en);
          if (odds && typeof odds.probYes === 'number' && odds.hasWorldOdds !== false) worldYes = odds.probYes;
        }
      } catch {}
    }
    rows.push({
      titleJa: e.title_ja || e.title_en,
      slug: e.slug || e.id,
      worldYes,
      japanN,
      japanYes: japanN >= MIN_VOTES ? japanYes : null,
      gap: worldYes !== null && japanN >= MIN_VOTES ? Math.abs(worldYes - japanYes) : null,
    });
  }
  const ranked = rows.filter(r => r.gap !== null).sort((a, b) => b.gap - a.gap);
  const collecting = rows.filter(r => r.japanYes === null).length;

  // 3. トラックレコードの現在値と「今週の決着」
  const trPath = path.join(ROOT, 'public/data/track_record.json');
  const tr = JSON.parse(fs.readFileSync(trPath, 'utf-8'));
  let newlyResolved = [];
  if (prevPath && fs.existsSync(prevPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(prevPath, 'utf-8'));
      const prevIds = new Set((prev.records || []).map(r => r.id));
      newlyResolved = (tr.records || []).filter(r => !prevIds.has(r.id));
    } catch {}
  }
  const b = tr.breakdown;

  // 4. Markdown ドラフト
  const md = [];
  md.push(`# 週次定点観測 ${TODAY}`);
  md.push('');
  md.push(`> ⚠️ **これは下書き。** 投稿前に数字を当日値へ更新すること（オッズは動く）。`);
  md.push(`> トーン3原則：数字は母集団と一緒／外れを先に言う／賭けに誘導しない。リンクは返信側へ。`);
  md.push('');
  md.push(`## 今週の乖離（掲載${listed.length}銘柄中、世界オッズと日本世論 n>=${MIN_VOTES} が両方そろった${ranked.length}件）`);
  md.push('');
  if (ranked.length === 0) {
    md.push('該当なし（日本側の票が足りない）。乖離を語れない週は語らない。');
  } else {
    md.push('| # | 乖離 | 世界 | 日本 | 銘柄 |');
    md.push('|---:|---:|---:|---|---|');
    ranked.forEach((r, i) => {
      md.push(`| ${i + 1} | ${r.gap}pt | ${r.worldYes}% | ${r.japanYes}%（n=${r.japanN}） | [${r.titleJa}](https://mirairadar.com/market/${r.slug}) |`);
    });
  }
  md.push('');
  md.push(`集計中（n<${MIN_VOTES}）の掲載銘柄: ${collecting}件 — 確率は出さない。`);
  md.push('');
  md.push('## 今週の決着');
  md.push('');
  if (newlyResolved.length === 0) {
    md.push(prevPath ? '今週の新規決着はなし。' : '（--prev 未指定のため差分なし。前週の track_record.json を渡すと自動で埋まる）');
  } else {
    md.push('| 結果 | 24h前の市場 | 判定 | 銘柄 |');
    md.push('|---|---:|---|---|');
    for (const r of newlyResolved) {
      md.push(`| ${r.happened ? '起きた' : '起きず'} | ${r.world ? r.world.prob + '%' : '—'} | ${r.worldCorrect === null ? '—' : r.worldCorrect ? '的中' : '**外れ**'} | ${r.titleJa} |`);
    }
  }
  md.push('');
  md.push(`## トラックレコード現在値（決着${tr.summary.worldScored}件・全量無選別）`);
  md.push('');
  md.push(`- 全体: ${tr.summary.worldAccuracy}%（${tr.summary.worldHits}/${tr.summary.worldScored}）`);
  md.push(`- スポーツの1試合だけ: ${b.sports.accuracy}%（${b.sports.hits}/${b.sports.n}）`);
  md.push(`- スポーツの1試合を除く: ${b.nonSports.accuracy}%（${b.nonSports.hits}/${b.nonSports.n}）`);
  md.push(`- 24h前にほぼ確定を除く: ${b.excludingDegenerate.accuracy}%（${b.excludingDegenerate.hits}/${b.excludingDegenerate.n}）`);
  md.push('');
  md.push('## X投稿の下書き（ツリー構成・本文は無リンク）');
  md.push('');
  if (ranked.length > 0) {
    const top = ranked[0];
    md.push('**ポスト1（本文）**');
    md.push('');
    md.push(`> 今週、世界と日本が最もズレている問い。`);
    md.push(`> 「${top.titleJa}」——`);
    md.push(`> 世界のリアルマネーは ${top.worldYes}%、日本の読者投票は ${top.japanYes}%（n=${top.japanN}）。`);
    md.push(`> 乖離${top.gap}ポイント。どちらかが間違っています。`);
    if (newlyResolved.length > 0) {
      const miss = newlyResolved.find(r => r.worldCorrect === false);
      const hit = newlyResolved.find(r => r.worldCorrect === true);
      const pick = miss || hit;
      if (pick) {
        md.push(`>`);
        md.push(`> 先週の答え合わせ：「${pick.titleJa}」は${pick.happened ? '起きました' : '起きませんでした'}。`);
        md.push(`> 24時間前の市場は${pick.world ? pick.world.prob + '%' : '—'}——${pick.worldCorrect ? '的中です' : '外れです。外れも記録に残します'}。`);
      }
    }
    md.push(`> `);
    md.push(`> 全銘柄の観測と的中記録（外れ込み）はリプライに。`);
    md.push('');
    md.push('**ポスト2（返信・リンク）**');
    md.push('');
    md.push('> ▶ 観測中の全銘柄 https://mirairadar.com');
    md.push('> ▶ 的中トラックレコード（全量・無選別） https://mirairadar.com/track-record');
  } else {
    md.push('（乖離を語れる銘柄がないため、この週の投稿は見送りを推奨。数字がないのに語らない）');
  }
  md.push('');

  const outDir = path.join(ROOT, 'docs', 'weekly');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${TODAY}.md`);
  fs.writeFileSync(outPath, md.join('\n'), 'utf-8');
  console.log(`✅ 週次観測ドラフトを書き出しました: ${outPath}`);
  console.log(`   乖離ランキング ${ranked.length}件 ／ 集計中 ${collecting}件 ／ 今週の決着 ${newlyResolved.length}件`);
}

main();
