import React from 'react';
import type { MarketItem } from '../types';
import { Flame } from 'lucide-react';

interface WatchlistTableProps {
  events: MarketItem[];
  selectedEvent: MarketItem;
  onSelectEvent: (event: MarketItem) => void;
}

export const WatchlistTable: React.FC<WatchlistTableProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
}) => {
  return (
    <div className="terminal-pane watchlist-pane">
      <div className="pane-title-bar">
        <div className="title-text">
          <Flame size={14} className="icon-gold" />
          <span>観測銘柄リスト (Polymarket Screener)</span>
        </div>
        <span className="count-tag">{events.length} 銘柄</span>
      </div>

      <div className="table-scroll-container">
        <table className="terminal-table">
          <thead>
            <tr>
              <th className="th-name">予測テーマ / 銘柄</th>
              <th className="th-prob text-right">現在確率</th>
              <th className="th-chg text-right">24h騰落</th>
              <th className="th-gap text-right">世論乖離</th>
              <th className="th-vol text-right">出来高</th>
            </tr>
          </thead>
          <tbody>
            {events.map((item) => {
              const isSelected = selectedEvent.id === item.id;
              const isUp = item.probChange24h >= 0;
              const gap = Math.abs(item.worldProbYes - item.japanVotes.percentYes);
              
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectEvent(item)}
                  className={`terminal-tr ${isSelected ? 'selected' : ''}`}
                >
                  <td className="td-name">
                    <div className="name-wrap">
                      <span className="category-micro-tag">{item.categoryLabel}</span>
                      <span className="event-title-short" title={item.titleJa}>
                        {item.titleJa}
                      </span>
                    </div>
                  </td>

                  <td className="td-prob text-right">
                    <span className="prob-mono-val">
                      {item.worldProbYes}<span className="pct-sign">%</span>
                    </span>
                  </td>

                  <td className="td-chg text-right">
                    <span className={`chg-pill ${isUp ? 'pos' : 'neg'}`}>
                      {isUp ? '+' : ''}{item.probChange24h}%
                    </span>
                  </td>

                  <td className="td-gap text-right">
                    <span className="gap-mono-val">
                      {gap > 0 ? `${gap}%` : '0%'}
                    </span>
                  </td>

                  <td className="td-vol text-right">
                    <span className="vol-mono-val">
                      ${Math.round(item.volume24hUsd / 1000).toLocaleString()}k
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
