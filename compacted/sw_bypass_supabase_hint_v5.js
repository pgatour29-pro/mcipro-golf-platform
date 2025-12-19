// sw_bypass_supabase_hint_v5.js
// Add this inside your Service Worker to bypass cache for Supabase REST/Realtime calls.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.endsWith('.supabase.co')) {
    event.respondWith(fetch(event.request)); // always network for Supabase
  }
});