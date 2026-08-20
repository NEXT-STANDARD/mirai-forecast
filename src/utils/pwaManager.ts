/**
 * 未来レーダー (MiraiRadar) - PWA ＆ WebPush マネージャー
 * Service Worker 登録・インストール促進・ブラウザ通知許可
 */

class PwaManager {
  private deferredPrompt: any = null;
  private isInstalled: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Service Worker 登録
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(
            (registration) => {
              console.log('✅ ServiceWorker registered with scope:', registration.scope);
            },
            (err) => {
              console.warn('⚠️ ServiceWorker registration failed:', err);
            }
          );
        });
      }

      // 2. インストール可能イベント (beforeinstallprompt)
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
      });

      // 3. インストール完了検知
      window.addEventListener('appinstalled', () => {
        this.isInstalled = true;
        this.deferredPrompt = null;
        console.log('🎉 未来レーダー PWA App was installed successfully!');
      });

      // スタンドアロン判定
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        this.isInstalled = true;
      }
    }
  }

  public canInstall(): boolean {
    return !!this.deferredPrompt && !this.isInstalled;
  }

  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    return outcome === 'accepted';
  }

  public getIsInstalled(): boolean {
    return this.isInstalled;
  }

  // 🔔 WebPush 通知の許可リクエスト
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.sendLocalNotification(
        '🎯 未来レーダー 的中通知が有効化されました',
        'あなたが投票したマーケットの結果が確定した際、リアルタイムで速報をお届けします。'
      );
    }
    return permission;
  }

  // ローカル即時通知テスト
  public sendLocalNotification(title: string, body: string, url: string = '/') {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/pwa-192.png',
            badge: '/favicon.svg',
            data: { url }
          });
        });
      } else {
        new Notification(title, {
          body,
          icon: '/pwa-192.png',
        });
      }
    }
  }
}

export const pwaManager = new PwaManager();
