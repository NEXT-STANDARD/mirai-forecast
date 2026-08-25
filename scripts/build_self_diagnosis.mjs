#!/usr/bin/env node

/**
 * ==============================================================================
 * サイトの自己診断（Loop 2 / 再帰的自己改善の入口）
 * ==============================================================================
 * 週次オブザーバトリーの最後に走り、サイト自身の健康を機械的に診断する。
 *   1. ドリフト検知 — 掲載数・トラックレコードの減少・同期停止・本番との乖離など、
 *      「静かに壊れる」類の異常を検出する（2026-08-25 の記録5件消失が動機）
 *   2. 週次状態の永続化 — docs/weekly/state.json に票の集計スナップショット等を積む。
 *      Loop 1（掲載の自己チューニング）が票速度を計算するための土台
 *   3. 改善候補の自動起票 — 検知結果を SD-ID つきで週次ドラフトに追記する
 *
 * 検査思想は audit_self_check と同じ：母集団は導出する・しきい値は外から動かせる
 * （破壊テストのため環境変数で上書き可能）・沈黙を成功と混同しない。
 *
 * 使い方:
 *   node scripts/build_self_diagnosis.mjs [--audit-log /path/to/audit.log] [--prev-track /path/to/prev.json]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { GLOBAL_QUOTA, DOMESTIC_QUOTA } from './curation_rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TODAY = new Date().toISOString().slice(0, 10);
const SITE = 'https://mirairadar.com';
const STATE_PATH = path.join(ROOT, 'docs', 'weekly', 'state.json');
const MIN_VOTES = 3;

// しきい値（破壊テストで動かせるよう環境変数を優先）
const SYNC_MAX_HOURS = Number(process.env.SD_SYNC_MAX_HOURS ?? 2);
const COUNCIL_MAX_DAYS = Number(process.env.SD_COUNCIL_MAX_DAYS ?? 3);

const argOf = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
};
const auditLogPath = argOf('--audit-log');
const prevTrackPath = argOf('--prev-track');

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

const findings = [];
const note = (id, severity, message) => findings.push({ id, severity, message });

async function probe(url, checker) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return `HTTP ${res.status}`;
    if (checker) return await checker(res);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'fetch failed';
  }
}

async function main() {
  // ---------------------------------------------------------------------------
  // 信号の収集
  // ---------------------------------------------------------------------------
  const { data: events, error } = await supabase.from('events').select('id, is_active, is_listed, updated_at, created_at');
  if (error) { console.error('events 取得エラー:', error.message); process.exit(1); }
  const active = events.filter(e => e.is_active);
  const listed = active.filter(e => e.is_listed !== false);

  const { data: voteLogs, error: vErr } = await supabase.from('japan_vote_logs').select('event_id, choice');
  if (vErr) { console.error('vote_logs 取得エラー:', vErr.message); process.exit(1); }
  const tallies = {};
  for (const v of voteLogs || []) {
    if (!v.event_id) continue;
    const t = (tallies[String(v.event_id)] ??= { yes: 0, total: 0 });
    t.total++;
    if (v.choice === 'YES') t.yes++;
  }
  const totalVotes = (voteLogs || []).length;
  const n3Listed = listed.filter(e => (tallies[String(e.id)]?.total ?? 0) >= MIN_VOTES).length;

  const track = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/track_record.json'), 'utf-8'));
  const dbIds = new Set(events.map(e => String(e.id)));
  const orphanRecords = (track.records || []).filter(r => !dbIds.has(String(r.id))).length;

  let auditPass = null, auditFail = null;
  if (auditLogPath && fs.existsSync(auditLogPath)) {
    const m = fs.readFileSync(auditLogPath, 'utf-8').match(/合格\s+(\d+)件\s*｜\s*不合格\s+(\d+)件/);
    if (m) { auditPass = Number(m[1]); auditFail = Number(m[2]); }
  }

  const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) : { weeks: [] };
  // 「前週」は今日より前の最新スナップショット。同日再実行で自分自身を前週扱いすると
  // 増分が常に0になり、SD-VOTE-STALL が誤検知する（破壊テスト中に実際に踏んだ）
  const prevWeeks = state.weeks.filter(w => w.date !== TODAY);
  const prev = prevWeeks.length > 0 ? prevWeeks[prevWeeks.length - 1] : null;

  // ---------------------------------------------------------------------------
  // 検知器（SD-*）。severity: critical=🔴要対応 / warn=🟡注意 / info=🔵観察
  // ---------------------------------------------------------------------------
  const expectedListed = DOMESTIC_QUOTA + GLOBAL_QUOTA;
  if (listed.length !== expectedListed) {
    note('SD-LISTED', 'critical', `掲載数が ${listed.length}件（期待 ${expectedListed}件）。リバランスの失敗か DB 異常`);
  }

  let prevTrackCount = prev?.trackRecords ?? null;
  if (prevTrackCount === null && prevTrackPath && fs.existsSync(prevTrackPath)) {
    try { prevTrackCount = (JSON.parse(fs.readFileSync(prevTrackPath, 'utf-8')).records || []).length; } catch {}
  }
  if (prevTrackCount !== null && track.records.length < prevTrackCount) {
    note('SD-RECORD-LOSS', 'critical', `トラックレコードが ${prevTrackCount}→${track.records.length}件に減少。追記型の破れ＝即調査（記録は消えない設計）`);
  }

  if (prev && typeof prev.orphanRecords === 'number' && orphanRecords > prev.orphanRecords) {
    note('SD-ORPHAN-SPIKE', 'warn', `DB に存在しない採点済み記録が ${prev.orphanRecords}→${orphanRecords}件に増加。今週、DB の銘柄行が削除された（記録自体は追記型で保持済み）`);
  }

  const newestUpdate = Math.max(...active.map(e => new Date(e.updated_at).getTime()));
  const syncAgeH = (Date.now() - newestUpdate) / 3600000;
  if (syncAgeH > SYNC_MAX_HOURS) {
    note('SD-SYNC-STALE', 'critical', `同期の最終更新から ${syncAgeH.toFixed(1)}時間（しきい値 ${SYNC_MAX_HOURS}h）。auto-bot cron の停止を疑う`);
  }

  const councilTimes = events
    .filter(e => /^(council-|proposal-)/.test(String(e.id)))
    .map(e => new Date(e.created_at).getTime());
  if (councilTimes.length > 0) {
    const councilAgeD = (Date.now() - Math.max(...councilTimes)) / 86400000;
    if (councilAgeD > COUNCIL_MAX_DAYS) {
      note('SD-COUNCIL-STALE', 'warn', `評議会の最終起案から ${councilAgeD.toFixed(1)}日（しきい値 ${COUNCIL_MAX_DAYS}日）。daily-council cron の停止を疑う`);
    }
  }

  if (auditFail === null) {
    note('SD-AUDIT-MISSING', 'warn', '自己検証の結果ログが無い（--audit-log 未指定 or 検査が走っていない）。沈黙は成功ではない');
  } else if (auditFail > 0) {
    note('SD-AUDIT-FAIL', 'critical', `自己検証で不合格 ${auditFail}件（合格 ${auditPass}件）。ログを確認して起票する`);
  }
  const auditItems = auditPass !== null && auditFail !== null ? auditPass + auditFail : null;
  if (prev && typeof prev.auditItems === 'number' && auditItems !== null && auditItems < prev.auditItems) {
    note('SD-AUDIT-SHRINK', 'warn', `検査項目数が ${prev.auditItems}→${auditItems} に減少。検査を消した変更が正当か確認する`);
  }

  // 本番の生存と乖離（CI から独立に測る。デプロイ詰まり・配信事故の検知）
  const probes = [
    ['SD-PROD-TOP', `${SITE}/`, null],
    ['SD-PROD-MCP', `${SITE}/api/mcp`, async (res) => {
      const j = await res.json().catch(() => null);
      return j && j.name === 'mirairadar-webmcp' ? null : 'MCP応答が期待形でない（SPAフォールバック再発を疑う）';
    }],
    ['SD-PROD-TRACK', `${SITE}/track-record`, null],
  ];
  for (const [id, url, checker] of probes) {
    const bad = await probe(url, checker);
    if (bad) note(id, 'critical', `${url} → ${bad}`);
  }
  const sitemapBody = await fetch(`${SITE}/sitemap.xml`, { signal: AbortSignal.timeout(15000) }).then(r => r.text()).catch(() => '');
  const sitemapMarkets = (sitemapBody.match(/<loc>https:\/\/mirairadar\.com\/market\//g) || []).length;
  if (sitemapMarkets !== listed.length) {
    note('SD-PROD-SITEMAP-DRIFT', 'warn', `本番 sitemap の銘柄 ${sitemapMarkets}件 ≠ DB 掲載 ${listed.length}件。デプロイの停滞か（30分以内の変更なら一過性）`);
  }

  if (prev && typeof prev.totalVotes === 'number') {
    const dv = totalVotes - prev.totalVotes;
    if (dv <= 0) note('SD-VOTE-STALL', 'info', `今週の票の増分 ${dv}票。エンゲージメント停滞（C の配布・告知の効果測定へ）`);
    if (typeof prev.n3Listed === 'number' && n3Listed < prev.n3Listed) {
      note('SD-N3-DROP', 'info', `n>=${MIN_VOTES} の掲載銘柄が ${prev.n3Listed}→${n3Listed}件に減少（決着や入れ替えの自然減か確認）`);
    }
  }

  // ---------------------------------------------------------------------------
  // 状態の永続化（同日再実行は上書き）
  // ---------------------------------------------------------------------------
  const snapshot = {
    date: TODAY,
    totalVotes,
    listed: listed.length,
    listedIds: listed.map(e => String(e.id)),   // Loop 1: 翌週「掲載中に集めた票」を計算する母集団
    n3Listed,
    trackRecords: track.records.length,
    orphanRecords,
    auditPass, auditFail, auditItems,
    findings: findings.map(f => f.id),
    tallies,   // Loop 1 用：翌週との差分で「掲載中に集めた票（vote velocity）」を計算する
  };
  state.weeks = state.weeks.filter(w => w.date !== TODAY);
  state.weeks.push(snapshot);
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 1), 'utf-8');

  // ---------------------------------------------------------------------------
  // 週次ドラフトへ追記
  // ---------------------------------------------------------------------------
  const sev = { critical: '🔴', warn: '🟡', info: '🔵' };
  const criticals = findings.filter(f => f.severity === 'critical').length;
  const warns = findings.filter(f => f.severity === 'warn').length;
  const verdict = criticals > 0 ? `🔴 要対応 ${criticals}件` : warns > 0 ? `🟡 注意 ${warns}件` : '🟢 異常なし';

  const fmt = (v, pv) => pv === null || pv === undefined ? `${v}` : `${pv} → ${v}`;
  const md = [];

  // Loop 1（掲載チューニング）の今週の結果を可視化する。
  // チューナーはワークフロー先頭で走り params に記録済み。描画はここで一元化する
  const paramsPath = path.join(ROOT, 'docs', 'weekly', 'curation_params.json');
  if (fs.existsSync(paramsPath)) {
    try {
      const cp = JSON.parse(fs.readFileSync(paramsPath, 'utf-8'));
      const lt = cp.lastTuning;
      if (lt && lt.date === TODAY) {
        md.push('');
        md.push('## 掲載チューニング（Loop 1）');
        md.push('');
        if (lt.skipped) {
          md.push(`調整見送り：${lt.skipped}`);
        } else if ((lt.changes || []).length === 0) {
          md.push(`増分票 ${lt.totalGained}票。票シェアと枠シェアの乖離が小さく、重みの変更なし。`);
        } else {
          md.push(`増分票 ${lt.totalGained}票。重みの変更 ${lt.changes.length}件：`);
          md.push('');
          for (const c of lt.changes) md.push(`- **${c.cat}**: ${c.from} → ${c.to}（${c.why}）`);
        }
        if (lt.exploration) {
          const x = lt.exploration;
          md.push('');
          md.push(`前週の探索枠：「${x.title}」— 増分${x.gained}票（通常枠の中央値${x.medianOfRegulars}票・**${x.verdict}**）`);
        }
        if (cp.exploration?.id) {
          md.push(`今週の探索枠：\`${cp.exploration.id}\`（${cp.exploration.since} 開始・翌週評価）`);
        }
        md.push('');
        md.push(`現在の重み: ${Object.entries(cp.categoryWeights).map(([k, v]) => `${k}=${v}`).join(' / ')}`);
      }
    } catch {}
  }

  md.push('');
  md.push('## 自己診断（Loop 2）');
  md.push('');
  md.push(`**判定: ${verdict}**（しきい値は環境変数で調整可能）`);
  md.push('');
  md.push('| 指標 | 先週 → 今週 |');
  md.push('|---|---|');
  md.push(`| 掲載銘柄 | ${fmt(listed.length, prev?.listed)} |`);
  md.push(`| 総投票数 | ${fmt(totalVotes, prev?.totalVotes)} |`);
  md.push(`| n>=${MIN_VOTES} の掲載銘柄 | ${fmt(n3Listed, prev?.n3Listed)} |`);
  md.push(`| トラックレコード | ${fmt(track.records.length, prev?.trackRecords)} |`);
  md.push(`| DB に無い採点済み記録（追記型で保持） | ${fmt(orphanRecords, prev?.orphanRecords)} |`);
  md.push(`| 自己検証 | ${auditFail === null ? '未実行' : `${auditPass}/${auditItems} PASS`} |`);
  md.push(`| 同期の最終更新 | ${syncAgeH.toFixed(1)}時間前 |`);
  md.push('');
  if (findings.length === 0) {
    md.push('検知事項なし。');
  } else {
    md.push('### 今週の改善候補（自動起票）');
    md.push('');
    for (const f of findings) md.push(`- ${sev[f.severity]} **[${f.id}]** ${f.message}`);
  }
  md.push('');

  const weeklyPath = path.join(ROOT, 'docs', 'weekly', `${TODAY}.md`);
  if (fs.existsSync(weeklyPath)) {
    // 同日再実行に備え、既存の Loop 1・Loop 2 セクションを置き換える（先に現れた方から切る）
    let body = fs.readFileSync(weeklyPath, 'utf-8');
    const cutPoints = ['\n## 掲載チューニング（Loop 1）', '\n## 自己診断（Loop 2）']
      .map(m => body.indexOf(m)).filter(i => i >= 0);
    if (cutPoints.length > 0) body = body.slice(0, Math.min(...cutPoints));
    fs.writeFileSync(weeklyPath, body + md.join('\n'), 'utf-8');
  } else {
    fs.writeFileSync(weeklyPath, `# 週次定点観測 ${TODAY}\n` + md.join('\n'), 'utf-8');
  }

  console.log(`✅ 自己診断を追記しました: ${path.relative(ROOT, weeklyPath)} ／ 状態: ${path.relative(ROOT, STATE_PATH)}`);
  console.log(`   判定: ${verdict}`);
  for (const f of findings) console.log(`   ${sev[f.severity]} [${f.id}] ${f.message}`);
}

main();
