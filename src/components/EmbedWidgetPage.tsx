import React, { useState, useEffect } from 'react';
import type { MarketItem } from '../types';
import { Globe2, ExternalLink, ArrowRight } from 'lucide-react';
import { INITIAL_EVENTS } from '../data/initialEvents';
import { fetchLivePolymarketMarkets, syncVotesFromSupabase } from '../services/polymarketService';
import { submitVoteToSupabase } from '../services/supabaseClient';
import { positiveLabel, framingOf } from '../utils/probabilityLabel';

interface EmbedWidgetPageProps {
  slugOrId: string;
}

export const EmbedWidgetPage: React.FC<EmbedWidgetPageProps> = ({ slugOrId }) => {
  const [item, setItem] = useState<MarketItem | null>(null);
  const [userVote, setUserVote] = useState<'YES' | 'NO' | null>(null);
  // N-56: 記録できた票だけを反映した集計。null なら item の値をそのまま使う。
  const [localTally, setLocalTally] = useState<{ yes: number; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. 初期データから即時キャッシュ表示
    const initialFound = INITIAL_EVENTS.find(
      (e) => e.slug === slugOrId || e.id === slugOrId
    );
    if (initialFound) {
      setItem(initialFound);
      setIsLoading(false);
    }

    // 2. Supabase ＆ Polymarket 実測統合データをフェッチ ＆ 実票同期
    async function loadData() {
      try {
        const events = await fetchLivePolymarketMarkets();
        if (!isMounted) return;
        const match = events.find(
          (e) => e.slug === slugOrId || e.id === slugOrId
        );
        const target = match || initialFound;
        if (target) {
          const [withVotes] = await syncVotesFromSupabase([target]);
          if (!isMounted) return;
          setItem(withVotes || target);
        }
      } catch (err) {
        console.warn('Embed live fetch fallback:', err);
        if (initialFound && isMounted) setItem(initialFound);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

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

  // N-56: 以前はクリックしただけで表示が ±2% 動き、n は据え置きだった。
  //   記録は一切されていないのに「6人が52%」と表示していた（実際は6人が50%）。
  //   しかもこのウィジェットは他人のサイトに貼られる。借りた信用の上で嘘をつく形になる。
  //   いまは記録できた票だけを、分子と分母の両方に足して反映する。
  const baseTotal = item.japanVotes.total;
  const baseYes = Math.round((item.japanVotes.percentYes * baseTotal) / 100);
  const tally = localTally ?? { yes: baseYes, total: baseTotal };
  const japanYes = tally.total > 0 ? Math.round((tally.yes / tally.total) * 100) : 0;
  // 表示は実効集計（tally）から作るが、「サンプル収集中」を解除する判定は
  // 元の母数で行う。読者自身の1票で解除されると、
  // 「自分のクリックで世論が見えるようになった」という錯覚を作ってしまう。
  // n の表示は tally.total（記録された票を含む実数）のままにする。
  const hasValidJapanVotes = item.japanVotes.total >= 3;
  const gap = Math.abs(worldYes - japanYes);

  // N-56: 記録に成功したときだけ表示を動かす。失敗・重複なら数字は据え置く。
  const handleEmbedVote = async (choice: 'YES' | 'NO') => {
    if (userVote) return;                 // 1銘柄につき1票（本体の handleVote と同じ方針）
    setUserVote(choice);
    const recorded = await submitVoteToSupabase(String(item.id), choice);
    if (!recorded) return;
    setLocalTally({ yes: tally.yes + (choice === 'YES' ? 1 : 0), total: tally.total + 1 });
  };

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
            ⚡ 乖離: {gap}% GAP (n={tally.total})
          </span>
        ) : (
          <span className="embed-gap-tag opacity-80 font-mono text-[10px]">
            🇯🇵 サンプル収集中 (n={tally.total})
          </span>
        )}
      </div>

      {/* 銘柄タイトル
          N-59: 埋め込みは iframe 内の独立した文書なので、この文書の主題を h1 にする。
          見た目を変えないよう、既存の <a> はそのまま包むだけにする。 */}
      <h1 className="embed-market-heading">
        <a 
          href={`https://mirairadar.com/market/${item.slug || item.id}?ref=embed_title`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="embed-market-title"
        >
          <span>{item.titleJa || item.title}</span>
          <ExternalLink size={12} className="opacity-60 flex-shrink-0" />
        </a>
      </h1>

      {/* 世論対比バー */}
      <div className="embed-metrics-grid">
        <div className="embed-metric-col world">
          <div className="metric-header">
            <Globe2 size={11} className="text-cyan-400" />
            <span>世界リアルマネー</span>
          </div>
          <div className="metric-val font-mono text-cyan-400">{positiveLabel(item)} {worldYes}%</div>
          {/* N-55: 「本命 14%」だけでは誰の14%か分からない。幅が狭いので主語だけ添える。 */}
          {framingOf(item).kind === 'leader' && (
            <div className="embed-subject-note">本命 {framingOf(item).subject}</div>
          )}
          <div className="embed-bar-track">
            <div className="embed-bar-fill bg-cyan-400" style={{ width: `${worldYes}%` }}></div>
          </div>
        </div>

        <div className="embed-vs-center">VS</div>

        <div className="embed-metric-col japan">
          <div className="metric-header">
            <span>🇯🇵</span>
            <span>日本の生活者世論 {hasValidJapanVotes ? `(n=${tally.total})` : ''}</span>
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
            onClick={() => handleEmbedVote('YES')} 
            disabled={Boolean(userVote)}
            className={`embed-vote-btn yes ${userVote === 'YES' ? 'active' : ''}`}
          >
            YES {userVote === 'YES' && '✓'}
          </button>
          <button 
            onClick={() => handleEmbedVote('NO')} 
            disabled={Boolean(userVote)}
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
