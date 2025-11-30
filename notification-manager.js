// notification-manager.js
import { getSupabaseClient } from './supabaseClient.js';

class NotificationManager {
    constructor() {
        this.supabase = null;
        this.initPromise = null;
        this.user_id = null;
        this.notificationChannel = null;
        this.onNotificationsUpdate = () => {}; // Callback to update UI

        this.initializeSupabase();
    }

    async initializeSupabase() {
        this.initPromise = new Promise(async (resolve) => {
            this.supabase = await getSupabaseClient();
            console.log('[NotificationManager] Supabase client initialized.');
            resolve();
        });
    }

    async waitForInitialization() {
        if (!this.initPromise) {
            this.initializeSupabase();
        }
        await this.initPromise;
    }

    /**
     * Sets the user ID for the notification manager and subscribes to real-time notifications.
     * @param {string} userId - The LINE user ID of the current authenticated user.
     */
    async setUserId(userId) {
        await this.waitForInitialization();
        this.user_id = userId;
        this.subscribeToRealtimeNotifications();
    }

    /**
     * Subscribes to real-time notifications for the current user.
     */
    async subscribeToRealtimeNotifications() {
        if (!this.user_id || !this.supabase) {
            console.warn('[NotificationManager] Cannot subscribe: user ID or Supabase client not set.');
            return;
        }

        if (this.notificationChannel) {
            await this.supabase.removeChannel(this.notificationChannel);
            console.log('[NotificationManager] Existing notification channel removed.');
        }

        this.notificationChannel = this.supabase.channel(`notifications:user_id=eq.${this.user_id}`);
        
        this.notificationChannel.on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${this.user_id}`
        }, (payload) => {
            console.log('[NotificationManager] New real-time notification:', payload.new);
            this.onNotificationsUpdate(payload.new); // Trigger UI update
            NotificationManagerGlobal.showAppNotification(payload.new); // Show temporary app notification
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${this.user_id}`
        }, (payload) => {
            console.log('[NotificationManager] Notification updated in real-time:', payload.new);
            this.onNotificationsUpdate(payload.new); // Trigger UI update
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[NotificationManager] Subscribed to notifications for user: ${this.user_id}`);
            } else {
                console.error(`[NotificationManager] Failed to subscribe to notifications: ${status}`);
            }
        });
    }

    /**
     * Creates a new notification.
     * @param {string} recipientUserId - The user ID to whom the notification is addressed.
     * @param {string} type - Type of notification (e.g., 'caddy_approved').
     * @param {string} message - The notification message.
     * @param {object} [metadata] - Optional JSON metadata.
     */
    async createNotification(recipientUserId, type, message, metadata = {}) {
        await this.waitForInitialization();
        if (!this.supabase) return;

        try {
            const { data, error } = await this.supabase
                .from('notifications')
                .insert({
                    user_id: recipientUserId,
                    type: type,
                    message: message,
                    metadata: metadata
                });

            if (error) {
                console.error('[NotificationManager] Error creating notification:', error);
                throw error;
            }
            console.log(`[NotificationManager] Notification created for ${recipientUserId}: ${message}`);
            return data;
        } catch (error) {
            console.error('[NotificationManager] Failed to create notification:', error);
            throw error;
        }
    }

    /**
     * Fetches all notifications for the current user, optionally filtered by read status.
     * @param {boolean} [onlyUnread=false] - If true, only fetches unread notifications.
     */
    async fetchNotifications(onlyUnread = false) {
        await this.waitForInitialization();
        if (!this.user_id || !this.supabase) return [];

        let query = this.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', this.user_id)
            .order('created_at', { ascending: false });

        if (onlyUnread) {
            query = query.eq('is_read', false);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[NotificationManager] Error fetching notifications:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Marks a specific notification as read.
     * @param {string} notificationId - The ID of the notification to mark as read.
     */
    async markNotificationAsRead(notificationId) {
        await this.waitForInitialization();
        if (!this.user_id || !this.supabase) return;

        try {
            const { error } = await this.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('user_id', this.user_id); // Ensure user can only mark their own

            if (error) {
                console.error(`[NotificationManager] Error marking notification ${notificationId} as read:`, error);
                throw error;
            }
            console.log(`[NotificationManager] Notification ${notificationId} marked as read.`);
        } catch (error) {
            console.error('[NotificationManager] Failed to mark notification as read:', error);
            throw error;
        }
    }

    /**
     * Marks all unread notifications for the current user as read.
     */
    async markAllAsRead() {
        await this.waitForInitialization();
        if (!this.user_id || !this.supabase) return;

        try {
            const { error } = await this.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', this.user_id)
                .eq('is_read', false);

            if (error) {
                console.error('[NotificationManager] Error marking all notifications as read:', error);
                throw error;
            }
            console.log(`[NotificationManager] All unread notifications for user ${this.user_id} marked as read.`);
        } catch (error) {
            console.error('[NotificationManager] Failed to mark all notifications as read:', error);
            throw error;
        }
    }

    /**
     * Sets the callback function to be called when notifications are updated in real-time.
     * @param {function} callback - The function to call with updated notifications.
     */
    setOnNotificationsUpdate(callback) {
        this.onNotificationsUpdate = callback;
    }

    // --- Temporary App Notification Display (can be replaced by a more sophisticated UI) ---
    showAppNotification(notification) {
        // Create a temporary div element for the notification
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl z-[10000] flex items-center space-x-3 opacity-0 transition-opacity duration-300 ease-out';
        notificationDiv.innerHTML = `
            <span class="material-symbols-outlined text-green-400 text-2xl">notifications_active</span>
            <div>
                <p class="font-bold">${notification.type.replace(/_/g, ' ').toUpperCase()}</p>
                <p class="text-sm">${notification.message}</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white ml-auto">
                <span class="material-symbols-outlined text-xl">close</span>
            </button>
        `;

        document.body.appendChild(notificationDiv);

        // Animate in and out
        setTimeout(() => notificationDiv.style.opacity = '1', 10);
        setTimeout(() => notificationDiv.style.opacity = '0', 5000);
        setTimeout(() => notificationDiv.remove(), 5300);
    }
}

// Global instance of the NotificationManager
window.notificationManager = new NotificationManager();

// Expose for convenience
window.NotificationManagerGlobal = {
    setUserId: (userId) => window.notificationManager.setUserId(userId),
    createNotification: (recipientUserId, type, message, metadata) => window.notificationManager.createNotification(recipientUserId, type, message, metadata),
    fetchNotifications: (onlyUnread) => window.notificationManager.fetchNotifications(onlyUnread),
    markNotificationAsRead: (id) => window.notificationManager.markNotificationAsRead(id),
    markAllAsRead: () => window.notificationManager.markAllAsRead(),
    setOnNotificationsUpdate: (cb) => window.notificationManager.setOnNotificationsUpdate(cb),
    showAppNotification: (notification) => window.notificationManager.showAppNotification(notification)
};

console.log('[NotificationManager] Module loaded.');
