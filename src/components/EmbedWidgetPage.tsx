import React, { useState, useEffect } from 'react';
import type { MarketItem } from '../types';
import { Globe2, ExternalLink, ArrowRight } from 'lucide-react';
import { INITIAL_EVENTS } from '../data/initialEvents';
import { fetchLivePolymarketMarkets } from '../services/polymarketService';

interface EmbedWidgetPageProps {
  slugOrId: string;
}

export const EmbedWidgetPage: React.FC<EmbedWidgetPageProps> = ({ slugOrId }) => {
  const [item, setItem] = useState<MarketItem | null>(null);
  const [userVote, setUserVote] = useState<'YES' | 'NO' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. 初期データから即時キャッシュ表示
    const initialFound = INITIAL_EVENTS.find(
      (e) => e.slug === slugOrId || e.id === slugOrId || e.slug.replace(/-\d+$/, '') === slugOrId.replace(/-\d+$/, '')
    );
    if (initialFound) {
      setItem(initialFound);
      setIsLoading(false);
    }

    // 2. Supabase ＆ Polymarket 実測統合データをフェッチ
    fetchLivePolymarketMarkets()
      .then((events) => {
        if (!isMounted) return;
        const match = events.find(
          (e) => e.slug === slugOrId || e.id === slugOrId || e.slug.replace(/-\d+$/, '') === slugOrId.replace(/-\d+$/, '')
        );
        if (match) {
          setItem(match);
        } else if (initialFound) {
          setItem(initialFound);
        }
      })
      .catch((err) => {
        console.warn('Embed live fetch fallback:', err);
        if (initialFound) setItem(initialFound);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
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
  const hasValidJapanVotes = item.japanVotes.total >= 3;
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
        {hasValidJapanVotes ? (
          <span className="embed-gap-tag">
            ⚡ 乖離: {gap}% GAP (n={item.japanVotes.total})
          </span>
        ) : (
          <span className="embed-gap-tag opacity-80 font-mono text-[10px]">
            🇯🇵 サンプル収集中 (n={item.japanVotes.total})
          </span>
        )}
      </div>

      {/* 銘柄タイトル */}
      <a 
        href={`https://mirairadar.com/market/${item.slug || item.id}?ref=embed_title`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="embed-market-title"
      >
        <span>{item.titleJa || item.title}</span>
        <ExternalLink size={12} className="opacity-60 flex-shrink-0" />
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
            <span>日本の生活者世論 {hasValidJapanVotes ? `(n=${item.japanVotes.total})` : ''}</span>
          </div>
          <div className="metric-val font-mono text-emerald-400">
            {hasValidJapanVotes ? `YES ${japanYes}%` : 'サンプル収集中'}
          </div>
          <div className="embed-bar-track">
            <div 
              className="embed-bar-fill bg-emerald-400" 
              style={{ width: `${hasValidJapanVotes ? japanYes : 50}%` }}
            ></div>
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
