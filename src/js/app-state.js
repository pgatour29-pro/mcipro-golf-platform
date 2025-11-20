import { initializeHistory } from './history.js';

initializeHistory();

export const AppState = {
    currentUser: null,
    currentScreen: null,
    activeTab: {},
    activeSubTab: {},
    isOnline: navigator.onLine,
    isNative: false, // Will be set later
    currentLanguage: 'en',
    languageData: {},
    lastSyncTimestamp: 0,
    syncInProgress: false,

    async initialize() {
        this.isNative = window.Capacitor.isNativePlatform();
        console.log(`[App] Running in ${this.isNative ? 'Native' : 'Web'} mode.`);
        
        await this.loadLanguage(this.currentLanguage);
        this.updateOnlineStatus();
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());

        // Perform initial data sync
        this.syncData();
    },

    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('mciProUser', JSON.stringify(user));
            console.log('[App] User set and saved to localStorage:', user);
        } else {
            localStorage.removeItem('mciProUser');
            console.log('[App] User removed from localStorage.');
        }
    },

    loadUserFromStorage() {
        const storedUser = localStorage.getItem('mciProUser');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                console.log('[App] User loaded from localStorage:', this.currentUser);
                return this.currentUser;
            } catch (e) {
                console.error("[App] Error parsing user from localStorage", e);
                localStorage.removeItem('mciProUser');
                return null;
            }
        }
        return null;
    },

    setActiveTab(screen, tabId) {
        this.activeTab[screen] = tabId;
        localStorage.setItem(`activeTab_${screen}`, tabId);
    },
    
    getActiveTab(screen) {
        return localStorage.getItem(`activeTab_${screen}`) || this.activeTab[screen];
    },

    setActiveSubTab(screen, tabId, subTabId) {
        if (!this.activeSubTab[screen]) {
            this.activeSubTab[screen] = {};
        }
        this.activeSubTab[screen][tabId] = subTabId;
    },

    updateOnlineStatus() {
        this.isOnline = navigator.onLine;
        console.log(`[App] Network status: ${this.isOnline ? 'Online' : 'Offline'}`);
        const onlineIndicator = document.getElementById('onlineStatusIndicator');
        if (onlineIndicator) {
            onlineIndicator.style.display = this.isOnline ? 'flex' : 'none';
        }
        if (!this.isOnline) {
            // Optionally show an offline UI message
        }
    },

    async loadLanguage(lang) {
        try {
            const response = await fetch(`languages/${lang}.json?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`Failed to load language file: ${lang}.json`);
            this.languageData = await response.json();
            this.currentLanguage = lang;
            console.log(`[App] Language set to ${lang}`);
        } catch (error) {
            console.error('Error loading language:', error);
            // Fallback to English if the chosen language fails
            if (lang !== 'en') await this.loadLanguage('en');
        }
    },

    translate(key, replacements = {}) {
        let text = this.languageData[key] || key;
        for (const [placeholder, value] of Object.entries(replacements)) {
            text = text.replace(`{${placeholder}}`, value);
        }
        return text;
    },

    async syncData() {
        if (this.syncInProgress || !this.isOnline) return;

        this.syncInProgress = true;
        console.log('[Sync] Starting data synchronization...');

        try {
            // Example: Sync user profile
            if (this.currentUser) {
                const { data: remoteProfile, error } = await SupabaseManager.client
                    .from('profiles')
                    .select('*')
                    .eq('line_user_id', this.currentUser.lineUserId)
                    .single();
                
                if (error) throw error;
                
                if (remoteProfile) {
                    // Compare and update if necessary
                    if (new Date(remoteProfile.updated_at) > new Date(this.currentUser.updated_at || 0)) {
                        console.log('[Sync] Remote profile is newer. Updating local.');
                        this.setCurrentUser({ ...this.currentUser, ...remoteProfile });
                    }
                }
            }

            // Example: Sync pending offline actions
            const offlineActions = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
            if (offlineActions.length > 0) {
                console.log(`[Sync] Processing ${offlineActions.length} offline actions.`);
                for (const action of offlineActions) {
                    // Implement action processing logic (e.g., API calls)
                }
                localStorage.setItem('offlineQueue', '[]'); // Clear queue after processing
            }
            
            this.lastSyncTimestamp = Date.now();
            console.log('[Sync] Synchronization complete.');

        } catch (error) {
            console.error('[Sync] Data synchronization failed:', error);
        } finally {
            this.syncInProgress = false;
        }
    }
};

// Initialize the app state
document.addEventListener('DOMContentLoaded', () => {
    AppState.initialize();
});