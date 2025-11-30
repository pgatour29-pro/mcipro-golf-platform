class PerformanceMonitor {
    constructor() {
        this.supabase = null;
        this.initPromise = null;
        this.initializeSupabase();
    }

    async initializeSupabase() {
        this.initPromise = new Promise(async (resolve) => {
            this.supabase = window.SupabaseDB.client;
            console.log('[PerformanceMonitor] Supabase client initialized.');
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
     * Logs a performance event to the Supabase performance_logs table.
     * @param {string} eventName - Name of the event (e.g., "chat_init", "fetch_users").
     * @param {number} duration_ms - Duration of the event in milliseconds.
     * @param {string} [component] - Application component (e.g., "Chat", "AdminDashboard").
     * @param {string} [screen] - Screen where the event occurred.
     * @param {object} [metadata] - Additional JSON metadata.
     */
    async logEvent(eventName, duration_ms, component = 'General', screen = 'Unknown', metadata = {}) {
        await this.waitForInitialization();

        if (!this.supabase) {
            console.error('[PerformanceMonitor] Supabase client not ready, cannot log event:', eventName);
            return;
        }

        try {
            const { data: user } = await this.supabase.auth.getUser();
            const userId = user?.user?.id || 'anonymous';
            const lineUserId = AppState?.currentUser?.lineUserId || userId; // Assuming AppState is available

            const { error } = await this.supabase
                .from('performance_logs')
                .insert({
                    event_name: eventName,
                    duration_ms: duration_ms,
                    user_id: lineUserId,
                    component: component,
                    screen: screen,
                    metadata: metadata
                });

            if (error) {
                console.error('[PerformanceMonitor] Error logging performance event:', error);
            } else {
                console.log(`[PerformanceMonitor] Logged: ${eventName} (${duration_ms}ms)`);
            }
        } catch (error) {
            console.error('[PerformanceMonitor] Unexpected error in logEvent:', error);
        }
    }

    /**
     * Measures the execution time of an async function and logs it.
     * @param {string} eventName - Name of the event.
     * @param {function} asyncFn - The asynchronous function to measure.
     * @param {string} [component] - Application component.
     * @param {string} [screen] - Screen where the event occurred.
     * @param {object} [metadata] - Additional metadata.
     * @returns {Promise<any>} The result of the measured function.
     */
    async measureAndLog(eventName, asyncFn, component, screen, metadata) {
        const start = performance.now();
        try {
            const result = await asyncFn();
            const end = performance.now();
            await this.logEvent(eventName, end - start, component, screen, metadata);
            return result;
        } catch (error) {
            const end = performance.now();
            await this.logEvent(eventName, end - start, component, screen, { ...metadata, error: error.message });
            throw error;
        }
    }
}

// Global instance of the PerformanceMonitor
window.performanceMonitor = new PerformanceMonitor();

// Expose measureAndLog globally for convenience in other modules
window.measureAndLog = (eventName, asyncFn, component, screen, metadata) => 
    window.performanceMonitor.measureAndLog(eventName, asyncFn, component, screen, metadata);

console.log('[PerformanceMonitor] Module loaded.');
