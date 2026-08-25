/**
 * Polymarket オッズ解決共通コアエンジン (Single Source of Truth - TypeScript版)
 * 
 * 1. 単一二者択一: 単一サブマーケットのYES価格 (0%〜100%)
 * 2. 多肢 (タイトル一致): タイトルで問われている特定候補のオッズ
 * 3. 多肢 (勝者予測): ダミー/プレースホルダ(A, B, C, Other)を除外した本命候補 (Leader) のオッズ
 * 4. 多肢 (分岐レンジ・特定問なし): 偽の2値オッズを出さず hasWorldOdds: false
 * 5. 決着済み/非アクティブ (closed: true / active: false): hasWorldOdds: false, isClosed: true
 */

export interface ResolvedPolymarketOdds {
  probYes: number | null;
  hasWorldOdds: boolean;
  isClosed: boolean;
  volume24h: number;
  totalVolume: number;
  probChange24h: number;
  clobTokenId?: string;
  isMultiChoice: boolean;
  leaderName: string | null;
  marketQuestion: string | null;
  /** N-50: この確率の主語。outcomes[0] が "Yes" でないとき（例「Lilli Tagger」）に入る。
   *  値が入っていたら、その数字を YES と呼んではいけない。 */
  outcomeSubject: string | null;
}

// 国内銘柄（Polymarket に対応市場がなく、世界オッズを持たない）の判定。
// scripts 側は resolvePolymarketOdds.mjs に一元化済み（HB-2）。TS と mjs の2実行系が
// あるため物理的な単一ソースにはできず、定義の一致は検査エンジン（mjs/ts 整合検査）が守る。
// ここを変えるときは scripts/resolvePolymarketOdds.mjs も同時に変えること。
export const DOMESTIC_FIXED_IDS = new Set([
  'japan-lower-house-dissolution-2026',
  'sam-altman-world-ai-summit-tokyo',
  'boj-rate-hike-september-2026',
]);
export const isDomesticEvent = (id: unknown): boolean => {
  const s = String(id);
  return s.startsWith('council-') || s.startsWith('official-') || s.startsWith('proposal-') || DOMESTIC_FIXED_IDS.has(s);
};

// N-50: outcomes[0] が "Yes" でなければ、その確率は YES のものではない。
const outcomeSubjectOf = (m: any): string | null => {
  if (!m) return null;
  let oc = m.outcomes;
  if (typeof oc === 'string') { try { oc = JSON.parse(oc); } catch { return null; } }
  if (!Array.isArray(oc) || !oc[0]) return null;
  const first = String(oc[0]).trim();
  return /^yes$/i.test(first) ? null : first;
};

export const isDummyCandidate = (label?: string | null): boolean => {
  if (!label) return true;
  const l = label.trim();
  if (/^[A-Z]$/.test(l)) return true;
  if (/^Will\s+[A-Z]\s+win/i.test(l)) return true;
  if (/^Will\s+another\s+team/i.test(l)) return true;
  if (/^Will\s+\[.*\]\s+win/i.test(l)) return true;
  if (/other|another/i.test(l)) return true;
  if (/placeholder/i.test(l)) return true;
  if (/tbd/i.test(l)) return true;
  return false;
};

// 表示用に本命名を整える：前後の空白を落とし、長すぎるものは省略する
// （og:title は実務上の長さ上限があり、43文字の候補名が実在する）
export const LEADER_NAME_MAX = 20;
export const truncateLeader = (name?: string | null): string | null => {
  if (!name) return null;
  const t = String(name).trim();
  if (!t) return null;
  return t.length > LEADER_NAME_MAX ? t.slice(0, LEADER_NAME_MAX - 1) + '…' : t;
};

