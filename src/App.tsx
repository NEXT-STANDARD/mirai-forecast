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
import { ProposeTopicModal } from './components/ProposeTopicModal';
import { AdminConsolePage } from './components/AdminConsolePage';
import { MyForecastModal } from './components/MyForecastModal';
import { INITIAL_EVENTS } from './data/initialEvents';
import { fetchLivePolymarketMarkets, syncVotesFromSupabase } from './services/polymarketService';
import { submitVoteToSupabase } from './services/supabaseClient';
import type { MarketItem, CategoryType, StreakData } from './types';

export function App() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [events, setEvents] = useState<MarketItem[]>(INITIAL_EVENTS);
  const [selectedModalEvent, setSelectedModalEvent] = useState<MarketItem | null>(null);
  const [selectedShareEvent, setSelectedShareEvent] = useState<MarketItem | null>(null);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [isMyForecastOpen, setIsMyForecastOpen] = useState(false);
  const [isLetterPageOpen, setIsLetterPageOpen] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname === '/letter-to-mike';
  });
  const [isAdminOpen, setIsAdminOpen] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname === '/admin';
  });
  const [userVotes, setUserVotes] = useState<Record<string, 'YES' | 'NO'>>(() => {
    try {
      const saved = localStorage.getItem('mirairadar_user_votes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [streak, setStreak] = useState<StreakData>(() => {
    try {
      const saved = localStorage.getItem('mirairadar_streak');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      currentStreak: 1,
      lastVoteDate: new Date().toISOString().split('T')[0],
      maxStreak: 1,
      totalVotedDays: 1,
    };
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  // URL 履歴管理
  const handleOpenLetter = () => {
    setIsAdminOpen(false);
    setIsLetterPageOpen(true);
    window.history.pushState({}, '', '/letter-to-mike');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseLetter = () => {
    setIsLetterPageOpen(false);
    window.history.pushState({}, '', '/');
  };

  const handleOpenAdmin = () => {
    setIsLetterPageOpen(false);
    setIsAdminOpen(true);
    window.history.pushState({}, '', '/admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    window.history.pushState({}, '', '/');
  };

  const handleGoHome = () => {
    setIsLetterPageOpen(false);
    setIsAdminOpen(false);
    setSelectedCategory('all');
    setActiveTopicId(null);
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 管理者ショートカット (Cmd + Shift + A / Ctrl + Shift + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsAdminOpen(prev => {
          const next = !prev;
          window.history.pushState({}, '', next ? '/admin' : '/');
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Polymarket API ＆ Supabase データの完全自動同期
  const loadMarketData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const liveItems = await fetchLivePolymarketMarkets();
      const baseItems = liveItems.length > 0 ? liveItems : INITIAL_EVENTS;
      
      // Supabaseの投票データを合成
      const synced = await syncVotesFromSupabase(baseItems);
      setEvents(synced);

      // URLルーティングチェック
      const pathname = window.location.pathname;
      if (pathname === '/admin') {
        setIsAdminOpen(true);
      } else if (pathname === '/letter-to-mike') {
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

    // ストリーク日数の更新
    setStreak(prev => {
      const today = new Date().toISOString().split('T')[0];
      if (prev.lastVoteDate === today) {
        return prev;
      }

      const lastDate = new Date(prev.lastVoteDate);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let nextStreak = 1;
      if (diffDays === 1) {
        nextStreak = prev.currentStreak + 1;
      }

      const next: StreakData = {
        currentStreak: nextStreak,
        lastVoteDate: today,
        maxStreak: Math.max(prev.maxStreak, nextStreak),
        totalVotedDays: prev.totalVotedDays + 1,
      };

      try {
        localStorage.setItem('mirairadar_streak', JSON.stringify(next));
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

  // 投票した銘柄のうち結果確定している件数
  const resolvedNotificationsCount = Object.keys(userVotes).filter(id => {
    const ev = events.find(e => e.id === id || e.slug === id);
    return ev && Boolean(ev.resolvedChoice);
  }).length;

  const currentFocusedEvent = events.find(e => e.id === activeTopicId) || filteredEvents[0] || events[0];

  return (
    <div className="min-h-screen bg-primary pb-16 md:pb-0">
      <Header
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onRefresh={loadMarketData}
        isRefreshing={isRefreshing}
        totalVolume={totalVolume}
        totalMarketsCount={totalMarketsCount}
        totalJapanVotes={totalJapanVotes}
        onOpenLetter={handleOpenLetter}
        onGoHome={handleGoHome}
        onOpenPropose={() => setIsProposeModalOpen(true)}
        onOpenMyForecast={() => setIsMyForecastOpen(true)}
        userVotesCount={Object.keys(userVotes).length}
        streakDays={streak.currentStreak}
        resolvedNotificationsCount={resolvedNotificationsCount}
      />

      {isAdminOpen ? (
        <main className="container main-content">
          <AdminConsolePage
            onBack={handleCloseAdmin}
            events={events}
            onRefreshMarkets={loadMarketData}
          />
        </main>
      ) : isLetterPageOpen ? (
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
              events={filteredEvents}
              userVotes={userVotes}
              onVote={handleVote}
              onOpenModal={(event) => setSelectedModalEvent(event)}
              onOpenShare={(event) => setSelectedShareEvent(event)}
              activeEventId={activeTopicId}
              onOpenPropose={() => setIsProposeModalOpen(true)}
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

      {/* ユーザー提案モーダル */}
      <ProposeTopicModal
        isOpen={isProposeModalOpen}
        onClose={() => setIsProposeModalOpen(false)}
      />

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

      {/* 🏆 未来予報士プロファイル ＆ 的中履歴モーダル */}
      <MyForecastModal
        isOpen={isMyForecastOpen}
        onClose={() => setIsMyForecastOpen(false)}
        userVotes={userVotes}
        events={events}
        streak={streak}
        onSelectEvent={(ev) => {
          setActiveTopicId(ev.id);
          setSelectedCategory('all');
        }}
      />

      <ComplianceBanner />

      {/* ローカル開発用/管理者用 司令室アクセスボタン (開発環境またはキーボードショートカットで表示) */}
      {import.meta.env.DEV && !isAdminOpen && (
        <button
          onClick={handleOpenAdmin}
          className="fixed bottom-2 left-2 z-50 text-[10px] font-mono font-bold bg-slate-900/90 text-amber-400/80 hover:text-amber-300 border border-amber-500/30 px-2 py-1 rounded shadow-lg backdrop-blur"
          title="未来レーダー 司令室（Admin Console）"
        >
          ⚡ MISSION CONTROL
        </button>
      )}
    </div>
  );
}

export default App;
