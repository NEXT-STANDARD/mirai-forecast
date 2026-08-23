import React, { useState, useEffect } from 'react';
import { 
  Award,
  ArrowLeft, 
  Target, 
  Flame, 
  Trophy, 
  Share2, 
  Crown, 
  Lock, 
  CheckCircle2, 
  Layers
} from 'lucide-react';
import type { MarketItem, StreakData } from '../types';
import { calculateUserRank, RANK_TIERS } from '../utils/rankSystem';
import { applySeoMetadata } from '../utils/seoHelper';

interface ForecastHubPageProps {
  userVotes: Record<string, 'YES' | 'NO'>;
  events: MarketItem[];
  streak: StreakData;
  onBack: () => void;
  onSelectEvent: (event: MarketItem) => void;
}

export const ForecastHubPage: React.FC<ForecastHubPageProps> = ({
  userVotes,
  events,
  streak,
  onBack,
  onSelectEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'ranks' | 'leaderboard'>('profile');

  // SEO & カノニカル設定
  useEffect(() => {
    applySeoMetadata({
      title: 'サイバー予報士プロファイル ＆ 全国ランキング ｜ 未来レーダー (MiraiRadar)',
      description: '未来レーダーのサイバー予報士ランク制度（Lv.1〜Lv.10）。あなたの未来予報的中率、連続ストリーク、投票ポートフォリオ、全国クォンツランキングをリアルタイム可視化。',
      // /forecast・/profile・/rankings が1コンポーネント。canonical は実パスから決める
      canonicalUrl: `https://mirairadar.com${typeof window !== 'undefined' && ['/forecast', '/profile', '/rankings'].includes(window.location.pathname) ? window.location.pathname : '/forecast'}`,
      ogType: 'website',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const votedEventIds = Object.keys(userVotes);
  const votedCount = votedEventIds.length;

  // 投票した銘柄一覧
  const votedItems = votedEventIds
    .map((id) => {
      const ev = events.find((e) => e.id === id || e.slug === id);
      return ev ? { event: ev, vote: userVotes[id] } : null;
    })
    .filter(Boolean) as { event: MarketItem; vote: 'YES' | 'NO' }[];

  // 的中判定の集計
  let resolvedCount = 0;
  let correctCount = 0;
  votedItems.forEach(({ event, vote }) => {
    if (event.resolvedChoice) {
      resolvedCount++;
      if (event.resolvedChoice === vote) correctCount++;
    }
  });

  const accuracyRate = resolvedCount > 0 ? Math.round((correctCount / resolvedCount) * 100) : null;

  // 🏆 サイバー予報士ランク計算 (Lv.1〜Lv.10)
  const currentRank = calculateUserRank(votedCount);

  // X自慢シェアリンク生成（実データのみ反映）
  const handleShareToX = () => {
    const accText = accuracyRate !== null 
      ? `的中率: 🎯 ${accuracyRate}% (${resolvedCount}件確定中 ${correctCount}件的中)` 
      : `観測投票実績: 📊 ${votedCount}件`;
    const shareText = `【未来レーダー】私のサイバー予報士ステータス
称号: ${currentRank.icon} [ Lv.${currentRank.level} ${currentRank.title} ]
${accText}
連続観測ストリーク: 🔥 ${streak.currentStreak}日連続

世界のスマートマネー（Polymarket）vs 日本の生活者世論
あなたも1秒で直感投票！👇
https://mirairadar.com/forecast

#未来レーダー #サイバー予報士 #Polymarket #世論調査`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="forecast-hub-page-container">
      {/* 1. ナビゲーションバー */}
      <div className="forecast-hub-nav">
        <button onClick={onBack} className="btn-back-link">
          <ArrowLeft size={16} />
          <span>マーケット一覧へ戻る</span>
        </button>

        <div className="flex items-center gap-2">
          <button onClick={handleShareToX} className="btn-market-share-trigger">
            <Share2 size={14} />
            <span>ステータスを 𝕏 でシェア</span>
          </button>
        </div>
      </div>

      {/* 2. ヒーローセクション */}
      <div 
        className="forecast-hub-hero"
        style={{
          borderColor: currentRank.borderColor,
          boxShadow: `0 0 30px ${currentRank.borderColor}22`,
        }}
      >
        <div className="forecast-hub-hero-inner">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="hub-hero-tag font-mono">CYBER FORECASTER PROFILE</span>
              <span className="hub-hero-level font-mono font-black" style={{ color: currentRank.color }}>
                {currentRank.icon} LEVEL {currentRank.level}
              </span>
            </div>

            <h1 className="hub-hero-title" style={{ color: currentRank.color }}>
              {currentRank.title}
              <span className="hub-hero-title-en font-mono text-sm text-slate-400 ml-3">
                // {currentRank.titleEn}
              </span>
            </h1>

            <p className="hub-hero-desc">{currentRank.description}</p>
          </div>

          {/* EXP 進捗カード */}
          <div className="hub-exp-card">
            <div className="flex justify-between items-center text-xs font-mono mb-1.5">
              <span className="text-slate-300">EXP (投票総数): <strong className="text-cyan-400">{votedCount}</strong> 票</span>
              <span style={{ color: currentRank.color }} className="font-bold">
                {currentRank.isMaxLevel ? 'MAX RANK' : `次まで: あと ${currentRank.nextLevelExp - currentRank.currentExp} 票`}
              </span>
            </div>

            <div className="hub-exp-track">
              <div 
                className="hub-exp-fill" 
                style={{ 
                  width: `${currentRank.progressPercent}%`,
                  background: currentRank.color,
                  boxShadow: `0 0 12px ${currentRank.color}`
                }}
              />
            </div>
          </div>
        </div>

        {/* 3大スタッツバー */}
        <div className="hub-stats-grid">
          <div className="hub-stat-item">
            <div className="hub-stat-label">
              <Target size={16} className="text-cyan-400" />
              <span>総投票実績</span>
            </div>
            <div className="hub-stat-value text-cyan-400 font-mono">
              {votedCount}
              <span className="text-xs text-slate-400 ml-1">件</span>
            </div>
            <div className="hub-stat-sub">観測参加マーケット</div>
          </div>

          <div className="hub-stat-item">
            <div className="hub-stat-label">
              <Flame size={16} className="text-amber-400" />
              <span>連続ストリーク</span>
            </div>
            <div className="hub-stat-value text-amber-400 font-mono">
              {streak.currentStreak}
              <span className="text-xs text-slate-400 ml-1">日連続</span>
            </div>
            <div className="hub-stat-sub">最高記録: {streak.maxStreak} 日</div>
          </div>

          <div className="hub-stat-item">
            <div className="hub-stat-label">
              <Award size={16} className="text-rose-400" />
              <span>予想的中率</span>
            </div>
            <div className="hub-stat-value text-rose-400 font-mono">
              {accuracyRate !== null ? `${accuracyRate}%` : '---'}
            </div>
            <div className="hub-stat-sub">
              {resolvedCount > 0 ? `${resolvedCount}件中 ${correctCount}件的中` : '結果確定待ち'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. タブナビゲーション */}
      <div className="forecast-hub-tabs">
        <button
          className={`forecast-hub-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Layers size={16} />
          <span>あなたが投票したマーケット ({votedCount})</span>
        </button>

        <button
          className={`forecast-hub-tab-btn ${activeTab === 'ranks' ? 'active' : ''}`}
          onClick={() => setActiveTab('ranks')}
        >
          <Crown size={16} />
          <span>全10階級コレクション</span>
        </button>

        <button
          className={`forecast-hub-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Trophy size={16} />
          <span>全国クォンツ・リーダーボード</span>
        </button>
      </div>

      {/* 4. タブコンテンツ */}
      <div className="forecast-hub-tab-content">
        {/* タブ1: 投票マーケット一覧 */}
        {activeTab === 'profile' && (
          <div className="forecast-hub-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers size={18} className="text-cyan-400" />
                <span>投票ポートフォリオ一覧 ({votedCount}件)</span>
              </h2>
            </div>

            {votedItems.length === 0 ? (
              <div className="hub-empty-state">
                <div className="empty-icon-wrap">🔭</div>
                <p className="text-base font-bold text-slate-200">まだ投票したマーケットがありません</p>
                <p className="text-xs text-slate-400 max-w-md mt-1">
                  トップページの気になるテーマに「YES」か「NO」で投票すると、あなたの予報士データが記録され階級がアンロックされます！
                </p>
                <button onClick={onBack} className="btn-primary-data mt-4">
                  マーケット一覧を見に行く
                </button>
              </div>
            ) : (
              <div className="hub-vote-grid">
                {votedItems.map(({ event, vote }) => (
                  <div
                    key={event.id}
                    className="hub-vote-card"
                    onClick={() => onSelectEvent(event)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectEvent(event);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${event.titleJa || event.title}の詳細を見る`}
                  >
                    <div className="hub-vote-header-row">
                      <span className={`history-vote-badge ${vote.toLowerCase()}`}>
                        あなたの投票: {vote}
                      </span>
                      <span className="hub-vote-category">{event.categoryLabel}</span>
                    </div>

                    <h3 className="hub-vote-title">{event.titleJa || event.title}</h3>

                    <div className="hub-vote-meta">
                      <span className="hub-vote-meta-world">🌍 世界オッズ: YES {event.worldProbYes}%</span>
                      <span className="hub-vote-meta-japan">🇯🇵 日本世論: YES {event.japanVotes.percentYes}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* タブ2: 全10階級一覧 */}
        {activeTab === 'ranks' && (
          <div className="forecast-hub-card">
            <h2 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
              <Crown size={18} className="text-amber-400" />
              <span>サイバー予報士 全10階級コレクション・マトリクス</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              未来レーダーでの投票実績（EXP）に応じて階級がアンロックされます。最高位「Lv.10 伝説の予報神」を目指しましょう。
            </p>

            <div className="rank-tier-grid">
              {RANK_TIERS.map((tier) => {
                const isUnlocked = votedCount >= tier.minVotes;
                const isCurrent = currentRank.level === tier.level;

                return (
                  <div
                    key={tier.level}
                    className={`rank-tier-card ${isCurrent ? 'current' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
                    style={{
                      borderColor: isCurrent ? tier.color : undefined,
                    }}
                  >
                    <div className="tier-header-row">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{tier.icon}</span>
                        <div>
                          <div className="tier-level-num font-mono text-xs text-slate-400">
                            LEVEL {tier.level} // {tier.titleEn}
                          </div>
                          <div className="tier-title font-bold text-base" style={{ color: tier.color }}>
                            {tier.title}
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="badge-current-rank">現在の階級</span>
                      ) : isUnlocked ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-mono font-bold">
                          <CheckCircle2 size={16} />
                          <span>解禁済</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
                          <Lock size={14} />
                          <span>未解放</span>
                        </div>
                      )}
                    </div>

                    <p className="tier-desc text-xs text-slate-300 mt-2">{tier.description}</p>

                    <div className="tier-req-bar mt-3 font-mono text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                      必要投票実績: <strong className="text-slate-200">{tier.minVotes} 票</strong> 〜 {tier.maxVotes === Infinity ? '無制限' : `${tier.maxVotes} 票`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* タブ3: 全国リーダーボード */}
        {activeTab === 'leaderboard' && (
          <div className="forecast-hub-card">
            <h2 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              <span>全国クォンツ・リーダーボード（β版）</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              あなたの現在の観測実績と階級ステータスです。※ 全国ユーザーとのリアルタイムランキングはアカウント機能と連携して公開予定です。
            </p>

            <div className="leaderboard-table">
              <div className="leaderboard-row user-row">
                <div className="leaderboard-rank font-mono font-black text-base text-amber-400">
                  {currentRank.icon}
                </div>

                <div className="leaderboard-user-info">
                  <div className="leaderboard-name font-bold text-sm flex items-center gap-2">
                    <span>あなた (ローカル実績)</span>
                    <span className="you-badge font-mono">YOU</span>
                  </div>
                  <div className="leaderboard-badge text-xs text-slate-400">
                    Lv.{currentRank.level} {currentRank.title}
                  </div>
                </div>

                <div className="leaderboard-stats font-mono text-right">
                  <div className="stat-acc text-cyan-400 font-bold text-base">
                    {accuracyRate !== null ? `${accuracyRate}%` : '—'}
                  </div>
                  <div className="stat-sub text-xs text-slate-400">
                    {votedCount}票 / 🔥{streak.currentStreak}日連続
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center gap-2">
              <span className="text-amber-400">ℹ️</span>
              <span>投票数と的中実績を積み上げることで、階級バッジと限定称号がアンロックされます。</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
