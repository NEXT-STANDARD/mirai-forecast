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
  onOpenPropose?: () => void;
  onOpenDetail?: (event: MarketItem) => void;
}

export const TradingTerminal: React.FC<TradingTerminalProps> = ({
  events,
  userVotes,
  onVote,
  onOpenShare,
  activeEventId,
  onOpenPropose,
  onOpenDetail,
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

  if (!currentEvent || events.length === 0) {
    return (
      <div className="trading-terminal-root">
        <div className="terminal-empty-view">
          <div className="empty-box-inner">
            <span className="text-2xl mb-2">📡</span>
            <h3 className="text-sm font-bold text-slate-100">該当するカテゴリーの観測銘柄はありません</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
              現在、このカテゴリーのマーケットを準備中です。観測したい未来の問いがあれば提案してください。
            </p>
            {onOpenPropose && (
              <button onClick={onOpenPropose} className="btn-screener-propose mt-4">
                💡 新しい問いを提案する
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
            onOpenPropose={onOpenPropose}
          />
        </div>

        {/* 中央ペイン：メイン株価チャート ＆ 3D SmartRadar */}
        <div className="terminal-col col-center">
          <MainTradingChart
            event={currentEvent}
            events={events}
            onSelectEvent={(e) => setSelectedEventId(e.id)}
            onOpenDetail={onOpenDetail}
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
        <LiveTape events={events} />
      </div>
    </div>
  );
};
