// Capacitor Native Integration
// Handles: Push notifications, local caching, back button, network status, haptics

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';

const CapacitorManager = {
  isNative: false,
  pushToken: null,

  /**
   * Initialize all Capacitor plugins
   */
  async init() {
    this.isNative = Capacitor.isNativePlatform();

    if (!this.isNative) {
      console.log('[Capacitor] Running in web mode - native features disabled');
      return;
    }

    console.log('[Capacitor] Native app detected - Platform:', Capacitor.getPlatform());

    try {
      // Initialize plugins
      await this.initStatusBar();
      await this.initPushNotifications();
      await this.initBackButton();
      await this.initNetworkListener();
      await this.initAppStateListener();

      // Hide splash screen after initialization
      await SplashScreen.hide();

      console.log('[Capacitor] ✅ All native features initialized');
    } catch (error) {
      console.error('[Capacitor] Initialization error:', error);
    }
  },

  /**
   * Status Bar Configuration
   */
  async initStatusBar() {
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#10b981' });
      console.log('[Capacitor] ✅ Status bar configured');
    } catch (error) {
      console.error('[Capacitor] Status bar error:', error);
    }
  },

  /**
   * Push Notifications Setup
   */
  async initPushNotifications() {
    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[Capacitor] Push notification permission denied');
        return;
      }

      // Register for push
      await PushNotifications.register();

      // Listen for registration
      await PushNotifications.addListener('registration', (token) => {
        console.log('[Capacitor] ✅ Push token:', token.value);
        this.pushToken = token.value;

        // Store token in localStorage for backend registration
        localStorage.setItem('fcm_token', token.value);

        // Trigger custom event for app to handle
        window.dispatchEvent(new CustomEvent('push-token-received', {
          detail: { token: token.value }
        }));
      });

      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[Capacitor] Push registration error:', error);
      });

      // Handle incoming push notifications
      await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('[Capacitor] Push notification received:', notification);

        // Trigger custom event
        window.dispatchEvent(new CustomEvent('push-notification-received', {
          detail: notification
        }));

        // Vibrate
        await this.vibrate('medium');

        // If it's a chat message, update unread count
        if (notification.data?.type === 'chat_message') {
          this.handleChatNotification(notification.data);
        }
      });

      // Handle notification tap
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('[Capacitor] Push notification action:', notification);

        const data = notification.notification.data;

        // Navigate to specific screen based on notification type
        if (data?.type === 'chat_message' && data?.room_id) {
          this.navigateToChat(data.room_id);
        }
      });

      console.log('[Capacitor] ✅ Push notifications configured');
    } catch (error) {
      console.error('[Capacitor] Push notifications error:', error);
    }
  },

  /**
   * Back Button Handler (Android)
   */
  async initBackButton() {
    await CapApp.addListener('backButton', ({ canGoBack }) => {
      // Check if we're in chat view
      const chatContainer = document.querySelector('#professionalChatContainer');
      const isChatOpen = chatContainer?.classList.contains('chat-active');

      if (isChatOpen) {
        // Go back to contacts list
        const backBtn = document.querySelector('[onclick*="chatShowContacts"]');
        if (backBtn) {
          backBtn.click();
          return;
        }
      }

      // Check if any modal is open
      const modals = document.querySelectorAll('.modal, [id*="Modal"]');
      let modalOpen = false;
      modals.forEach(modal => {
        if (modal.style.display !== 'none' && modal.offsetParent !== null) {
          modalOpen = true;
          // Try to close it
          const closeBtn = modal.querySelector('[data-close], [onclick*="close"], .close-btn');
          if (closeBtn) closeBtn.click();
        }
      });

      if (modalOpen) return;

      // If we can go back in history, do it
      if (canGoBack) {
        window.history.back();
      } else {
        // Otherwise, minimize app
        CapApp.exitApp();
      }
    });

    console.log('[Capacitor] ✅ Back button handler configured');
  },

  /**
   * Network Status Listener
   */
  async initNetworkListener() {
    Network.addListener('networkStatusChange', status => {
      console.log('[Capacitor] Network status changed:', status.connected ? 'Online' : 'Offline');

      // Trigger existing online/offline handlers
      if (status.connected) {
        window.dispatchEvent(new Event('online'));
      } else {
        window.dispatchEvent(new Event('offline'));
      }

      // Update UI indicator if exists
      const networkIndicator = document.querySelector('#networkStatus');
      if (networkIndicator) {
        networkIndicator.textContent = status.connected ? '🟢 Online' : '🔴 Offline';
        networkIndicator.style.color = status.connected ? '#10b981' : '#ef4444';
      }
    });

    // Get current status
    const status = await Network.getStatus();
    console.log('[Capacitor] Initial network status:', status.connected ? 'Online' : 'Offline');
  },

  /**
   * App State Listener (foreground/background)
   */
  async initAppStateListener() {
    CapApp.addListener('appStateChange', ({ isActive }) => {
      console.log('[Capacitor] App state:', isActive ? 'Foreground' : 'Background');

      if (isActive) {
        // App came to foreground - trigger sync
        window.dispatchEvent(new Event('visibilitychange'));

        // Sync offline data if chat is initialized
        if (typeof window.__chat?.subscribeGlobalMessages === 'function') {
          window.__chat.subscribeGlobalMessages();
        }
      }
    });
  },

  /**
   * Local Storage Helpers (uses Preferences API for native)
   */
  async setItem(key, value) {
    if (!this.isNative) {
      localStorage.setItem(key, value);
      return;
    }

    await Preferences.set({ key, value });
  },

  async getItem(key) {
    if (!this.isNative) {
      return localStorage.getItem(key);
    }

    const { value } = await Preferences.get({ key });
    return value;
  },

  async removeItem(key) {
    if (!this.isNative) {
      localStorage.removeItem(key);
      return;
    }

    await Preferences.remove({ key });
  },

  /**
   * Cache recent messages for instant load
   */
  async cacheRecentMessages(roomId, messages) {
    const cacheKey = `chat_cache_${roomId}`;
    const cacheData = {
      timestamp: Date.now(),
      messages: messages.slice(-50) // Keep last 50 messages
    };

    await this.setItem(cacheKey, JSON.stringify(cacheData));
  },

  async getCachedMessages(roomId) {
    const cacheKey = `chat_cache_${roomId}`;
    const cached = await this.getItem(cacheKey);

    if (!cached) return null;

    const data = JSON.parse(cached);

    // Cache expires after 24 hours
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      await this.removeItem(cacheKey);
      return null;
    }

    return data.messages;
  },

  /**
   * Cache user contacts
   */
  async cacheContacts(contacts) {
    await this.setItem('contacts_cache', JSON.stringify({
      timestamp: Date.now(),
      contacts
    }));
  },

  async getCachedContacts() {
    const cached = await this.getItem('contacts_cache');
    if (!cached) return null;

    const data = JSON.parse(cached);

    // Cache expires after 1 hour
    if (Date.now() - data.timestamp > 60 * 60 * 1000) {
      return null;
    }

    return data.contacts;
  },

  /**
   * Haptic Feedback
   */
  async vibrate(style = 'medium') {
    if (!this.isNative) return;

    try {
      const impactStyle = style === 'light' ? ImpactStyle.Light :
                         style === 'heavy' ? ImpactStyle.Heavy :
                         ImpactStyle.Medium;

      await Haptics.impact({ style: impactStyle });
    } catch (error) {
      // Haptics not available
    }
  },

  /**
   * Share Content
   */
  async share(title, text, url) {
    if (!this.isNative) {
      // Fallback to Web Share API
      if (navigator.share) {
        await navigator.share({ title, text, url });
      }
      return;
    }

    await Share.share({
      title,
      text,
      url,
      dialogTitle: 'Share via'
    });
  },

  /**
   * Handle chat notification
   */
  handleChatNotification(data) {
    // Update badge on specific room
    const roomBadge = document.querySelector(`#contact-badge-${data.room_id}`);
    if (roomBadge) {
      const current = parseInt(roomBadge.textContent) || 0;
      roomBadge.textContent = current + 1;
      roomBadge.style.display = 'inline-block';
    }

    // Update global badge
    if (typeof window.__chat?.updateUnreadBadge === 'function') {
      window.__chat.updateUnreadBadge();
    }
  },

  /**
   * Navigate to chat room
   */
  navigateToChat(roomId) {
    // Open chat window
    if (typeof window.openProfessionalChat === 'function') {
      window.openProfessionalChat();
    }

    // Wait for chat to initialize then open room
    setTimeout(() => {
      if (typeof window.__chat?.openConversation === 'function') {
        window.__chat.openConversation(roomId);
      }
    }, 500);
  }
};

// Auto-initialize when loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CapacitorManager.init());
} else {
  CapacitorManager.init();
}

// Export for global use
window.CapacitorManager = CapacitorManager;

export default CapacitorManager;
