# CRITICAL BUG REPORT: Bookings Disappearing After 3-5 Minutes

## Executive Summary
Bookings are being lost after approximately 3-5 minutes due to **THREE CRITICAL BUGS**:

1. **SERVER-SIDE**: In-memory storage in Netlify Functions loses all data when the function cold-starts
2. **CLIENT-SIDE**: Login function wipes ALL bookings from localStorage on every login
3. **SYNC ISSUE**: Poor sync implementation causes local data to be overwritten by empty cloud data

---

## Bug #1: NETLIFY FUNCTION IN-MEMORY STORAGE (CRITICAL)

### Location
**File**: `C:/Users/pete/Documents/MciPro/netlify/functions/bookings.js`
**Lines**: 1-12

### Problem Code
```javascript
// Line 1-12
let storage = {
  bookings: [],
  user_profiles: [],
  schedule_items: [],
  emergency_alerts: [],
  caddies: [],
  waitlist: [],
  tombstones: {},
  version: 1,
  updatedAt: Date.now()
};
```

### Why This Causes Data Loss
- Netlify Functions are **serverless** and use in-memory storage
- After 3-5 minutes of inactivity, the function container **shuts down** (cold start)
- Next request creates a **NEW container** with **EMPTY storage**
- All bookings vanish because they were only stored in RAM

### Evidence
- Cloud polling every 15 seconds (line 2314 in index.html)
- When function cold-starts, GET request returns empty array
- Client overwrites local bookings with empty cloud data (line 2343-2351)

### Fix Applied
**File**: `C:/Users/pete/Documents/MciPro/netlify/functions/bookings-FIXED.js`

**Changed from**: In-memory `let storage = {...}`
**Changed to**: Persistent storage using Netlify Blobs:

```javascript
const { getStore } = require('@netlify/blobs');

async function getStorage() {
  const store = getStore('mcipro-data');
  const data = await store.get('storage', { type: 'json' });

  if (!data) {
    return {
      bookings: [],
      user_profiles: [],
      schedule_items: [],
      emergency_alerts: [],
      caddies: [],
      waitlist: [],
      tombstones: {},
      version: 0,
      updatedAt: Date.now()
    };
  }

  return data;
}

async function setStorage(storage) {
  const store = getStore('mcipro-data');
  await store.setJSON('storage', storage);
  return storage;
}
```

**Required**:
- Replace `bookings.js` with `bookings-FIXED.js`
- Install dependency: `npm install @netlify/blobs`

---

## Bug #2: LOGIN FUNCTION WIPES ALL BOOKINGS (CRITICAL)

### Location
**File**: `C:/Users/pete/Documents/MciPro/index.html`
**Lines**: 4566, 4613-4727

### Problem Code
```javascript
// Line 4566 - Called on EVERY login
function loginWithCustomProfile(profileData) {
    LoadingManager.show('Logging in with your profile...');

    // FIRST: Clear all data immediately before any initialization
    ensureCleanSlateForNewUser(profileData);  // <-- WIPES BOOKINGS!
    ...
}

// Line 4613-4727 - The destructive function
function ensureCleanSlateForNewUser(profileData) {
    ...
    // Line 4628 - Bookings are in the "force remove" list
    const dataKeysToForceRemove = [
        'mcipro_bookings',  // <-- DELETES ALL BOOKINGS
        'schedule_items',
        ...
    ];

    // Line 4645-4647 - Actually deletes them
    dataKeysToForceRemove.forEach(key => {
        localStorage.removeItem(key);
    });

    // Line 4658 - Empties the in-memory array
    if (window.BookingManager) {
        BookingManager.bookings = [];  // <-- WIPES IN-MEMORY BOOKINGS
        BookingManager.waitlists = {};

        // Line 4662 - Overwrites with empty array
        localStorage.setItem('mcipro_bookings', JSON.stringify([]));
        ...
    }

    // Line 4711 - Does it AGAIN after 100ms
    setTimeout(() => {
        if (window.BookingManager) {
            BookingManager.bookings = [];  // <-- WIPES AGAIN
            BookingManager.waitlists = {};
        }
        ...
    }, 100);
}
```

### Why This Causes Data Loss
1. User creates a booking → Saved to localStorage
2. User logs out and logs back in → `ensureCleanSlateForNewUser()` called
3. Function removes `mcipro_bookings` from localStorage (line 4645)
4. Function sets `BookingManager.bookings = []` (line 4658)
5. Function overwrites with empty array (line 4662)
6. Function does it AGAIN after 100ms (line 4711)
7. **ALL BOOKINGS ARE GONE**

### Fix Applied
**File**: `C:/Users/pete/Documents/MciPro/FIXES-client-side.html`

**Changed from**: Clearing ALL data including bookings
**Changed to**: Only clearing user-specific UI data:

