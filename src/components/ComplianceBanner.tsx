import React from 'react';
import { ShieldCheck, Info, Scale, Lock } from 'lucide-react';

interface ComplianceBannerProps {
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

export const ComplianceBanner: React.FC<ComplianceBannerProps> = ({
  onOpenTerms,
  onOpenPrivacy,
}) => {
  return (
    <footer className="compliance-footer">
      <div className="container compliance-container">
        {/* ヘッダーブロック */}
        <div className="compliance-header">
          <div className="shield-icon-box">
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div className="compliance-header-text">
            <h4 className="compliance-title">コンプライアンス及び利用規約に関する重要事項</h4>
            <p className="compliance-subtitle">
              未来レーダー（MiraiRadar.com）は、世界の分散型市場データを中立的に報道・分析するオルタナティブデータ＆世論調査メディアです。
            </p>
          </div>
        </div>

        {/* 3カラム・コンプライアンスカードグリッド */}
        <div className="compliance-grid">
          <div className="compliance-card">
            <div className="compliance-card-title text-rose-400">
              <Lock size={15} />
              <span>賭博行為の完全排除（刑法185条・186条遵守）</span>
            </div>
            <p className="compliance-card-text">
              当サイト内では、有償・無償を問わずベッティング（賭け）機能は一切提供していません。金銭や換金性のあるポイントのやり取りは一切発生しません。
            </p>
          </div>

          <div className="compliance-card">
            <div className="compliance-card-title text-cyan-400">
              <Scale size={15} />
              <span>世論調査（アンケート）の性質</span>
            </div>
            <p className="compliance-card-text">
              当サイト内の投票機能は、Yahoo!ニュース等の意識調査と同様の、財産的価値を伴わない完全無料のオピニオン集計です。
            </p>
          </div>

          <div className="compliance-card">
            <div className="compliance-card-title text-amber-400">
              <Info size={15} />
              <span>データの引用元と免責事項</span>
            </div>
            <p className="compliance-card-text">
              世界の確率はPolymarketの公開APIより取得した統計値であり、将来の結果を保証するものではありません。投資判断等の最終決定はご自身の責任で行ってください。
            </p>
          </div>
        </div>

        {/* フッター規約リンク ＆ コピーライト */}
        <div className="footer-bottom-row">
          <div className="footer-links-group">
            {onOpenTerms && (
              <button onClick={onOpenTerms} className="footer-link-btn">
                利用規約
              </button>
            )}
            <span className="footer-link-divider">｜</span>
            {onOpenPrivacy && (
              <button onClick={onOpenPrivacy} className="footer-link-btn">
                プライバシーポリシー
              </button>
            )}
          </div>

          <div className="footer-bottom-copy">
            © 2026 未来レーダー (MiraiRadar.com). Powered by Polymarket Public Data & Gemini 3.7 Flash.
          </div>
        </div>
      </div>
    </footer>
  );
};
