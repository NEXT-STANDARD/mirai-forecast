import React, { useState } from 'react';
import { Sparkles, X, ChevronRight } from 'lucide-react';

export const QuickGuideBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem('mirairadar_guide_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  if (isDismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    try {
      localStorage.setItem('mirairadar_guide_dismissed', 'true');
    } catch {}
  };

  return (
    <div className="quick-guide-strip-wrap">
      <div
        className={`quick-guide-strip ${isOpen ? 'expanded' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="strip-header">
          <div className="strip-left">
            <span className="strip-badge">
              <Sparkles size={12} className="icon-gold" />
              <span>10秒でわかる使い方</span>
            </span>
            <span className="strip-summary">
              世界のお金（Polymarket）と日本の世論のズレを可視化する無料メディア
            </span>
          </div>

          <div className="strip-right">
            <span className="toggle-hint">
              {isOpen ? '閉じる' : '詳しく見る'} <ChevronRight size={12} className={isOpen ? 'rotate-90' : ''} />
            </span>
            <button
              onClick={handleDismiss}
              className="dismiss-btn"
              title="ガイドを非表示にする"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="strip-content-body animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="guide-steps-grid">
              <div className="guide-step-card">
                <div className="step-num">1</div>
                <div className="step-text">
                  <strong>🌍 世界のお金（Polymarket）</strong>
                  <p>世界中の投資家がリアルマネーで予測した客観的な発生確率（0〜100%）をリアルタイム配信。</p>
                </div>
              </div>

              <div className="guide-step-card">
                <div className="step-num">2</div>
                <div className="step-text">
                  <strong>🔒 直感でブラインド投票</strong>
                  <p>先入観を防ぐため日本の世論は隠されています。「YES/NO」を押すだけで真実の世論が開示！</p>
                </div>
              </div>

              <div className="guide-step-card">
                <div className="step-num">3</div>
                <div className="step-text">
                  <strong>⚡ 世論スプレッドをXで議論</strong>
                  <p>「世界は30%だけど日本は80%！」といった驚きの世論ギャップをワンクリックでXにシェア。</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
