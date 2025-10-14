/**
 * Native Push Notifications for MciPro
 * Adapted from reference implementation - Production ready
 *
 * Features:
 * - Registers device tokens with Supabase
 * - Stores tokens in chat_devices table
 * - Deep links to chat rooms from notifications
 * - Handles both iOS (APNs) and Android (FCM)
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const NativePush = {
  isInitialized: false,
  currentUserId: null,

  /**
   * Initialize push notifications for current user
   * @param {string} userId - Supabase user ID
   */
  async init(userId) {
    if (!Capacitor.isNativePlatform()) {
      console.log('[NativePush] Web platform - push notifications not available');
      return;
    }

    if (this.isInitialized) {
      console.log('[NativePush] Already initialized');
      return;
    }

    this.currentUserId = userId;

    try {
      // Check permissions
      let perms = await PushNotifications.checkPermissions();

      if (perms.receive === 'prompt') {
        perms = await PushNotifications.requestPermissions();
      }

      if (perms.receive !== 'granted') {
        console.warn('[NativePush] Permission denied');
        return;
      }

      // Register for push
      await PushNotifications.register();

      // Handle registration success
      await PushNotifications.addListener('registration', async (token) => {
        console.log('[NativePush] ✅ Token registered:', token.value);

        try {
          // Store token in Supabase chat_devices table
          const { error } = await window.supabaseClient
            .from('chat_devices')
            .upsert({
              user_id: userId,
              token: token.value,
              platform: Capacitor.getPlatform(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'token'
            });

          if (error) {
            console.error('[NativePush] Failed to store token:', error);
          } else {
            console.log('[NativePush] ✅ Token stored in database');

            // Store locally for reference
            localStorage.setItem('push_token', token.value);
            localStorage.setItem('push_platform', Capacitor.getPlatform());
          }
        } catch (err) {
          console.error('[NativePush] Error storing token:', err);
        }
      });

      // Handle registration errors
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[NativePush] Registration error:', error);
      });

      // Handle incoming notifications (app in foreground)
      await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('[NativePush] Notification received:', notification);

        // Show notification details
        const { title, body, data } = notification;

        // Update badge if it's a chat message
        if (data?.room_id) {
          this.updateChatBadge(data.room_id);
        }

        // Vibrate
        if (window.CapacitorManager?.vibrate) {
          await window.CapacitorManager.vibrate('medium');
        }

        // Show in-app notification (optional)
        if (typeof window.showInAppNotification === 'function') {
          window.showInAppNotification({
            title: title || 'New Message',
            body: body || '',
            onClick: () => {
              if (data?.room_id) {
                this.navigateToRoom(data.room_id);
              }
            }
          });
        }
      });

      // Handle notification tap (app in background)
      await PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
        console.log('[NativePush] Notification action:', action);

        const data = action.notification?.data;
        const roomId = data?.room_id;

        if (roomId) {
          // Navigate to chat room
          this.navigateToRoom(roomId);
        }
      });

      this.isInitialized = true;
      console.log('[NativePush] ✅ Initialized successfully');

    } catch (error) {
      console.error('[NativePush] Initialization error:', error);
    }
  },

  /**
   * Navigate to specific chat room
   * @param {string} roomId - Chat room ID
   */
  navigateToRoom(roomId) {
    console.log('[NativePush] Navigating to room:', roomId);

    // Open professional chat if not already open
    if (typeof window.openProfessionalChat === 'function') {
      window.openProfessionalChat();
    }

    // Wait for chat to initialize, then open conversation
    setTimeout(() => {
      if (window.__chat?.openConversation) {
        window.__chat.openConversation(roomId);

        // Show thread tab on mobile
        const chatContainer = document.querySelector('#professionalChatContainer');
        if (chatContainer) {
          chatContainer.classList.add('chat-active');
        }
      } else {
        console.error('[NativePush] Chat not initialized');
      }
    }, 500);
  },

  /**
   * Update chat badge for specific room
   * @param {string} roomId - Chat room ID
   */
  updateChatBadge(roomId) {
    const badge = document.querySelector(`#contact-badge-${roomId}`);
    if (badge) {
      const current = parseInt(badge.textContent) || 0;
      badge.textContent = (current + 1).toString();
      badge.style.display = 'inline-block';
    }

    // Update global chat badge
    if (window.__chat?.updateUnreadBadge) {
      window.__chat.updateUnreadBadge();
    }
  },

  /**
   * Remove device token from database (on logout)
   */
  async unregister() {
    const token = localStorage.getItem('push_token');

    if (!token) {
      console.log('[NativePush] No token to unregister');
      return;
    }

    try {
      const { error } = await window.supabaseClient
        .from('chat_devices')
        .delete()
        .eq('token', token);

      if (error) {
        console.error('[NativePush] Failed to unregister token:', error);
      } else {
        console.log('[NativePush] ✅ Token unregistered');
        localStorage.removeItem('push_token');
        localStorage.removeItem('push_platform');
      }
    } catch (err) {
      console.error('[NativePush] Error unregistering token:', err);
    }
  },

  /**
   * Get list of delivery channels for push notifications
   */
  async getDeliveryChannels() {
    try {
      const result = await PushNotifications.listChannels();
      console.log('[NativePush] Delivery channels:', result.channels);
      return result.channels;
    } catch (error) {
      console.error('[NativePush] Error getting channels:', error);
      return [];
    }
  }
};

// Export for global use
window.NativePush = NativePush;

export default NativePush;
