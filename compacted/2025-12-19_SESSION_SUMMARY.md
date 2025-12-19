# Session Summary: December 19, 2025

## Overview
Major fixes for login issues, Bangpakong standings, and Starting Nine feature for shotgun starts.

---

## 1. Starting Nine Feature (Live Scorecard)

### Problem
For 2-way shotgun starts, players starting on hole 10 had to manually fast-forward through holes 1-9 to get to their starting hole.

### Solution
Added "Starting Nine" selector in Live Scorecard setup:
- **Front 9 First** (default) - Normal play: 1→2→3...→18
- **Back 9 First** - Shotgun start: 10→11→12...→18→1→2...→9

### Implementation
```javascript
// New properties in LiveScorecardSystem
this.startingNine = 'front'; // 'front' or 'back'
this.holeOrder = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
this.currentHoleIndex = 0;

// In startRound()
if (this.startingNine === 'back') {
    this.holeOrder = [10,11,12,13,14,15,16,17,18,1,2,3,4,5,6,7,8,9];
}

// Navigation uses holeOrder array
this.currentHole = this.holeOrder[this.currentHoleIndex];
```

### Files Modified
- `public/index.html` - UI selector and hole order logic

---

## 2. Bangpakong Standings Fix

### Problem
Bangpakong event (Dec 19) not showing in Leaderboard or My Standings.

### Root Cause
- Event status was `draft` (should be `completed`)
- `assignPoints()` was never called
- `event_results` table had 0 entries for this event
- Leaderboard and My Standings both query `event_results`

### Solution
Created SQL fix: `sql/FIX_BANGPAKONG_STANDINGS.sql`
- Updates event status to `completed`
- Sets `point_allocation` to linear `[10,9,8,7,6,5,4,3,2,1]`
- Inserts event_results with positions and points:
  - 1st: Alan Thomas (38 pts) → 10 championship points
  - 2nd: Pete Park (37 pts) → 9 championship points
  - 3rd: Tristan Gilbert (27 pts) → 8 championship points

### event_results Schema
```sql
id, event_id, round_id, player_id, player_name, division,
position, score, score_type, points_earned, status,
is_counted, event_date, created_at
```

---

## 3. Login Sanity Check & Fixes

### Issues Identified (7 total)

| # | Issue | Impact |
|---|-------|--------|
| 1 | No timeout on LIFF init | Infinite hang on slow network |
| 2 | No timeout on profile fetch | Stuck on "Loading your profile..." |
| 3 | Build ID reload interrupts OAuth | OAuth code lost, forces re-login |
| 4 | Sequential async operations | 3-4x slower cold start |
| 5 | Stale LIFF session not cleared | Double login loop |
| 6 | No LoadingManager timeout | Infinite spinner |
| 7 | OAuth protection uses sessionStorage | Lost on PWA close |

### Fixes Implemented

#### Fix 1: LoadingManager Auto-Timeout
```javascript
class LoadingManager {
    static _timeout = null;

    static show(message = 'Loading...', timeoutMs = 30000) {
        // ... create overlay ...

        // Auto-hide after timeout
        if (this._timeout) clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
            console.warn('[LoadingManager] Timeout after', timeoutMs, 'ms');
            this.hide();
            NotificationManager.show('Operation timed out.', 'warning');
        }, timeoutMs);
    }

    static hide() {
        if (this._timeout) clearTimeout(this._timeout);
        // ... hide overlay ...
    }
}
```

#### Fix 2: withTimeout() Utility
```javascript
function withTimeout(promise, ms, fallbackValue = null) {
    let timeoutId;
    const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => {
            console.warn('[withTimeout] Timed out after', ms, 'ms');
            resolve(fallbackValue);
        }, ms);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
    });
}
```

#### Fix 3: LIFF Init with Timeout
```javascript
const LIFF_INIT_TIMEOUT = 8000;  // 8 seconds
const PROFILE_FETCH_TIMEOUT = 10000; // 10 seconds

withTimeout(liff.init({ liffId: LineConfig.liffId }), LIFF_INIT_TIMEOUT, { timeout: true })
    .then(async (initResult) => {
        if (initResult && initResult.timeout) {
            console.warn('[INIT] LIFF init timed out');
            ScreenManager.showScreen('loginScreen');
            return;
        }
        // ... continue with login flow ...
    });
```

#### Fix 4: Stale LIFF Session Clearing
```javascript
// If both LINE and Supabase auth fail, clear stale LIFF session
if (!fallbackSucceeded) {
    console.warn('[INIT] Both auth methods failed - clearing stale LIFF session');
    try {
        if (liff.isLoggedIn()) {
            liff.logout();
            console.log('[INIT] Stale LIFF session cleared');
        }
    } catch (logoutErr) {
        console.warn('[INIT] LIFF logout failed:', logoutErr);
    }
}
```

### Files Modified
- `public/index.html` - All login flow fixes

### Documentation
- `compacted/2025-12-19_LOGIN_SANITY_CHECK.md` - Full issue analysis

---

## SQL Files Created

| File | Purpose |
|------|---------|
| `sql/FIX_BANGPAKONG_STANDINGS.sql` | Populate event_results for Dec 19 Bangpakong event |

---

## Git Commits

```
f6133ca1 fix: Address double-login and slow PWA cold-start issues
000e5241 feat: Add Starting Nine option for 2-way shotgun starts
```

---

## Testing Checklist

### Starting Nine
- [ ] Front 9 First: Holes play in order 1→18
- [ ] Back 9 First: Holes play in order 10→18→1→9
- [ ] Next/Prev navigation works correctly with both orders
- [ ] Auto-advance respects hole order

### Login Fixes
- [ ] Fresh install, first login works in one attempt
- [ ] PWA cold start after 24+ hours works in one attempt
- [ ] Slow network (3G throttle) shows timeout, not hang
- [ ] Spinner auto-hides after 30 seconds max

### Bangpakong Standings
- [ ] Run `sql/FIX_BANGPAKONG_STANDINGS.sql` in Supabase
- [ ] Event shows in Leaderboard
- [ ] Event shows in My Standings
- [ ] Points are correct (Alan: 10, Pete: 9, Tristan: 8)
