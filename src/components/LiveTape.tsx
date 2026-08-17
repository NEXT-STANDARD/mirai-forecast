import React, { useEffect, useState } from 'react';
import { Activity, Zap, TrendingUp, TrendingDown } from 'lucide-react';

interface TapeItem {
  id: string;
  time: string;
  type: 'VOTE_YES' | 'VOTE_NO' | 'SMART_MONEY';
  title: string;
  amountOrProb: string;
  location?: string;
}

export const LiveTape: React.FC = () => {
  const [tape, setTape] = useState<TapeItem[]>([
    { id: '1', time: '19:30:12', type: 'VOTE_YES', title: '日銀利上げ (9月)', amountOrProb: 'YES投票', location: '東京都' },
    { id: '2', time: '19:29:45', type: 'SMART_MONEY', title: '米大統領選 2028', amountOrProb: '+$42,000 大口買い', location: 'New York' },
    { id: '3', time: '19:28:30', type: 'VOTE_NO', title: 'OpenAI GPT-5年内公開', amountOrProb: 'NO投票', location: '大阪府' },
    { id: '4', time: '19:27:15', type: 'SMART_MONEY', title: 'ビットコイン15万ドル到達', amountOrProb: '+$18,500 急変検知', location: 'London' },
    { id: '5', time: '19:25:50', type: 'VOTE_YES', title: '米大統領選 2028', amountOrProb: 'YES投票', location: '福岡県' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const titles = [
        '米大統領選 2028',
        '日銀利上げ (9月)',
        'OpenAI GPT-5年内公開',
        'ビットコイン15万ドル到達',
        'イーサリアム現物ETF流入',
      ];
      const types: ('VOTE_YES' | 'VOTE_NO' | 'SMART_MONEY')[] = ['VOTE_YES', 'VOTE_NO', 'SMART_MONEY'];
      const locs = ['東京都', '神奈川県', '愛知県', '海外', '大阪府', '福岡県'];

      const randomTitle = titles[Math.floor(Math.random() * titles.length)];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomLoc = locs[Math.floor(Math.random() * locs.length)];

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const newItem: TapeItem = {
        id: String(Date.now()),
        time: timeStr,
        type: randomType,
        title: randomTitle,
        amountOrProb: randomType === 'SMART_MONEY' ? `+$${(Math.floor(Math.random() * 30) + 10) * 1000} 大口流入` : randomType === 'VOTE_YES' ? 'YES投票' : 'NO投票',
        location: randomLoc,
      };

      setTape((prev) => [newItem, ...prev.slice(0, 7)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="terminal-pane live-tape-pane">
      <div className="pane-title-bar live-tape-bar">
        <div className="title-text">
          <Activity size={13} className="icon-green" />
          <span className="pane-main-title">歩み値 ＆ 大口取引速報 ｜ Time & Sales</span>
        </div>
        <span className="live-pill-sm">● LIVE STREAM</span>
      </div>

      <div className="tape-items-scroll hide-native-scrollbar">
        {tape.map((item) => (
          <div key={item.id} className="tape-row">
            <span className="tape-time">{item.time}</span>
            <span className={`tape-badge ${item.type.toLowerCase()}`}>
              {item.type === 'SMART_MONEY' ? (
                <><Zap size={10} /> SMART MONEY</>
              ) : item.type === 'VOTE_YES' ? (
                <><TrendingUp size={10} /> YES 投票</>
              ) : (
                <><TrendingDown size={10} /> NO 投票</>
              )}
            </span>
            <span className="tape-title">{item.title}</span>
            <span className="tape-val">{item.amountOrProb}</span>
            {item.location && <span className="tape-loc">({item.location})</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
