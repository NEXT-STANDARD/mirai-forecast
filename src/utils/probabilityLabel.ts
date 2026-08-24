/**
 * N-50: 「この確率は何の確率か」を1か所で決める。
 *
 * Polymarket のサブ市場は outcomes[0] が必ずしも "Yes" ではない。
 * 例：テニスの勝敗市場は outcomes が ["Lilli Tagger", "Yulia Starodubtseva"] で、
 * 0% は「Tagger が勝つ確率」を意味する。これを「YES 0%」と表示すると、
 * 読者は何が 0% なのか分からないまま「ありえない」とだけ受け取る。
 *
 * 多肢イベントの本命（leaderName）も同じで、YES/NO の二値ではない。
 *
 * 表示側でこの分岐を書き散らすと、直し漏れた箇所だけが古い枠組みで残る。
 * 実際 og:title を直したあとも OGP画像とアプリ本体は「YES」のままだった。
 */
import type { MarketItem } from '../types';

export type ProbFraming =
  | { kind: 'yes'; subject: null }
  | { kind: 'leader'; subject: string }
  | { kind: 'subject'; subject: string };

type FramingInput = Pick<MarketItem, 'leaderName' | 'isMultiChoice' | 'outcomeSubject'>;

export const framingOf = (item: FramingInput): ProbFraming => {
  if (item.isMultiChoice && item.leaderName) {
    return { kind: 'leader', subject: item.leaderName };
  }
  if (item.outcomeSubject) {
    return { kind: 'subject', subject: item.outcomeSubject };
  }
  return { kind: 'yes', subject: null };
};

/** 肯定側のラベル。「YES」「本命」「Lilli Tagger」のいずれか。 */
export const positiveLabel = (item: FramingInput): string => {
  const f = framingOf(item);
  return f.kind === 'yes' ? 'YES' : f.kind === 'leader' ? '本命' : f.subject;
};

/**
 * 否定側のラベル。二値でない場合は「NO」と呼べないので別語を返す。
 * 数値そのものは 100 - x で正しい（残り全部の確率）が、名前が違う。
 */
export const negativeLabel = (item: FramingInput): string => {
  const f = framingOf(item);
  return f.kind === 'yes' ? 'NO' : f.kind === 'leader' ? '本命以外' : `${f.subject}以外`;
};

/** 「誰の確率か」を一言で添える。yes のときは何も添えない。 */
export const subjectNote = (item: FramingInput): string | null => {
  const f = framingOf(item);
  if (f.kind === 'yes') return null;
  return f.kind === 'leader'
    ? `この確率は本命 ${f.subject} のものです（YES/NOではありません）`
    : `この確率は「${f.subject}」のものです（YES/NOではありません）`;
};

/**
 * 論拠セクションの見出し用。数値の隣に置く短いラベル（positiveLabel）とは用途が違う。
 * 「本命論拠」のように語が潰れるのを避け、主語そのものを名乗らせる。
 */
export const positiveSideName = (item: FramingInput): string => {
  const f = framingOf(item);
  return f.kind === 'yes' ? 'YES' : f.subject;
};

export const negativeSideName = (item: FramingInput): string => {
  const f = framingOf(item);
  return f.kind === 'yes' ? 'NO' : 'それ以外';
};
