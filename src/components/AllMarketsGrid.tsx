import React, { useState, useMemo } from 'react';
import type { MarketItem, CategoryType } from '../types';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Search, 
  SlidersHorizontal, 
  Zap, 
  Globe2, 
  Calendar,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface AllMarketsGridProps {
  events: MarketItem[];
  userVotes: Record<string, 'YES' | 'NO'>;
  selectedCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  onVote: (eventId: string, choice: 'YES' | 'NO') => void;
  onSelectEvent: (event: MarketItem) => void;
  onOpenDetail?: (event: MarketItem) => void;
}

type SortOption = 'volume' | 'gap' | 'trending' | 'newest';

// ⭐️ ヘッダーと100%完全一致するカテゴリー定義
const UNIFIED_CATEGORIES: { id: CategoryType; label: string }[] = [
  { id: 'all', label: '☀️ 全銘柄' },
  { id: 'trending', label: '🔥 人気急上昇' },
  { id: 'economy', label: '📊 経済・金利・暗号資産' },
  { id: 'tech', label: '⚡ AI・テック' },
  { id: 'politics', label: '🌐 国際・社会' },
  { id: 'sports', label: '⚾ スポーツ' },
  { id: 'entertainment', label: '🎬 エンタメ' },
];

// 話題のホットキーワード（クイック検索タグ）
const HOT_KEYWORDS = [
  { label: '大谷翔平', keyword: '大谷' },
  { label: '日銀利上げ', keyword: '日銀' },
  { label: 'Switch 2', keyword: 'switch' },
  { label: 'GPT-5', keyword: 'gpt' },
  { label: 'ビットコイン', keyword: 'ビットコイン' },
  { label: 'Apple AI', keyword: 'apple' },
  { label: '米大統領選', keyword: '大統領' },
];

