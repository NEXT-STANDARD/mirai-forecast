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

type SortOption = 'volume' | 'gap' | 'trending';

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
            <h2 className="section-main-title">すべての観測銘柄</h2>
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
          const hasGap = event.japanVotes.total >= 3 && gap >= 10;
          const isUp = event.probChange24h >= 0;

          // AI 次回カタリスト
          const catalyst = event.aiInsight?.keyCatalysts?.[0];

          return (
            <a 
              key={event.id}
              href={`/market/${encodeURIComponent(event.slug || event.id)}`}
              className={`market-card-item ${hasVoted ? 'voted-card' : ''} no-underline`}
              onClick={(e) => {
                // If user clicks on button inside or default link
                if ((e.target as HTMLElement).closest('button')) {
                  return;
                }
                e.preventDefault();
                if (onOpenDetail) onOpenDetail(event);
                else onSelectEvent(event);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onOpenDetail) onOpenDetail(event);
                  else onSelectEvent(event);
                }
              }}
              tabIndex={0}
              aria-label={`${event.titleJa || event.title}の詳細を見る`}
            >
              {/* カードヘッダー：カテゴリ ＆ 変動率 */}
              <div className="card-top-row">
                <div className="flex items-center gap-1.5 min-w-0">
                  {event.iconUrl ? (
                    <img 
                      src={event.iconUrl} 
                      alt="" 
                      loading="lazy"
                      className="w-4 h-4 rounded-full object-cover flex-shrink-0 bg-slate-800 border border-slate-700/60"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className="card-category-tag">{event.categoryLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasGap && (
                    <span className="card-gap-badge" title={`世界とお茶の間の見解に大きな乖離があります（サンプル数: ${event.japanVotes.total}票）`}>
                      <Zap size={10} />
                      <span>{gap}% 乖離 (n={event.japanVotes.total})</span>
                    </span>
                  )}
                  <span className={`card-delta-tag ${isUp ? 'pos' : 'neg'}`}>
                    {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    <span>{isUp ? '+' : ''}{event.probChange24h}%</span>
                  </span>
                </div>
              </div>

              {/* カードメインタイトル */}
              <h3 className="card-market-title" title={event.titleJa || event.title}>
                {event.titleJa || event.title}
              </h3>

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

              {/* 🎯 1タップ即時投票ボタングループ または 🏛️ 公選法ブラックアウト または 🏁 締切終了 */}
              {event.isExpired || (event.endDate && new Date(event.endDate).getTime() < Date.now()) ? (
                <div className="card-blackout-badge opacity-80" onClick={(e) => e.stopPropagation()}>
                  <span className="text-slate-400 font-mono">🏁 投票受付終了（結果確定）</span>
                </div>
              ) : event.isElectionBlackout ? (
                <div className="card-blackout-badge" onClick={(e) => e.stopPropagation()}>
                  <span>🏛️ 公選法第138条の3 遵守（選挙期間中受付休止）</span>
                </div>
              ) : (
                <div className="card-quick-vote-row" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onVote(event.id, 'YES')}
                    disabled={hasVoted}
                    className={`btn-card-vote btn-vote-yes ${userVote === 'YES' ? 'selected' : ''}`}
                  >
                    <span className="vote-label">YES</span>
                    {userVote === 'YES' && <CheckCircle2 size={13} className="text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => onVote(event.id, 'NO')}
                    disabled={hasVoted}
                    className={`btn-card-vote btn-vote-no ${userVote === 'NO' ? 'selected' : ''}`}
                  >
                    <span className="vote-label">NO</span>
                    {userVote === 'NO' && <CheckCircle2 size={13} className="text-rose-400" />}
                  </button>
                </div>
              )}

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
                        if (!raw) return '随時';
                        const clean = raw.split('T')[0];
                        const parts = clean.split('-');
                        if (parts.length === 3) {
                          const [y, m, d] = parts;
                          const currentYear = String(new Date().getFullYear());
                          if (y !== currentYear) {
                            return `${y}/${m}/${d}`;
                          }
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
            </a>
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
