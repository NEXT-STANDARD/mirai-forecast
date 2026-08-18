import React, { useEffect, useState } from 'react';
import { Activity, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import type { MarketItem } from '../types';
import { supabase } from '../services/supabaseClient';

interface TapeItem {
  id: string;
  time: string;
  type: 'VOTE_YES' | 'VOTE_NO' | 'SMART_MONEY';
  title: string;
  amountOrProb: string;
  location?: string;
}

interface LiveTapeProps {
  events?: MarketItem[];
}

export const LiveTape: React.FC<LiveTapeProps> = ({ events = [] }) => {
  const [tape, setTape] = useState<TapeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Supabaseから本物のリアル投票ログを取得し、銘柄タイトルと紐付ける
  useEffect(() => {
    async function loadRealTape() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: voteLogs } = await supabase
          .from('japan_vote_logs')
          .select('id, event_id, choice, voted_at, device_type')
          .order('voted_at', { ascending: false })
          .limit(10);

        const realItems: TapeItem[] = [];

        if (voteLogs && voteLogs.length > 0) {
          voteLogs.forEach((v) => {
            const ev = events.find((e) => e.id === v.event_id || e.slug === v.event_id);
            const title = ev ? ev.titleJa : `銘柄 #${v.event_id.slice(0, 8)}`;
            const d = v.voted_at ? new Date(v.voted_at) : new Date();
            const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

            realItems.push({
              id: v.id,
              time: timeStr,
              type: v.choice === 'YES' ? 'VOTE_YES' : 'VOTE_NO',
              title,
              amountOrProb: v.choice === 'YES' ? 'YES 投票' : 'NO 投票',
              location: v.device_type === 'MOBILE' ? 'モバイル' : 'PC端末',
            });
          });
        }

        // 2. 実データのあるPolymarketの高出来高銘柄（実数）も追加
        const topVolumeEvents = events
          .filter((e) => e.volume24hUsd > 10000)
          .sort((a, b) => b.volume24hUsd - a.volume24hUsd)
          .slice(0, 5);

        topVolumeEvents.forEach((ev) => {
          realItems.push({
            id: `vol-${ev.id}`,
            time: `実測出来高`,
            type: 'SMART_MONEY',
            title: ev.titleJa,
            amountOrProb: `$${Math.round(ev.volume24hUsd / 1000).toLocaleString()}k 取引高`,
            location: 'Polymarket',
          });
        });

        setTape(realItems);
      } catch (err) {
        console.error('Error fetching real tape:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadRealTape();
  }, [events]);

  return (
    <div className="terminal-pane live-tape-pane">
      <div className="pane-title-bar live-tape-bar">
        <div className="title-text">
          <Activity size={13} className="icon-green" />
          <span className="pane-main-title">リアルタイム歩み値 ＆ 実測取引高 ｜ Real-time Time & Sales</span>
        </div>
        <span className="live-pill-sm">● REAL DATA ONLY</span>
      </div>

      <div className="tape-items-scroll hide-native-scrollbar">
        {tape.length === 0 ? (
          <div className="py-2 px-4 text-xs text-slate-500">
            {isLoading ? '実測ログ集計中...' : 'リアルタイム投票ログ受付中（新しい投票があると即座にここに流れます）'}
          </div>
        ) : (
          tape.map((item) => (
            <div key={item.id} className="tape-row">
              <span className="tape-time">{item.time}</span>
              <span className={`tape-badge ${item.type.toLowerCase()}`}>
                {item.type === 'SMART_MONEY' ? (
                  <><Zap size={10} /> 実測出来高</>
                ) : item.type === 'VOTE_YES' ? (
                  <><TrendingUp size={10} /> リアル YES</>
                ) : (
                  <><TrendingDown size={10} /> リアル NO</>
                )}
              </span>
              <span className="tape-title">{item.title}</span>
              <span className="tape-val">{item.amountOrProb}</span>
              {item.location && <span className="tape-loc">({item.location})</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