export function resolvePolymarketOdds(
  ev: any,
  dbTitleJa: string = '',
  dbTitleEn: string = ''
): ResolvedPolymarketOdds | null {
  if (!ev || !ev.markets || ev.markets.length === 0) return null;

  // 決着済み / 終了済み判定 (N-36)
  if (ev.closed === true || ev.active === false) {
    return {
      probYes: null,
      isClosed: true,
      hasWorldOdds: false,
      volume24h: 0,
      totalVolume: 0,
      probChange24h: 0,
      isMultiChoice: ev.markets.length > 1,
      leaderName: null,
      marketQuestion: null,
      outcomeSubject: null,
    };
  }

  const markets = ev.markets;
  const isMultiChoice = markets.length > 1;

  // 1. 単一二者択一マーケット
  if (!isMultiChoice) {
    const targetMarket = markets[0];
    if (targetMarket.closed === true || targetMarket.active === false) {
      return {
        probYes: null,
        isClosed: true,
        hasWorldOdds: false,
        volume24h: 0,
        totalVolume: 0,
        probChange24h: 0,
        isMultiChoice: false,
        leaderName: null,
        marketQuestion: targetMarket.question || targetMarket.groupItemTitle,
        outcomeSubject: null,
      };
    }

    let probYes = 50;
    if (targetMarket.outcomePrices) {
      try {
        const parsed = typeof targetMarket.outcomePrices === 'string' ? JSON.parse(targetMarket.outcomePrices) : targetMarket.outcomePrices;
        if (Array.isArray(parsed) && parsed[0]) {
          probYes = Math.min(100, Math.max(0, Math.round(parseFloat(parsed[0]) * 100)));
        }
      } catch {}
    }

    const volume24h = ev.volume24hr || (targetMarket.volume24hr ? parseFloat(targetMarket.volume24hr) : 0);
    const totalVolume = ev.volume || (targetMarket.volume ? parseFloat(targetMarket.volume) : volume24h * 3.5);
    const probChange24h = targetMarket.oneDayPriceChange ? Math.round(parseFloat(targetMarket.oneDayPriceChange) * 100) : 0;
    
    let clobTokenId: string | undefined = undefined;
    if (targetMarket.clobTokenIds) {
      try {
        const ids = typeof targetMarket.clobTokenIds === 'string' ? JSON.parse(targetMarket.clobTokenIds) : targetMarket.clobTokenIds;
        if (Array.isArray(ids) && ids[0]) clobTokenId = String(ids[0]);
      } catch {}
    }

    return {
      probYes,
      hasWorldOdds: true,
      isClosed: false,
      volume24h: Math.round(volume24h),
      totalVolume: Math.round(totalVolume),
      probChange24h,
      clobTokenId,
      isMultiChoice: false,
      leaderName: null,
      marketQuestion: targetMarket.question || targetMarket.groupItemTitle,
      outcomeSubject: outcomeSubjectOf(targetMarket),
    };
  }

  // 2. 多肢イベント
  const lowerJa = (dbTitleJa || '').toLowerCase();
  const lowerEn = (dbTitleEn || ev.title || '').toLowerCase();

  // ダミー/プレースホルダ（A, B, C, Other等）を除外した有効候補集合 (N-34)
  const validMarkets = markets.filter((m: any) => !isDummyCandidate(m.groupItemTitle || m.question));
  const candidateMarkets = validMarkets.length > 0 ? validMarkets : markets;

  // 2-0. コロン以降に明示された個別選択肢の照合 (N-38: 9件の選択肢型市場の完全解決)
  const colonTarget = (dbTitleEn || '').includes(':') 
    ? (dbTitleEn || '').split(':').pop()!.trim().replace(/[?？]$/, '') 
    : '';
  const isGenericColon = /^(winner|champion|2027 champion|match winner)$/i.test(colonTarget);
  const isGenericBucketQuestion = /到達水準予測|価格水準予測/i.test(dbTitleJa);

  let matchedMarket: any = null;

  if (colonTarget && !isGenericColon && !isGenericBucketQuestion) {
    const colonMatches = candidateMarkets.filter((m: any) => {
      const itemTitle = (m.groupItemTitle || m.question || '').trim().toLowerCase();
      return itemTitle === colonTarget.toLowerCase() || 
             itemTitle.replace(/\s+/g, '') === colonTarget.toLowerCase().replace(/\s+/g, '');
    });
    if (colonMatches.length > 0) {
      matchedMarket = colonMatches.find((m: any) => m.closed !== true && m.active !== false) || colonMatches[0];
    }
  }

  // 2-1. 多肢レンジ・価格帯予測で全体を問う銘柄（例: WTI到達水準予測）は特定2値オッズを出さず【世界観測銘柄】とする (N-34)
  if (!matchedMarket && isGenericBucketQuestion) {
    const volume24h = ev.volume24hr || 0;
    const totalVolume = ev.volume || volume24h * 3.5;
    return {
      probYes: null,
      hasWorldOdds: false,
      isClosed: false,
      volume24h: Math.round(volume24h),
      totalVolume: Math.round(totalVolume),
      probChange24h: 0,
      isMultiChoice: true,
      leaderName: null,
      marketQuestion: null,
      outcomeSubject: null,
    };
  }

  // 2-2. タイトルで特定候補が問われている場合 (候補集合からマッチング)
  if (!matchedMarket) {
    matchedMarket = candidateMarkets.find((m: any) => {
      const itemTitle = (m.groupItemTitle || m.question || '').toLowerCase();
      if (!itemTitle || isDummyCandidate(itemTitle)) return false;
      
      // 英語タイトル完全/部分一致 (短い略称・1文字等での誤マッチ防止のため length >= 4)
      if (itemTitle.length >= 4 && lowerEn.includes(itemTitle)) return true;
      if (itemTitle.length >= 4 && lowerJa.includes(itemTitle)) return true;
      if (/mbapp[eé]/i.test(itemTitle) && /エムバペ|mbapp/i.test(lowerJa)) return true;
      if (/vinicius/i.test(itemTitle) && /ヴィニシウス|vinicius/i.test(lowerJa)) return true;
      if (/kane/i.test(itemTitle) && /ケイン|kane/i.test(lowerJa)) return true;
      if (/bellingham/i.test(itemTitle) && /ベリンガム|bellingham/i.test(lowerJa)) return true;
      if (/rodri/i.test(itemTitle) && /ロドリ|rodri/i.test(lowerJa)) return true;
      if (/sinner/i.test(itemTitle) && /シナー/i.test(lowerJa)) return true;
      if (/alcaraz/i.test(itemTitle) && /アルカラス/i.test(lowerJa)) return true;
      if (/paris\s*saint-germain|psg/i.test(itemTitle) && /パリ・サンジェルマン|psg/i.test(lowerJa)) return true;
      if (/arsenal/i.test(itemTitle) && /アーセナル/i.test(lowerJa)) return true;
      if (/real\s*madrid/i.test(itemTitle) && /レアル・マドリード/i.test(lowerJa)) return true;
      if (/manchester\s*city/i.test(itemTitle) && /マンチェスター・シティ/i.test(lowerJa)) return true;
      if (/50\+?\s*bps\s*decrease/i.test(itemTitle) && /50bp/i.test(lowerJa)) return true;
      if (/25\s*bps\s*decrease/i.test(itemTitle) && /25bp/i.test(lowerJa)) return true;
      if (/100,?000/i.test(itemTitle) && /100,?000|10万/i.test(lowerJa)) return true;
      if (/150,?000/i.test(itemTitle) && /150,?000|15万/i.test(lowerJa)) return true;
      if (/Match Winner/i.test(m.question || '') && /勝敗予測/i.test(lowerJa)) return true;
      return false;
    });
  }

  if (matchedMarket) {
    let probYes = 50;
    if (matchedMarket.outcomePrices) {
      try {
        const parsed = typeof matchedMarket.outcomePrices === 'string' ? JSON.parse(matchedMarket.outcomePrices) : matchedMarket.outcomePrices;
        if (Array.isArray(parsed) && parsed[0]) {
          probYes = Math.min(100, Math.max(0, Math.round(parseFloat(parsed[0]) * 100)));
        }
      } catch {}
    }
    const volume24h = ev.volume24hr || (matchedMarket.volume24hr ? parseFloat(matchedMarket.volume24hr) : 0);
    const totalVolume = ev.volume || (matchedMarket.volume ? parseFloat(matchedMarket.volume) : volume24h * 3.5);
    const probChange24h = matchedMarket.oneDayPriceChange ? Math.round(parseFloat(matchedMarket.oneDayPriceChange) * 100) : 0;
    return {
      probYes,
      hasWorldOdds: true,
      isClosed: false,
      volume24h: Math.round(volume24h),
      totalVolume: Math.round(totalVolume),
      probChange24h,
      isMultiChoice: true,
      leaderName: null,
      marketQuestion: matchedMarket.question || matchedMarket.groupItemTitle,
      outcomeSubject: outcomeSubjectOf(matchedMarket),
    };
  }

  // 2-2. 優勝・受賞・1位等の勝者予測コンテスト (Leader 抽出)
  const isWinnerContest = /優勝|受賞|winner|champion|ballon|international|1st place|first place|mvp/i.test(lowerJa + ' ' + lowerEn);
  
  if (isWinnerContest) {
    let maxProb = -1;
    let topM: any = null;

    candidateMarkets.forEach((m: any) => {
      let p = 0;
      if (m.outcomePrices) {
        try {
          const parsed = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
          if (Array.isArray(parsed) && parsed[0]) p = parseFloat(parsed[0]);
        } catch {}
      }
      if (p > maxProb) {
        maxProb = p;
        topM = m;
      }
    });

    if (topM && maxProb > 0) {
      const probYes = Math.min(100, Math.max(0, Math.round(maxProb * 100)));
      const leaderName = truncateLeader(topM.groupItemTitle || topM.question?.replace(/^Will\s+/i, '').replace(/\s+win.*$/i, '').trim());
      const volume24h = ev.volume24hr || (topM.volume24hr ? parseFloat(topM.volume24hr) : 0);
      const totalVolume = ev.volume || (topM.volume ? parseFloat(topM.volume) : volume24h * 3.5);
      const probChange24h = topM.oneDayPriceChange ? Math.round(parseFloat(topM.oneDayPriceChange) * 100) : 0;

      return {
        probYes,
        hasWorldOdds: true,
        isClosed: false,
        volume24h: Math.round(volume24h),
        totalVolume: Math.round(totalVolume),
        probChange24h,
        isMultiChoice: true,
        leaderName,
        marketQuestion: topM.question || topM.groupItemTitle,
        outcomeSubject: null,
      };
    }
  }

  // 2-3. 多肢レンジ・分岐型で特定質問がない場合 (N-34: 偽の2値オッズを出さない)
  const volume24h = ev.volume24hr || 0;
  const totalVolume = ev.volume || volume24h * 3.5;
  return {
    probYes: null,
    hasWorldOdds: false,
    isClosed: false,
    volume24h: Math.round(volume24h),
    totalVolume: Math.round(totalVolume),
    probChange24h: 0,
    isMultiChoice: true,
    leaderName: null,
    marketQuestion: null,
    outcomeSubject: null,
  };
}
