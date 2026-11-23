import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, Lock, Scale, AlertCircle } from 'lucide-react';
import { useFocusTrap } from '../utils/useFocusTrap';

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
  const modalRef = useFocusTrap(isOpen, onClose);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="利用規約およびプライバシーポリシー">
      <div className="terms-modal-card" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="modal-header">
          <div className="terms-header-title">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span>
              {activeTab === 'terms' ? '利用規約（Terms of Service）' : 'プライバシーポリシー（Privacy Policy）'}
            </span>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        {/* タブ切り替え */}
        <div className="terms-tab-bar">
          <button
            onClick={() => setActiveTab('terms')}
            className={`terms-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
          >
            <FileText size={14} />
            <span>利用規約</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`terms-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
          >
            <Lock size={14} />
            <span>プライバシーポリシー</span>
          </button>
        </div>

        {/* 本文エリア（スクロール可能） */}
        <div className="terms-body-scroll">
          {activeTab === 'terms' ? (
            <>
              <div>
                <h4 className="terms-section-title">
                  <Scale size={15} className="text-cyan-400" />
                  <span>第1条（総則および本サービスの性質）</span>
                </h4>
                <p>
                  未来レーダー（以下「本サービス」）は、ＤＥＬＩＣＩＯＵＳ株式会社（届出電気通信事業者：届出番号 Ａ－０８－２４２３７、以下「当社」）が運営する情報メディアであり、世界の予測市場（Polymarket等）の公開データを集計・可視化し、日本国内の生活者によるオピニオン（世論）を収集・報道する中立的な情報ポータルです。
                </p>
                <p style={{ marginTop: '0.4rem', color: '#8a96a8' }}>
                  本サービスは、刑法第185条および第186条（賭博罪）に抵触するベッティング行為、金銭・財物の賭け、および換金可能なポイントの付与を一切行いません。本サイト内の投票は完全無料のアンケート調査です。
                </p>
              </div>

              <div>
                <h4 className="terms-section-title">
                  <AlertCircle size={15} className="text-amber-400" />
                  <span>第2条（選挙に関する問いの扱い）</span>
                </h4>
                <p>
                  本サービスは、日本国内の国政選挙および地方選挙について、特定の候補者や政党の当落・得票を問う銘柄は、審査で採用せず掲載しない方針です（公職選挙法第138条の3 が禁じる人気投票の公表に当たらないようにするためです）。選挙の期間中に投票の受付を自動で止める仕組みはありません。
                </p>
              </div>

              <div>
                <h4 className="terms-section-title">第3条（免責事項および投資助言の否認）</h4>
                <p>
                  本サービスが提供する確率データおよびAI分析情報は、将来の出来事の発生を保証するものではありません。また、特定の金融商品、暗号資産、株式等の売買を推奨する投資助言（金融商品取引法上の投資助言業）ではありません。本情報を利用したことによるいかなる損害についても、当運営は一切の責任を負いかねます。
                </p>
              </div>

              <div>
                <h4 className="terms-section-title">第4条（禁止事項）</h4>
                <p>
                  利用者は、自動化ツール（ボット・スクレイピング）を用いた不正な大量投票、公序良俗に反するコミュニティ提案、誹謗中傷・名誉毀損行為を行ってはならないものとします。
                </p>
              </div>
            </>
          ) : (
            <>
              {/* AR-30・AR-31: 実際に保存・送信しているものを書く（2026-11-24 改定）。
                  項目を増減したら、ここも同時に直すこと */}
              <div>
                <h4 className="terms-section-title">
                  <Lock size={15} className="text-emerald-400" />
                  <span>1. 当社が保存する情報と利用目的</span>
                </h4>
                <ul className="terms-list">
                  <li>
                    <strong>投票の記録</strong>（クラウドデータベース Supabase に保存）: 選んだ選択肢（YES/NO）、投票日時、対象の銘柄、端末の種類（スマートフォン／パソコンの別）、
                    参照元のページの URL（リファラ）、重複投票を防ぐための識別子（ブラウザに保存した乱数と銘柄から作るもので、氏名やメールアドレスは含みません）。
                    利用目的は、世論の集計と表示、重複投票の防止、サービスの改善です。
                    集計に使うため、投票の記録（上の各項目）は、このサイトのデータ公開の仕組みを通じて誰でも読める状態にあります。
                  </li>
                  <li>
                    <strong>銘柄の提案</strong>: 提案フォームに入力した内容（問い、締切、判定に使う情報源、背景、任意で入力した提案者名）。審査と掲載のために使い、入力した内容は公開されます。
                  </li>
                  <li>
                    <strong>ブラウザ内の保存</strong>（LocalStorage）: 投票済みの銘柄、称号ランク、連続観測日数など。お使いのブラウザの中だけに保存され、当社には送られません。
                  </li>
                </ul>
                <p style={{ marginTop: '0.4rem', color: '#8a96a8' }}>
                  公認クリエイターの申請（氏名・メールアドレス等の入力）は、現在受け付けていません。
                </p>
              </div>

              <div>
                <h4 className="terms-section-title">2. 外部への送信（利用者情報の外部送信）</h4>
                <p>本サービスのページを開くと、次の事業者へ、お使いの端末から情報が送信されます。</p>
                <ul className="terms-list">
                  <li>
                    <strong>Google アナリティクス 4</strong>（送信先: Google LLC）: 閲覧したページの URL、参照元、端末・ブラウザの種類、おおよその地域、Cookie による識別子、IP アドレスなど。
                    利用目的は、アクセス状況の把握とサービスの改善です。
                    Google によるデータの扱いは <a href="https://policies.google.com/technologies/partner-sites?hl=ja" target="_blank" rel="noopener noreferrer">Google のサイトでの説明</a> を、
                    送信を止めたい場合は <a href="https://tools.google.com/dlpage/gaoptout?hl=ja" target="_blank" rel="noopener noreferrer">Google アナリティクス オプトアウト アドオン</a> をご覧ください。
                  </li>
                  <li>
                    <strong>Cloudflare Web Analytics</strong>（送信先: Cloudflare, Inc.）: 閲覧したページの URL、参照元、ページの読み込み時間などの性能情報、端末・ブラウザの種類。
                    利用目的は、アクセス状況と表示速度の把握です。Cookie は使いません。
                    詳しくは <a href="https://www.cloudflare.com/ja-jp/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare のプライバシーポリシー</a> をご覧ください。
                  </li>
                  <li>
                    <strong>表示に必要な取得</strong>: 確率データ（Polymarket）、投票の集計（Supabase）、画像やフォントの配信元から、表示のためにデータを取得します。
                    その際、通常の通信と同じく、IP アドレスやブラウザの種類がそれぞれの事業者に伝わります。
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="terms-section-title">3. 第三者提供</h4>
                <p>
                  当社は、法令に基づく場合を除き、本人の同意なく個人データを第三者に提供しません。上の「外部への送信」は、各事業者のサービスを利用するためのものです。
                </p>
              </div>

              <div>
                <h4 className="terms-section-title">4. 開示等の請求・お問い合わせ窓口</h4>
                <p>
                  保有する個人データの開示・訂正・利用停止等のご請求、苦情、その他のお問い合わせは、下記の運営者までご連絡ください。ご本人であることを確認したうえで、法令に従って対応します。
                </p>
                <ul className="terms-list">
                  <li>運営者: ＤＥＬＩＣＩＯＵＳ株式会社（代表取締役 大山 圭太）</li>
                  <li>所在地: 〒104-0061 東京都中央区銀座１丁目１５番４号 ヒューリック銀座一丁目昭和通りビル７階（郵送）</li>
                  <li>X: <a href="https://x.com/MiraiRadar" target="_blank" rel="noopener noreferrer">@MiraiRadar</a></li>
                </ul>
              </div>

              <div>
                <h4 className="terms-section-title">5. 安全管理と改定</h4>
                <p>
                  当社は、取り扱う情報の漏えい等を防ぐため、保存先へのアクセス権限の管理など必要な措置を講じます。本ポリシーは、法令の改正やサービスの変更に伴い改定することがあります。
                </p>
                <p style={{ marginTop: '0.4rem', color: '#8a96a8' }}>2026年11月24日 改定</p>
              </div>
            </>
          )}
        </div>

        {/* フッターボタン */}
        <div className="terms-footer-bar">
          <button onClick={onClose} className="terms-close-action-btn">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
