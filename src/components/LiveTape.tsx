import React, { useEffect, useMemo, useState } from 'react';
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

interface VoteLogRow {
  id: string;
  event_id: string;
  choice: string;
  voted_at: string | null;
  device_type: string | null;
}

interface LiveTapeProps {
  events?: MarketItem[];
}

export const LiveTape: React.FC<LiveTapeProps> = ({ events = [] }) => {
  // N-57: 取得と表示を分ける。
  //   以前は useEffect(..., [events]) で、events は配列propなので
  //   中身が同じでも参照が変わるたびに Supabase へ再取得が飛んでいた。
  //   読み込み時に events は3回入れ替わる（初期値 → Supabase → Polymarket反映）ため、
  //   同じクエリが 216ms / 358ms / 560ms の3回発火していた（本番実測）。
  //   30秒ごとの更新でも同じことが起きるので、開いている限り増え続ける。
  const [voteLogs, setVoteLogs] = useState<VoteLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 取得は「マウント時 ＋ 30秒ごと」。events の参照が変わっても再取得しない。
  //   本体（App.tsx）と同じ周期・同じ作法（非表示時は休止）に揃える。
  //   以前は events の参照変化に釣られて1周期あたり3回飛んでいた。
  useEffect(() => {
    let alive = true;
    async function loadVoteLogs() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('japan_vote_logs')
          .select('id, event_id, choice, voted_at, device_type')
          .order('voted_at', { ascending: false })
          .limit(10);
        if (alive) setVoteLogs((data as VoteLogRow[]) || []);
      } catch (err) {
        console.warn('歩み値の取得に失敗しました:', err);
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadVoteLogs();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) loadVoteLogs();
    }, 30000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  // 表示は voteLogs と events から導出する。ここでは取得しない。
  const tape = useMemo<TapeItem[]>(() => {
    const realItems: TapeItem[] = [];

    voteLogs.forEach((v) => {
      const ev = events.find((e) => e.id === v.event_id || e.slug === v.event_id);
      const title = ev ? ev.titleJa : (String(v.event_id).length > 20 ? '注目観測銘柄' : `世論銘柄 [${v.event_id}]`);
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

    // 実データのあるPolymarketの高出来高銘柄（実数）も追加
    events
      .filter((e) => e.volume24hUsd > 10000)
      .sort((a, b) => b.volume24hUsd - a.volume24hUsd)
      .slice(0, 5)
      .forEach((ev) => {
        realItems.push({
          id: `vol-${ev.id}`,
          time: `実測出来高`,
          type: 'SMART_MONEY',
          title: ev.titleJa,
          amountOrProb: `$${Math.round(ev.volume24hUsd / 1000).toLocaleString()}k 取引高`,
          location: 'Polymarket',
        });
      });

    return realItems;
  }, [voteLogs, events]);

  return (
    <div className="terminal-pane live-tape-pane">
      <div className="pane-title-bar live-tape-bar">
        <div className="title-text">
          <Activity size={13} className="icon-green" />
          <span className="pane-main-title">リアルタイム歩み値 ＆ 実測取引高 ｜ Real-time Time & Sales</span>
        </div>
        <span className="live-pill-sm">● LIVE LOGS</span>
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
