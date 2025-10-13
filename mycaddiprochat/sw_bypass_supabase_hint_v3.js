
// Place this inside your SW install/activate or fetch handler.
// Ensure Supabase REST/RPC calls bypass cache to prevent 406/403 from wrong headers.

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    url.hostname.endsWith('.supabase.co') &&
    (url.pathname.startsWith('/rest/v1') || url.pathname.startsWith('/rpc'))
  ) {
    event.respondWith(
      fetch(new Request(event.request, {
        cache: 'no-store',
        // do NOT alter headers; ensure Accept includes application/json implicitly
      }))
    );
  }
});