```javascript
function ensureCleanSlateForNewUser(profileData) {
    const userName = `${profileData.firstName} ${profileData.lastName}`;

    console.log(`[FIXED] Setting up user: ${userName} - PRESERVING BOOKINGS`);

    // FIXED: Preserve critical data
    const keysToPreserve = [
        'mcipro_user_profiles',
        'mcipro_bookings',        // PRESERVED
        'mcipro_schedule',         // PRESERVED
        'schedule_items',          // PRESERVED
        'mcipro_data',            // PRESERVED
        'mci-pro-language',
        'caddie_system_data',
        'golf_courses_data'
    ];

    // Only clear temporary/UI data
    const dataKeysToClear = [
        'food_orders',
        'chat_messages',
        'cart_data',
        'order_history'
    ];

    dataKeysToClear.forEach(key => {
        localStorage.removeItem(key);
    });

    // REMOVED: All code that was wiping BookingManager.bookings
}
```

---

## Bug #3: POOR CLOUD SYNC OVERWRITES LOCAL DATA

### Location
**File**: `C:/Users/pete/Documents/MciPro/index.html`
**Lines**: 2343-2409

### Problem Code
```javascript
// Line 2343 - Uses timestamp comparison
if (!localData.updatedAt || (cloudData.updatedAt && cloudData.updatedAt > localData.updatedAt)) {
    console.log('[SimpleCloudSync] Cloud data is newer, updating local storage');

    // Line 2348 - Overwrites local bookings with cloud data
    if (cloudData.bookings) {
        localStorage.setItem('mcipro_bookings', JSON.stringify(cloudData.bookings));
        if (typeof BookingManager !== 'undefined' && BookingManager.bookings) {
            BookingManager.bookings = cloudData.bookings;  // <-- OVERWRITES
            ...
        }
    }
}
```

### Why This Causes Data Loss
1. User creates booking → Saved locally with `updatedAt: Date.now()`
2. Debounced sync triggers after 800ms (line 2272, 2864)
3. Netlify function cold-starts → Returns EMPTY array with `updatedAt: Date.now()`
4. Client compares: `cloudData.updatedAt > localData.updatedAt` = **TRUE** (server time is newer)
5. Client overwrites local bookings with empty cloud array
6. **ALL BOOKINGS ARE GONE**

### Additional Issues
- No cross-device sync via localStorage events
- 15-second polling interval is too slow (line 2314)
- No retry logic for failed syncs
- Timestamp-based instead of version-based sync

### Fix Applied
**File**: `C:/Users/pete/Documents/MciPro/FIXES-client-side.html`

**FIX 2**: Version-based sync instead of timestamp:
```javascript
const cloudVersion = cloudData.version || 0;
const localVersion = localData.lastSyncVersion || 0;

if (cloudVersion > localVersion) {
    // Only update if cloud version is actually newer
    ...
} else if (localBookings.length > 0 && (!cloudData.bookings || cloudData.bookings.length === 0)) {
    // If we have local bookings but cloud is empty, push to cloud
    await this.saveToCloud();
}
```

**FIX 3**: Immediate sync after booking save:
```javascript
saveToLocalStorage() {
    localStorage.setItem('mcipro_bookings', JSON.stringify(this.bookings));

    // IMMEDIATE sync instead of debounced
    SimpleCloudSync.saveToCloud().then(() => {
        console.log('[BookingManager] Immediate sync completed');
    }).catch(err => {
        SimpleCloudSync.saveToCloudSoon(); // Fallback
    });
}
```

**FIX 4**: Cross-device sync via storage events:
```javascript
window.addEventListener('storage', (e) => {
    if (e.key === 'mcipro_bookings' && e.newValue) {
        const newBookings = JSON.parse(e.newValue);
        if (typeof BookingManager !== 'undefined') {
            BookingManager.bookings = newBookings;
            BookingManager.render();
        }
    }
});
```

**FIX 5**: Faster polling (5s instead of 15s):
```javascript
}, 5000);  // Line 2314
```

**FIX 6**: Retry logic for failed syncs:
```javascript
static async saveToCloudWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const success = await this.saveToCloud();
            if (success) return true;
        } catch (err) {
            if (i < maxRetries - 1) {
                const delay = Math.min(1000 * Math.pow(2, i), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return false;
}
```

---

## Data Flow Analysis

### Current (BROKEN) Flow
```
1. User creates booking
2. BookingManager.addBooking() called (line 9356)
3. Booking saved to localStorage (line 9427)
4. Debounced cloud sync scheduled (800ms delay, line 9434)
5. User logs out/in → ensureCleanSlateForNewUser() wipes bookings (line 4566)
6. OR: Netlify function cold-starts → Returns empty array
7. Cloud polling overwrites local with empty array (line 2350)
8. BOOKINGS LOST
```

