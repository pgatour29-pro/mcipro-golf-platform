// Kill-switch Service Worker for mobile blank screen recovery
self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // Delete all caches
      if (self.caches && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
      }
      // Unregister this SW
      if (self.registration && self.registration.unregister) {
        await self.registration.unregister();
      }
      // Take control
      if (self.clients && self.clients.claim) {
        await self.clients.claim();
      }
    } catch (e) { /* no-op */ }
  })());
});
self.addEventListener('fetch', (event) => {
  // Always fall through to network
  event.respondWith(fetch(event.request));
});