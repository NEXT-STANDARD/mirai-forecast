import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TradingTerminal } from './components/TradingTerminal';
import { MobileStickyVoteBar } from './components/MobileStickyVoteBar';
import { EventModal } from './components/EventModal';
import { OgpPreviewModal } from './components/OgpPreviewModal';
import { ComplianceBanner } from './components/ComplianceBanner';
import { MikeNoticePopup } from './components/MikeNoticePopup';
import { LetterToMikePage } from './components/LetterToMikePage';
import { ProposeTopicModal } from './components/ProposeTopicModal';
import { SpreadRankingSection } from './components/SpreadRankingSection';
import { AdminConsolePage } from './components/AdminConsolePage';
import { AllMarketsGrid } from './components/AllMarketsGrid';
import { MarketDetailPage } from './components/MarketDetailPage';
import { OnboardingModal } from './components/OnboardingModal';
import { AiConnectorPage } from './components/AiConnectorPage';
import { ForecastHubPage } from './components/ForecastHubPage';
import { EmbedWidgetPage } from './components/EmbedWidgetPage';
import { EmbedModal } from './components/EmbedModal';
import { DataExportModal } from './components/DataExportModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { INITIAL_EVENTS } from './data/initialEvents';
import { fetchLivePolymarketMarkets, syncVotesFromSupabase } from './services/polymarketService';
import { submitVoteToSupabase } from './services/supabaseClient';
import { cyberSound } from './utils/cyberSound';
import type { MarketItem, CategoryType, StreakData } from './types';

