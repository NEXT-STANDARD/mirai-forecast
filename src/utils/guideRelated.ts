import type { MarketItem } from '../types';

/**
 * ガイド記事の関連銘柄を選ぶ（AR-26）。scripts/guideRelated.mjs と同じ規則の写し。
 * 優先の銘柄のうち掲載中のもの → 掲載中の銘柄を締切の遠い順に補う、で最大 count 件。
 */
export function pickGuideRelated(preferred: string[], events: MarketItem[], count = 3): MarketItem[] {
  const listed = events.filter(e => e.isListed !== false);
  const find = (s: string) => listed.find(e => e.slug === s || e.id === s);
  const chosen: MarketItem[] = [];
  for (const s of preferred) {
    const e = find(s);
    if (e && !chosen.includes(e)) chosen.push(e);
  }
  const endMs = (e: MarketItem) => {
    const t = Date.parse(e.endDate || '');
    return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
  };
  const fill = listed
    .filter(e => !chosen.includes(e))
    .sort((a, b) => endMs(b) - endMs(a) || (a.slug || a.id).localeCompare(b.slug || b.id));
  for (const e of fill) {
    if (chosen.length >= count) break;
    chosen.push(e);
  }
  return chosen.slice(0, count);
}
