// SERVICE WORKER - Offline-First Caching for MciPro Golf Platform
// Provides instant loading and offline support

const CACHE_VERSION = 'mcipro-v2025-10-15-force-reload';
const CACHE_NAME = `${CACHE_VERSION}-${Date.now()}`;

// Cache strategies
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',      // Instant load from cache, update in background
    NETWORK_FIRST: 'network-first',  // Try network first, fallback to cache
    CACHE_ONLY: 'cache-only',        // Only serve from cache
    NETWORK_ONLY: 'network-only'     // Only fetch from network
};

// Resources to cache immediately (app shell)
const APP_SHELL = [
    '/index.html',
    '/public/assets/tailwind.css',   // Built Tailwind CSS
    '/supabase-config.js?v=20251015',
    '/weather-integration.js',
    '/maintenance-management.js',
    // Add other critical resources
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
    /supabase\.co/,
    /api\.openweathermap\.org/,
    /api\.rainviewer\.com/,
    /tilecache\.rainviewer\.com/
];

// Static resources to cache
const STATIC_CACHE_PATTERNS = [
    /\.js$/,
    /\.css$/,
    /\.png$/,
    /\.jpg$/,
    /\.svg$/,
    /\.woff2?$/
];

// =====================================================
// INSTALL - Cache app shell
// =====================================================

self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' })));
            })
            .then(() => {
                console.log('[ServiceWorker] App shell cached');
                return self.skipWaiting(); // Activate immediately
            })
            .catch((err) => {
                console.error('[ServiceWorker] Install failed:', err);
            })
    );
});

// =====================================================
// ACTIVATE - Clean up old caches
// =====================================================

self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('mcipro-') && name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[ServiceWorker] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Activated');
                return self.clients.claim(); // Take control immediately
            })
    );
});

// =====================================================
// FETCH - Intercept requests and serve from cache
// =====================================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // CRITICAL: Never intercept Supabase REST or Realtime (NETWORK ONLY)
    // Also bypass WebSocket and Server-Sent Events (SSE) requests
    const isSupabase =
        url.hostname.endsWith('.supabase.co') ||
        url.hostname.includes('realtime.supabase');

    const isLiveTransport =
        request.headers.get('upgrade') === 'websocket' ||
        request.headers.get('accept') === 'text/event-stream';

    if (isSupabase || isLiveTransport) {
        // Pure network-only, no cache, no SW interference
        event.respondWith(fetch(request));
        return;
    }

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Chat system files: Always network-first with MIME validation
    if (url.pathname.startsWith('/chat/')) {
        event.respondWith(handleChatFetch(request));
        return;
    }

    // Determine cache strategy
    let strategy = CACHE_STRATEGIES.NETWORK_FIRST;

    // API requests: Network first (fresh data preferred)
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
        strategy = CACHE_STRATEGIES.NETWORK_FIRST;
    }
    // Static resources: Cache first (instant loading)
    else if (STATIC_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
        strategy = CACHE_STRATEGIES.CACHE_FIRST;
    }
    // HTML pages: Network first
    else if (url.pathname.endsWith('.html') || url.pathname === '/') {
        strategy = CACHE_STRATEGIES.NETWORK_FIRST;
    }

    event.respondWith(handleFetch(request, strategy));
});

// =====================================================
// FETCH HANDLERS
// =====================================================

async function handleFetch(request, strategy) {
    switch (strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
            return cacheFirst(request);
        case CACHE_STRATEGIES.NETWORK_FIRST:
            return networkFirst(request);
        case CACHE_STRATEGIES.CACHE_ONLY:
            return cacheOnly(request);
        case CACHE_STRATEGIES.NETWORK_ONLY:
            return fetch(request);
        default:
            return networkFirst(request);
    }
}

// Cache first: Instant load, update in background
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Serve from cache instantly
        console.log('[ServiceWorker] Serving from cache:', request.url);

        // Update cache in background
        fetch(request)
            .then((response) => {
                if (response && response.status === 200) {
                    cache.put(request, response.clone());
                }
            })
            .catch(() => {
                // Ignore network errors
            });

        return cachedResponse;
    }

    // Cache miss: Fetch from network
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[ServiceWorker] Fetch failed:', request.url, error);
        throw error;
    }
}

// Network first: Fresh data preferred, fallback to cache
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);

        // Cache successful responses
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log('[ServiceWorker] Network failed, serving from cache:', request.url);

        // Fallback to cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

// Cache only: Never fetch from network
async function cacheOnly(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    throw new Error('Resource not in cache');
}

// Chat system: Network-first with MIME validation
async function handleChatFetch(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        // Always fetch from network with no-store
        const response = await fetch(request, { cache: 'no-store' });

        // Validate MIME type before caching
        const contentType = response.headers.get('content-type') || '';
        const url = new URL(request.url);
        let validType = true;

        if (url.pathname.endsWith('.js')) {
            validType = contentType.includes('javascript');
        } else if (url.pathname.endsWith('.css')) {
            validType = contentType.includes('css');
        }

        // Only cache if status is OK and MIME type is correct
        if (response.status === 200 && validType) {
            cache.put(request, response.clone());
        } else if (!validType) {
            console.warn('[ServiceWorker] Invalid MIME type for', url.pathname, '- got', contentType);
        }

        return response;
    } catch (error) {
        console.log('[ServiceWorker] Network failed for chat file, checking cache:', request.url);

        // Fallback to cache only if network fails
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

// =====================================================
// BACKGROUND SYNC (for offline operations)
// =====================================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-bookings') {
        console.log('[ServiceWorker] Background sync: bookings');
        event.waitUntil(syncBookings());
    }
});

async function syncBookings() {
    // Sync pending bookings when back online
    // This would be triggered by the main app when operations fail
    console.log('[ServiceWorker] Syncing bookings...');

    // Get pending operations from IndexedDB or cache
    // Send to server
    // Clear pending queue

    return Promise.resolve();
}

// =====================================================
// PUSH NOTIFICATIONS (future enhancement)
// =====================================================

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};

    const title = data.title || 'MciPro Golf';
    const options = {
        body: data.body || 'New notification',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: data
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

console.log('[ServiceWorker] Loaded and ready');
