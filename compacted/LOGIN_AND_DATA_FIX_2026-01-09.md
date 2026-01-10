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

---

### Issue 4: 2-Man Team Match Play Calculation Wrong
**Symptom:** Team match play not calculating hole winners correctly. The rule is:
1. Best ball from each team competes first (outright win)
2. If best balls tie, partners' scores break the tie
3. If partners also tie, it's a halve

**Root Cause:** Bug at line 59163 comparing player ID against array of objects instead of array of IDs:
```javascript
// BUG: teamConfig.teamA is array of {playerId, playerName, scores, handicap} objects
.filter(p => !teamConfig.teamA.includes(p.id))  // ALWAYS FALSE!
```

**Fix Applied:**
```javascript
// FIX: Extract IDs first, then compare
const teamAIds = teamConfig.teamA.map(t => t.playerId);
actualTeamB = this.players
    .filter(p => !teamAIds.includes(p.id))
```

**Location:** `public/index.html` ~line 59163

---

---

### Issue 5: Rounds Not Saving to Database
**Symptom:** Clicking "Finish Round" shows success but round doesn't appear in history.

**Root Causes:**
1. `distributeRoundScores()` and `saveRoundToHistory()` not waiting for Supabase
2. Database trigger `auto_update_society_handicaps_on_round` has UUID/text type mismatch

**Fixes Applied:**

#### A. Added waitForReady to round saving (`public/index.html`)
```javascript
async distributeRoundScores() {
    // Wait for Supabase to be ready before saving rounds
    if (window.SupabaseDB && !window.SupabaseDB.ready) {
        await window.SupabaseDB.waitForReady();
    }
    // ... rest of function
}

async saveRoundToHistory(player) {
    // Wait for Supabase to be ready before saving
    if (window.SupabaseDB && !window.SupabaseDB.ready) {
        await window.SupabaseDB.waitForReady();
    }
    // ... rest of function
}
```

#### B. Fixed database trigger (run in Supabase SQL Editor)
```sql
-- The bug was: sm.user_id (UUID) = NEW.golfer_id (text)
-- Fixed by casting: sm.user_id::text = NEW.golfer_id
CREATE OR REPLACE FUNCTION auto_update_society_handicaps_on_round()
RETURNS TRIGGER AS $$
...
WHERE sm.user_id::text = NEW.golfer_id  -- FIX: Cast UUID to text
...
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## SERVICE WORKER CACHE VERSIONS (Updated)

| Version | Fix |
|---------|-----|
| v60 | Initial fixes for login flow |
| v61 | Added waitForReady in renderScheduleList |
| v62 | Added waitForReady in MessagesSystem.init |
| v63 | Fixed PWA icons for installation |
| v64 | Fixed 2-man team match play calculation |
| v65 | Fixed round saving - waitForReady + trigger fix |
| v66 | Fixed tee sheet auto-date-update for midnight rollover |
| v67 | Fixed plus handicap handling in all match play calculations |

---

### Issue 6: Tee Sheet Date Not Auto-Updating at Midnight
**Symptom:** Golf courses keep tee sheet open permanently. After midnight, the date stays on yesterday instead of auto-updating to today.

**Root Cause:** Line 4116 only set today's date if the input was empty: `if (!el.dateInput.value) el.dateInput.value = todayISO();`

**Fix Applied:** (`public/proshop-teesheet.html` ~line 4116)
```javascript
// Always start with today's date (fixes overnight stale date issue)
el.dateInput.value = todayISO();
el.langSelect.value = currentLang;

// Auto-update date at midnight for golf courses that keep tee sheet open permanently
let lastCheckedDate = todayISO();
setInterval(() => {
  const currentToday = todayISO();
  if (currentToday !== lastCheckedDate) {
    console.log('[TeeSheet] Date changed from', lastCheckedDate, 'to', currentToday, '- auto-updating');
    lastCheckedDate = currentToday;
    el.dateInput.value = currentToday;
    updateHeaderDate();
    fetchAndRender();
  }
}, 60000); // Check every minute
```

---

### Issue 7: Spectate Live Showing Wrong Stableford Score
**Symptom:** Tristan Gilbert's score showed 33 instead of 35 on Spectate Live page.

**Root Cause:** Wrong hole scores were saved to `scores` table:
- Hole 3: 7 instead of 5 (caused -2 pts)
- Hole 7: 6 instead of 8 (no pts difference)

**Fix Applied:** Manual SQL correction:
```sql
UPDATE scores SET gross_score = 5, stableford_points = 2
WHERE scorecard_id = 'ab99b630-d589-4f5f-a37f-8464c6a40b0b' AND hole_number = 3;

