// SERVICE WORKER - Performance Caching Version
// Caches static assets for dramatically faster repeat visits

const SW_VERSION = 'mcipro-cache-v225';
const CACHE_NAME = `mcipro-static-${SW_VERSION}`;
const RUNTIME_CACHE = `mcipro-runtime-${SW_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/mcipro.png',
    '/professional-analytics.css',
    '/js/scorecardProfileLoader.js',
    '/js/cheechan-yardage-book.js',
    '/supabaseClient.js',
    '/supabase-config.js',
    '/auth-bridge.js',
    '/caddie_data.js',
    '/society-golf-system.js',
    '/society-golf-combined.js',
    '/society-dashboard-enhanced.js',
    '/course-data-manager.js',
    '/staff-management.js',
    '/staff-management-compact.js',
    '/reports-system.js',
    '/analytics-drilldown.js',
    '/tournament-series-manager.js',
    '/global-player-directory.js',
    '/golf-buddies-system.js',
    '/maintenance-management.js',
    '/unified-player-service.js',
    '/analytics-export.js',
    '/time-windowed-leaderboards.js',
    '/live-scorecard-enhancements.js',
    '/weather-integration.js',
    '/gm-analytics-engine.js',
    '/financial-drilldown-system.js',
    '/society-organizer-manager.js',
    '/cross-device-sync.js',
    '/native-push.js',
    '/staff-security.js',
    '/supabase-security.js',
    '/traffic-monitor-complete.js'
];

// CDN resources to cache (external libraries)
const CDN_PATTERNS = [
    'cdn.tailwindcss.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'unpkg.com/leaflet',
    'static.line-scdn.net/liff',
    'cdn.jsdelivr.net'
];

// Patterns that should NEVER be cached (always network)
const NEVER_CACHE_PATTERNS = [
    'supabase.co',           // Supabase API calls
    'realtime-',             // Supabase realtime
    '/rest/v1/',             // REST API
    '/auth/v1/',             // Auth API
    '/storage/v1/',          // Storage API
    'api.openweathermap.org', // Weather API
    'chrome-extension://',   // Browser extensions
    'localhost',             // Local development
    'analytics',             // Analytics
    'gtag',                  // Google tag
    'firebase'               // Firebase (if used for analytics)
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[SW] Installing cache version:', SW_VERSION);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets');
                // Cache assets one by one to avoid failing on missing files
                return Promise.allSettled(
                    STATIC_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.log('[SW] Failed to cache:', url, err.message);
                            return null;
                        })
                    )
                );
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                // Don't skipWaiting - let SW update naturally to avoid aborting requests
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating cache version:', SW_VERSION);

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => {
                            // Delete caches that don't match current version
                            return name.startsWith('mcipro-') &&
                                   name !== CACHE_NAME &&
                                   name !== RUNTIME_CACHE;
                        })
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activated - waiting for next navigation to take control');
                // Don't claim clients immediately - this aborts in-flight requests
            })
    );
});

// Helper: Check if URL should never be cached
function shouldNeverCache(url) {
    return NEVER_CACHE_PATTERNS.some(pattern => url.includes(pattern));
}

// Helper: Check if URL is a CDN resource
function isCDNResource(url) {
    return CDN_PATTERNS.some(pattern => url.includes(pattern));
}

// Helper: Check if URL is a static asset (JS, CSS, images, fonts)
function isStaticAsset(url) {
    const pathname = new URL(url).pathname;
    return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(pathname);
}

// Helper: Check if URL is HTML
function isHTMLRequest(request) {
    const accept = request.headers.get('Accept') || '';
    return request.mode === 'navigate' || accept.includes('text/html');
}

// Fetch event - smart caching strategy
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Never cache certain patterns (API calls, etc.)
    if (shouldNeverCache(url)) {
        return;
    }

    // HTML requests: Network-first with cache fallback
    if (isHTMLRequest(event.request)) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone and cache the response
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(RUNTIME_CACHE).then(cache => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(event.request)
                        .then(cached => cached || caches.match('/index.html'));
                })
        );
        return;
    }

    // CDN resources: Cache-first with network fallback
    if (isCDNResource(url)) {
        event.respondWith(
            caches.match(event.request)
                .then(cached => {
                    if (cached) {
                        // Return cached, but also update cache in background
                        fetch(event.request)
                            .then(response => {
                                if (response.ok) {
                                    caches.open(RUNTIME_CACHE)
                                        .then(cache => cache.put(event.request, response));
                                }
                            })
                            .catch(() => {});
                        return cached;
                    }

                    // Not cached, fetch and cache
                    return fetch(event.request)
                        .then(response => {
                            if (response.ok) {
                                const clone = response.clone();
                                caches.open(RUNTIME_CACHE)
                                    .then(cache => cache.put(event.request, clone));
                            }
                            return response;
                        });
                })
        );
        return;
    }

    // Static assets (JS, CSS, images): Cache-first
    if (isStaticAsset(url)) {
        event.respondWith(
            caches.match(event.request)
                .then(cached => {
                    if (cached) {
                        return cached;
                    }

                    // Not in cache, fetch and cache
                    return fetch(event.request)
                        .then(response => {
                            if (response.ok) {
                                const clone = response.clone();
                                caches.open(RUNTIME_CACHE)
                                    .then(cache => cache.put(event.request, clone));
                            }
                            return response;
                        });
                })
        );
        return;
    }

    // Everything else: Network-first
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(RUNTIME_CACHE)
                        .then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// Handle messages from clients
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data === 'getVersion') {
        event.ports[0].postMessage({ version: SW_VERSION });
    }

    if (event.data === 'clearCache') {
        caches.keys().then(names => {
            Promise.all(names.map(name => caches.delete(name)))
                .then(() => {
                    if (event.ports[0]) {
                        event.ports[0].postMessage({ cleared: true });
                    }
                });
        });
    }
});

console.log('[SW] Service Worker loaded:', SW_VERSION);
