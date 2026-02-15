/**
 * Script Lazy Loader
 * Dynamically loads JavaScript modules on demand to improve initial page load
 *
 * @version 1.0.0
 */

const ScriptLazyLoader = {
    // Track loaded scripts
    loadedScripts: new Set(),

    // Loading states
    loadingScripts: new Map(),

    // Script groups by dashboard/feature
    scriptGroups: {
        // Manager Dashboard Scripts
        manager: [
            'gm-analytics-engine.js',
            'society-golf-analytics.js',
            'staff-security.js',
            'staff-management.js',
            'weather-integration.js'
        ],

        // Admin Dashboard Scripts
        admin: [
            'admin-pricing-control.js',
            'analytics-drilldown.js',
            'analytics-export.js',
            'reports-system.js'
        ],

        // Society Organizer Scripts
        society: [
            'society-golf-combined.js',
            'society-dashboard-enhanced.js',
            'society-organizer-manager.js',
            'tournament-series-manager.js',
            'time-windowed-leaderboards.js'
        ],

        // Maintenance Dashboard Scripts
        maintenance: [
            'maintenance-management.js'
        ],

        // Pro Shop Dashboard Scripts
        proshop: [],

        // Course Admin Scripts
        courseAdmin: [
            'course-data-manager.js',
            'global-player-directory.js',
            'unified-player-service.js'
        ],

        // Golfer Dashboard Scripts (core - load early)
        golfer: [
            'golf-buddies-v2.js',
            'hole-by-hole-leaderboard-enhancement.js',
            'live-scorecard-enhancements.js'
        ],

        // Payment Tracking Scripts
        payment: [
            'compacted/payment-tracking-database.js',
            'compacted/payment-tracking-manager.js',
            'compacted/payment-system-integration.js'
        ]
    },

    // Dashboard to script group mapping
    dashboardGroups: {
        'golferDashboard': ['golfer'],
        'caddieDashboard': [],
        'managerDashboard': ['manager', 'admin'],
        'proshopDashboard': ['proshop'],
        'maintenanceDashboard': ['maintenance'],
        'adminDashboard': ['admin'],
        'societyOrganizerDashboard': ['society', 'payment'],
        'courseAdminDashboard': ['courseAdmin']
    },

    /**
     * Load a single script
     * @param {string} src - Script source path
     * @returns {Promise<boolean>}
     */
    async loadScript(src) {
        // Already loaded
        if (this.loadedScripts.has(src)) {
            return true;
        }

        // Already loading - wait for it
        if (this.loadingScripts.has(src)) {
            return this.loadingScripts.get(src);
        }

        // Check if script is already in the DOM (e.g. loaded via <script defer>)
        // Match by filename to handle version query strings like ?v=20251211c
        const filename = src.split('/').pop().split('?')[0];
        const existing = document.querySelector(`script[src="${src}"], script[src*="${filename}"]`);
        if (existing) {
            this.loadedScripts.add(src);
            console.log(`[ScriptLoader] Already in DOM: ${src}`);
            return true;
        }

        // Create loading promise
        const loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;

            script.onload = () => {
                this.loadedScripts.add(src);
                this.loadingScripts.delete(src);
                console.log(`[ScriptLoader] Loaded: ${src}`);
                resolve(true);
            };

            script.onerror = (error) => {
                this.loadingScripts.delete(src);
                console.error(`[ScriptLoader] Failed to load: ${src}`, error);
                reject(error);
            };

            document.body.appendChild(script);
        });

        this.loadingScripts.set(src, loadPromise);
        return loadPromise;
    },

    /**
     * Load multiple scripts in sequence
     * @param {string[]} scripts - Array of script paths
     * @returns {Promise<boolean>}
     */
    async loadScripts(scripts) {
        for (const script of scripts) {
            try {
                await this.loadScript(script);
            } catch (e) {
                console.warn(`[ScriptLoader] Continuing despite error loading: ${script}`);
            }
        }
        return true;
    },

    /**
     * Load all scripts in parallel (faster but may have dependency issues)
     * @param {string[]} scripts - Array of script paths
     * @returns {Promise<boolean[]>}
     */
    async loadScriptsParallel(scripts) {
        const promises = scripts.map(script =>
            this.loadScript(script).catch(e => {
                console.warn(`[ScriptLoader] Failed to load ${script}:`, e);
                return false;
            })
        );
        return Promise.all(promises);
    },

    /**
     * Load a script group by name
     * @param {string} groupName - Name of the script group
     * @returns {Promise<boolean>}
     */
    async loadGroup(groupName) {
        const scripts = this.scriptGroups[groupName];
        if (!scripts || scripts.length === 0) {
            console.log(`[ScriptLoader] No scripts in group: ${groupName}`);
            return true;
        }

        console.log(`[ScriptLoader] Loading group: ${groupName} (${scripts.length} scripts)`);
        const startTime = performance.now();

        await this.loadScripts(scripts);

        const loadTime = performance.now() - startTime;
        console.log(`[ScriptLoader] Group ${groupName} loaded in ${loadTime.toFixed(0)}ms`);

        return true;
    },

    /**
     * Load scripts for a specific dashboard
     * @param {string} dashboardId - Dashboard ID
     * @returns {Promise<boolean>}
     */
    async loadForDashboard(dashboardId) {
        const groups = this.dashboardGroups[dashboardId];
        if (!groups || groups.length === 0) {
            console.log(`[ScriptLoader] No script groups for dashboard: ${dashboardId}`);
            return true;
        }

        console.log(`[ScriptLoader] Loading scripts for: ${dashboardId}`);
        const startTime = performance.now();

        for (const group of groups) {
            await this.loadGroup(group);
        }

        const loadTime = performance.now() - startTime;
        console.log(`[ScriptLoader] Dashboard ${dashboardId} scripts loaded in ${loadTime.toFixed(0)}ms`);

        // Emit event
        window.dispatchEvent(new CustomEvent('scriptsLoaded', {
            detail: { dashboardId, loadTime }
        }));

        return true;
    },

    /**
     * Preload script groups in the background
     */
    preloadAll() {
        // Delay preloading to not interfere with initial page load
        setTimeout(() => {
            console.log('[ScriptLoader] Starting background preload...');
            const groups = Object.keys(this.scriptGroups);
            let index = 0;

            const loadNext = async () => {
                if (index >= groups.length) {
                    console.log('[ScriptLoader] Background preload complete');
                    return;
                }

                const group = groups[index++];
                await this.loadGroup(group);
                setTimeout(loadNext, 1000); // 1 second between groups
            };

            loadNext();
        }, 5000); // Wait 5 seconds after page load
    },

    /**
     * Check if a script is loaded
     */
    isLoaded(src) {
        return this.loadedScripts.has(src);
    },

    /**
     * Check if a group is loaded
     */
    isGroupLoaded(groupName) {
        const scripts = this.scriptGroups[groupName];
        if (!scripts) return true;
        return scripts.every(s => this.loadedScripts.has(s));
    },

    /**
     * Get loading stats
     */
    getStats() {
        return {
            loaded: Array.from(this.loadedScripts),
            loading: Array.from(this.loadingScripts.keys()),
            groups: Object.keys(this.scriptGroups)
        };
    }
};

// Make globally available
window.ScriptLazyLoader = ScriptLazyLoader;

console.log('[ScriptLoader] Script Lazy Loader initialized');
