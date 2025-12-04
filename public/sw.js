// SERVICE WORKER - UNREGISTRATION VERSION
// This version clears all caches and unregisters itself

const SW_VERSION = 'save-manual-players-dec4-v1';

self.addEventListener('install', event => {
    console.log('[ServiceWorker] Installing unregistration version');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Unregistering and clearing all caches');

    event.waitUntil((async () => {
        // Delete all caches
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => {
            console.log('[ServiceWorker] Deleting cache:', name);
            return caches.delete(name);
        }));

        // Take control
        await self.clients.claim();

        // Unregister this service worker
        const registrations = await self.registration.unregister();
        console.log('[ServiceWorker] Unregistered:', registrations);

        // Notify clients to reload
        const allClients = await self.clients.matchAll({ type: 'window' });
        for (const client of allClients) {
            client.postMessage({ type: 'SW_UNREGISTERED' });
        }
    })());
});

// No fetch interception - let everything pass through
self.addEventListener('fetch', event => {
    return;
});

console.log('[ServiceWorker] Unregistration version loaded');