export const AllMarketsGrid: React.FC<AllMarketsGridProps> = ({
  events,
  userVotes,
  selectedCategory,
  onSelectCategory,
  onVote,
  onSelectEvent,
  onOpenDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('volume');

  // ⭐️ フィルタリング ＆ ソート
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // 1. ヘッダー同期カテゴリーによる絞り込み
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'trending') {
        result = result.filter(m => m.isTrending || m.volume24hUsd > 80000 || Math.abs(m.probChange24h) >= 6);
      } else {
        result = result.filter(m => m.category === selectedCategory);
      }
    }

    // 2. 検索キーワードによる絞り込み
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(ev => 
        ev.titleJa.toLowerCase().includes(query) ||
        ev.questionJa.toLowerCase().includes(query) ||
        ev.categoryLabel.toLowerCase().includes(query) ||
        (ev.slug || '').toLowerCase().includes(query)
      );
    }

    // 3. ソート処理
    result.sort((a, b) => {
      if (sortBy === 'volume') {
        return (b.volume24hUsd || 0) - (a.volume24hUsd || 0);
      }
      if (sortBy === 'gap') {
        const gapA = a.japanVotes.total > 0 ? Math.abs(a.worldProbYes - a.japanVotes.percentYes) : 0;
        const gapB = b.japanVotes.total > 0 ? Math.abs(b.worldProbYes - b.japanVotes.percentYes) : 0;
        return gapB - gapA;
      }
      if (sortBy === 'trending') {
        return Math.abs(b.probChange24h || 0) - Math.abs(a.probChange24h || 0);
      }
      return 0;
    });

    return result;
  }, [events, selectedCategory, searchQuery, sortBy]);

  return (
    <section className="all-markets-section">
      {/* セクションヘッダー */}
      <div className="markets-section-header">
        <div className="section-title-group">
          <div className="flex items-center gap-2">
            <h3 className="section-main-title">すべての観測銘柄</h3>
            <span className="markets-count-badge font-mono">{filteredEvents.length}件</span>
          </div>
          <p className="section-subtitle">
            世界のスマートマネー確率（Polymarket）と日本の世論を比較し、未来を1秒で予報
          </p>
        </div>

        {/* 検索バー ＆ ソートセレクター */}
        <div className="section-controls-group">
          <div className="market-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="観測銘柄・テーマを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="market-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="search-clear-btn">
                ×
              </button>
            )}
          </div>

          <div className="sort-selector-box">
            <SlidersHorizontal size={13} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="sort-select"
            >
              <option value="volume">取引高順 (Volume)</option>
              <option value="gap">⚡ 世論ギャップ大</option>
              <option value="trending">🔥 24h急変動順</option>
            </select>
          </div>
        </div>
      </div>

      {/* ⭐️ ヘッダー完全同期・カテゴリーピルタグ */}
      <div className="topic-pills-scroll-container">
        <div className="topic-pills-bar">
          {UNIFIED_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`topic-pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 話題のホットキーワード（クイック絞り込み） */}
      <div className="hot-keywords-row">
        <span className="hot-keywords-label">注目の話題:</span>
        <div className="hot-keywords-list">
          {HOT_KEYWORDS.map((hk) => {
            const isSelected = searchQuery === hk.keyword;
            return (
              <button
                key={hk.keyword}
                onClick={() => setSearchQuery(isSelected ? '' : hk.keyword)}
                className={`hot-keyword-chip ${isSelected ? 'active' : ''}`}
              >
                #{hk.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 自動フィット・マーケットカードグリッド */}
      <div className="markets-cards-grid">
        {filteredEvents.map((event) => {
          const userVote = userVotes[event.id] || userVotes[event.slug];
          const hasVoted = Boolean(userVote);
          const worldYes = event.worldProbYes;
          const japanYes = event.japanVotes.percentYes;
          const gap = Math.abs(worldYes - japanYes);
          const hasGap = event.japanVotes.total > 0 && gap >= 10;
          const isUp = event.probChange24h >= 0;

          // AI 次回カタリスト
          const catalyst = event.aiInsight?.keyCatalysts?.[0];

          return (
            <div 
              key={event.id}
              className={`market-card-item ${hasVoted ? 'voted-card' : ''}`}
              onClick={() => onSelectEvent(event)}
            >
              {/* カードヘッダー：カテゴリ ＆ 変動率 */}
              <div className="card-top-row">
                <span className="card-category-tag">{event.categoryLabel}</span>
                <div className="flex items-center gap-1.5">
                  {hasGap && (
                    <span className="card-gap-badge" title="世界とお茶の間の見解に大きな乖離があります">
                      <Zap size={10} />
                      <span>{gap}% 乖離</span>
                    </span>
                  )}
                  <span className={`card-delta-tag ${isUp ? 'pos' : 'neg'}`}>
                    {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    <span>{isUp ? '+' : ''}{event.probChange24h}%</span>
                  </span>
                </div>
              </div>

              {/* カードメインタイトル */}
              <h4 className="card-market-title" title={event.titleJa}>
                {event.titleJa}
              </h4>

              {/* ⭐️ デュアル世論スプレッド（世界マネー vs 日本世論） */}
              <div className="card-spread-container">
                <div className="spread-row world-row">
                  <div className="spread-label">
                    <Globe2 size={12} className="text-cyan-400" />
                    <span>世界マネー</span>
                  </div>
                  <div className="spread-bar-wrap">
                    <div className="spread-bar-fill world-fill" style={{ width: `${worldYes}%` }}></div>
                  </div>
                  <span className="spread-val font-mono text-cyan-400 font-bold">{worldYes}%</span>
                </div>

                <div className="spread-row japan-row">
                  <div className="spread-label">
                    <span className="text-xs">🇯🇵</span>
                    <span>日本世論</span>
                  </div>
                  {hasVoted ? (
                    <>
                      <div className="spread-bar-wrap">
                        <div className="spread-bar-fill japan-fill" style={{ width: `${japanYes}%` }}></div>
                      </div>
                      <span className="spread-val font-mono text-emerald-400 font-bold">{japanYes}%</span>
                    </>
                  ) : (
                    <div className="spread-locked-hint">
                      <Lock size={10} />
                      <span>投票で解禁</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 🎯 1タップ即時投票ボタングループ */}
              <div className="card-quick-vote-row" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onVote(event.id, 'YES')}
                  className={`btn-card-vote btn-vote-yes ${userVote === 'YES' ? 'selected' : ''}`}
                >
                  <span className="vote-label">YES (そう思う)</span>
                  {userVote === 'YES' && <CheckCircle2 size={12} className="text-emerald-400" />}
                </button>

                <button
                  onClick={() => onVote(event.id, 'NO')}
                  className={`btn-card-vote btn-vote-no ${userVote === 'NO' ? 'selected' : ''}`}
                >
                  <span className="vote-label">NO (起きない)</span>
                  {userVote === 'NO' && <CheckCircle2 size={12} className="text-rose-400" />}
                </button>
              </div>

              {/* 🪄 Gemini 次回注目カタリスト予報 */}
              {catalyst && (
                <div className="card-catalyst-snippet">
                  <Sparkles size={11} className="text-amber-400 flex-shrink-0" />
                  <span className="catalyst-text-ellipsis">次回: {catalyst}</span>
                </div>
              )}

              {/* カードフッター */}
              <div className="card-footer-row">
                <div className="card-footer-metrics font-mono">
                  <span>${Math.round((event.volume24hUsd || 0) / 1000)}k Vol.</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    <span>
                      {(() => {
                        const raw = event.endDate || '';
                        if (raw.includes('T')) {
                          const datePart = raw.split('T')[0];
                          const [, m, d] = datePart.split('-');
                          return `${m}/${d}`;
                        }
                        return raw.replace('2026年', '').replace('2026-', '');
                      })()}
                    </span>
                  </span>
                </div>

                {onOpenDetail && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail(event);
                    }}
                    className="btn-card-detail-link"
                    title="個別深層分析ページへ"
                  >
                    <span>詳細</span>
                    <ExternalLink size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="empty-markets-card">
          <p className="text-sm text-slate-400">該当する観測銘柄が見つかりませんでした。</p>
          <button onClick={() => { onSelectCategory('all'); setSearchQuery(''); }} className="btn-reset-filters">
            すべての観測銘柄を表示
          </button>
        </div>
      )}
    </section>
  );
};
