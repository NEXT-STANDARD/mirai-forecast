import React from 'react';
import { X, Award, ArrowRight, Target } from 'lucide-react';
import type { MarketItem } from '../types';

interface MyForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  userVotes: Record<string, 'YES' | 'NO'>;
  events: MarketItem[];
  onSelectEvent: (event: MarketItem) => void;
}

export const MyForecastModal: React.FC<MyForecastModalProps> = ({
  isOpen,
  onClose,
  userVotes,
  events,
  onSelectEvent,
}) => {
  if (!isOpen) return null;

  const votedEventIds = Object.keys(userVotes);
  const votedCount = votedEventIds.length;

  // 投票した銘柄一覧
  const votedItems = votedEventIds
    .map((id) => {
      const ev = events.find((e) => e.id === id || e.slug === id);
      return ev ? { event: ev, vote: userVotes[id] } : null;
    })
    .filter(Boolean) as { event: MarketItem; vote: 'YES' | 'NO' }[];

  // 的中判定の集計（確定済み銘柄がある場合）
  let resolvedCount = 0;
  let correctCount = 0;
  votedItems.forEach(({ event, vote }) => {
    if (event.resolvedChoice) {
      resolvedCount++;
      if (event.resolvedChoice === vote) correctCount++;
    }
  });

  const accuracyRate = resolvedCount > 0 ? Math.round((correctCount / resolvedCount) * 100) : null;

  // 予報士ランク判定
  let rankTitle = '🌱 ルーキー予報士 (Lv.1)';
  let rankDesc = '未来の直感を記録し始めた駆け出しアナリスト';
  let rankBadgeColor = 'text-slate-300 border-slate-700 bg-slate-800/60';

  if (votedCount >= 3) {
    rankTitle = '🔭 クォンツ・オブザーバー (Lv.2)';
    rankDesc = '世界のスマートマネーと世論のギャップを鋭く観察中';
    rankBadgeColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40';
  }
  if (votedCount >= 8) {
    rankTitle = '⚡ チーフ・ストラテジスト (Lv.3)';
    rankDesc = '多数の未来テーマに投票し、独自の世論ポートフォリオを構築中';
    rankBadgeColor = 'text-amber-400 border-amber-500/30 bg-amber-950/40';
  }
  if (votedCount >= 15) {
    rankTitle = '👑 未来マスター (Master Predictor)';
    rankDesc = '卓越した洞察力で世界の集合知と対峙する伝説の予報士';
    rankBadgeColor = 'text-rose-400 border-rose-500/30 bg-rose-950/40';
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card max-w-xl" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider">PREDICTOR PROFILE // 未来予報士</span>
              <h2 className="text-sm font-bold text-white">あなたの直感ポートフォリオ ＆ 予報履歴</h2>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* ランク ＆ スタッツカード */}
        <div className="p-4 space-y-4">
          <div className={`p-4 rounded-xl border ${rankBadgeColor} relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-slate-400">CURRENT RANK</span>
                <h3 className="text-base font-bold text-white mt-0.5">{rankTitle}</h3>
                <p className="text-xs text-slate-300 mt-1">{rankDesc}</p>
              </div>
              <div className="text-3xl">🔮</div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
              <div>
                <div className="text-[10px] text-slate-400">総投票数</div>
                <div className="text-base font-bold font-mono text-white">{votedCount} <span className="text-[10px] text-slate-400">件</span></div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">結果確定</div>
                <div className="text-base font-bold font-mono text-cyan-400">{resolvedCount} <span className="text-[10px] text-slate-400">件</span></div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">的中率 (Accuracy)</div>
                <div className="text-base font-bold font-mono text-emerald-400">{accuracyRate !== null ? `${accuracyRate}%` : '集計待機中'}</div>
              </div>
            </div>
          </div>

          {/* 過去の投票履歴リスト */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Target size={13} className="text-cyan-400" />
                <span>あなたが投票した未来の問い一覧 ({votedItems.length}件)</span>
              </h4>
            </div>

            {votedItems.length === 0 ? (
              <div className="py-8 px-4 text-center border border-dashed border-slate-800 rounded-lg">
                <p className="text-xs text-slate-400">まだ投票履歴がありません。</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  トップページの各銘柄で「YES / NO」に直感で投票すると、ここに自動記録されます。
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll pr-1">
                {votedItems.map(({ event, vote }) => (
                  <div
                    key={event.id}
                    onClick={() => {
                      onSelectEvent(event);
                      onClose();
                    }}
                    className="p-2.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {event.categoryLabel.slice(0, 6)}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">
                          世界オッズ: {event.worldProbYes}%
                        </span>
                      </div>
                      <h5 className="text-xs font-medium text-slate-100 truncate group-hover:text-cyan-300">
                        {event.titleJa}
                      </h5>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${vote === 'YES' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50' : 'bg-rose-950 text-rose-400 border border-rose-800/50'}`}>
                        [{vote}] に投票
                      </span>
                      <ArrowRight size={13} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center text-[11px] text-slate-500">
          <span>🔒 投票履歴はブラウザ内に安全に保存されています</span>
          <button onClick={onClose} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-all">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
