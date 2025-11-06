// SERVICE WORKER - Production-Grade Caching for MciPro Golf Platform
// DEPLOYMENT VERSION: 2025-11-05-ORGANIZER-ROUND-HISTORY

const SW_VERSION = '359cda2b'; // Git SHA - updated on every deploy

self.addEventListener('install', event => {
    console.log('[ServiceWorker] Installing version:', SW_VERSION);
    // Optional pre-cache can go here
    self.skipWaiting(); // Let this install finish quickly
});

self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Activating version:', SW_VERSION);

    event.waitUntil((async () => {
        // Clean old caches if you named them with versions
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter(name => name.startsWith('mcipro-') && !name.includes(SW_VERSION))
                .map(name => {
                    console.log('[ServiceWorker] Deleting old cache:', name);
                    return caches.delete(name);
                })
        );

        // ONLY call claim() here, inside activate event's waitUntil
        await self.clients.claim();

        // Tell all tabs there is a new SW
        const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        for (const client of allClients) {
            client.postMessage({ type: 'SW_ACTIVATED', version: SW_VERSION });
        }

        console.log('[ServiceWorker] Activated version:', SW_VERSION);
    })());
});

// Fetch strategy: HTML always fresh, let browser handle asset caching based on headers
self.addEventListener('fetch', event => {
    const { request } = event;

    // Always network for HTML navigation
    if (request.mode === 'navigate') {
        event.respondWith(fetch(request, { cache: 'no-store' }));
        return;
    }

    // For all other requests, let the browser handle caching based on Cache-Control headers from Vercel
    // This respects the immutable + max-age headers we set in vercel.json
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[ServiceWorker] Force update requested');
        self.skipWaiting();
    }
});

console.log('[ServiceWorker] Loaded - Version:', SW_VERSION);
