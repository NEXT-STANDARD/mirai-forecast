import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { 
  Flame, 
  Sparkles, 
  Zap, 
  Globe2, 
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import heroesManifest from '../../public/images/heroes/_manifest.json';
import { positiveLabel, negativeLabel } from '../utils/probabilityLabel';

interface FeaturedHeroSectionProps {
  events: MarketItem[];
  userVotes: Record<string, 'YES' | 'NO'>;
  onSelectEvent: (event: MarketItem) => void;
}

export const FeaturedHeroSection: React.FC<FeaturedHeroSectionProps> = ({
  events,
  userVotes,
  onSelectEvent,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. 画像が生成されている銘柄を抽出
  const featuredEvents = React.useMemo(() => {
    const manifestKeys = Object.keys(heroesManifest || {});
    if (manifestKeys.length === 0) return [];

    const matched = events.filter(ev => {
      const slug = ev.slug || ev.id;
      return manifestKeys.includes(slug) || manifestKeys.includes(ev.id);
    });

    // スプレッド乖離（Gap）が大きい順（同率なら投票数順）にソート
    matched.sort((a, b) => {
      const gapA = a.japanVotes.total >= 3 && a.hasWorldOdds ? Math.abs(a.worldProbYes - a.japanVotes.percentYes) : 0;
      const gapB = b.japanVotes.total >= 3 && b.hasWorldOdds ? Math.abs(b.worldProbYes - b.japanVotes.percentYes) : 0;
      if (gapB !== gapA) return gapB - gapA;
      return b.japanVotes.total - a.japanVotes.total;
    });

    return matched;
  }, [events]);

  if (featuredEvents.length === 0) return null;

  const currentEvent = featuredEvents[currentIndex] || featuredEvents[0];
  const userVote = userVotes[currentEvent.id] || userVotes[currentEvent.slug];
  const worldYes = currentEvent.worldProbYes;
  const japanYes = currentEvent.japanVotes.percentYes;
  const hasConsensus = currentEvent.japanVotes.total >= 3;
  const gap = hasConsensus && currentEvent.hasWorldOdds ? Math.abs(worldYes - japanYes) : 0;
  const slug = currentEvent.slug || currentEvent.id;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? featuredEvents.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === featuredEvents.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="featured-hero-section" aria-label="注目のオラクル">
      <div className="featured-section-header">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-amber-400 animate-pulse" />
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
            注目のシネマティック・オラクル
          </h2>
          <span className="featured-ai-badge font-mono text-[11px]">
            <Sparkles size={11} className="text-cyan-400" />
            <span>AI INTEL HERO</span>
          </span>
        </div>

        {featuredEvents.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-slate-400 mr-2">
              {currentIndex + 1} / {featuredEvents.length}
            </span>
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/50 transition cursor-pointer"
              aria-label="前の注目銘柄"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/50 transition cursor-pointer"
              aria-label="次の注目銘柄"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ヒーローカード本体 */}
      <div 
        className="featured-hero-card"
        onClick={() => onSelectEvent(currentEvent)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectEvent(currentEvent);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`${currentEvent.titleJa || currentEvent.title}の詳細を見る`}
      >
        <div className="featured-hero-image-wrap">
          <img
            src={`/images/heroes/${slug}.png`}
            alt={`${currentEvent.titleJa || currentEvent.title}の情景アイキャッチ`}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
            className="featured-hero-image"
          />
          <div className="featured-hero-gradient-overlay" />
        </div>

        {/* オーバーレイコンテンツ */}
        <div className="featured-hero-content">
          <div className="featured-top-meta">
            <span className="featured-category-pill font-mono">
              {currentEvent.categoryLabel || currentEvent.category?.toUpperCase()}
            </span>
            {hasConsensus && currentEvent.hasWorldOdds && gap > 0 && (
              <span className="featured-gap-pill font-mono">
                <Zap size={12} className="text-amber-300" />
                <span>⚡ {gap}% 乖離 (n={currentEvent.japanVotes.total})</span>
              </span>
            )}
            {userVote && (
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                あなたの投票: {userVote}
              </span>
            )}
          </div>

          <h3 className="featured-title">
            {currentEvent.titleJa || currentEvent.title}
          </h3>

          {/* デュアルスプレッド比較帯 */}
          <div className="featured-spread-strip">
            {currentEvent.hasWorldOdds && (
              <div className="featured-stat-box world">
                <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-bold mb-1">
                  <Globe2 size={13} />
                  <span>世界オッズ (Polymarket)</span>
                </div>
                <div className="text-lg sm:text-xl font-mono font-black text-white">
                  {positiveLabel(currentEvent)} {worldYes}% <span className="text-xs text-slate-400 font-normal">/ {negativeLabel(currentEvent)} {100 - worldYes}%</span>
                </div>
              </div>
            )}

            <div className="featured-stat-box japan">
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold mb-1">
                <span>🇯🇵</span>
                <span>日本世論支持率</span>
              </div>
              <div className="text-lg sm:text-xl font-mono font-black text-white">
                {currentEvent.japanVotes.total > 0 ? `YES ${japanYes}%` : '集計中'}
                <span className="text-xs text-slate-400 font-normal ml-1">
                  (n={currentEvent.japanVotes.total})
                </span>
              </div>
            </div>

            <div className="featured-action-box">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 group-hover:text-cyan-200 transition">
                <span>真相・カタリスト分析を見る</span>
                <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
