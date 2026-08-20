/**
 * 未来レーダー (MiraiRadar) - サイバー予報士ランク制度（Lv.1〜Lv.10）
 * 投票数・ストリーク実績に応じた称号・レベル・EXP計算エンジン
 */

export interface RankInfo {
  level: number;
  title: string;
  titleEn: string;
  minVotes: number;
  maxVotes: number;
  color: string;
  bgGradient: string;
  borderColor: string;
  icon: string;
  description: string;
  isMaxLevel: boolean;
  currentExp: number;
  nextLevelExp: number;
  progressPercent: number;
}

export const RANK_TIERS = [
  {
    level: 1,
    title: '見習い観測員',
    titleEn: 'Novice Observer',
    minVotes: 0,
    maxVotes: 1,
    color: '#94a3b8',
    bgGradient: 'linear-gradient(135deg, #1e293b, #0f172a)',
    borderColor: '#475569',
    icon: '🔭',
    description: '未来レーダーにアクセスし、世界の集合知観測を始めた新人観測員。',
  },
  {
    level: 2,
    title: '世論スキャナー',
    titleEn: 'Sentiment Scanner',
    minVotes: 2,
    maxVotes: 4,
    color: '#34d399',
    bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), #064e3b)',
    borderColor: '#10b981',
    icon: '📡',
    description: '日本世論と世界オッズの初期データを読み解き始めたアクティブ観測者。',
  },
  {
    level: 3,
    title: 'クォンツ解析士',
    titleEn: 'Quant Analyst',
    minVotes: 5,
    maxVotes: 9,
    color: '#38bdf8',
    bgGradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), #0c4a6e)',
    borderColor: '#38bdf8',
    icon: '📊',
    description: 'Polymarketのリアルマネー確率と世論スプレッドの本質を理解した解析官。',
  },
  {
    level: 4,
    title: 'トレンド探求者',
    titleEn: 'Trend Seeker',
    minVotes: 10,
    maxVotes: 14,
    color: '#c084fc',
    bgGradient: 'linear-gradient(135deg, rgba(192, 132, 252, 0.2), #581c87)',
    borderColor: '#a855f7',
    icon: '⚡',
    description: '世界とお茶の間の温度差にいち早く気づき、乖離銘柄を捉える探求者。',
  },
  {
    level: 5,
    title: '凄腕オラクル',
    titleEn: 'Elite Oracle',
    minVotes: 15,
    maxVotes: 19,
    color: '#fbbf24',
    bgGradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25), #78350f)',
    borderColor: '#f59e0b',
    icon: '🔮',
    description: '数々の未来分岐において鋭い直感を的中させ、一目置かれる熟練予報士。',
  },
  {
    level: 6,
    title: 'マーケット預言者',
    titleEn: 'Market Prophet',
    minVotes: 20,
    maxVotes: 29,
    color: '#fb7185',
    bgGradient: 'linear-gradient(135deg, rgba(251, 113, 133, 0.25), #881337)',
    borderColor: '#f43f5e',
    icon: '🔥',
    description: '海外スマートマネーの過熱を冷静に見極め、逆張りと順張りを自在に操る預言者。',
  },
  {
    level: 7,
    title: '深層シンジケート',
    titleEn: 'Deep Syndicate',
    minVotes: 30,
    maxVotes: 49,
    color: '#e879f9',
    bgGradient: 'linear-gradient(135deg, rgba(232, 121, 249, 0.25), #701a75)',
    borderColor: '#d946ef',
    icon: '🌐',
    description: '膨大なオルタナティブデータと生活者感覚を融合させ、未来を掌握する中枢。',
  },
  {
    level: 8,
    title: '特異点サイファー',
    titleEn: 'Singularity Cypher',
    minVotes: 50,
    maxVotes: 74,
    color: '#a3e635',
    bgGradient: 'linear-gradient(135deg, rgba(163, 230, 53, 0.25), #365314)',
    borderColor: '#84cc16',
    icon: '🧬',
    description: 'AIの進化や社会情勢のシンギュラリティ（特異点）を先回りして解読する存在。',
  },
  {
    level: 9,
    title: '時間軸支配者',
    titleEn: 'Chrono Master',
    minVotes: 75,
    maxVotes: 99,
    color: '#22d3ee',
    bgGradient: 'linear-gradient(135deg, rgba(34, 211, 238, 0.3), #164e63)',
    borderColor: '#06b6d4',
    icon: '⏳',
    description: 'あらゆる時間軸の確率推移を俯瞰し、時代の潮流を完全にコントロールする覇者。',
  },
  {
    level: 10,
    title: '伝説の予報神',
    titleEn: 'Legendary Prognosticator',
    minVotes: 100,
    maxVotes: Infinity,
    color: '#ffd700',
    bgGradient: 'linear-gradient(135deg, rgba(255, 215, 0, 0.35), #713f12)',
    borderColor: '#ffd700',
    icon: '👑',
    description: '100回以上の予報を達成し、未来レーダーの頂点に君臨する伝説の未来予報神。',
  },
];

export function calculateUserRank(voteCount: number): RankInfo {
  const tier = RANK_TIERS.find(
    (t) => voteCount >= t.minVotes && (voteCount <= t.maxVotes || t.maxVotes === Infinity)
  ) || RANK_TIERS[0];

  const isMaxLevel = tier.level === 10;
  const currentExp = voteCount - tier.minVotes;
  const nextLevelExp = isMaxLevel ? 1 : tier.maxVotes - tier.minVotes + 1;
  const progressPercent = isMaxLevel 
    ? 100 
    : Math.min(100, Math.round((currentExp / nextLevelExp) * 100));

  return {
    ...tier,
    isMaxLevel,
    currentExp,
    nextLevelExp,
    progressPercent,
  };
}