### Fixed Flow
```
1. User creates booking
2. BookingManager.addBooking() called (line 9356)
3. Booking saved to localStorage (line 9427)
4. IMMEDIATE cloud sync (no delay)
5. Netlify Blobs stores persistently
6. User logs out/in → Bookings PRESERVED (keysToPreserve)
7. Cloud polling uses version-based sync
8. Storage events sync across devices/tabs
9. BOOKINGS SAFE
```

---

## Exact Line Numbers of Bugs

### index.html
- **Line 4566**: Calls `ensureCleanSlateForNewUser()` on every login
- **Line 4613-4727**: `ensureCleanSlateForNewUser()` function that wipes bookings
- **Line 4628**: Includes `mcipro_bookings` in deletion list
- **Line 4645-4647**: Actually deletes bookings from localStorage
- **Line 4658**: Sets `BookingManager.bookings = []`
- **Line 4662**: Overwrites localStorage with empty array
- **Line 4711**: Wipes bookings AGAIN after 100ms timeout
- **Line 2272**: Debounce delay of 800ms (should be immediate)
- **Line 2314**: Polling interval of 15000ms (should be 5000ms)
- **Line 2343**: Timestamp-based sync (should be version-based)
- **Line 2350**: Overwrites local bookings without validation
- **Line 9434**: Debounced sync instead of immediate
- **Missing**: No storage event listener for cross-device sync
- **Missing**: No retry logic for failed syncs

### netlify/functions/bookings.js
- **Line 2-12**: In-memory storage (volatile, resets on cold start)
- **Line 104-126**: GET handler returns in-memory data (lost on cold start)
- **Line 129-330**: PUT handler uses in-memory storage
- **Missing**: No persistent storage implementation

---

## Testing Recommendations

### Test Case 1: Cold Start Data Loss
1. Create a booking
2. Wait 5 minutes (force cold start)
3. Refresh page
4. **Expected (broken)**: Booking disappears
5. **Expected (fixed)**: Booking persists

### Test Case 2: Login Data Loss
1. Create a booking
2. Logout
3. Login again
4. **Expected (broken)**: Booking disappears
5. **Expected (fixed)**: Booking persists

### Test Case 3: Cross-Device Sync
1. Open app in two browser tabs
2. Create booking in tab 1
3. **Expected (broken)**: Tab 2 doesn't update until next poll (15s)
4. **Expected (fixed)**: Tab 2 updates immediately via storage event

### Test Case 4: Sync Retry
1. Create booking while offline
2. Go online
3. **Expected (broken)**: Sync fails, no retry
4. **Expected (fixed)**: Automatic retry with backoff

---

## Deployment Instructions

### Step 1: Install Dependencies
```bash
cd C:/Users/pete/Documents/MciPro
npm install @netlify/blobs
```

### Step 2: Replace Server Function
```bash
# Backup original
cp netlify/functions/bookings.js netlify/functions/bookings-BACKUP.js

# Deploy fixed version
cp netlify/functions/bookings-FIXED.js netlify/functions/bookings.js
```

### Step 3: Apply Client-Side Fixes
Apply the 6 fixes from `FIXES-client-side.html` to `index.html`:

1. **FIX 1 (Line 4613-4727)**: Replace `ensureCleanSlateForNewUser` function
2. **FIX 2 (Line 2343+)**: Replace `loadFromCloud` update logic
3. **FIX 3 (Line 9425-9438)**: Replace `saveToLocalStorage` method
4. **FIX 4 (After line 4545)**: Add storage event listener
5. **FIX 5 (Line 2314)**: Change polling interval to 5000ms
6. **FIX 6**: Add `saveToCloudWithRetry` method to SimpleCloudSync

### Step 4: Deploy to Netlify
```bash
git add .
git commit -m "Fix: Prevent booking data loss - persistent storage + improved sync"
git push origin main
```

### Step 5: Verify Fix
1. Monitor Netlify function logs for errors
2. Test all 4 test cases above
3. Check Netlify Blobs dashboard for stored data

---

## Root Cause Summary

The "3-minute disappearance" is actually a **5-minute cold-start window** combined with:

1. **Serverless functions restart every ~5 minutes** → In-memory data lost
2. **Login function aggressively wipes data** → Bookings deleted on every login
3. **Poor sync logic** → Empty cloud data overwrites local bookings

The fix requires **THREE changes**:
1. Use persistent storage (Netlify Blobs) instead of in-memory
2. Preserve bookings during login (don't wipe them)
3. Improve sync logic (version-based, immediate, with retries)

---

## Files Created

1. `C:/Users/pete/Documents/MciPro/netlify/functions/bookings-FIXED.js` - Server fix with persistent storage
2. `C:/Users/pete/Documents/MciPro/FIXES-client-side.html` - All 6 client-side fixes
3. `C:/Users/pete/Documents/MciPro/BUG-REPORT-BOOKING-DISAPPEARANCE.md` - This comprehensive report

---

## Contact for Questions
- Review all fixes before deploying to production
- Test thoroughly in staging environment first
- Monitor Netlify function logs after deployment
