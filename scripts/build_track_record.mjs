/**
 * 的中トラックレコードの生成（Phase 2 / B）
 *
 * 決着済み銘柄について「決着の24時間前に市場が何%と言い、実際どうだったか」を集める。
 *
 * 【なぜ24時間前か】
 *   決着後の価格は 0% か 100% に張り付く。これは予測ではなく結果なので、
 *   そのまま使うと「市場は100%正しかった」という無意味な記録になる。
 *   決着の24時間前を「最後の予測」とみなす。
 *
 * 【なぜ markets[0] を使わないか】
 *   多肢イベントで markets[0] は任意の1候補にすぎない（N-34）。
 *   対象のサブ市場は matchTitledMarket（題名が名指ししている候補）で決める。
 *   以前は resolvePolymarketOdds を使っていたが、決着済みイベントでは対象を返さず
 *   markets[0] に落ちていた（AR-4：題名と違うサブ市場で採点した記録が公開された）。
 *   題名から対象を決められない多肢イベントは採点しない（本命は決着後の価格で選ぶと勝者になるため使わない）。
 *
 * 【--rescore-closed】
 *   決着済みトークンは prices-history?interval=max が空を返すため、既存の記録は引き継がれるだけで
 *   採点し直されない。このフラグを付けたときだけ、決着時刻までの期間（startTs/endTs）で取り直す。
 *   公開中の記録を書き換えるので、--dry-run で旧→新の差分を確かめてから使う。
 *
 * 【日本世論について】
 *   現時点では決着済み39件のうち n>=3 が 0件のため、日本側は採点できない。
 *   枠だけ作っておき、票が貯まったら自動的に埋まるようにする。
 *
 * 出力: public/data/track_record.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { matchTitledMarket } from './resolvePolymarketOdds.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, 'public', 'data', 'track_record.json');
const DRY_RUN = process.argv.includes('--dry-run');
const RESCORE_CLOSED = process.argv.includes('--rescore-closed');
const DIFF_OUT = (process.argv.find(a => a.startsWith('--diff-out=')) || '').slice('--diff-out='.length) || null;
// prices-history は期間が長すぎると 400（30日は不可、14日は可を実測）。必要なのは決着の24時間前なので14日で足りる
const RESCORE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const LOOKBACK_MS = 24 * 60 * 60 * 1000;   // 「最後の予測」とみなす時点
const MIN_VOTES = 3;                        // 日本世論を予測として扱う下限（サイト全体と同じ基準）

const env = {};
if (fs.existsSync(path.join(ROOT, '.env'))) {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf-8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

const parseJson = (x) => {
  if (x == null) return null;
  if (typeof x !== 'string') return x;
  try { return JSON.parse(x); } catch { return null; }
};

/** 決着結果を読む。outcomePrices が ["1","0"] なら outcome[0] 側が的中。 */
function resolveOutcome(market) {
  const prices = parseJson(market?.outcomePrices);
  const outcomes = parseJson(market?.outcomes);
  if (!Array.isArray(prices) || prices.length < 2) return null;
  const p0 = parseFloat(prices[0]);
  if (Number.isNaN(p0)) return null;
  // 0/1 に張り付いていなければ、まだ決着していない
  if (p0 > 0.02 && p0 < 0.98) return null;
  return {
    happened: p0 >= 0.98,
    subject: Array.isArray(outcomes) && outcomes[0] ? String(outcomes[0]) : null,
  };
}

async function fetchHistory(query) {
  const res = await fetch(`https://clob.polymarket.com/prices-history?${query}`);
  if (!res.ok) return null;
  const hist = (await res.json())?.history;
  return Array.isArray(hist) && hist.length > 0 ? hist : null;
}

