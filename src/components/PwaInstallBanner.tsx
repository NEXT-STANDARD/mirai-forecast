import React, { useState, useEffect } from 'react';
import { Smartphone, Bell, X, Download, Check } from 'lucide-react';
import { pwaManager } from '../utils/pwaManager';

export const PwaInstallBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [notificationState, setNotificationState] = useState<NotificationPermission>('default');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // すでに閉じたか、スタンドアロンなら非表示
    try {
      const dismissed = localStorage.getItem('mirairadar_pwa_dismissed');
      if (!dismissed && !pwaManager.getIsInstalled()) {
        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationState(Notification.permission);
    }
  }, []);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('mirairadar_pwa_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  const handleInstallApp = async () => {
    setIsInstalling(true);
    const accepted = await pwaManager.promptInstall();
    if (accepted) {
      setIsVisible(false);
    }
    setIsInstalling(false);
  };

  const handleEnableNotifications = async () => {
    const res = await pwaManager.requestNotificationPermission();
    setNotificationState(res);
  };

  return (
    <div className="pwa-floating-banner animate-fade-in">
      <div className="pwa-banner-card">
        <button onClick={handleDismiss} className="pwa-close-btn" aria-label="閉じる">
          <X size={14} />
        </button>

        <div className="pwa-content-row">
          <div className="pwa-icon-glow">
            <Smartphone size={20} className="text-cyan-400" />
          </div>

          <div className="pwa-text-block">
            <div className="pwa-title-row flex items-center gap-1.5">
              <span className="font-bold text-xs text-slate-100">未来レーダー アプリ ＆ 的中速報</span>
              <span className="pwa-badge font-mono">PWA</span>
            </div>
            <p className="pwa-desc text-[11px] text-slate-400">
              ホーム画面に追加すると全画面アプリとして起動。投票したマーケットの結果確定時にリアルタイム通知！
            </p>
          </div>
        </div>

        <div className="pwa-actions-row">
          {notificationState !== 'granted' && (
            <button onClick={handleEnableNotifications} className="btn-pwa-notify">
              <Bell size={13} />
              <span>的中通知をON</span>
            </button>
          )}

          {notificationState === 'granted' && (
            <div className="pwa-notif-granted-tag">
              <Check size={12} className="text-emerald-400" />
              <span>通知有効化済み</span>
            </div>
          )}

          <button onClick={handleInstallApp} className="btn-pwa-install">
            <Download size={13} />
            <span>{isInstalling ? '起動中...' : 'アプリを追加'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
