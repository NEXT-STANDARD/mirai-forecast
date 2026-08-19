export type CategoryType = 'all' | 'trending' | 'economy' | 'politics' | 'tech' | 'sports' | 'entertainment';

export interface MarketItem {
  id: string;
  slug: string;
  title: string;
  titleJa: string;
  question: string;
  questionJa: string;
  category: CategoryType;
  categoryLabel: string;
  iconUrl: string;
  worldProbYes: number; // 0 to 100
  worldProbNo: number;
  probChange24h: number; // e.g. +12.5 or -5.2
  volume24hUsd: number;
  totalVolumeUsd: number;
  endDate: string;
  isTrending?: boolean; // 🔥 人気急上昇フラグ
  isElectionBlackout?: boolean; // 🏛️ 公選法第138条の3遵守（選挙公示・投票期間中の安全ロック）
  resolvedChoice?: 'YES' | 'NO' | null; // 🏁 結果確定（的中判定用）
  clobTokenId?: string; // 📈 Polymarket CLOB prices-history 用のアセットID
  
  // 日本人ユーザーの投票集計（完全無料・意識調査）
  japanVotes: {
    yes: number;
    no: number;
    total: number;
    percentYes: number;
  };
  
  // AI要因分析
  aiInsight?: {
    summaryJa: string;
    whyMovedJa: string;
    keyCatalysts: string[];
    urgencyLevel: 'high' | 'medium' | 'low';
    lastUpdated: string;
  };

  // コメント
  comments?: Array<{
    id: string;
    author: string;
    avatar: string;
    vote: 'YES' | 'NO';
    text: string;
    createdAt: string;
    likes: number;
  }>;
}

export interface StreakData {
  currentStreak: number;
  lastVoteDate: string; // YYYY-MM-DD
  maxStreak: number;
  totalVotedDays: number;
}
