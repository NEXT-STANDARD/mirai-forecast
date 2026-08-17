import React from 'react';
import { ShieldCheck, Info, Scale, Lock } from 'lucide-react';

export const ComplianceBanner: React.FC = () => {
  return (
    <footer className="compliance-footer">
      <div className="container compliance-container">
        <div className="compliance-header">
          <div className="shield-icon-box">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h4 className="compliance-title">コンプライアンス及び利用規約に関する重要事項</h4>
            <p className="compliance-subtitle">
              未来予報（Mirai Forecast）は、世界の分散型市場データを中立的に報道・分析する情報キュレーション＆世論調査メディアです。
            </p>
          </div>
        </div>

        <div className="compliance-grid">
          <div className="compliance-item">
            <div className="item-title">
              <Lock size={16} />
              <span>賭博行為の完全排除（刑法185条・186条遵守）</span>
            </div>
            <p>
              当サイト内では、有償・無償を問わずベッティング（賭け）機能は一切提供していません。金銭や換金性のあるポイントのやり取りは一切発生しません。
            </p>
          </div>

          <div className="compliance-item">
            <div className="item-title">
              <Scale size={16} />
              <span>世論調査（アンケート）の性質</span>
            </div>
            <p>
              当サイト内の投票機能は、Yahoo!ニュース等の意識調査と同様の、財産的価値を伴わない完全無料のオピニオン集計です。
            </p>
          </div>

          <div className="compliance-item">
            <div className="item-title">
              <Info size={16} />
              <span>データの引用元と免責事項</span>
            </div>
            <p>
              世界の確率はPolymarketの公開APIより取得した統計値であり、将来の結果を保証するものではありません。投資判断等の最終決定はご自身の責任で行ってください。
            </p>
          </div>
        </div>

        <div className="footer-bottom-copy">
          © 2026 未来予報 Project (Mirai Forecast). Powered by Polymarket Public Data & Gemini AI.
        </div>
      </div>
    </footer>
  );
};
