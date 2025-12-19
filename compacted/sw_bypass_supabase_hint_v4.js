// Service Worker patch (bypass cache for Supabase endpoints to avoid 406/ambiguous headers)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.endsWith('.supabase.co') && (url.pathname.startsWith('/rest/v1') || url.pathname.startsWith('/auth/v1'))) {
    event.respondWith(fetch(new Request(event.request, { cache: 'no-store' })));
  }
});
