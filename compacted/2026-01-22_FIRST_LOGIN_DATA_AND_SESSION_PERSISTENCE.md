# Session Catalog - January 22, 2026 (First Login Data + Session Persistence)

## Summary
- **SW Versions:** v233 → v234 → v235 → v236
- **Issues Fixed:**
  1. Data doesn't show on first login (only shows after second login)
  2. AbortErrors from too many concurrent Supabase requests
  3. User kicked to login screen on page refresh (external browsers)

---

## ISSUE #1: FIRST LOGIN DATA NOT SHOWING

### Problem
After logging in for the first time, data doesn't show on dashboard. After logging out and back in, data appears.

### Root Cause
`SimpleCloudSync.initialize()` runs during DOMContentLoaded BEFORE OAuth completes:
1. At that point, `AppState.currentUser.lineUserId` is NOT set
2. `loadFromCloud()` uses `AppState.currentUser.id` (wrong property name) which is undefined
3. User-specific data isn't loaded
4. On second login, localStorage has cached data from first session

### The Fix (v234)

**1. Re-trigger data load after login completes:**
```javascript
// In setUserFromLineProfile, after AppState.session is set:
setTimeout(() => {
    if (typeof SimpleCloudSync !== 'undefined' && SimpleCloudSync.loadFromCloud) {
        console.log('[LINE] Loading cloud data with valid userId...');
        SimpleCloudSync.loadFromCloud().then(() => {
            console.log('[LINE] Cloud data loaded successfully');
            if (typeof ScheduleSystem !== 'undefined') ScheduleSystem.renderScheduleList();
        }).catch(err => {
            console.warn('[LINE] Cloud data load failed (non-critical):', err.message);
        });
    }
}, 500);
```

**2. Fixed property name in loadFromCloud:**
```javascript
// OLD (wrong):
const currentUserId = (window.AppState?.currentUser?.id) || ...

// NEW (correct):
const currentUserId = (window.AppState?.currentUser?.lineUserId) ||
                    (window.AppState?.currentUser?.userId) ||
                    (window.Auth?.currentUserId) ||
                    localStorage.getItem('line_user_id') || null;
```

**3. Store line_user_id in localStorage:**
```javascript
// In setUserFromLineProfile, when profile is found:
localStorage.setItem('line_user_id', lineUserId);

// In logout:
localStorage.removeItem('line_user_id');
```

### Files Modified
- `public/index.html` lines 9555-9557 (store line_user_id)
- `public/index.html` lines 9783-9797 (reload after login)
- `public/index.html` lines 8015-8019 (fix property names)
- `public/index.html` lines 10984-10985 (clear on logout)

---

## ISSUE #2: ABORTERRORS FROM CONCURRENT REQUESTS

### Problem
Console flooded with `AbortError: signal is aborted without reason` from Supabase queries.

### Root Cause
Too many Supabase requests firing simultaneously:
- SimpleCloudSync.loadFromCloud (twice - initial + post-login)
- DashboardUpcomingEvents.load
- ScheduleSystem
- GolferCaddyBooking
- MessagesSystem
- RoleSwitcher
- LiveRoundsBadge
- Buddies
- AdminInbox
- TeeSheet iframe
- And more...

Browser has connection limits per domain, so some requests get aborted.

### The Fix (v235)

**1. Skip initial load during OAuth:**
```javascript
static async initialize() {
    console.log('[SimpleCloudSync] Initializing Supabase realtime sync...');
    this.isInitialized = true;

    // SKIP initial load if OAuth is in progress
    const oauthInProgress = sessionStorage.getItem('__oauth_in_progress') ||
                           sessionStorage.getItem('__pending_oauth_code');
    if (oauthInProgress) {
        console.log('[SimpleCloudSync] OAuth in progress - skipping initial load');
    } else {
        this.loadFromCloud().catch(err => {
            console.error('[SimpleCloudSync] Initial load failed:', err);
        });
    }

    this.startRealtimeSync();
}
```

**2. Added 500ms delay to post-login load:**
```javascript
setTimeout(() => {
    SimpleCloudSync.loadFromCloud()...
}, 500);
```

### Files Modified
- `public/index.html` lines 7581-7592 (skip during OAuth)
- `public/index.html` lines 9785-9797 (add delay)

---

## ISSUE #3: KICKED TO LOGIN ON REFRESH

### Problem
User logs in successfully, refreshes page, gets sent back to login screen.

### Root Cause
LIFF doesn't persist login state in external browsers:
1. User logs in via OAuth callback (?code=...)
2. Session is established, dashboard shows
3. User refreshes page
4. LIFF SDK initializes, `liff.isLoggedIn()` returns false
5. Code sends user to login screen

### The Fix (v236)

**Added session restore from localStorage in 3 places:**

