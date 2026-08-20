import React, { useState, useEffect } from 'react';
import type { MarketItem } from '../types';
import { Globe2, ExternalLink, ArrowRight } from 'lucide-react';
import { INITIAL_EVENTS } from '../data/initialEvents';

interface EmbedWidgetPageProps {
  slugOrId: string;
}

export const EmbedWidgetPage: React.FC<EmbedWidgetPageProps> = ({ slugOrId }) => {
  const [item, setItem] = useState<MarketItem | null>(null);
  const [userVote, setUserVote] = useState<'YES' | 'NO' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. まず初期データから検索
    const found = INITIAL_EVENTS.find(
      (e) => e.slug === slugOrId || e.id === slugOrId
    );
    if (found) {
      setItem(found);
      setIsLoading(false);
    }

    // 2. Polymarket APIから最新データをフェッチ
    fetch('https://gamma-api.polymarket.com/events?limit=80&active=true&closed=false&order=volume24hr&ascending=false')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const match = data.find((e: any) => e.slug === slugOrId || String(e.id) === slugOrId);
          if (match) {
            const firstMarket = match.markets?.[0];
            let probYes = 50;
            if (firstMarket?.outcomePrices) {
              try {
                const prices = JSON.parse(firstMarket.outcomePrices);
                probYes = Math.round(Number(prices[0]) * 100);
              } catch {
                probYes = 50;
              }
            }
            setItem({
              id: String(match.id),
              slug: match.slug || String(match.id),
              title: match.title,
              titleJa: match.title,
              question: match.description || match.title,
              questionJa: match.description || match.title,
              category: 'trending',
              categoryLabel: '⚡ 注目マーケット',
              iconUrl: match.image || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=120&q=80',
              worldProbYes: probYes,
              worldProbNo: 100 - probYes,
              probChange24h: 0,
              volume24hUsd: Number(match.volume24hr || 0),
              totalVolumeUsd: Number(match.volume || 0),
              endDate: match.endDate || '2026-12-31',
              japanVotes: {
                yes: 12,
                no: 8,
                total: 20,
                percentYes: 60,
              },
              comments: [],
            });
          }
        }
      })
      .catch((err) => console.error('Embed fetch error:', err))
      .finally(() => setIsLoading(false));
  }, [slugOrId]);

  if (isLoading && !item) {
    return (
      <div className="embed-loading-container">
        <span className="live-dot-cyan"></span>
        <span>未来レーダー リアルタイム世論データを読み込み中...</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="embed-error-container">
        <p>指定された観測銘柄が見つかりませんでした。</p>
        <a href="https://mirairadar.com" target="_blank" rel="noopener noreferrer" className="embed-brand-link">
          未来レーダー トップへ ➔
        </a>
      </div>
    );
  }

  const worldYes = item.worldProbYes;
  const japanYes = userVote === 'YES' 
    ? Math.min(100, item.japanVotes.percentYes + 2) 
    : userVote === 'NO' 
    ? Math.max(0, item.japanVotes.percentYes - 2) 
    : item.japanVotes.percentYes;
  const gap = Math.abs(worldYes - japanYes);

  return (
    <div className="mirairadar-embed-widget">
      {/* ウィジェットヘッダー */}
      <div className="embed-header">
        <a 
          href={`https://mirairadar.com/market/${item.slug || item.id}?ref=embed_header`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="embed-brand-badge"
        >
          <span className="live-dot-cyan animate-pulse"></span>
          <span className="font-extrabold">未来レーダー</span>
          <span className="brand-sub">| 世論スプレッド</span>
        </a>
        <span className="embed-gap-tag">
          ⚡ 乖離: {gap}% GAP
        </span>
      </div>

      {/* 銘柄タイトル */}
      <a 
        href={`https://mirairadar.com/market/${item.slug || item.id}?ref=embed_title`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="embed-market-title"
      >
        <span>{item.titleJa || item.title}</span>
        <ExternalLink size={12} className="opacity-60" />
      </a>

      {/* 世論対比バー */}
      <div className="embed-metrics-grid">
        <div className="embed-metric-col world">
          <div className="metric-header">
            <Globe2 size={11} className="text-cyan-400" />
            <span>世界リアルマネー</span>
          </div>
          <div className="metric-val font-mono text-cyan-400">YES {worldYes}%</div>
          <div className="embed-bar-track">
            <div className="embed-bar-fill bg-cyan-400" style={{ width: `${worldYes}%` }}></div>
          </div>
        </div>

        <div className="embed-vs-center">VS</div>

        <div className="embed-metric-col japan">
          <div className="metric-header">
            <span>🇯🇵</span>
            <span>日本の生活者世論</span>
          </div>
          <div className="metric-val font-mono text-emerald-400">YES {japanYes}%</div>
          <div className="embed-bar-track">
            <div className="embed-bar-fill bg-emerald-400" style={{ width: `${japanYes}%` }}></div>
          </div>
        </div>
      </div>

      {/* 投票ボタン ＆ 誘導フッター */}
      <div className="embed-footer">
        <div className="embed-vote-btns">
          <button 
            onClick={() => setUserVote('YES')} 
            className={`embed-vote-btn yes ${userVote === 'YES' ? 'active' : ''}`}
          >
            YES {userVote === 'YES' && '✓'}
          </button>
          <button 
            onClick={() => setUserVote('NO')} 
            className={`embed-vote-btn no ${userVote === 'NO' ? 'active' : ''}`}
          >
            NO {userVote === 'NO' && '✓'}
          </button>
        </div>

        <a 
          href={`https://mirairadar.com/market/${item.slug || item.id}?ref=embed_cta`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="embed-cta-link"
        >
          <span>詳細チャート・深層分析</span>
          <ArrowRight size={12} />
        </a>
      </div>
    </div>
  );
};
