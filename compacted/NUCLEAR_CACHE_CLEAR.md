# NUCLEAR CACHE CLEAR - Fix Stuck Service Worker

## Current Problem

Service Worker is stuck at `2025-11-02T21:00:00Z` (old version).
Should be: `2025-11-02T21:45:00Z` (new version with Edge Function).

**This is why you're still seeing all the old errors!**

---

## Option 1: Incognito/Private Window (FASTEST)

1. **Close ALL regular browser windows**
2. **Open NEW Incognito/Private window** (Ctrl+Shift+N in Chrome)
3. **Navigate to:** `https://mycaddipro.com/`
4. **Check console:** Should see `[ServiceWorker] Loaded - Version: 2025-11-02T21:45:00Z`
5. **Test event registration**

**This guarantees fresh cache with no old service worker.**

---

## Option 2: Manual Service Worker Unregister

1. **Open DevTools** (F12)
2. **Go to Application tab**
3. **Service Workers section (left sidebar)**
4. **For EACH service worker:**
   - Click "Unregister"
   - Wait for it to disappear
5. **Verify list is empty**
6. **Close ALL tabs** for mycaddipro.com
7. **Close browser completely**
8. **Wait 10 seconds**
9. **Reopen browser**
10. **Navigate to:** `https://mycaddipro.com/`
11. **Check console:** Should see `2025-11-02T21:45:00Z`

---

## Option 3: Chrome Hard Reset

**If Options 1 & 2 don't work:**

1. **Close ALL browser windows**
2. **Open Chrome**
3. **Go to:** `chrome://serviceworker-internals/`
4. **Find mycaddipro.com entries**
5. **Click "Unregister"** for ALL of them
6. **Go to:** `chrome://settings/clearBrowserData`
7. **Time range:** "All time"
8. **Check:**
   - ✅ Cached images and files
   - ✅ Cookies and other site data
9. **Click "Clear data"**
10. **Restart Chrome**
11. **Navigate to:** `https://mycaddipro.com/`
12. **Check console:** Should see `2025-11-02T21:45:00Z`

---

## Option 4: Force Update via URL Parameter

**Add this to index.html** (temporary bypass):

```javascript
// Detect ?forceUpdate=1 parameter
if (window.location.search.includes('forceUpdate=1')) {
    console.log('[FORCE UPDATE] Unregistering all service workers...');
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => {
            console.log('[FORCE UPDATE] Unregistering:', reg.scope);
            reg.unregister();
        });
        console.log('[FORCE UPDATE] All service workers unregistered. Reloading in 2 seconds...');
        setTimeout(() => {
            window.location.href = window.location.origin;
        }, 2000);
    });
}
```

**Then visit:**
```
https://mycaddipro.com/?forceUpdate=1
```

This will:
1. Unregister all service workers
2. Redirect to clean URL
3. Load fresh service worker

---

## Verification Checklist

After cache clear, you should see:

### Service Worker
```
[ServiceWorker] Loaded - Version: 2025-11-02T21:45:00Z  ✅
[ServiceWorker] Installing version: 2025-11-02T21:45:00Z  ✅
[ServiceWorker] Activating version: 2025-11-02T21:45:00Z  ✅
```

**NOT:**
```
[ServiceWorker] Loaded - Version: 2025-11-02T21:00:00Z  ❌
```

### No Parse Errors
```
❌ No "Uncaught SyntaxError: Invalid left-hand side in assignment"
❌ No "chat-system-full.js:931 Uncaught"
```

### No Old URL Errors
```
❌ No "organizer_id=eq.Utrgg..." (LINE ID)
❌ No "order=completed_at.desc" 400 errors
```

### Event Registration (AFTER EDGE FUNCTION DEPLOYED)
```
✅ POST /functions/v1/event-register → 201 Created
✅ [SocietyGolf] ✅ Registration successful:
❌ No "Not authenticated - please log in"
```

---

## IMPORTANT: Deploy Edge Function First!

**Before cache clearing, deploy the Edge Function:**

```bash
cd C:\Users\pete\Documents\MciPro
supabase functions deploy event-register
```

**Otherwise you'll get:**
```
POST /functions/v1/event-register → 404 Not Found
```

---

## Why This Happened

Service workers are **extremely persistent**:
- They survive page refresh
- They survive browser restart
- They cache themselves
- They need explicit unregistration

The old SW (`2025-11-02T21:00:00Z`) is blocking the new one (`2025-11-02T21:45:00Z`) from loading.

**Solution:** Use incognito (cleanest) or nuclear unregister (most thorough).

---

## Quick Test Commands

**Check current SW version:**
```javascript
navigator.serviceWorker.getRegistrations().then(r => console.log(r.map(x => x.active?.scriptURL)));
```

**Force unregister all:**
```javascript
navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()));
```

**Check cache names:**
```javascript
caches.keys().then(k => console.log(k));
```

**Delete all caches:**
```javascript
caches.keys().then(k => k.forEach(n => caches.delete(n)));
```

---

**Recommended:** Start with **Option 1 (Incognito)** - it's the fastest and most reliable.
