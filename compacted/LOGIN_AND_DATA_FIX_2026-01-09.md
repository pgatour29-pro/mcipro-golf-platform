# MyCaddi Pro - Login & Data Loading Fix Documentation
## Date: January 9, 2026
## Cache Version: v63

---

## CRITICAL ISSUES FIXED

### Issue 1: Multiple Clicks Required for Login
**Symptom:** Users had to click the LINE login button 3 times, opening 3 windows before reaching dashboard.

**Root Causes:**
1. Touch event handlers conflicting with onclick handlers
2. No debounce on login button
3. Race condition between OAuth callback and LIFF initialization

**Fixes Applied:**

#### A. Added Login Debounce (`public/index.html`)
```javascript
let _loginClicked = false;
window.loginWithLINE = function() {
    if (_loginClicked) return; // Prevent multiple clicks
    _loginClicked = true;
    LineAuthentication.loginWithLINE();
};
```

#### B. Removed Conflicting Touch Handlers
Removed touch event listeners that were triggering alongside click events.

#### C. Added OAuth Processing Flag
```javascript
let oauthProcessed = false;
if (currentCode && statesMatch && codeUnused) {
    oauthProcessed = true;
    // ... process OAuth
}
// Later:
if (typeof liff !== 'undefined' && !oauthProcessed) {
    // LIFF init only if OAuth not being processed
}
```

---

### Issue 2: Data Not Loading After Login
**Symptom:** Users logged in successfully but saw no society events, no rounds, no messages, no announcements.

**Root Cause:** Race condition - code was querying Supabase BEFORE the client finished initializing.

**Fixes Applied:**

#### A. Supabase Client Retry Logic (`public/supabase-config.js`)
```javascript
class SupabaseClient {
    constructor() {
        this.ready = false;
        this.readyPromise = new Promise((resolve) => {
            this.resolveReady = resolve;
        });
        this._initWithRetry();
    }

    _initWithRetry(attempts = 0) {
        if (window.supabase && window.supabase.createClient) {
            this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            this.ready = true;
            this.resolveReady();
            console.log('[Supabase] Client initialized');
        } else if (attempts < 50) {
            // Retry every 100ms for up to 5 seconds
            setTimeout(() => this._initWithRetry(attempts + 1), 100);
        } else {
            console.error('[Supabase] FAILED to initialize after 5 seconds');
        }
    }

    async waitForReady(maxWait = 5000) {
        const start = Date.now();
        while (!this.ready) {
            if (Date.now() - start > maxWait) {
                console.error('[waitForReady] Timeout');
                return;
            }
            await new Promise(r => setTimeout(r, 100));
        }
    }
}
```

#### B. Schedule System Waits for Supabase (`public/index.html` ~line 20702)
```javascript
async renderScheduleList() {
    // Wait for Supabase to be ready (up to 3 seconds)
    if (window.SupabaseDB && !window.SupabaseDB.ready) {
        await window.SupabaseDB.waitForReady();
    }
    // ... rest of function
}
```

#### C. Messages System Waits for Supabase (`public/index.html` ~line 70783)
```javascript
async init() {
    console.log('[MessagesSystem] Initializing...');

    // Wait for Supabase to be ready
    if (window.SupabaseDB && !window.SupabaseDB.ready) {
        await window.SupabaseDB.waitForReady();
    }

    const user = AppState?.currentUser || window.currentUser;
    // ... rest of init
}
```

#### D. Direct REST API for Profile Lookup
Changed profile lookup to use direct REST API to bypass any client initialization issues:
```javascript
static async setUserFromLineProfile(profile) {
    const lineUserId = profile.userId;

    // Query Supabase REST API DIRECTLY
    let userProfile = null;
    try {
        const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
        const SUPABASE_KEY = '...'; // anon key

        const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?line_user_id=eq.${lineUserId}&select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const data = await res.json();
        if (data && data.length > 0) {
            userProfile = data[0];
        }
    } catch (err) {
        console.error('[LINE] Direct query failed:', err);
    }
    // ... rest of profile handling
}
```

---

### Issue 3: PWA Would Not Install
**Symptom:** "This app cannot be installed" when trying to save to homescreen.

**Root Cause:** manifest.json declared icon sizes (192x192, 512x512) that didn't match the actual file size (1024x1024). Chrome validates actual dimensions.

**Fix Applied:**

#### A. Created Properly Sized Icons
```bash
# Using sharp to resize
node -e "
const sharp = require('sharp');
sharp('./public/mcipro.png').resize(512, 512).toFile('./public/mcipro-512.png');
sharp('./public/mcipro.png').resize(192, 192).toFile('./public/mcipro-192.png');
"
```

#### B. Updated manifest.json
```json
{
  "icons": [
    {
      "src": "/mcipro-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/mcipro-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/mcipro.png",
      "sizes": "1024x1024",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

---

## FILES MODIFIED

| File | Changes |
|------|---------|
| `public/index.html` | Login debounce, OAuth flag, wait for Supabase in ScheduleSystem and MessagesSystem, direct REST profile lookup |
| `public/supabase-config.js` | Retry-based initialization, waitForReady() function |
| `public/sw.js` | Cache bumped from v46 to v63 |
| `public/manifest.json` | Fixed icon size declarations |
| `public/mcipro-192.png` | NEW - 192x192 icon for PWA |
| `public/mcipro-512.png` | NEW - 512x512 icon for PWA |

---

## SERVICE WORKER CACHE VERSIONS

| Version | Fix |
|---------|-----|
| v60 | Initial fixes for login flow |
| v61 | Added waitForReady in renderScheduleList |
| v62 | Added waitForReady in MessagesSystem.init |
| v63 | Fixed PWA icons for installation |

---

## KEY PATTERNS FOR ALL USERS

### 1. Always Wait for Supabase Before Data Operations
```javascript
// CORRECT PATTERN
async function anyDataFunction() {
    if (window.SupabaseDB && !window.SupabaseDB.ready) {
        await window.SupabaseDB.waitForReady();
    }
    // Now safe to query
    const { data, error } = await window.SupabaseDB.client.from('table')...
}
```

### 2. Login Flow Must Be Single-Click
- Debounce the login button
- Don't mix touch and click handlers
- Handle OAuth callback before LIFF init

### 3. PWA Icons Must Match Declared Sizes
- Each icon entry needs a separate file at the declared size
- Chrome validates actual image dimensions
- Minimum required: 192x192 and 512x512

---

## TESTING CHECKLIST

- [ ] Login works with single click for new users
- [ ] Login works with single click for existing users
- [ ] Dashboard shows schedule data after login
- [ ] Messages tab shows announcements
- [ ] Society events display correctly
- [ ] PWA can be installed to homescreen
- [ ] Clear cache and retest all above

---

## EMERGENCY ROLLBACK

If issues occur, bump SW_VERSION in `public/sw.js` and redeploy:
```javascript
const SW_VERSION = 'mcipro-cache-v64'; // Increment this
```

Then deploy:
```bash
git add . && git commit -m "Cache bust" && git push && vercel --prod --yes
```
