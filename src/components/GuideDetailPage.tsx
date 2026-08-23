import React, { useEffect } from 'react';
import { BookOpen, ArrowLeft, Share2, ArrowRight, ShieldCheck, Clock, Calendar, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { POLYMARKET_JAPAN_GUIDE } from '../content/guides/polymarketJapan';
import type { GuideArticle } from '../content/guides/polymarketJapan';
import type { MarketItem } from '../types';
import { applySeoMetadata } from '../utils/seoHelper';

interface GuideDetailPageProps {
  slug?: string;
  allEvents: MarketItem[];
  onSelectEvent: (market: MarketItem) => void;
  onBack: () => void;
}

export const GuideDetailPage: React.FC<GuideDetailPageProps> = ({
  allEvents,
  onSelectEvent,
  onBack,
}) => {
  const guide: GuideArticle = POLYMARKET_JAPAN_GUIDE; // 現在のガイド記事マスター

  useEffect(() => {
    applySeoMetadata({
      title: `${guide.title} ｜ 未来レーダー`,
      description: guide.description,
      canonicalUrl: `https://mirairadar.com/guide/${guide.slug}`,
      ogType: 'article'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [guide]);

  // 関連銘柄の取得
  const relatedMarkets = allEvents.filter(ev => 
    guide.relatedMarketSlugs.includes(ev.slug) || guide.relatedMarketSlugs.includes(ev.id)
  );

  const shareText = `【解説】${guide.title}
世界最大の予測市場Polymarketは日本から使えるのか？法規制と日本語での活用法まとめ。
#未来レーダー #Polymarket #予測市場 #MiraiRadar`;

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/guide/${guide.slug}` : `https://mirairadar.com/guide/${guide.slug}`;

  const handleTwitterShare = () => {
    const tweetIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetIntent, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="container main-content py-6 max-w-4xl mx-auto">
      {/* ナビゲーションバー */}
      <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-cyan-900/40">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/60 px-3 py-2 rounded-lg border border-cyan-800/50 transition"
        >
          <ArrowLeft size={14} />
          <span>トップ・マーケット一覧へ戻る</span>
        </button>

        <button
          onClick={handleTwitterShare}
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-white bg-[#1d9bf0] hover:bg-[#1a8cd8] px-3.5 py-2 rounded-lg transition shadow-md"
        >
          <Share2 size={13} />
          <span>Xで共有</span>
        </button>
      </div>

      {/* 記事ヘッダー */}
      <article className="bg-[#0b1320] border border-cyan-900/60 rounded-2xl p-6 sm:p-10 shadow-2xl space-y-8">
        <header className="space-y-4 border-b border-cyan-900/50 pb-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
            <span className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-800/80 font-bold flex items-center gap-1">
              <BookOpen size={12} />
              公式ガイド・法規制解説
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar size={12} />
              {guide.publishedAt}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock size={12} />
              読了目安 {guide.readTimeMin}分
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
            {guide.title}
          </h1>

          <p className="text-sm sm:text-base text-cyan-200/80 leading-relaxed font-medium">
            {guide.subtitle}
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono pt-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>執筆・監修：{guide.author}</span>
          </div>
        </header>

        {/* 本文セクション */}
        <div className="space-y-10 text-slate-200 text-sm sm:text-base leading-relaxed">
          {guide.sections.map((sec, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-cyan-300 flex items-center gap-2 border-l-4 border-cyan-500 pl-3 py-0.5">
                {sec.heading}
              </h2>

              {sec.content.map((p, pIdx) => {
                const parts = p.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={pIdx} className="text-slate-300 leading-relaxed">
                    {parts.map((part, partIdx) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                          <strong key={partIdx} className="text-white font-bold bg-cyan-950/60 px-1 py-0.5 rounded border border-cyan-800/40">
                            {part.slice(2, -2)}
                          </strong>
                        );
                      }
                      return part;
                    })}
                  </p>
                );
              })}

              {sec.callout && (
                <div className={`p-4 rounded-xl border flex gap-3 mt-4 ${
                  sec.callout.type === 'warning'
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                    : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200'
                }`}>
                  {sec.callout.type === 'warning' ? (
                    <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 size={20} className="text-cyan-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="font-bold">{sec.callout.title}</div>
                    <div className="opacity-90 leading-relaxed">{sec.callout.text}</div>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* 関連観測銘柄への誘導セクション (P1-3) */}
        {relatedMarkets.length > 0 && (
          <section className="pt-8 border-t border-cyan-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-cyan-400" />
                <span>今すぐチェックできる注目のリアルタイム観測銘柄</span>
              </h3>
              <span className="text-xs font-mono text-cyan-400">登録不要・完全無料</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {relatedMarkets.map((market) => (
                <button
                  key={market.id}
                  onClick={() => onSelectEvent(market)}
                  className="text-left bg-[#0f172a] hover:bg-cyan-950/60 border border-cyan-900/60 hover:border-cyan-500/80 p-3.5 rounded-xl transition duration-150 flex flex-col justify-between group shadow-sm hover:shadow-cyan-900/20"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-cyan-400 font-mono">
                      <span>{market.categoryLabel}</span>
                      <span className="font-bold text-cyan-300">世界オッズ: {market.worldProbYes}%</span>
                    </div>
                    <div className="text-xs font-bold text-slate-100 line-clamp-2 group-hover:text-cyan-300 transition">
                      {market.titleJa}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[11px] font-mono text-cyan-400 pt-2 group-hover:translate-x-1 transition">
                    <span>データを見る</span>
                    <ArrowRight size={11} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* フッター誘導 */}
        <footer className="pt-6 border-t border-cyan-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            © 2026 未来レーダー ｜ 世界の集合知 × 日本の世論インテリジェンス
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300 hover:text-white bg-cyan-900/50 hover:bg-cyan-800 px-4 py-2 rounded-lg transition border border-cyan-700/60"
          >
            <span>未来レーダー トップへ戻る</span>
            <ArrowRight size={13} />
          </button>
        </footer>
      </article>
    </div>
  );
};
