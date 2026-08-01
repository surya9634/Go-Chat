/**
 * NotificationService — Browser Push Notifications for Go-Chat
 * Uses the Web Notifications API (free, no server needed for basic in-tab)
 * For background push (app closed), uses the Push API + a Service Worker.
 */

export const NotificationService = {
  /** Ask for permission once */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  },

  /** Send a browser notification */
  notify(title: string, options?: NotificationOptions & { onClick?: () => void }) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const { onClick, ...notifOptions } = options || {};
    const notif = new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      silent: false,
      ...notifOptions,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
      onClick?.();
    };

    // Auto-close after 6s
    setTimeout(() => notif.close(), 6000);
  },

  /** Notify about a new incoming message */
  notifyMessage(senderName: string, text: string, avatarUrl?: string, onClick?: () => void) {
    this.notify(`${senderName}`, {
      body: text || '📷 Sent an attachment',
      icon: avatarUrl || '/icon-192.png',
      tag: `msg-${senderName}`,
      ...(({ renotify: true } as any)),
      onClick,
    });
  },

  /** Notify about an incoming call */
  notifyCall(callerName: string, type: 'audio' | 'video', onClick?: () => void) {
    this.notify(`Incoming ${type === 'video' ? '📹 Video' : '📞 Audio'} Call`, {
      body: `${callerName} is calling you`,
      tag: 'incoming-call',
      requireInteraction: true,   // stays until dismissed
      onClick,
    });
  },

  /** Register the service worker for background push (when app is closed) */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      // SW registration failed — notifications still work while app is open
    }
  },

  get isSupported() {
    return 'Notification' in window;
  },

  get isGranted() {
    return Notification.permission === 'granted';
  },

  get isDenied() {
    return Notification.permission === 'denied';
  },
};
