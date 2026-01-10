# MyCaddi Pro - Bug Fixes Documentation
## Dates: January 9-10, 2026
## Current Cache Version: v71

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
| v68 | Fixed private vs society event handicap selection |

---

### Issue 9: Private Events Using Society Handicaps (Jan 10, 2026)
**Symptom:** Scheduled private rounds with friends were labeled as "Society Events" and potentially using wrong handicaps.

**Root Cause:** When any event with an ID was selected, code assumed it was a society event:
```javascript
// BUG: Any event ID = society event
if (eventSelectValue !== '' && eventSelectValue !== 'private') {
    this.roundType = 'society';  // WRONG for private scheduled events!
}
```

**Correct Logic:**
- **Practice Round**: No event → Universal handicap
- **Private Round**: "Private Round" option OR event.isPrivate=true OR event has no societyName → Universal handicap
- **Society Event**: event.isPrivate=false AND event has societyName → Society handicap

**Fixes Applied:**
1. Store loaded events in `this.loadedEvents` for lookup
2. Check `isPrivate` flag and `societyName` when determining round type
3. Pass `null` to `getHandicapForSociety()` for private/practice rounds (forces universal)
4. Updated dropdown labels to show: 🔒 Private, 🏌️ Society, 👥 Public

**Code Pattern:**
```javascript
// Look up the event to check if it's private or society
const selectedEvent = this.loadedEvents?.find(e => e.id === eventSelectValue);
const isTrueSocietyEvent = selectedEvent && !selectedEvent.isPrivate && selectedEvent.societyName;

// Only use society handicaps for TRUE society events
const societyForHandicap = (this.roundType === 'society') ? selectedSociety : null;
const newHcp = this.getHandicapForSociety(player.societyHandicaps, societyForHandicap);
```

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

## SUMMARY OF ALL FIXES

### January 9, 2026 (v60-v66)

| Issue | Problem | Fix | Cache Ver |
|-------|---------|-----|-----------|
| 1 | Multiple clicks to login | Debounce flag, removed touch handlers | v60 |
| 2 | Data not loading after login | waitForReady in ScheduleSystem, MessagesSystem | v61-62 |
| 3 | PWA won't install | Created 192x192 & 512x512 icons, fixed manifest | v63 |
| 4 | 2-man team match play wrong | Fixed teamConfig.teamA comparison (objects vs IDs) | v64 |
| 5 | Rounds not saving to DB | waitForReady + fixed trigger UUID/text cast | v65 |
| 6 | Tee sheet stale date overnight | Always set today + check every minute | v66 |
| 7 | Spectate wrong score | Manual SQL fix for hole scores | - |

### January 10, 2026 (v67-v68)

