import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { QuickGuideBanner } from './components/QuickGuideBanner';
import { TradingTerminal } from './components/TradingTerminal';
import { MobileStickyVoteBar } from './components/MobileStickyVoteBar';
import { EventModal } from './components/EventModal';
import { OgpPreviewModal } from './components/OgpPreviewModal';
import { ComplianceBanner } from './components/ComplianceBanner';
import { MikeNoticePopup } from './components/MikeNoticePopup';
import { LetterToMikePage } from './components/LetterToMikePage';
import { INITIAL_EVENTS } from './data/initialEvents';
import { fetchLivePolymarketMarkets, syncVotesFromSupabase } from './services/polymarketService';
import { submitVoteToSupabase } from './services/supabaseClient';
import type { MarketItem, CategoryType } from './types';

export function App() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [events, setEvents] = useState<MarketItem[]>(INITIAL_EVENTS);
  const [selectedModalEvent, setSelectedModalEvent] = useState<MarketItem | null>(null);
  const [selectedShareEvent, setSelectedShareEvent] = useState<MarketItem | null>(null);
  const [isLetterPageOpen, setIsLetterPageOpen] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname === '/letter-to-mike';
  });
  const [userVotes, setUserVotes] = useState<Record<string, 'YES' | 'NO'>>(() => {
    try {
      const saved = localStorage.getItem('mirairadar_user_votes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  // URL 履歴管理
  const handleOpenLetter = () => {
    setIsLetterPageOpen(true);
    window.history.pushState({}, '', '/letter-to-mike');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseLetter = () => {
    setIsLetterPageOpen(false);
    window.history.pushState({}, '', '/');
  };

  const handleGoHome = () => {
    setIsLetterPageOpen(false);
    setSelectedCategory('all');
    setActiveTopicId(null);
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Polymarket API ＆ Supabase データの完全自動同期
  const loadMarketData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const liveItems = await fetchLivePolymarketMarkets();
      const baseItems = liveItems.length > 0 ? liveItems : INITIAL_EVENTS;
      
      // Supabaseの投票データを合成
      const synced = await syncVotesFromSupabase(baseItems);
      setEvents(synced);

      // URLルーティングチェック (/topic/:slug または /letter-to-mike でアクセスされた場合)
      const pathname = window.location.pathname;
      if (pathname === '/letter-to-mike') {
        setIsLetterPageOpen(true);
      } else if (pathname.startsWith('/topic/')) {
        const targetSlug = pathname.replace('/topic/', '').trim();
        const matched = synced.find(e => e.slug === targetSlug || e.id === targetSlug);
        if (matched) {
          setActiveTopicId(matched.id);
        }
      }
    } catch (err) {
      console.error('Error loading market data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 初回マウント時 ＆ 30秒ごとの自動ポーリング更新
  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 30000);
    return () => clearInterval(interval);
  }, [loadMarketData]);

  // 2. カテゴリー別フィルタリング（🔥人気急上昇対応）
  const filteredEvents = events.filter((m) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'trending') {
      return m.isTrending || m.volume24hUsd > 80000 || Math.abs(m.probChange24h) >= 6;
    }
    return m.category === selectedCategory;
  });

  // 3. 実データ集計
  const totalVolume = events.reduce((sum, item) => sum + item.totalVolumeUsd, 0);
  const totalMarketsCount = events.length;
  const totalJapanVotes = events.reduce((sum, item) => sum + item.japanVotes.total, 0);

  const handleVote = (eventId: string, choice: 'YES' | 'NO') => {
    setUserVotes(prev => {
      const next = { ...prev, [eventId]: choice };
      try {
        localStorage.setItem('mirairadar_user_votes', JSON.stringify(next));
      } catch {}
      return next;
    });

    // ローカルステートを即時更新
    setEvents(prev => prev.map(item => {
      if (item.id === eventId) {
        const yesAdd = choice === 'YES' ? 1 : 0;
        const noAdd = choice === 'NO' ? 1 : 0;
        const newYes = item.japanVotes.yes + yesAdd;
        const newNo = item.japanVotes.no + noAdd;
        const newTotal = newYes + newNo;
        return {
          ...item,
          japanVotes: {
            yes: newYes,
            no: newNo,
            total: newTotal,
            percentYes: Math.round((newYes / newTotal) * 100),
          }
        };
      }
      return item;
    }));

    // Supabaseへ非同期送信
    submitVoteToSupabase(eventId, choice);
  };

  const currentFocusedEvent = events.find(e => e.id === activeTopicId) || filteredEvents[0] || events[0];

  return (
    <div className="min-h-screen bg-primary pb-16 md:pb-0">
      <Header
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onRefresh={loadMarketData}
        isRefreshing={isRefreshing}
        totalMarketVolume={totalVolume}
        totalMarketsCount={totalMarketsCount}
        totalJapanVotes={totalJapanVotes}
        onOpenLetter={handleOpenLetter}
        onGoHome={handleGoHome}
      />

      {isLetterPageOpen ? (
        <main className="container main-content">
          <LetterToMikePage onBack={handleCloseLetter} />
        </main>
      ) : (
        <>
          <div className="container">
            <QuickGuideBanner />
          </div>

          <main className="container main-content">
            {/* 証券会社風 プロトレーディングターミナル */}
            <TradingTerminal
              events={filteredEvents.length > 0 ? filteredEvents : events}
              userVotes={userVotes}
              onVote={handleVote}
              onOpenModal={(event) => setSelectedModalEvent(event)}
              onOpenShare={(event) => setSelectedShareEvent(event)}
              activeEventId={activeTopicId}
            />
          </main>

          {/* モバイル用 固定フローティング投票バー */}
          {currentFocusedEvent && (
            <MobileStickyVoteBar
              event={currentFocusedEvent}
              userVote={userVotes[currentFocusedEvent.id] || null}
              onVote={handleVote}
              onOpenShare={(event) => setSelectedShareEvent(event)}
            />
          )}
        </>
      )}

      {/* 初回訪問時のサイバーパンク風通知ポップアップ */}
      <MikeNoticePopup onOpenLetter={handleOpenLetter} />

      {/* 詳細分析モーダル */}
      <EventModal
        item={selectedModalEvent}
        onClose={() => setSelectedModalEvent(null)}
        userVote={selectedModalEvent ? userVotes[selectedModalEvent.id] || null : null}
        onVote={handleVote}
        onOpenShare={(item) => {
          setSelectedModalEvent(null);
          setSelectedShareEvent(item);
        }}
      />

      {/* X シェアモーダル */}
      <OgpPreviewModal
        item={selectedShareEvent}
        onClose={() => setSelectedShareEvent(null)}
        userVote={selectedShareEvent ? userVotes[selectedShareEvent.id] || null : null}
      />

      <ComplianceBanner />
    </div>
  );
}

export default App;
