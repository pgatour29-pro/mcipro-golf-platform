// SERVICE WORKER - Production-Grade Caching for MciPro Golf Platform
// DEPLOYMENT VERSION: 2025-11-16-AUTO-UPDATE-V2

const SW_VERSION = 'auto-update-v2'; // Auto-update service worker - no more manual cache clearing needed

self.addEventListener('install', event => {
    console.log('[ServiceWorker] Installing NEW version:', SW_VERSION);
    // FORCE immediate activation - don't wait
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Activating NEW version:', SW_VERSION);

    event.waitUntil((async () => {
        // DELETE ALL CACHES - force fresh content
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => {
            console.log('[ServiceWorker] 🗑️ Deleting cache:', name);
            return caches.delete(name);
        }));

        // Take control of all pages IMMEDIATELY
        await self.clients.claim();

        // Notify all tabs to reload automatically
        const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        for (const client of allClients) {
            console.log('[ServiceWorker] 📢 Notifying client to reload');
            client.postMessage({
                type: 'SW_UPDATED',
                version: SW_VERSION,
                action: 'RELOAD' // Tell page to reload itself
            });
        }

        console.log('[ServiceWorker] ✅ Activated NEW version:', SW_VERSION);
    })());
});

// Fetch strategy: ALWAYS FRESH - no caching, always network
self.addEventListener('fetch', event => {
    const { request } = event;

    // ALWAYS get fresh content from network - NO CACHING
    event.respondWith(
        fetch(request, { cache: 'no-store' })
            .catch(() => {
                // If network fails, show offline page
                return new Response('Offline - please check your connection', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                });
            })
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[ServiceWorker] Force update requested');
        self.skipWaiting();
    } else if (event.data && event.data.type === 'CLEAR_PROFILE_CACHE') {
        console.log('[ServiceWorker] Clearing profile cache for user:', event.data.lineUserId);
        event.waitUntil((async () => {
            // Clear all caches to ensure fresh profile data
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(name => {
                    console.log('[ServiceWorker] Deleting cache:', name);
                    return caches.delete(name);
                })
            );
            console.log('[ServiceWorker] All caches cleared after profile creation');
        })());
    }
});

console.log('[ServiceWorker] Loaded - Version:', SW_VERSION);
