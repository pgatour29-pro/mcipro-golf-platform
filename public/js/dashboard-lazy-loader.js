/**
 * Dashboard Lazy Loader
 * Handles lazy loading of dashboard scripts and resources on demand
 * Since HTML is inline, this focuses on script loading and initialization
 *
 * @version 2.0.0
 */

const DashboardLazyLoader = {
    // Track which dashboards have been initialized
    initializedDashboards: new Set(),

    // Currently loading dashboards
    loadingDashboards: new Set(),

    // Dashboard to script dependencies mapping
    // NOTE: All external scripts are loaded via <script defer> in index.html.
    // Do NOT list them here or they will be loaded twice, causing
    // "Identifier already declared" SyntaxErrors from class re-declarations.
    scriptDependencies: {
        'golferDashboard': {
            scripts: [],
            init: null
        },
        'caddieDashboard': {
            scripts: [],
            init: null
        },
        'managerDashboard': {
            scripts: [],
            init: 'initManagerDashboard'
        },
        'proshopDashboard': {
            scripts: [],
            init: null
        },
        'maintenanceDashboard': {
            scripts: [],
            init: null
        },
        'adminDashboard': {
            scripts: [],
            init: null
        },
        'societyOrganizerDashboard': {
            scripts: [],
            init: 'initSocietyOrganizerDashboard'
        },
        'courseAdminDashboard': {
            scripts: [],
            init: 'initCourseAdminDashboard'
        }
    },

    // Core scripts that should always be loaded (essential for all dashboards)
    coreScripts: [
        'supabase-config.js'
    ],

    /**
     * Initialize a dashboard - load its scripts and run init function
     * @param {string} dashboardId - The dashboard ID to initialize
     * @returns {Promise<boolean>} - True if successfully initialized
     */
    async initialize(dashboardId) {
        // Already initialized
        if (this.initializedDashboards.has(dashboardId)) {
            console.log(`[DashboardLoader] ${dashboardId} already initialized`);
            return true;
        }

        // Already loading
        if (this.loadingDashboards.has(dashboardId)) {
            console.log(`[DashboardLoader] ${dashboardId} already loading, waiting...`);
            return this.waitForInit(dashboardId);
        }

        const deps = this.scriptDependencies[dashboardId];
        if (!deps) {
            console.log(`[DashboardLoader] No dependencies for ${dashboardId}`);
            this.initializedDashboards.add(dashboardId);
            return true;
        }

        try {
            this.loadingDashboards.add(dashboardId);
            const startTime = performance.now();

            // Load scripts if any
            if (deps.scripts && deps.scripts.length > 0) {
                console.log(`[DashboardLoader] Loading ${deps.scripts.length} scripts for ${dashboardId}`);

                // Use ScriptLazyLoader if available
                if (window.ScriptLazyLoader) {
                    await window.ScriptLazyLoader.loadScripts(deps.scripts);
                } else {
                    // Fallback: load scripts directly
                    for (const script of deps.scripts) {
                        await this.loadScript(script);
                    }
                }
            }

            // Run initialization function if specified
            if (deps.init && typeof window[deps.init] === 'function') {
                console.log(`[DashboardLoader] Running ${deps.init}()`);
                try {
                    window[deps.init]();
                } catch (e) {
                    console.warn(`[DashboardLoader] Init function ${deps.init} error:`, e);
                }
            }

            const loadTime = performance.now() - startTime;
            console.log(`[DashboardLoader] ${dashboardId} initialized in ${loadTime.toFixed(0)}ms`);

            this.initializedDashboards.add(dashboardId);
            this.loadingDashboards.delete(dashboardId);

            // Emit event
            window.dispatchEvent(new CustomEvent('dashboardInitialized', {
                detail: { dashboardId, loadTime }
            }));

            return true;

        } catch (error) {
            console.error(`[DashboardLoader] Failed to initialize ${dashboardId}:`, error);
            this.loadingDashboards.delete(dashboardId);
            return false;
        }
    },

    /**
     * Wait for a dashboard to finish initializing
     */
    async waitForInit(dashboardId, timeout = 15000) {
        const startTime = Date.now();
        while (this.loadingDashboards.has(dashboardId)) {
            if (Date.now() - startTime > timeout) {
                console.warn(`[DashboardLoader] Timeout waiting for ${dashboardId}`);
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return this.initializedDashboards.has(dashboardId);
    },

    /**
     * Fallback script loader (when ScriptLazyLoader not available)
     */
    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = (e) => reject(e);
            document.body.appendChild(script);
        });
    },

    /**
     * Get friendly name for dashboard
     */
    getFriendlyName(dashboardId) {
        const names = {
            'golferDashboard': 'Golfer Dashboard',
            'caddieDashboard': 'Caddie Dashboard',
            'managerDashboard': 'Manager Dashboard',
            'proshopDashboard': 'Pro Shop Dashboard',
            'maintenanceDashboard': 'Maintenance Dashboard',
            'adminDashboard': 'Admin Dashboard',
            'societyOrganizerDashboard': 'Society Organizer Dashboard',
            'courseAdminDashboard': 'Course Admin Dashboard'
        };
        return names[dashboardId] || dashboardId;
    },

    /**
     * Check if dashboard is initialized
     */
    isInitialized(dashboardId) {
        return this.initializedDashboards.has(dashboardId);
    },

    /**
     * Get loading stats
     */
    getStats() {
        return {
            initialized: Array.from(this.initializedDashboards),
            loading: Array.from(this.loadingDashboards),
            available: Object.keys(this.scriptDependencies)
        };
    },

    /**
     * Preload all dashboard scripts in background
     */
    preloadAll() {
        setTimeout(async () => {
            console.log('[DashboardLoader] Starting background preload...');

            for (const dashboardId of Object.keys(this.scriptDependencies)) {
                if (!this.initializedDashboards.has(dashboardId)) {
                    const deps = this.scriptDependencies[dashboardId];
                    if (deps.scripts && deps.scripts.length > 0) {
                        // Just preload scripts, don't initialize
                        for (const script of deps.scripts) {
                            try {
                                // Preload by creating link with preload
                                const link = document.createElement('link');
                                link.rel = 'preload';
                                link.as = 'script';
                                link.href = script;
                                document.head.appendChild(link);
                            } catch (e) {
                                // Ignore preload errors
                            }
                        }
                    }
                }
                // Small delay between dashboards
                await new Promise(r => setTimeout(r, 200));
            }

            console.log('[DashboardLoader] Background preload complete');
        }, 5000);
    }
};

// Make globally available
window.DashboardLazyLoader = DashboardLazyLoader;

console.log('[DashboardLoader] Dashboard Lazy Loader v2.0 initialized');
