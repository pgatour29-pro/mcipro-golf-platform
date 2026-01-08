# Session Catalog - January 8, 2026 (Part 2)
## CRITICAL: Duplicate Variable Declaration Breaking Entire App

---

## THE CRITICAL BUG

### Symptom
- LINE login button did nothing
- Console errors: `NotificationManager is not defined`, `AppState is not defined`, `loginWithLINE is not defined`
- Console showed mysterious `(index):21037 Uncaught` with no error message
- Debug checks showed `window.__SCRIPT_2232_LOADED__` was `undefined`

### Root Cause
**Duplicate `const now` declaration in the same function scope**

When adding Supabase caddy bookings cache to `renderScheduleList()`, introduced:
```javascript
// Line 20878 - NEW (for cache timing)
const now = Date.now();
const cacheAge = now - this._caddyBookingsCacheTime;
```

But the same function already had:
```javascript
// Line 21051 - EXISTING (for filter logic)
const now = new Date();
const bangkokNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
```

### Impact
- JavaScript syntax error: `Identifier 'now' has already been declared`
- **The entire 25,000-line script block (lines 2232-27340) failed to parse**
- Nothing in the script executed - not even the first line
- All global definitions broken: NotificationManager, AppState, loginWithLINE, PWAGuard, etc.
- App was completely non-functional

### Fix
Renamed the first declaration:
```javascript
// BEFORE
const now = Date.now();
const cacheAge = now - this._caddyBookingsCacheTime;

// AFTER
const cacheNow = Date.now();
const cacheAge = cacheNow - this._caddyBookingsCacheTime;
```

**File:** `public/index.html` (line 20878)
**Commit:** `ff5f7893`

---

## DIAGNOSIS PROCESS

### 1. Added Ultra-Early Error Capture
```javascript
window.onerror = function(msg, url, line, col, error) {
    console.error('CRITICAL JS ERROR:', msg, 'at line', line);
    alert('JS Error at line ' + line + ': ' + msg);
    return false;
};
```
**Result:** Did NOT catch the error because `window.onerror` doesn't catch syntax/parsing errors

### 2. Added Test Script Before Main Script
```html
<script>
    console.log('TEST SCRIPT - Scripts CAN execute');
    window.__PRE_SCRIPT_OK__ = true;
</script>
```
**Result:** Would have shown if scripts could execute at all

### 3. Used Node.js Syntax Check
```bash
node --check temp_check.js
```
**Result:** Found the exact error:
```
SyntaxError: Identifier 'now' has already been declared
    at temp_check.js:18814
```

### 4. Traced Script Line to HTML Line
- Script line 18814 = HTML line ~21051
- Found the conflicting declaration at script line 18641 = HTML line ~20878

---

## KEY LEARNING

### Syntax Errors Kill Entire Script Blocks
- A single syntax error anywhere in a `<script>` block prevents the **entire block** from parsing
- No code in that block executes - not even error handlers defined within it
- The browser shows a cryptic `Uncaught` with no message for parsing errors
- **Always run `node --check` on large script changes before deploying**

### How to Diagnose Script Not Executing
1. Add a small test `<script>` BEFORE the suspect script
2. Extract script content and run `node --check` on it
3. Check for duplicate variable declarations in same scope
4. Check for unclosed brackets, template literals, regex errors

---

## EARLIER FIXES THIS SESSION (Part 1)

### 1. Tee Sheet Booking Sync
- Added `bookingManager.saveToLocalStorage()` after `syncBookingToParent()`
- **Commit:** `c2a1c522`

### 2. Duplicate Caddy Booking Displays
- Removed `myCaddyBookingsWidget` section
- Removed `standaloneCaddyBookings` container
- **Commit:** `5da189ec`

### 3. Schedule Tab Caddy Bookings
- Added Supabase fetch to `renderScheduleList()`
- Added 30-second cache to avoid repeated queries
- **Commit:** `4a81de10`

### 4. startRound Freezing (Phoenix)
- Changed sequential handicap fetch to `Promise.all()` parallel fetch
- **Commit:** `6eaac3b3`

### 5. NotificationManager Not Defined
- Added `window.NotificationManager` definition
- **Commit:** `ac6fa74e`

### 6. Service Worker Cache Version
- Bumped from v3 to v4 to force fresh load
- **File:** `public/sw.js`

---

## ALL COMMITS THIS SESSION

| Commit | Description |
|--------|-------------|
| `c2a1c522` | Fix tee sheet booking sync (saveToLocalStorage) |
| `5da189ec` | Remove duplicate caddy booking displays |
| `4a81de10` | Add 30-second cache to Schedule tab |
| `6eaac3b3` | HOTFIX: startRound freezing (parallel fetch) |
| `ac6fa74e` | Add missing NotificationManager |
| `9d45b569` | Add ultra-early error capture (diagnostic) |
| `9d0bd694` | Add pre-script test (diagnostic) |
| `ff5f7893` | **CRITICAL FIX: Duplicate const now declaration** |

---

## FILES MODIFIED

| File | Changes |
|------|---------|
| `public/index.html` | Fixed duplicate `const now`, added NotificationManager, Schedule tab Supabase fetch, removed duplicate widgets, parallel handicap fetch |
| `public/proshop-teesheet.html` | Added saveToLocalStorage() call |
| `public/sw.js` | Bumped cache version to v4 |

---

## TESTING CHECKLIST

- [x] Hard refresh (`Ctrl+Shift+R`) to clear cache
- [x] LINE login button works
- [x] No console errors for NotificationManager/AppState
- [ ] Schedule tab shows caddy bookings
- [ ] Tee sheet bookings sync to dashboard
- [ ] startRound doesn't freeze
- [ ] Today's Tee Time displays correctly

---

## PREVENTION

### Before Deploying Large Script Changes:
```bash
# Extract script and check syntax
node -e "
const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const start = html.indexOf('<script>', html.indexOf('</style>'));
const end = html.indexOf('</script>', start);
const script = html.slice(start + 8, end);
fs.writeFileSync('temp.js', script);
" && node --check temp.js && rm temp.js
```

### Variable Naming Convention
- Use descriptive names to avoid collisions: `cacheTimestamp`, `filterDate`, `currentTime`
- Avoid generic names like `now`, `data`, `result` in large functions

---

## USER REFERENCE

| Name | LINE User ID |
|------|--------------|
| Pete Park | U2b6d976f19bca4b2f4374ae0e10ed873 |

---

## DEPLOYMENT

- **URL:** https://mycaddipro.com
- **Final Deploy:** Production at ~15:30 UTC
- **Status:** Login working, app functional
