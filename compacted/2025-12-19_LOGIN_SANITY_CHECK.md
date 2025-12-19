# Login Flow Sanity Check

**Date:** December 19, 2025
**Issue:** Users report having to log in twice on mobile; PWA cold-start takes 3-4x longer

---

## Issues Identified

### 1. NO TIMEOUT ON LIFF INITIALIZATION (Critical)
**Location:** `index.html:11632`
```javascript
liff.init({ liffId: LineConfig.liffId })
    .then(() => { ... })
    .catch(err => { ... });
```
**Problem:** `liff.init()` has no timeout. On slow networks or when LINE servers are slow, this can hang indefinitely, leaving the user stuck on a blank/loading screen.

**Impact:** User sees nothing or spinner forever until they force-refresh.

---

### 2. NO TIMEOUT ON PROFILE FETCH (Critical)
**Location:** `index.html:11642`
```javascript
liff.getProfile().then(async (profile) => { ... })
```
**Problem:** `liff.getProfile()` can hang indefinitely. No timeout or fallback.

**Impact:** User stuck on "Loading your profile..." message.

---

### 3. BUILD ID RELOAD INTERRUPTS OAUTH (High)
**Location:** `index.html:11608-11618`
```javascript
const key = 'mc_build_seen';
const last = localStorage.getItem(key);
if (last && last !== buildId) {
    localStorage.setItem(key, buildId);
    location.replace(location.href.split('#')[0]); // <-- PROBLEM
}
```
**Problem:** This runs during DOMContentLoaded. If a new build was deployed and the user is returning from an OAuth callback (with `?code=xxx&state=xxx`), this code strips the URL parameters and reloads, losing the OAuth code.

**Impact:** User completes LINE login, gets redirected back, but the code is lost due to reload. They have to log in AGAIN.

---

### 4. SEQUENTIAL ASYNC OPERATIONS (Medium - Slow PWA)
**Location:** `index.html:11630-11700`

The login flow runs these operations SEQUENTIALLY:
1. `liff.init()` - waits for LINE SDK
2. `liff.getProfile()` - waits for LINE API
3. `setUserFromLineProfile()` - waits for Supabase query
4. `SupabaseDB.client.auth.getSession()` - waits for Supabase
5. `SupabaseDB.waitForReady()` - waits for Supabase ready
6. `NativePush.init()` - waits for push registration

**Problem:** None of these run in parallel. On a cold PWA start, total time = sum of all operations.

**Impact:** 3-4x slower login on PWA cold start vs warm start.

---

### 5. DOUBLE LOGIN SCENARIO (High)
**Flow that causes double login:**
1. User opens PWA from homescreen (cold start)
2. `liff.isLoggedIn()` returns `true` (LINE token cached in browser)
3. `liff.getProfile()` fails (token expired, network issue, permissions)
4. Code falls back to Supabase session check (line 11676-11780)
5. Supabase session also invalid/expired
6. Shows login screen
7. User logs in with LINE
8. LINE OAuth completes successfully
9. BUT the old `liff.isLoggedIn()` is still true for next reload

**Impact:** User has to log in multiple times until sessions sync up.

---

### 6. NO LOADING TIMEOUT (Medium)
**Location:** `index.html:10358-10385`

`LoadingManager` has no automatic timeout. If an async operation hangs, the loading overlay stays forever.

---

### 7. OAUTH CODE DOUBLE-PROCESSING PROTECTION INCOMPLETE
**Location:** `index.html:11446`
```javascript
sessionStorage.setItem('__oauth_code_used', currentCode);
```
**Problem:** Uses `sessionStorage` which is cleared on PWA close. If user closes PWA mid-OAuth and reopens, protection is lost.

---

## Recommended Fixes

### Fix 1: Add Timeout Wrapper for LIFF Operations
```javascript
function withTimeout(promise, ms, fallback) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), ms)
        )
    ]).catch(err => {
        console.warn('[Timeout] Operation timed out:', err);
        return fallback;
    });
}

// Usage:
const profile = await withTimeout(liff.getProfile(), 10000, null);
if (!profile) {
    // Fallback to Supabase session or show login
}
```

### Fix 2: Skip Build ID Check During OAuth Callback
```javascript
// Don't reload if we're processing an OAuth callback
if (location.search.includes('code=') && location.search.includes('state=')) {
    console.log('[BUILD] Skipping reload during OAuth callback');
} else if (last && last !== buildId) {
    localStorage.setItem(key, buildId);
    location.replace(location.href.split('#')[0]);
}
```

### Fix 3: Parallel Initialization
```javascript
// Run independent operations in parallel
const [liffReady, supabaseReady] = await Promise.all([
    withTimeout(liff.init({ liffId: LineConfig.liffId }), 5000, false),
    window.SupabaseDB.waitForReady()
]);
```

### Fix 4: Add LoadingManager Timeout
```javascript
static show(message = 'Loading...', timeoutMs = 30000) {
    // ... existing code ...

    // Auto-hide after timeout
    if (this._timeout) clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
        console.warn('[LoadingManager] Timeout - auto-hiding');
        this.hide();
        NotificationManager.show('Operation timed out. Please try again.', 'warning');
    }, timeoutMs);
}

static hide() {
    if (this._timeout) clearTimeout(this._timeout);
    // ... existing code ...
}
```

### Fix 5: Invalidate Stale LIFF Session
```javascript
// If getProfile fails, logout from LIFF to force re-auth
liff.getProfile().catch(async (err) => {
    console.error('[INIT] Profile fetch failed, invalidating LIFF session');
    if (liff.isLoggedIn()) {
        try {
            liff.logout(); // Clear stale session
        } catch (e) {}
    }
    ScreenManager.showScreen('loginScreen');
});
```

---

## Priority Order

1. **Fix 2** - Build ID OAuth interrupt (causes immediate double login)
2. **Fix 1** - Timeout wrapper (prevents infinite hang)
3. **Fix 5** - Stale LIFF session (prevents double login loop)
4. **Fix 4** - LoadingManager timeout (UX improvement)
5. **Fix 3** - Parallel init (performance improvement)

---

## Test Cases

After implementing fixes:
1. Fresh install, first login - should work in one attempt
2. PWA cold start after 24+ hours - should work in one attempt
3. Login during new deployment - should not lose OAuth code
4. Slow network (throttle to 3G) - should timeout and show error, not hang
5. LINE token expired - should redirect to login, not loop
