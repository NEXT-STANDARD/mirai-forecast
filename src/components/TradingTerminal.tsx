import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { WatchlistTable } from './WatchlistTable';
import { MainTradingChart } from './MainTradingChart';
import { OrderBookConsensus } from './OrderBookConsensus';
import { LiveTape } from './LiveTape';

interface TradingTerminalProps {
  events: MarketItem[];
  userVotes: Record<string, 'YES' | 'NO'>;
  onVote: (eventId: string, choice: 'YES' | 'NO') => void;
  onOpenModal: (event: MarketItem) => void;
  onOpenShare: (event: MarketItem) => void;
  activeEventId?: string | null;
}

export const TradingTerminal: React.FC<TradingTerminalProps> = ({
  events,
  userVotes,
  onVote,
  onOpenShare,
  activeEventId,
}) => {
  // 初期選択銘柄
  const [selectedEventId, setSelectedEventId] = useState<string>(
    activeEventId || events[0]?.id || '1'
  );

  React.useEffect(() => {
    if (activeEventId) {
      setSelectedEventId(activeEventId);
    }
  }, [activeEventId]);

  const currentEvent = events.find((e) => e.id === selectedEventId || e.slug === selectedEventId) || events[0];

  return (
    <div className="trading-terminal-root">
      {/* 3ペイン構成：左（銘柄スクリーナー）、中央（メインチャート＆AI）、右（板情報＆投票） */}
      <div className="terminal-3pane-grid">
        {/* 左ペイン：銘柄スクリーナー */}
        <div className="terminal-col col-left">
          <WatchlistTable
            events={events}
            selectedEvent={currentEvent}
            onSelectEvent={(e) => setSelectedEventId(e.id)}
          />
        </div>

        {/* 中央ペイン：メイン株価チャート ＆ 3D SmartRadar */}
        <div className="terminal-col col-center">
          <MainTradingChart
            event={currentEvent}
            events={events}
            onSelectEvent={(e) => setSelectedEventId(e.id)}
          />
        </div>

        {/* 右ペイン：世論板情報 ＆ ワンクリック投票 */}
        <div className="terminal-col col-right">
          <OrderBookConsensus
            event={currentEvent}
            userVote={userVotes[currentEvent.id] || null}
            onVote={onVote}
            onOpenShare={onOpenShare}
          />
        </div>
      </div>

      {/* 下部：歩み値（Time & Sales）リアルタイムストリーム */}
      <div className="terminal-bottom-row">
        <LiveTape />
      </div>
    </div>
  );
};
