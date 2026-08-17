import { useState } from 'react';
import { Header } from './components/Header';
import { TradingTerminal } from './components/TradingTerminal';
import { EventModal } from './components/EventModal';
import { OgpPreviewModal } from './components/OgpPreviewModal';
import { ComplianceBanner } from './components/ComplianceBanner';
import { INITIAL_EVENTS } from './data/initialEvents';
import type { MarketItem, CategoryType } from './types';

export function App() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [selectedModalEvent, setSelectedModalEvent] = useState<MarketItem | null>(null);
  const [selectedShareEvent, setSelectedShareEvent] = useState<MarketItem | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'YES' | 'NO'>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredEvents = selectedCategory === 'all'
    ? INITIAL_EVENTS
    : INITIAL_EVENTS.filter(m => m.category === selectedCategory);

  const totalVolume = INITIAL_EVENTS.reduce((sum, item) => sum + item.totalVolumeUsd, 0);

  const handleVote = (eventId: string, choice: 'YES' | 'NO') => {
    setUserVotes(prev => ({ ...prev, [eventId]: choice }));
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen bg-primary">
      <Header
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        totalMarketVolume={totalVolume}
      />

      <main className="container main-content">
        {/* 証券会社風 プロトレーディングターミナル */}
        <TradingTerminal
          events={filteredEvents}
          userVotes={userVotes}
          onVote={handleVote}
          onOpenModal={(event) => setSelectedModalEvent(event)}
          onOpenShare={(event) => setSelectedShareEvent(event)}
        />
      </main>

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
