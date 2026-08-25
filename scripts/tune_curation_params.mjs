#!/usr/bin/env node

/**
 * ==============================================================================
 * 掲載パラメータの自己チューニング（Loop 1）
 * ==============================================================================
 * 週次オブザーバトリーの先頭（リバランスの前）に走る。
 *   1. 前週スナップショット（docs/weekly/state.json）との差分から
 *      「掲載中に集めた票（vote velocity）」をカテゴリ別に計測する
 *   2. カテゴリ重み（curation_params.json）を実測に基づき上限つきで調整する
 *   3. 前週の探索枠の成績を評価し、履歴に記録する（次の探索枠は選定側が選ぶ）
 *
 * 統計的な誠実さのガード：
 *   - 週の増分票が MIN_TUNING_VOTES 未満なら調整しない（ノイズに適合しない。
 *     「n<3なら語らない」と同じ思想）
 *   - 重みの変化は1週 ±STEP まで、値域 [MIN_W, MAX_W] にクランプ
 *   - すべての変更と「調整しなかった理由」を lastTuning に記録し、
 *     自己診断が週次ドラフトへ可視化する
 *
 * v1 で自動調整するのはカテゴリ重みだけ。枠の分割（国内8/グローバル12）と
 * 国内カテゴリ上限は params の手動ノブとして持つが、現在の票規模（数十票）で
 * 学習させるとノイズ適合するため自動では動かさない。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TODAY = new Date().toISOString().slice(0, 10);
const STATE_PATH = path.join(ROOT, 'docs', 'weekly', 'state.json');
export const PARAMS_PATH = path.join(ROOT, 'docs', 'weekly', 'curation_params.json');

const MIN_TUNING_VOTES = Number(process.env.TUNE_MIN_VOTES ?? 10);
const STEP = Number(process.env.TUNE_STEP ?? 0.1);
const MIN_W = 0.5, MAX_W = 2.0;

const env = {};
if (fs.existsSync(path.join(ROOT, '.env'))) {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf-8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
);

export const DEFAULT_PARAMS = {
  updatedAt: null,
  domesticQuota: 8,          // 手動ノブ（自動調整しない）
  domesticCategoryCap: 2,    // 手動ノブ（自動調整しない）
  categoryWeights: { economy: 1, politics: 1, tech: 1, sports: 1, entertainment: 1 },
  exploration: { id: null, since: null, baselineVotes: 0 },
  explorationHistory: [],
  lastTuning: null,
};

export function loadParams() {
  if (!fs.existsSync(PARAMS_PATH)) return structuredClone(DEFAULT_PARAMS);
  try {
    return { ...structuredClone(DEFAULT_PARAMS), ...JSON.parse(fs.readFileSync(PARAMS_PATH, 'utf-8')) };
  } catch {
    return structuredClone(DEFAULT_PARAMS);
  }
}

async function main() {
  const params = loadParams();
  const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) : { weeks: [] };
  const prevWeeks = state.weeks.filter(w => w.date !== TODAY);
  const prev = prevWeeks.length > 0 ? prevWeeks[prevWeeks.length - 1] : null;

  const skip = (reason) => {
    params.lastTuning = { date: TODAY, skipped: reason, changes: [], exploration: null };
    params.updatedAt = TODAY;
    fs.writeFileSync(PARAMS_PATH, JSON.stringify(params, null, 1), 'utf-8');
    console.log(`⏭️ チューニング見送り: ${reason}`);
  };

  if (!prev) return skip('前週のスナップショットが無い（初回）');
  if (!Array.isArray(prev.listedIds) || prev.listedIds.length === 0) {
    return skip('前週スナップショットに掲載IDが無い（旧形式）。今週から記録される');
  }

  // 現在の集計を取得し、前週との差分＝掲載中に集めた票を計算する
  const { data: voteLogs, error: vErr } = await supabase.from('japan_vote_logs').select('event_id, choice');
  if (vErr) { console.error('vote_logs 取得エラー:', vErr.message); process.exit(1); }
  const now = {};
  for (const v of voteLogs || []) {
    if (!v.event_id) continue;
    (now[String(v.event_id)] ??= { yes: 0, total: 0 }).total++;
    if (v.choice === 'YES') now[String(v.event_id)].yes++;
  }

  const { data: events, error: eErr } = await supabase.from('events').select('id, category, title_ja');
  if (eErr) { console.error('events 取得エラー:', eErr.message); process.exit(1); }
  const catOf = new Map(events.map(e => [String(e.id), e.category || 'other']));
  const titleOf = new Map(events.map(e => [String(e.id), e.title_ja || String(e.id)]));

  const gained = new Map();   // 前週に掲載されていた銘柄が今週までに集めた票
  for (const id of prev.listedIds) {
    const before = prev.tallies?.[id]?.total ?? 0;
    const after = now[id]?.total ?? before;   // 銘柄が削除されていたら増分0扱い
    gained.set(id, Math.max(0, after - before));
  }
  const totalGained = [...gained.values()].reduce((a, b) => a + b, 0);

  // 探索枠の評価（枠の入れ替え前に、出ていく探索銘柄の成績を確定させる）
  let explorationResult = null;
  if (params.exploration?.id && prev.listedIds.includes(String(params.exploration.id))) {
    const exId = String(params.exploration.id);
    const exGained = gained.get(exId) ?? 0;
    const regulars = prev.listedIds.filter(id => id !== exId).map(id => gained.get(id) ?? 0).sort((a, b) => a - b);
    const median = regulars.length ? regulars[Math.floor(regulars.length / 2)] : 0;
    explorationResult = {
      id: exId, title: (titleOf.get(exId) || exId).slice(0, 40),
      since: params.exploration.since, gained: exGained, medianOfRegulars: median,
      verdict: exGained > median ? 'win' : exGained === median ? 'even' : 'lose',
    };
    params.explorationHistory = [...(params.explorationHistory || []), explorationResult].slice(-12);
  }

  // カテゴリ重みの調整（増分票が薄い週は動かさない）
  const changes = [];
  if (totalGained < MIN_TUNING_VOTES) {
    params.lastTuning = {
      date: TODAY, skipped: `週の増分票 ${totalGained}票 < 最低 ${MIN_TUNING_VOTES}票（ノイズに適合しない）`,
      changes: [], totalGained, exploration: explorationResult,
    };
  } else {
    // カテゴリごとの「票シェア vs 枠シェア」。枠のわりに票を集めたカテゴリを+、逆を-
    const catGained = {}; const catSlots = {};
    for (const id of prev.listedIds) {
      const c = catOf.get(id) || 'other';
      catGained[c] = (catGained[c] || 0) + (gained.get(id) || 0);
      catSlots[c] = (catSlots[c] || 0) + 1;
    }
    for (const cat of Object.keys(params.categoryWeights)) {
      if (!catSlots[cat]) continue;   // 枠が無かったカテゴリは評価できない
      const voteShare = (catGained[cat] || 0) / totalGained;
      const slotShare = catSlots[cat] / prev.listedIds.length;
      const old = params.categoryWeights[cat];
      let next = old;
      if (voteShare > slotShare * 1.25) next = Math.min(MAX_W, old + STEP);
      else if (voteShare < slotShare * 0.75) next = Math.max(MIN_W, old - STEP);
      if (next !== old) {
        params.categoryWeights[cat] = Number(next.toFixed(2));
        changes.push({ cat, from: old, to: params.categoryWeights[cat],
          why: `票シェア ${(voteShare * 100).toFixed(0)}% vs 枠シェア ${(slotShare * 100).toFixed(0)}%` });
      }
    }
    params.lastTuning = { date: TODAY, skipped: null, changes, totalGained, exploration: explorationResult };
  }

  params.updatedAt = TODAY;
  fs.writeFileSync(PARAMS_PATH, JSON.stringify(params, null, 1), 'utf-8');

  console.log(`✅ チューニング完了: 増分票 ${totalGained}票`);
  if (params.lastTuning.skipped) console.log(`   ⏭️ ${params.lastTuning.skipped}`);
  for (const c of changes) console.log(`   ⚖️ ${c.cat}: ${c.from} → ${c.to}（${c.why}）`);
  if (explorationResult) console.log(`   🧪 探索枠の結果: ${explorationResult.title} — ${explorationResult.gained}票（中央値${explorationResult.medianOfRegulars}票・${explorationResult.verdict}）`);
}

// 選定スクリプトが loadParams を import しても副作用が走らないよう、直接実行時のみ main を呼ぶ
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
