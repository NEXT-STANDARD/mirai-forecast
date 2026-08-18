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
