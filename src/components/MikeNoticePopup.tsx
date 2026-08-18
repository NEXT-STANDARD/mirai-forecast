import React, { useState, useEffect } from 'react';
import { Mail, Sparkles, X, ArrowRight } from 'lucide-react';

interface MikeNoticePopupProps {
  onOpenLetter: () => void;
}

export const MikeNoticePopup: React.FC<MikeNoticePopupProps> = ({ onOpenLetter }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 過去に閉じたかチェック
    const hasClosed = localStorage.getItem('mirai_mike_notice_closed');
    if (!hasClosed) {
      // 1.5秒後にスタイリッシュにスライドイン
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('mirai_mike_notice_closed', 'true');
  };

  const handleOpen = () => {
    handleClose();
    onOpenLetter();
  };

  if (!isVisible) return null;

  return (
    <div className="mike-popup-container">
      <div className="mike-popup-card">
        {/* サイバーパンク装飾バー */}
        <div className="popup-neon-bar"></div>

        <button className="popup-close-btn" onClick={handleClose} aria-label="閉じる">
          <X size={14} />
        </button>

        <div className="popup-header">
          <div className="popup-icon-wrap">
            <Mail size={16} className="icon-gold animate-bounce" />
          </div>
          <div className="popup-titles">
            <span className="popup-tag">CONFIDENTIAL PROTOCOL</span>
            <h3 className="popup-title">あなたはマイク・エイドリン氏ですか？</h3>
          </div>
        </div>

        <p className="popup-desc">
          Polymarket Japan 代表 マイク・エイドリン様へ。<br />
          未来レーダー開発者・霧島フェニックスより、API利用への感謝と日本市場の法的課題に関する協力の公開書簡がございます。
        </p>

        <div className="popup-actions">
          <button className="btn-open-letter" onClick={handleOpen}>
            <Sparkles size={13} />
            <span>手紙を読む（OPEN LETTER）</span>
            <ArrowRight size={13} />
          </button>
          <button className="btn-dismiss" onClick={handleClose}>
            いいえ、一般の訪問者です
          </button>
        </div>
      </div>
    </div>
  );
};
