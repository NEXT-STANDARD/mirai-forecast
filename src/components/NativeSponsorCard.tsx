import React, { useState } from 'react';
import type { MarketItem, MarketSponsor } from '../types';
import { ExternalLink, Sparkles, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { sendSponsorInquiryNotification } from '../services/notificationService';

interface NativeSponsorCardProps {
  item: MarketItem;
  variant?: 'detail' | 'compact' | 'result';
}

export const NativeSponsorCard: React.FC<NativeSponsorCardProps> = ({ item, variant = 'detail' }) => {
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [budgetMonthly, setBudgetMonthly] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sponsor: MarketSponsor | undefined = item.sponsor;

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !email.trim() || !contactName.trim()) {
      setSubmitError('会社名・ご担当者名・メールアドレスを入力してください。');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await sendSponsorInquiryNotification({
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        targetMarketTitle: item.titleJa,
        targetCategory: item.categoryLabel,
        budgetMonthly: budgetMonthly.trim(),
        message: message.trim() || '銘柄コンテクスト連動型スポンサーシップへの出稿相談',
      });

      if (res.success) {
        setIsSubmitted(true);
      } else {
        setSubmitError(res.message || '送信に失敗しました。');
      }
    } catch {
      setSubmitError('通信エラーが発生しました。時間をおいて再試行してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // スポンサーが未設定の場合は、出稿企業募集のネイティブ枠として表示
  if (!sponsor) {
    if (variant === 'compact') {
      return (
        <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs">
          <span className="text-slate-400">💡 この銘柄の公式スポンサー募集中</span>
          <button
            onClick={() => setShowInquiryModal(true)}
            className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
          >
            出稿詳細 ↗
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="detail-section-card bg-gradient-to-br from-slate-900/90 via-[#0a1526]/80 to-slate-900/90 border border-slate-800/80 p-4 rounded-xl shadow-lg relative overflow-hidden my-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                Official Partner
              </span>
              <span className="text-xs text-slate-400">コンテクスト連動型 ネイティブ・スポンサー枠</span>
            </div>
            <button
              onClick={() => setShowInquiryModal(true)}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer"
            >
              <span>この銘柄にスポンサー出稿する</span>
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
            <div className="space-y-1 max-w-xl">
              <p className="text-sm font-semibold text-slate-200">
                「{item.titleJa}」の関心層へダイレクトにリーチ
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                知的好奇心の高いビジネスパーソン・投資家・意思決定者が集まる未来レーダー上で、自然で信頼性の高いブランドタイアップ枠を提供します（広告収益の50%は公認クリエイターへ還元）。
              </p>
            </div>
            <button
              onClick={() => setShowInquiryModal(true)}
              className="px-4 py-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 hover:text-white font-bold text-xs transition shadow-sm cursor-pointer"
            >
              出稿のお問い合わせ
            </button>
          </div>
        </div>

        {/* 出稿お問い合わせモーダル */}
        {showInquiryModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setShowInquiryModal(false);
                  setIsSubmitted(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 cursor-pointer"
                aria-label="閉じる"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">スポンサーシップ出稿のお問い合わせ</h3>
                  <p className="text-xs text-slate-400">銘柄コンテクスト連動型 ネイティブタイアップ枠</p>
                </div>
              </div>

              {isSubmitted ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-base font-bold text-white">お問い合わせを受け付けました</h4>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                    ご入力いただいたメールアドレス（{email}）宛てに、運営担当者より媒体資料および掲載プランのご案内をお送りいたします。
                  </p>
                  <button
                    onClick={() => {
                      setShowInquiryModal(false);
                      setIsSubmitted(false);
                    }}
                    className="mt-4 px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    閉じる
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitInquiry} className="space-y-4 pt-2">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                    <div className="text-slate-400">対象銘柄:</div>
                    <div className="font-bold text-cyan-300">{item.titleJa}</div>
                    <div className="text-[11px] text-slate-500">カテゴリー: {item.categoryLabel}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      貴社名・組織名 <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="例: 株式会社次世代総研"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        ご担当者名 <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="例: 山田 太郎"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        ご連絡先メールアドレス <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="taro@example.com"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ご想定のご予算感（任意）
                    </label>
                    <select
                      value={budgetMonthly}
                      onChange={(e) => setBudgetMonthly(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">選択してください</option>
                      <option value="5万〜10万円 / 月">5万〜10万円 / 月（トライアル掲載）</option>
                      <option value="10万〜30万円 / 月">10万〜30万円 / 月（特定カテゴリ独占枠）</option>
                      <option value="30万円以上 / 月">30万円以上 / 月（全体タイアップ＆API連携）</option>
                      <option value="未定・相談したい">未定・相談したい</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ご要望・アピールしたいサービス内容
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="例: 当該分野の最新レポートや関連カンファレンスの告知を掲載したい"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {submitError && (
                    <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                      {submitError}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <ShieldCheck size={13} className="text-emerald-400" />
                      <span>広告費の50%は公認クリエイターへ還元されます</span>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                    >
                      <Send size={13} />
                      <span>{isSubmitting ? '送信中...' : '出稿相談を送信'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // スポンサーが登録されている場合の実表示
  return (
    <div className={`detail-section-card border border-amber-500/30 bg-gradient-to-br from-[#0c1a2d] via-[#10243e] to-[#0c1a2d] p-4 rounded-xl shadow-lg relative overflow-hidden my-4 ${
      variant === 'compact' ? 'text-xs' : ''
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
            {sponsor.badgeText || 'Official Partner'}
          </span>
          <span className="text-xs text-slate-400">銘柄公式スポンサー</span>
          {sponsor.isCreatorReferred && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              クリエイター還元適用中
            </span>
          )}
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
