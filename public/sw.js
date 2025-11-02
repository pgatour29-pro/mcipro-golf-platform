// SERVICE WORKER - Offline-First Caching for MciPro Golf Platform
// DEPLOYMENT VERSION: 2025-10-21-CACHE-FIX

const BUILD_TIMESTAMP = '2025-11-02T23:00:00Z'; // Fixed Edge Function to use supabase.functions.invoke() + profiles query
const CACHE_VERSION = `mcipro-v${BUILD_TIMESTAMP}`;
const CACHE_NAME = CACHE_VERSION;

// NEVER cache these - always fetch fresh from network
const NEVER_CACHE = [
    '/index.html',
    '/',
];

// API endpoints
const API_CACHE_PATTERNS = [
    /supabase\.co/,
    /api\.openweathermap\.org/,
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
// INSTALL
// =====================================================

self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing version:', BUILD_TIMESTAMP);
    self.skipWaiting(); // Activate immediately
});

// =====================================================
// ACTIVATE - Clean up old caches
// =====================================================

self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating version:', BUILD_TIMESTAMP);

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
                console.log('[ServiceWorker] Activated - All old caches cleared');
                return self.clients.claim();
            })
    );
});

// =====================================================
// FETCH
// =====================================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip OAuth and Supabase
    if (
        url.search.includes('code=') ||
        url.search.includes('state=') ||
        url.pathname.includes('/functions/v1/') ||
        url.hostname.endsWith('.supabase.co') ||
        url.hostname.includes('realtime.supabase')
    ) {
        return;
    }

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // NEVER cache HTML files - ALWAYS fetch fresh
    const isHTML = url.pathname.endsWith('.html') || 
                   url.pathname === '/' ||
                   url.pathname.endsWith('/') ||
                   url.search.length > 0;

    if (isHTML) {
        console.log('[ServiceWorker] HTML - ALWAYS FRESH:', url.pathname);
        event.respondWith(fetch(request, { cache: 'no-store' }));
        return;
    }

    // Chat files: NEVER cache
    if (url.pathname.startsWith('/chat/')) {
        console.log('[ServiceWorker] Chat file - bypassing cache:', url.pathname);
        event.respondWith(fetch(request, { cache: 'no-store' }));
        return;
    }

    // Static resources: Cache first
    if (STATIC_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Everything else: Network first
    event.respondWith(networkFirst(request));
});

// =====================================================
// CACHE STRATEGIES
// =====================================================

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        console.log('[ServiceWorker] Serving from cache:', request.url);
        
        // Update in background
        fetch(request).then((response) => {
            if (response && response.status === 200) {
                cache.put(request, response.clone());
            }
        }).catch(() => {});

        return cachedResponse;
    }

    // Fetch from network
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[ServiceWorker] Fetch failed:', request.url);
        throw error;
    }
}

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            console.log('[ServiceWorker] Network failed, using cache:', request.url);
            return cachedResponse;
        }
        throw error;
    }
}

// =====================================================
// MESSAGE HANDLER
// =====================================================

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[ServiceWorker] Force update requested');
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('[ServiceWorker] Cache clear requested');
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            })
        );
    }
});

console.log('[ServiceWorker] Loaded - Version:', BUILD_TIMESTAMP);