/** サブ市場が決着（取引終了）した時刻。closedTime → umaEndDate → endDate の順に使う。 */
function closeTimeOf(market) {
  for (const v of [market?.closedTime, market?.umaEndDate, market?.endDate]) {
    if (!v) continue;
    const t = Date.parse(String(v).replace(' ', 'T').replace(/\+00$/, 'Z'));
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

/** 決着の LOOKBACK_MS 前の価格を「最後の予測」として取り出す。 */
async function lastForecast(clobTokenId, closeMs = null) {
  if (!clobTokenId) return null;
  let hist = await fetchHistory(`market=${clobTokenId}&interval=max&fidelity=180`);
  // AR-4: 決着済みトークンは interval=max が空。明示したときだけ期間指定で取り直す
  if (!hist && RESCORE_CLOSED && closeMs) {
    const endTs = Math.floor(closeMs / 1000);
    const startTs = Math.floor((closeMs - RESCORE_WINDOW_MS) / 1000);
    hist = await fetchHistory(`market=${clobTokenId}&startTs=${startTs}&endTs=${endTs}&fidelity=180`);
  }
  if (!hist) return null;

  const endT = hist[hist.length - 1].t * 1000;
  const cutoff = endT - LOOKBACK_MS;
  // カットオフ以前の最後の点。無ければ系列が短すぎるので中間点で代用する。
  const before = hist.filter(h => h.t * 1000 <= cutoff);
  const point = before.length > 0 ? before[before.length - 1] : hist[Math.floor(hist.length / 2)];
  return {
    prob: Math.round(point.p * 100),
    at: new Date(point.t * 1000).toISOString(),
    usedFallback: before.length === 0,
    points: hist.length,
  };
}

async function main() {
  const { data: closed, error } = await supabase
    .from('events').select('*').eq('is_active', false);
  if (error) { console.error('events 取得エラー:', error.message); process.exit(1); }

  const { data: voteRows } = await supabase.from('japan_vote_logs').select('event_id, choice');
  const votes = {};
  for (const r of voteRows || []) {
    (votes[r.event_id] ||= { yes: 0, total: 0 }).total++;
    if (r.choice === 'YES') votes[r.event_id].yes++;
  }

  console.log(`決着済み ${closed.length}件 を照会します（決着${LOOKBACK_MS / 3600000}時間前の価格を「最後の予測」とする）`);

  const records = [];
  const skipped = { api: 0, unresolved: 0, noHistory: 0, noMarket: 0, noTarget: 0 };

  for (const e of closed) {
    if (!/^\d+$/.test(String(e.id))) { skipped.api++; continue; }
    let ev;
    try {
      const r = await fetch(`https://gamma-api.polymarket.com/events/${e.id}`);
      if (!r.ok) { skipped.api++; continue; }
      ev = await r.json();
    } catch { skipped.api++; continue; }

    // 対象サブ市場：単一市場ならそれ。多肢なら題名が名指ししている候補だけ（AR-4：markets[0] に落とさない）
    const markets = ev.markets || [];
    if (markets.length === 0) { skipped.noMarket++; continue; }
    const market = markets.length === 1 ? markets[0] : matchTitledMarket(ev, e.title_ja, e.title_en).market;
    if (!market) { skipped.noTarget++; continue; }

    const outcome = resolveOutcome(market);
    if (!outcome) { skipped.unresolved++; continue; }

    const tok = parseJson(market.clobTokenIds);
    const forecast = await lastForecast(Array.isArray(tok) ? tok[0] : null, closeTimeOf(market));
    if (!forecast) { skipped.noHistory++; continue; }

    const jp = votes[e.id];
    const jpUsable = jp && jp.total >= MIN_VOTES;

    records.push({
      id: String(e.id),
      slug: e.slug || String(e.id),
      titleJa: e.title_ja || e.title_en || String(e.id),
      category: e.category || null,
      endDate: e.end_date || null,
      subject: (markets.length > 1 ? (market.groupItemTitle || '').trim() : '') || outcome.subject || null,
      marketId: market.id ? String(market.id) : null,
      world: { prob: forecast.prob, at: forecast.at, points: forecast.points, usedFallback: forecast.usedFallback },
      japan: jpUsable ? { prob: Math.round((jp.yes / jp.total) * 100), n: jp.total } : null,
      japanVotes: jp ? jp.total : 0,
      happened: outcome.happened,
      worldCorrect: (forecast.prob >= 50) === outcome.happened,
      japanCorrect: jpUsable ? ((Math.round((jp.yes / jp.total) * 100) >= 50) === outcome.happened) : null,
    });
  }

  records.sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')));

  // 単純な的中率は誤解を招く。母集団によって大きく変わることを、数字自体に持たせる。
  //   ・スポーツの1試合はコイン投げに近く（実測52%）、しかも同期フィルタで除外される銘柄
  //   ・決着24時間前に既に 0%/100% だったものは「予測」ではなく実質的な結果
  const SPORTS_RE = /UFC|勝敗予測|欧州サッカー|対戦カード|MLB|NBA|NFL|テニス|eスポーツ|優勝チーム|優勝クラブ/;
  for (const r of records) {
    r.isSports = SPORTS_RE.test(r.titleJa);
    r.isDegenerate = r.world.prob === 0 || r.world.prob === 100;
  }

  // ----------------------------------------------------------------------------
  // 追記型マージ：一度採点した記録は、DB から銘柄が消えても・再アクティブ化されても消さない。
  // 実際に 2026-08-25、DB の手動整理で決着9件が行ごと削除され、採点済み5件が
  // トラックレコードから静かに消えた（42→37件）。「削除も選別もしない」は
  // 表示の方針ではなくデータ生成の仕組みとして保証する。
  // 全面再採点が必要なとき（採点ロジック自体の修正時）だけ --rebuild で解除する。
  // ----------------------------------------------------------------------------
  // 公開中の記録と比べて、結論が変わる記録を一覧にする（書き換えの前に人が確かめるため）
  if (fs.existsSync(OUT)) {
    try {
      const prevById = new Map((JSON.parse(fs.readFileSync(OUT, 'utf-8')).records || []).map(r => [String(r.id), r]));
      const changes = records.filter(r => prevById.has(r.id)).map(r => {
        const p = prevById.get(r.id);
        return { id: r.id, titleJa: r.titleJa,
          before: { subject: p.subject, prob: p.world?.prob, happened: p.happened, worldCorrect: p.worldCorrect },
          after: { subject: r.subject, prob: r.world.prob, happened: r.happened, worldCorrect: r.worldCorrect } };
      }).filter(c => c.before.happened !== c.after.happened || c.before.worldCorrect !== c.after.worldCorrect
        || c.before.prob !== c.after.prob || (c.before.subject ?? null) !== (c.after.subject ?? null));
      const flipped = changes.filter(c => c.before.happened !== c.after.happened || c.before.worldCorrect !== c.after.worldCorrect);
      console.log(`  🔁 公開中の記録との差   : ${changes.length}件（うち結果か正誤が変わる ${flipped.length}件）`);
      if (DIFF_OUT) fs.writeFileSync(DIFF_OUT, JSON.stringify(changes, null, 1), 'utf-8');
    } catch (e) { console.error('差分の計算に失敗:', e.message); }
  }

  if (fs.existsSync(OUT) && !process.argv.includes('--rebuild')) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf-8'));
      const newIds = new Set(records.map(r => String(r.id)));
      const carried = (prev.records || []).filter(r => !newIds.has(String(r.id)));
      if (carried.length > 0) {
        records.push(...carried);
        console.log(`  ♻️ 過去記録の引き継ぎ   : ${carried.length}件（今回の走査に現れなかった採点済み記録を保持）`);
      }
    } catch {}
  }
  const rate = (arr) => arr.length
    ? { n: arr.length, hits: arr.filter(x => x.worldCorrect).length,
        accuracy: Math.round((arr.filter(x => x.worldCorrect).length / arr.length) * 100) }
    : { n: 0, hits: 0, accuracy: null };
  const breakdown = {
    all: rate(records),
    sports: rate(records.filter(r => r.isSports)),
    nonSports: rate(records.filter(r => !r.isSports)),
    excludingDegenerate: rate(records.filter(r => !r.isDegenerate)),
    nonSportsExcludingDegenerate: rate(records.filter(r => !r.isSports && !r.isDegenerate)),
  };

  const worldScored = records.length;
  const worldHits = records.filter(r => r.worldCorrect).length;
  const japanScored = records.filter(r => r.japan).length;
  const japanHits = records.filter(r => r.japanCorrect === true).length;

  // キャリブレーション：確率帯ごとに「そう言った回数」と「実際に起きた回数」
  const bands = [[0, 20], [20, 40], [40, 60], [60, 80], [80, 101]];
  const calibration = bands.map(([lo, hi]) => {
    const inBand = records.filter(r => r.world.prob >= lo && r.world.prob < hi);
    return {
      band: `${lo}-${hi === 101 ? 100 : hi - 1}%`,
      n: inBand.length,
      happenedRate: inBand.length ? Math.round((inBand.filter(r => r.happened).length / inBand.length) * 100) : null,
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    method: {
      forecastPoint: `決着の${LOOKBACK_MS / 3600000}時間前の市場価格`,
      minVotesForJapan: MIN_VOTES,
      note: '多肢イベントは題名が名指ししているサブ市場で採点する（markets[0] も本命も使わない。特定できないものは採点しない）',
    },
    summary: {
      worldScored, worldHits,
      worldAccuracy: worldScored ? Math.round((worldHits / worldScored) * 100) : null,
      japanScored, japanHits,
      japanAccuracy: japanScored ? Math.round((japanHits / japanScored) * 100) : null,
      skipped,
    },
    breakdown,
    calibration,
    records,
  };

  console.log('');
  console.log(`  採点できた       : ${worldScored}件`);
  console.log(`  世界の的中       : ${worldHits}件 (${payload.summary.worldAccuracy ?? '-'}%)`);
  console.log(`  日本の採点対象   : ${japanScored}件${japanScored ? ` / 的中 ${japanHits}件` : `（${MIN_VOTES}票以上の決着銘柄がまだ無い）`}`);
  console.log(`  除外             : API不可 ${skipped.api} / 未決着 ${skipped.unresolved} / 履歴なし ${skipped.noHistory} / 市場なし ${skipped.noMarket} / 対象を特定できない ${skipped.noTarget}`);
  console.log('');
  console.log('  母集団による的中率の違い');
  console.log(`    全体                     ${breakdown.all.hits}/${breakdown.all.n} (${breakdown.all.accuracy}%)`);
  console.log(`    スポーツの1試合            ${breakdown.sports.hits}/${breakdown.sports.n} (${breakdown.sports.accuracy ?? '-'}%)  ← 同期フィルタで除外される銘柄`);
  console.log(`    それ以外                  ${breakdown.nonSports.hits}/${breakdown.nonSports.n} (${breakdown.nonSports.accuracy ?? '-'}%)`);
  console.log(`    24h前に0/100%だった分を除外 ${breakdown.excludingDegenerate.hits}/${breakdown.excludingDegenerate.n} (${breakdown.excludingDegenerate.accuracy ?? '-'}%)`);
  console.log(`    両方を除外                ${breakdown.nonSportsExcludingDegenerate.hits}/${breakdown.nonSportsExcludingDegenerate.n} (${breakdown.nonSportsExcludingDegenerate.accuracy ?? '-'}%)`);
  console.log('');
  console.log('  キャリブレーション（市場がそう言った帯 → 実際に起きた率）');
  for (const c of calibration) {
    console.log(`    ${c.band.padStart(7)}  n=${String(c.n).padStart(2)}  実際 ${c.happenedRate === null ? '—' : c.happenedRate + '%'}`);
  }

  if (DRY_RUN) {
    console.log('\n🧪 [dry-run] ファイル書き込みを省略しました');
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 1), 'utf-8');
    console.log(`\n✅ ${path.relative(ROOT, OUT)} に ${records.length}件を保存しました`);
  }
}

main().catch(err => { console.error('Track record build error:', err); process.exit(1); });
