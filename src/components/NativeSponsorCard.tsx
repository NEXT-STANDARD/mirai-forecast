import React from 'react';
import type { MarketItem, MarketSponsor } from '../types';
import { ExternalLink } from 'lucide-react';

interface NativeSponsorCardProps {
  item: MarketItem;
  variant?: 'detail' | 'compact' | 'result';
}

/**
 * 銘柄ページのスポンサー枠。
 *
 * AR-33・AR-35: 以前はスポンサーの付いていない全銘柄に「出稿企業募集」の枠を出し、
 *   「ビジネスパーソン・投資家・意思決定者が集まる」「広告収益の50%は公認クリエイターへ還元」と書いていた。
 *   読者層の裏づけも、還元の相手（公認クリエイター）も仕組みも無く、問い合わせはどこにも届かずに
 *   「受け付けました」と返していた（/api/notify-admin が 404）。募集枠と問い合わせフォームは外し、
 *   実際にスポンサーが付いた銘柄だけ「広告」と明示して出す。
 */
export const NativeSponsorCard: React.FC<NativeSponsorCardProps> = ({ item, variant = 'detail' }) => {
  const sponsor: MarketSponsor | undefined = item.sponsor;
  if (!sponsor) return null;

  return (
    <div className={`detail-section-card border border-amber-500/30 bg-gradient-to-br from-[#0c1a2d] via-[#10243e] to-[#0c1a2d] p-4 rounded-xl shadow-lg relative overflow-hidden my-4 ${
      variant === 'compact' ? 'text-xs' : ''
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
            広告
          </span>
          <span className="text-xs text-slate-400">この銘柄のスポンサー{sponsor.badgeText ? `（${sponsor.badgeText}）` : ''}</span>
        </div>
        <a
          href={sponsor.actionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-amber-400 hover:text-amber-200 transition flex items-center gap-1"
        >
          <span>スポンサー公式 ↗</span>
        </a>
      </div>

      <div className="flex items-center gap-3">
        {sponsor.logoUrl && (
          <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0">
            <img
              src={sponsor.logoUrl}
              alt={sponsor.name}
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
        <div className="flex-1 space-y-0.5">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{sponsor.name}</span>
            <span className="text-xs font-normal text-amber-300/90">{sponsor.tagline}</span>
          </h4>
          {sponsor.description && (
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {sponsor.description}
            </p>
          )}
        </div>
        <div>
          <a
            href={sponsor.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs shadow transition whitespace-nowrap"
          >
            <span>{sponsor.actionText || '詳細を見る'}</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
