// N-64: 「日本の読者が判断できない銘柄」を判定する共通ルール
// ------------------------------------------------------------------------------
// 同期（sync_polymarket_cron.mjs）と既存銘柄の絞り込み（select_listed_events.mjs）が
// 同じ基準を使うために切り出した。片方だけ直すとルールが漂流するので、判定はここにだけ書く。
//
// 実測（有効73件）で分かったこと：
//   ・多肢イベント34件のAPI取得はすべて成功している。壊れているのは取得ではなく「翻訳」。
//   ・元が128択の候補者レースを「この1人が選ばれるか？」に平板化していた。
//     読者は残り127人を見られないので、15% と言われても判断のしようがない。
//   ・日常的な個別対戦カード（テニス・欧州サッカーの1試合）が3件混ざっていた。
//
// 価格バケット（BTCの44択など）は弾いてはいけない。
// 「3,000ドルに到達するか」は選択肢が多くても読者が判断できる問いだから。
// 判別は groupItemTitle が数値しきい値か候補者名かで行う（実データ14例で検算済み）。

export const FIELD_TOO_LARGE = 20;   // これ以上の候補数から1つを切り出すと全体像が見えない
export const NUMERIC_BUCKET = /^[<>≤≥↑↓\s$¥￥]*[\d,.]+\s*(?:%|bps?|\([^)]*\))?$/i;
export const DAILY_MATCH = /\bvs\.?\s|\bmatch winner\b|\d{4}-\d{2}-\d{2}/i;
export const SPORTS_HINT = /\b(atp|wta|mlb|nba|nfl|nhl|premier league|la liga|serie a|bundesliga|ligue 1|champions league|open|cup|match|game)\b/i;
export const SPORTS_QUOTA = 3;       // 上位のうちスポーツに割り当てる上限
export const SUBJECT_QUOTA = 2;      // 同じ主体（bitcoin / musk など）から採る上限
// 目標構成：全体20銘柄のうち国内40%（8件）・厳選グローバル60%（12件）。
export const GLOBAL_QUOTA = 12;
export const DOMESTIC_QUOTA = 8;

// イベント名から日付・数値・定型語を落として「主体になりうる単語」を取り出す。
// 主体の一覧は持たない。同じ単語が2回出たら3回目以降を採らない、という数え方にする。
// 実データ12件で検算：BTC が 5件 → 2件 に減り、ETH・マスクは2件のまま残った。
//（STOP は多様性を上げるための語彙であって正しさの判定ではない。
//  漏れても「少し多様性が下がる」だけで、誤った表示にはつながらない）
const MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december';
const STOP = new Set(('the and for will what hit out before any day next who win wins price above below ' +
  'under over end enter reach signed into law flight test with from that this').split(' '));

export function subjectWords(ev) {
  const t = String(ev.title || '')
    .toLowerCase()
    .replace(new RegExp(`\\b(${MONTHS})\\b`, 'g'), ' ')
    .replace(/\d+/g, ' ')
    .replace(/[^a-z\s]/g, ' ');
  return t.split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
}

export function curationReject(ev, market) {
  const fieldSize = (ev.markets || []).length;
  const gi = (market.groupItemTitle || '').trim();
  const evTitle = String(ev.title || '');

  if (DAILY_MATCH.test(evTitle)) return '日常的な個別対戦カード';
  if (fieldSize >= FIELD_TOO_LARGE && !NUMERIC_BUCKET.test(gi)) {
    return `${fieldSize}択レースから1候補を切り出す形（読者に全体像が見えない）`;
  }
  return null;
}

export const isSportsCandidate = (ev, market) =>
  SPORTS_HINT.test(String(ev.title || '') + ' ' + String((market && market.question) || ''));