export function App() {
  // 🔌 外部メディア・ブログ用 /embed/:slug ルーティング
  const embedSlug = typeof window !== 'undefined' && window.location.pathname.startsWith('/embed/')
    ? window.location.pathname.replace(/^\/embed\//, '')
    : null;

  if (embedSlug) {
    return <EmbedWidgetPage slugOrId={decodeURIComponent(embedSlug)} />;
  }

  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('trending');
  const [events, setEvents] = useState<MarketItem[]>(INITIAL_EVENTS);
  const [selectedModalEvent, setSelectedModalEvent] = useState<MarketItem | null>(null);
  const [selectedShareEvent, setSelectedShareEvent] = useState<MarketItem | null>(null);
  const [selectedEmbedEvent, setSelectedEmbedEvent] = useState<MarketItem | null>(null);
  const [selectedDataExportEvent, setSelectedDataExportEvent] = useState<MarketItem | null>(null);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  
  // 初回オンボーディング表示判定
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    try {
      return !localStorage.getItem('mirairadar_onboarded');
    } catch {
      return false;
    }
  });
  
  // 個別銘柄ページルーティング (/market/:slug or /market/:id)
  const [detailMarketId, setDetailMarketId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const match = window.location.pathname.match(/^\/market\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  });

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // 🏆 予報士ハブ個別ページルーティング (/forecast, /profile, /rankings)
  const [isForecastHubOpen, setIsForecastHubOpen] = useState(() => {
    return typeof window !== 'undefined' && (
      window.location.pathname === '/forecast' ||
      window.location.pathname === '/profile' ||
      window.location.pathname === '/rankings'
    );
  });

  // 本番環境で /admin にアクセスされた場合は即座にトップページへ自動リダイレクト
  useEffect(() => {
    if (!isLocalhost && typeof window !== 'undefined' && window.location.pathname === '/admin') {
      window.history.replaceState({}, '', '/');
    }
  }, [isLocalhost]);

  const [isLetterPageOpen, setIsLetterPageOpen] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname === '/letter-to-mike';
  });
  const [isAiConnectorOpen, setIsAiConnectorOpen] = useState(() => {
    return typeof window !== 'undefined' && (window.location.pathname === '/ai-connector' || window.location.pathname === '/developers');
  });
  const [isAdminOpen, setIsAdminOpen] = useState(() => {
    return isLocalhost && typeof window !== 'undefined' && window.location.pathname === '/admin';
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
  // URL 履歴管理
  const handleOpenMarketDetail = (market: MarketItem) => {
    setIsAdminOpen(false);
    setIsLetterPageOpen(false);
    setDetailMarketId(market.slug || market.id);
    window.history.pushState({}, '', `/market/${encodeURIComponent(market.slug || market.id)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseMarketDetail = () => {
    setDetailMarketId(null);
    window.history.pushState({}, '', '/');
  };

  const handleOpenLetter = () => {
    setDetailMarketId(null);
    setIsAdminOpen(false);
    setIsAiConnectorOpen(false);
    setIsForecastHubOpen(false);
    setIsLetterPageOpen(true);
    window.history.pushState({}, '', '/letter-to-mike');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseLetter = () => {
    setIsLetterPageOpen(false);
    window.history.pushState({}, '', '/');
  };

  const handleOpenForecastHub = () => {
    setDetailMarketId(null);
    setIsAdminOpen(false);
    setIsLetterPageOpen(false);
    setIsAiConnectorOpen(false);
    setIsForecastHubOpen(true);
    window.history.pushState({}, '', '/forecast');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseForecastHub = () => {
    setIsForecastHubOpen(false);
    window.history.pushState({}, '', '/');
  };

  const handleOpenAdmin = () => {
    setDetailMarketId(null);
    setIsLetterPageOpen(false);
    setIsAiConnectorOpen(false);
    setIsForecastHubOpen(false);
    setIsAdminOpen(true);
    window.history.pushState({}, '', '/admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    window.history.pushState({}, '', '/');
  };

  const handleGoHome = () => {
    setDetailMarketId(null);
    setIsLetterPageOpen(false);
    setIsAdminOpen(false);
    setIsAiConnectorOpen(false);
    setIsForecastHubOpen(false);
    setSelectedCategory('trending');
    setActiveTopicId(null);
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ブラウザの戻る・進む (popstate) の監視
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        if (isLocalhost) {
          setIsAdminOpen(true);
          setIsLetterPageOpen(false);
          setIsAiConnectorOpen(false);
          setIsForecastHubOpen(false);
          setDetailMarketId(null);
        } else {
          // 本番環境では /admin は存在しないものとしてトップへ強制リダイレクト
          window.history.replaceState({}, '', '/');
          setIsAdminOpen(false);
          setIsLetterPageOpen(false);
          setIsAiConnectorOpen(false);
          setIsForecastHubOpen(false);
          setDetailMarketId(null);
        }
      } else if (path === '/letter-to-mike') {
        setIsAdminOpen(false);
        setIsLetterPageOpen(true);
        setIsAiConnectorOpen(false);
        setIsForecastHubOpen(false);
        setDetailMarketId(null);
      } else if (path === '/ai-connector' || path === '/developers') {
        setIsAdminOpen(false);
        setIsLetterPageOpen(false);
        setIsAiConnectorOpen(true);
        setIsForecastHubOpen(false);
        setDetailMarketId(null);
      } else if (path === '/forecast' || path === '/profile' || path === '/rankings') {
        setIsAdminOpen(false);
        setIsLetterPageOpen(false);
        setIsAiConnectorOpen(false);
        setIsForecastHubOpen(true);
        setDetailMarketId(null);
      } else {
        const match = path.match(/^\/market\/(.+)$/);
        if (match) {
          setDetailMarketId(decodeURIComponent(match[1]));
          setIsAdminOpen(false);
          setIsLetterPageOpen(false);
          setIsAiConnectorOpen(false);
          setIsForecastHubOpen(false);
        } else {
          setDetailMarketId(null);
          setIsAdminOpen(false);
          setIsLetterPageOpen(false);
          setIsAiConnectorOpen(false);
          setIsForecastHubOpen(false);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isLocalhost]);

  // 管理者ショートカット (ローカル環境でのみ有効: Cmd + Shift + A)
  useEffect(() => {
    if (!isLocalhost) return;

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
  }, [isLocalhost]);

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
    // 🔊 サイバーパンク電子音 ＆ 触覚フィードバック
    cyberSound.playVote(choice);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(choice === 'YES' ? [25, 30, 35] : [40, 20]);
    }

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
        onOpenMyForecast={handleOpenForecastHub}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onOpenAiConnector={() => setIsAiConnectorOpen(true)}
        userVotesCount={Object.keys(userVotes).length}
        streakDays={streak.currentStreak}
        resolvedNotificationsCount={resolvedNotificationsCount}
      />

      {isAdminOpen && isLocalhost ? (
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
      ) : isAiConnectorOpen ? (
        <main className="container main-content">
          <AiConnectorPage onBack={() => setIsAiConnectorOpen(false)} />
        </main>
      ) : isForecastHubOpen ? (
        <main className="container main-content">
          <ForecastHubPage
            userVotes={userVotes}
            events={events}
            streak={streak}
            onBack={handleCloseForecastHub}
            onSelectEvent={(ev) => handleOpenMarketDetail(ev)}
          />
        </main>
      ) : detailMarketId && events.find(e => e.id === detailMarketId || e.slug === detailMarketId) ? (
        <main className="container main-content">
          <MarketDetailPage
            item={events.find(e => e.id === detailMarketId || e.slug === detailMarketId)!}
            allEvents={events}
            userVote={userVotes[events.find(e => e.id === detailMarketId || e.slug === detailMarketId)!.id] || null}
            onVote={handleVote}
            onOpenShare={(event) => setSelectedShareEvent(event)}
            onOpenEmbed={(event) => setSelectedEmbedEvent(event)}
            onOpenDataExport={(event) => setSelectedDataExportEvent(event)}
            onBack={handleCloseMarketDetail}
            onSelectRelatedEvent={handleOpenMarketDetail}
          />
        </main>
      ) : (
        <>
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
              onOpenDetail={handleOpenMarketDetail}
            />

            {/* ⚡ 注目の世論スプレッド乖離ランキング（キラー第1弾） */}
            <SpreadRankingSection
              events={events}
              userVotes={userVotes}
              onVote={handleVote}
              onSelectEvent={(event) => {
                setActiveTopicId(event.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenDetail={handleOpenMarketDetail}
              onOpenShare={(event) => setSelectedShareEvent(event)}
            />

            {/* 🎴 すべての観測銘柄（全銘柄カードグリッド ＆ 即時投票） */}
            <AllMarketsGrid
              events={events}
              userVotes={userVotes}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onVote={handleVote}
              onSelectEvent={(event) => {
                setActiveTopicId(event.id);
                // 画面上部のターミナルへスムーズスクロール
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenDetail={handleOpenMarketDetail}
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

      {/* </> 記事・ブログ埋め込みウィジェットモーダル */}
      <EmbedModal
        item={selectedEmbedEvent}
        onClose={() => setSelectedEmbedEvent(null)}
      />

      {/* 📊 金融オルタナティブデータ取得ハブ (CSV / WebMCP / JSON) */}
      <DataExportModal
        item={selectedDataExportEvent}
        onClose={() => setSelectedDataExportEvent(null)}
        onOpenAiConnector={() => setIsAiConnectorOpen(true)}
      />



      {/* 🌟 初見オンボーディング・クイックガイドモーダル */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onStartPredicting={() => {
          setIsOnboardingOpen(false);
          const topEvent = events.find((e) => e.isTrending) || events[0];
          if (topEvent) {
            setActiveTopicId(topEvent.id);
            setSelectedCategory('all');
          }
        }}
      />

      <ComplianceBanner />

      {/* 📱 PWA インストール ＆ WebPush 的中通知バナー */}
      <PwaInstallBanner />

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
