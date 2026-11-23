/**
 * ガイド記事の「関連銘柄」を選ぶ（AR-26）
 *
 * 記事ソースの relatedMarketSlugs は「優先して載せたい銘柄」であって、固定の一覧ではない。
 * 以前は固定の一覧で、1件でも決着・非公開になるとプリレンダーがビルドを止めた
 * （N-52・9月の FOMC で本番が約1か月凍結。差し替え先も 2027-01-01 に期限が来る）。
 *
 * 選び方：
 *   1. 優先の銘柄のうち、有効かつ掲載中（is_listed）のもの
 *   2. 足りなければ、掲載中の有効銘柄を締切の遠い順に補う（締切なしは最後）
 *   3. 最大 GUIDE_RELATED_COUNT 件。0件のときだけ呼び出し側が止める
 *
 * 画面側（src/utils/guideRelated.ts）に同じ規則の写しがある。片方だけ変えないこと。
 */
export const GUIDE_RELATED_COUNT = 3;

const keyOf = (e) => String(e.slug || e.id);
const endMs = (e) => {
  const t = Date.parse(e.end_date || '');
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
};

/**
 * @param {string[]} preferred 記事ソースの relatedMarketSlugs
 * @param {Array<{id: string, slug?: string, is_listed?: boolean, end_date?: string|null}>} activeEvents 有効銘柄
 * @returns {{ slugs: string[], dropped: string[] }} 使う slug と、使えなかった優先 slug
 */
export function pickGuideRelated(preferred, activeEvents, count = GUIDE_RELATED_COUNT) {
  const listed = activeEvents.filter(e => e.is_listed !== false);
  const byKey = new Map();
  for (const e of listed) {
    byKey.set(keyOf(e), e);
    byKey.set(String(e.id), e);
  }
  const chosen = [];
  const dropped = [];
  for (const s of preferred) {
    const e = byKey.get(String(s));
    if (e && !chosen.includes(keyOf(e))) chosen.push(keyOf(e));
    else if (!e) dropped.push(String(s));
  }
  const fill = listed
    .filter(e => !chosen.includes(keyOf(e)))
    .sort((a, b) => endMs(b) - endMs(a) || keyOf(a).localeCompare(keyOf(b)));
  for (const e of fill) {
    if (chosen.length >= count) break;
    chosen.push(keyOf(e));
  }
  return { slugs: chosen.slice(0, count), dropped };
}
