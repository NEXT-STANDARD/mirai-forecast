import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, Lock, Scale, AlertCircle } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // ⌨️ Esc キーでモーダルを閉じるアクセシビリティ対応
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content terms-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span className="font-extrabold text-sm text-slate-100">
              {activeTab === 'terms' ? '利用規約（Terms of Service）' : 'プライバシーポリシー（Privacy Policy）'}
            </span>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        {/* タブ切り替え */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'terms'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText size={13} />
            <span>利用規約</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock size={13} />
            <span>プライバシーポリシー</span>
          </button>
        </div>

        {/* 本文エリア（スクロール可能） */}
        <div className="modal-body-scroll custom-scroll text-xs text-slate-300 space-y-4 max-h-[70vh] p-5 leading-relaxed">
          {activeTab === 'terms' ? (
            <div className="space-y-4">
              <section>
                <h4 className="text-sm font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                  <Scale size={14} className="text-cyan-400" />
                  <span>第1条（総則および本サービスの性質）</span>
                </h4>
                <p>
                  未来レーダー（以下「本サービス」）は、世界の予測市場（Polymarket等）の公開データを集計・可視化し、日本国内の生活者によるオピニオン（世論）を収集・報道する中立的な情報メディアです。
                </p>
                <p className="mt-1 text-slate-400">
                  本サービスは、刑法第185条および第186条（賭博罪）に抵触するベッティング行為、金銭・財物の賭け、および換金可能なポイントの付与を一切行いません。本サイト内の投票は完全無料のアンケート調査です。
                </p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-400" />
                  <span>第2条（公職選挙法第138条の3の遵守）</span>
                </h4>
                <p>
                  本サービスは、日本国内の国政選挙および地方選挙の公示日から投開票日までの期間中、公職選挙法第138条の3（人気投票の公表の禁止）を厳格に遵守し、特定候補者・政党に関する新たな世論投票の受付を一時停止（ブラックアウト）いたします。
                </p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-slate-100 mb-1">第3条（免責事項および投資助言の否認）</h4>
                <p>
                  本サービスが提供する確率データおよびAI分析情報は、将来の出来事の発生を保証するものではありません。また、特定の金融商品、暗号資産、株式等の売買を推奨する投資助言（金融商品取引法上の投資助言業）ではありません。本情報を利用したことによるいかなる損害についても、当運営は一切の責任を負いかねます。
                </p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-slate-100 mb-1">第4条（禁止事項）</h4>
                <p>
                  利用者は、自動化ツール（ボット・スクレイピング）を用いた不正な大量投票、公序良俗に反するコミュニティ提案、誹謗中傷・名誉毀損行為を行ってはならないものとします。
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              <section>
                <h4 className="text-sm font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                  <Lock size={14} className="text-emerald-400" />
                  <span>1. 取得する情報および利用目的</span>
                </h4>
                <p>本サービスでは、サービスの改善、アクセス解析、および世論集計の正確性向上のため、以下の情報を取得する場合があります：</p>
                <ul className="list-disc list-inside space-y-1 mt-1 text-slate-400">
                  <li><strong>投票ログ</strong>: 選択肢（YES/NO）、投票日時、対象銘柄ID（統計集計目的）</li>
                  <li><strong>アクセス情報</strong>: IPアドレス、ブラウザ種別、リファラ、アクセス日時（Google Analytics 4 / GA4 経由）</li>
                  <li><strong>端末設定</strong>: LocalStorageによる投票履歴・称号ランク・連続観測日数のローカル保持</li>
                </ul>
              </section>

              <section>
                <h4 className="text-sm font-bold text-slate-100 mb-1">2. Cookieおよびローカルストレージの利用</h4>
                <p>
                  本サービスは、利用者の投票状態の保持およびGoogle Analyticsによる利用状況分析のためにCookieおよびブラウザのローカルストレージ（LocalStorage）を利用しています。ブラウザの設定によりCookieを無効化することができます。
                </p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-slate-100 mb-1">3. 第三者提供の制限</h4>
                <p>
                  当運営は、法令に基づく開示要請がある場合を除き、利用者の個人を特定できる情報を事前の同意なく第三者に提供することはありません。
                </p>
              </section>

              <section>
                <h4 className="text-sm font-bold text-slate-100 mb-1">4. プライバシーポリシーの改定およびお問い合わせ</h4>
                <p>
                  本ポリシーは法令の改正およびサービス改善に伴い改定されることがあります。お問い合わせは運営者（霧島フェニックス）または公開書簡ページ記載の窓口までご連絡ください。
                </p>
              </section>
            </div>
          )}
        </div>

        {/* フッターボタン */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold transition-all">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