**1. When LIFF says "not logged in":**
```javascript
} else {
    console.log('[INIT] User NOT logged in via LINE - checking localStorage session...');

    const savedLineUserId = localStorage.getItem('line_user_id');
    if (savedLineUserId) {
        console.log('[INIT] Found saved line_user_id, attempting session restore...');
        try {
            await window.SupabaseDB.waitForReady();
            const { data: userProfile, error } = await window.SupabaseDB.client
                .from('user_profiles')
                .select('*')
                .eq('line_user_id', savedLineUserId)
                .single();

            if (userProfile && !error) {
                console.log('[INIT] Session restored from localStorage!');
                // Restore AppState...
                AppState.currentUser = { ... };
                AppState.session = {
                    isAuthenticated: true,
                    authMethod: 'localStorage_restore',
                    loginTime: new Date().toISOString()
                };
                LineAuthentication.redirectToDashboard();
                return;
            } else {
                localStorage.removeItem('line_user_id'); // Invalid, clear it
            }
        } catch (err) {
            console.warn('[INIT] Session restore failed:', err);
        }
    }
    // ... show login screen
}
```

**2. When LIFF init fails (.catch block)**

**3. When LIFF SDK not available**

### Files Modified
- `public/index.html` lines 13831-13892 (LIFF not logged in)
- `public/index.html` lines 13894-13950 (LIFF init failed)
- `public/index.html` lines 13951-14012 (LIFF SDK not available)

---

## DEPLOYMENT HISTORY

| Version | Changes | Result |
|---------|---------|--------|
| v233 | Previous: Society event time fix | Working |
| v234 | Reload cloud data after login, fix property names, store line_user_id | Fixed first login data |
| v235 | Skip duplicate load during OAuth, add delay | Reduced AbortErrors |
| v236 | Session persistence from localStorage | Fixed refresh logout |

---

## CODE LOCATIONS

### Login Data Load Fix
```
index.html
Line 9555-9557  : Store line_user_id in localStorage
Line 9783-9797  : Reload cloud data after login (with 500ms delay)
Line 8015-8019  : Fixed property names in loadFromCloud
Line 10984-10985: Clear line_user_id on logout
```

### OAuth Skip in SimpleCloudSync
```
index.html
Line 7581-7592  : Check OAuth flags before initial load
```

### Session Restore from localStorage
```
index.html
Line 13831-13892 : Restore when LIFF says not logged in
Line 13894-13950 : Restore when LIFF init fails
Line 13951-14012 : Restore when LIFF SDK not available
```

---

## SESSION RESTORE FLOW

```
Page Load (no ?code= in URL)
    │
    ├─> LIFF init
    │       │
    │       ├─> liff.isLoggedIn() = true
    │       │       └─> Normal LIFF flow (get profile, redirect)
    │       │
    │       ├─> liff.isLoggedIn() = false
    │       │       └─> Check localStorage for line_user_id
    │       │               │
    │       │               ├─> Found: Query Supabase, restore session
    │       │               └─> Not found: Show login screen
    │       │
    │       └─> LIFF init failed
    │               └─> Check localStorage for line_user_id
    │                       │
    │                       ├─> Found: Query Supabase, restore session
    │                       └─> Not found: Show login screen
    │
    └─> LIFF SDK not available
            └─> Check localStorage for line_user_id
                    │
                    ├─> Found: Query Supabase, restore session
                    └─> Not found: Show login screen
```

---

## LESSONS LEARNED

### 1. Property Names Matter
`AppState.currentUser.id` vs `AppState.currentUser.userId` - always verify the actual property names being used.

### 2. Timing of Initialization
`SimpleCloudSync.initialize()` runs in DOMContentLoaded before OAuth callback is processed. Need to account for this timing.

### 3. LIFF Doesn't Persist in External Browsers
LIFF login state only persists in LINE app's WebView. External browsers (Chrome, Safari) need localStorage-based session persistence.

### 4. Concurrent Request Limits
Browsers limit concurrent connections per domain. Too many Supabase requests at once causes AbortErrors.

### 5. Skip Redundant Operations During OAuth
If OAuth is in progress, skip initial data loads that will happen after OAuth completes anyway.

---

## TESTING CHECKLIST

### First Login Data
- [ ] Log out completely
- [ ] Clear line_user_id from localStorage (DevTools > Application > Local Storage)
- [ ] Log in via LINE
- [ ] Dashboard should show data immediately (schedule, events, etc.)

### Session Persistence
- [ ] Log in successfully
- [ ] Refresh the page (F5)
- [ ] Should stay on dashboard (NOT redirected to login)
- [ ] Console should show: `[INIT] Session restored from localStorage!`

### AbortErrors
- [ ] Log in
- [ ] Console should have fewer AbortErrors than before
- [ ] Console should show: `[SimpleCloudSync] OAuth in progress - skipping initial load`

---

## RELATED DOCUMENTATION

- `compacted/2026-01-22_SESSION_FUCKUPS_AND_FIXES.md` - Previous session fixes (drag duplicate, login loop, society event)
- `compacted/2025-12-19_LOGIN_SANITY_CHECK.md` - OAuth flow documentation