| Issue | Problem | Fix | Cache Ver |
|-------|---------|-----|-----------|
| 8 | Plus handicap not handled in match play | Fixed all inline calculations + string "+X" format | v67 |
| 9 | Private events using society handicaps | Check isPrivate flag + societyName | v68 |

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
const SW_VERSION = 'mcipro-cache-v69'; // Increment this
```

Then deploy:
```bash
git add . && git commit -m "Cache bust" && git push && vercel --prod --yes
```

---

## HANDICAP QUICK REFERENCE

### Stroke Allocation Formula
```javascript
baseStrokes = floor(handicap / 18)        // Strokes on ALL holes
extraStrokeThreshold = handicap % 18      // Extra stroke on hardest SI holes
```

### Regular Handicaps (Receive Strokes)
| Handicap | Base | Extra SI | SI 1 | SI 5 | SI 10 | SI 18 |
|----------|------|----------|------|------|-------|-------|
| 13 | 0 | ≤13 | 1 | 1 | 1 | 0 |
| 20 | 1 | ≤2 | 2 | 1 | 1 | 1 |
| 25 | 1 | ≤7 | 2 | 2 | 1 | 1 |
| 36 | 2 | ≤0 | 2 | 2 | 2 | 2 |

### Plus Handicaps (Give Strokes on Easiest Holes)
| Handicap | Base | Extra SI | SI 1 | SI 17 | SI 18 |
|----------|------|----------|------|-------|-------|
| +2 | 0 | >16 | 0 | +1 | +1 |
| +4 | 0 | >14 | 0 | +1 | +1 |

### Stableford Points (Net Score vs Par)
| Net Score | Points |
|-----------|--------|
| 3+ under (Albatross) | 5 |
| 2 under (Eagle) | 4 |
| 1 under (Birdie) | 3 |
| Even (Par) | 2 |
| 1 over (Bogey) | 1 |
| 2+ over | 0 |

### 2-Man Team Match Play Rules
1. Best ball from each team competes first (outright win)
2. If best balls tie → partners' scores break the tie
3. If partners also tie → hole is halved

### Handicap Source by Round Type
| Round Type | Handicap Used |
|------------|---------------|
| Practice Round | Universal |
| Private Round | Universal |
| Private Event (isPrivate=true) | Universal |
| Public Event (no societyName) | Universal |
| Society Event | Society-specific |

---

## FILES MODIFIED (All Sessions)

| File | Changes |
|------|---------|
| `public/index.html` | Login, scoring, match play, handicap logic |
| `public/supabase-config.js` | Retry-based initialization |
| `public/sw.js` | Cache versions v60 → v68 |
| `public/manifest.json` | PWA icon declarations |
| `public/proshop-teesheet.html` | Midnight auto-date rollover |
| `public/mcipro-192.png` | NEW - PWA icon |
| `public/mcipro-512.png` | NEW - PWA icon |
| `public/society-dashboard-enhanced.js` | formatHandicapDisplay for members list |
| `public/society-organizer-manager.js` | formatHandicapDisplay for player groups |

---

## ADDITIONAL FIXES - January 10, 2026 (v69-v71)

### Issue 10: Cannot Enter Plus Handicap Manually (v69)
**Symptom:** Users cannot change a player's handicap to a plus "+" value using the dropdown - only preset values available.

**Root Cause:** Handicap dropdown only shows pre-stored values from database. No manual entry option.

**Fix Applied:** Added `promptManualHandicap()` function with pencil button (✏️)

**Location:** `public/index.html` ~line 50181
```javascript
// Prompt user to manually enter a handicap (supports plus handicaps like +2.5)
promptManualHandicap(playerIndex) {
    const player = this.players[playerIndex];
    if (!player) return;

    const currentDisplay = window.formatHandicapDisplay(player.handicap);
    const input = prompt(
        `Enter handicap for ${player.name}:\n\n` +
        `• Regular handicap: e.g., 15.2\n` +
        `• Plus handicap: e.g., +2.5\n\n` +
        `Current: ${currentDisplay}`,
        currentDisplay
    );

    if (input === null) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    // Parse the handicap - handle plus format
    let handicapValue;
    if (trimmed.startsWith('+')) {
        handicapValue = -Math.abs(parseFloat(trimmed.substring(1)));
    } else {
        handicapValue = parseFloat(trimmed);
    }

    if (isNaN(handicapValue)) {
        NotificationManager.show('Invalid handicap value', 'error');
        return;
    }

    player.handicap = handicapValue;
    this.renderPlayersList();
    NotificationManager.show(`${player.name} handicap set to ${window.formatHandicapDisplay(handicapValue)}`, 'success');
}
```

**UI Change:** Added ✏️ edit button next to handicap dropdown in player list.

---

### Issue 11: Plus Handicap Shows as "1.6" Instead of "+1.6" (v70)
**Symptom:** In society directory, a player with +1.6 handicap shows as "1.6" (missing plus sign), but edit modal shows correct "+1.6".

**Root Cause:** Two files displayed raw handicap value without using `formatHandicapDisplay()`:
1. `society-dashboard-enhanced.js` line 507: `const handicap = profile.profile_data?.golfInfo?.handicap`
2. `society-organizer-manager.js` line 796: `HCP: ${Math.round(p.handicap)}` (Math.round loses sign)

**Fixes Applied:**

**society-dashboard-enhanced.js (~line 507):**
```javascript
// BEFORE
const handicap = profile.profile_data?.golfInfo?.handicap || profile.profile_data?.handicap || '-';

// AFTER
const rawHandicap = profile.profile_data?.golfInfo?.handicap ?? profile.profile_data?.handicap;
const handicap = rawHandicap !== null && rawHandicap !== undefined
    ? (window.formatHandicapDisplay ? window.formatHandicapDisplay(rawHandicap) : rawHandicap)
    : '-';
```

**society-organizer-manager.js (~line 796):**
```javascript
// BEFORE
<span class="text-gray-500">HCP: ${Math.round(p.handicap)}</span>

// AFTER
<span class="text-gray-500">HCP: ${window.formatHandicapDisplay ? window.formatHandicapDisplay(p.handicap) : p.handicap}</span>
```

---

### Issue 12: Cannot Save User Edits - Duplicate Key Error (v71)
**Symptom:** Saving user edits in admin panel fails with:
```
duplicate key value violates unique constraint "idx_user_profiles_username_unique"
Key (username)=() already exists.
```

**Root Cause:** When username is empty, code set `username: ""` (empty string). The unique constraint allows only one empty string, but many users have no username.

**Fix Applied:** Use `null` instead of empty string for username and society_name.

**Location:** `public/index.html` ~line 46565
```javascript
// BEFORE
const updatePayload = {
    name: fullName,
    username: username,
    society_name: society,
    role: role,
    profile_data: this.users[userIndex].profile_data
};