UPDATE scores SET gross_score = 8
WHERE scorecard_id = 'ab99b630-d589-4f5f-a37f-8464c6a40b0b' AND hole_number = 7;
```

---

## SUMMARY OF ALL FIXES (January 9, 2026)

| Issue | Problem | Fix | Cache Ver |
|-------|---------|-----|-----------|
| 1 | Multiple clicks to login | Debounce flag, removed touch handlers | v60 |
| 2 | Data not loading after login | waitForReady in ScheduleSystem, MessagesSystem | v61-62 |
| 3 | PWA won't install | Created 192x192 & 512x512 icons, fixed manifest | v63 |
| 4 | 2-man team match play wrong | Fixed teamConfig.teamA comparison (objects vs IDs) | v64 |
| 5 | Rounds not saving to DB | waitForReady + fixed trigger UUID/text cast | v65 |
| 6 | Tee sheet stale date overnight | Always set today + check every minute | v66 |
| 7 | Spectate wrong score | Manual SQL fix for hole scores | - |
| 8 | Plus handicap not handled in match play | Fixed all inline calculations + string "+X" format | v67 |

---

### Issue 8: Plus Handicap Not Handled in Match Play (Jan 10, 2026)
**Symptom:** Plus handicappers (e.g., +1.9) would have strokes incorrectly calculated in team match play and round robin.

**Root Cause:** Inline `getStablefordPoints` and `getNetScore` functions in `calculateTeamMatchPlay` didn't handle:
1. Negative handicap values (plus handicaps stored as -1.9)
2. String format "+X" (e.g., "+1.9")

**Correct Logic for Plus Handicaps:**
- Plus handicaps **GIVE** strokes on **EASIEST** holes (highest SI: 18, 17, 16...)
- Example: +2 handicap gives 1 stroke on SI 17 and SI 18 only

**Fixes Applied:**
1. `calculateTeamMatchPlay` - Both stableford and stroke modes
2. `calculateRoundRobinMatchPlay` - Added string "+X" format handling
3. `calcStablefordPts` fallback function
4. `calcShotsOnHole` function

**Code Pattern Used:**
```javascript
// Handle plus handicaps (negative values or "+X" strings)
let hcpValue = typeof handicap === 'string' && handicap.startsWith('+')
    ? -parseFloat(handicap.substring(1))
    : parseFloat(handicap) || 0;
const isPlus = hcpValue < 0;
const absHcp = Math.abs(hcpValue);

const baseStrokes = Math.floor(absHcp / 18);
const extraStrokeThreshold = absHcp % 18;

let shotsReceived;
if (isPlus) {
    // Plus handicap: GIVE strokes on EASIEST holes (highest SI)
    shotsReceived = -(baseStrokes + (strokeIndex > (18 - extraStrokeThreshold) ? 1 : 0));
} else {
    // Regular handicap: RECEIVE strokes on HARDEST holes (lowest SI)
    shotsReceived = baseStrokes + (strokeIndex <= extraStrokeThreshold ? 1 : 0);
}
```

---

## DATABASE FIXES APPLIED

### 1. Society Handicap Trigger (CRITICAL)
```sql
-- Fixed UUID/text type mismatch in auto_update_society_handicaps_on_round
WHERE sm.user_id::text = NEW.golfer_id  -- Cast UUID to text
```

### 2. Tristan Gilbert Score Correction
```sql
-- Hole 3: 7→5, Hole 7: 6→8
UPDATE scores SET gross_score = 5, stableford_points = 2 WHERE ... hole_number = 3;
UPDATE scores SET gross_score = 8 WHERE ... hole_number = 7;
```

### 3. Manual Round Insert (when triggers block)
```sql
-- Disable triggers, insert, re-enable
ALTER TABLE rounds DISABLE TRIGGER trigger_update_buddy_stats;
ALTER TABLE rounds DISABLE TRIGGER trigger_auto_update_handicap;
ALTER TABLE rounds DISABLE TRIGGER trigger_auto_update_society_handicaps;
INSERT INTO rounds (...) VALUES (...);
ALTER TABLE rounds ENABLE TRIGGER ...;
```

---

## EMERGENCY ROLLBACK

If issues occur, bump SW_VERSION in `public/sw.js` and redeploy:
```javascript
const SW_VERSION = 'mcipro-cache-v68'; // Increment this
```

Then deploy:
```bash
git add . && git commit -m "Cache bust" && git push && vercel --prod --yes
```