// AFTER
const updatePayload = {
    name: fullName,
    username: username || null,  // Use null instead of empty string to avoid unique constraint
    society_name: society || null,
    role: role,
    profile_data: this.users[userIndex].profile_data
};
```

---

### Issue 13: Bubba Gump Missing Society Data (Data Fix)
**Symptom:** Bubba Gump shows no society or messages in their profile.

**Root Cause:** User was member of TRGG in `society_members` table (joined 2026-01-07), but `user_profiles` record was out of sync:
- `user_profiles.society_id = null`
- `user_profiles.society_name = ""`
- `profile_data.organizationInfo.societyId = null`

**Fix Applied:** Direct database update to sync profile with membership:
```javascript
// Updated user_profiles
await supabase
    .from('user_profiles')
    .update({
        society_id: '7c0e4b72-d925-44bc-afda-38259a7ba346',  // TRGG
        society_name: 'Travellers Rest Golf Group',
        profile_data: {
            ...current.profile_data,
            organizationInfo: {
                societyId: '7c0e4b72-d925-44bc-afda-38259a7ba346',
                societyName: 'Travellers Rest Golf Group'
            }
        }
    })
    .eq('line_user_id', 'U9e64d5456b0582e81743c87fa48c21e2');

// Set as primary society
await supabase
    .from('society_members')
    .update({ is_primary_society: true })
    .eq('golfer_id', 'U9e64d5456b0582e81743c87fa48c21e2')
    .eq('society_id', '7c0e4b72-d925-44bc-afda-38259a7ba346');
```

**Messages Status:** No bug - Bubba has never sent/received messages. Only 20 direct messages exist in system, between 5 other users.

---

## SERVICE WORKER CACHE VERSIONS (Complete)

| Version | Fix | Date |
|---------|-----|------|
| v60 | Initial fixes for login flow | Jan 9 |
| v61 | Added waitForReady in renderScheduleList | Jan 9 |
| v62 | Added waitForReady in MessagesSystem.init | Jan 9 |
| v63 | Fixed PWA icons for installation | Jan 9 |
| v64 | Fixed 2-man team match play calculation | Jan 9 |
| v65 | Fixed round saving - waitForReady + trigger fix | Jan 9 |
| v66 | Fixed tee sheet auto-date-update for midnight rollover | Jan 9 |
| v67 | Fixed plus handicap handling in all match play calculations | Jan 10 |
| v68 | Fixed private vs society event handicap selection | Jan 10 |
| v69 | Added manual handicap edit with plus support | Jan 10 |
| v70 | Fixed plus handicap display in society directory | Jan 10 |
| v71 | Fixed empty username unique constraint error | Jan 10 |

---

## SUMMARY: ALL ISSUES FIXED (Jan 9-10, 2026)

| # | Issue | Fix Summary | Ver |
|---|-------|-------------|-----|
| 1 | Multiple clicks to login | Debounce flag, removed touch handlers | v60 |
| 2 | Data not loading after login | waitForReady in ScheduleSystem, MessagesSystem | v61-62 |
| 3 | PWA won't install | Created 192x192 & 512x512 icons | v63 |
| 4 | 2-man team match play wrong | Fixed teamConfig.teamA objects vs IDs | v64 |
| 5 | Rounds not saving to DB | waitForReady + fixed trigger UUID/text | v65 |
| 6 | Tee sheet stale date overnight | Always set today + check every minute | v66 |
| 7 | Spectate wrong score | Manual SQL fix for hole scores | - |
| 8 | Plus handicap not handled | Fixed all inline calculations | v67 |
| 9 | Private events using society HCP | Check isPrivate flag + societyName | v68 |
| 10 | Cannot enter plus handicap | Added promptManualHandicap() + ✏️ button | v69 |
| 11 | Plus HCP shows without "+" | formatHandicapDisplay in directory | v70 |
| 12 | Duplicate username key error | Use null instead of empty string | v71 |
| 13 | Bubba Gump missing society | Synced user_profiles with society_members | - |

---

## DATA FIXES APPLIED

| User | Issue | Fix |
|------|-------|-----|
| Tristan Gilbert | Wrong hole scores (H3: 7→5, H7: 6→8) | SQL UPDATE |
| Bubba Gump | Profile out of sync with society_members | Direct DB update |

---

## EMERGENCY ROLLBACK

If issues occur, bump SW_VERSION in `public/sw.js` and redeploy:
```javascript
const SW_VERSION = 'mcipro-cache-v72'; // Increment this
```

Then deploy:
```bash
git add . && git commit -m "Cache bust" && git push && vercel --prod --yes
```
