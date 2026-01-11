# MyCaddiPro Comprehensive Handicap Fix Session
**Date**: January 11, 2026
**Issue**: Handicaps displaying incorrectly across entire system
**Status**: FIXED

---

## Problem Summary

Handicaps were showing wrong values (0, 36, or incorrect) throughout the system because:
1. **Multiple storage locations** with inconsistent data
2. **Wrong read priority** in 25+ code locations
3. **Stale cache** with 72 holes instead of 18

---

## Root Causes

### 1. Inconsistent Data Storage
Handicaps are stored in FOUR locations that must stay in sync:
```
user_profiles.handicap_index        = 3.2   (numeric column)
user_profiles.profile_data.handicap = "3.2" (string in JSON)
user_profiles.profile_data.golfInfo.handicap = "3.2" (string in JSON)
society_handicaps.handicap_index    = 3.2   (where society_id IS NULL for universal)
```

**Pete Park example:**
- handicap_index: 3.2 ✓
- profile_data.handicap: 3.2 ✓
- profile_data.golfInfo.handicap: **0** ← WRONG! Caused flip-flop between 0 and 3.2

### 2. Wrong Read Priority in Code
Many places read from `golfInfo.handicap` FIRST instead of `handicap_index`:
```javascript
// WRONG (old code in 25+ locations):
const handicap = profile.golfInfo?.handicap || profile.handicap || 0;

// CORRECT (fixed):
const handicap = profile.handicap_index ?? profile.profile_data?.handicap ?? profile.golfInfo?.handicap ?? 0;
```

### 3. Course Data Cache Issue
When tee marker not found, system loaded ALL 72 holes (18 holes × 4 tees).
This caused `allocHandicapShots()` to give multiple strokes per hole.
A 9-handicapper got 4 strokes on hole 1 instead of 1, causing:
- Gross 5 - 4 strokes = Net 1 = 5 stableford points (albatross) instead of Net 4 = 2 points

---

## All Fixes Applied

### Fix 1: Course Cache Version Bump
**File:** `public/index.html` line 52219
```javascript
// OLD:
const expectedVersion = COURSE_CACHE_VERSIONS[courseId] || 2;

// NEW:
const expectedVersion = COURSE_CACHE_VERSIONS[courseId] || 6;
```
Forces cache refresh to get deduplicated holes.

### Fix 2: Hole Deduplication
**File:** `public/index.html` line 52295-52307
When loading holes without tee filter, deduplicate by hole_number to ensure only 18 holes.

### Fix 3: Centralized Handicap Helper
**File:** `public/index.html` line 11501-11529
```javascript
// Added to HandicapManager class:
static getFromProfile(profile, fallback = null) {
    if (!profile) return fallback;

    // Priority: handicap_index > profile_data.handicap > golfInfo.handicap
    if (profile.handicap_index !== null && profile.handicap_index !== undefined) {
        return profile.handicap_index;
    }
    const pd = profile.profile_data;
    if (pd?.handicap !== null && pd?.handicap !== undefined && pd?.handicap !== '') {
        return this.parseHandicap(pd.handicap);
    }
    if (pd?.golfInfo?.handicap !== null && pd?.golfInfo?.handicap !== undefined) {
        return this.parseHandicap(pd.golfInfo.handicap);
    }
    if (profile.handicap !== null && profile.handicap !== undefined) {
        return this.parseHandicap(profile.handicap);
    }
    return fallback;
}

// Global helper:
window.getHandicapFromProfile = function(profile, fallback = null) {
    return HandicapManager.getFromProfile(profile, fallback);
};
```

### Fix 4: Fixed 25+ Code Locations
All locations now use correct priority. Key files/lines fixed:

| Line | Location | Fix Applied |
|------|----------|-------------|
| 8881 | LINE auth user creation | `HandicapManager.getFromProfile(userProfile)` |
| 9020 | Profile summary | Added `handicap_index ??` |
| 9279 | Player search | `HandicapManager.getFromProfile(profile, 0)` |
| 10586 | OAuth user creation | `HandicapManager.getFromProfile(existingUser)` |
| 10904 | LINE OAuth user | `HandicapManager.getFromProfile(userProfile)` |
| 12964 | Init user creation | `HandicapManager.getFromProfile(userProfile)` |
| 13009 | Profile summary | Added `handicap_index ??` |
| 19042 | Profile sync to Supabase | Added `handicap_index ??` |
| 19865 | updateDashboardData | Fixed to check `handicap_index` first |
| 43236 | Stats display | Added `handicap_index ??` |
| 43973 | Player search results | Added `handicap_index ??` |
| 46623 | Admin edit user | Added `handicap_index ??` |
| 48116 | Society player search | Added `handicap_index ??` |
| 51670 | Auto-add current user | `HandicapManager.getFromProfile(profile, 0)` |
| 52578 | Player selection | Added `handicap_index ??` |
| 52638 | Select existing player | Added `handicap_index ??` |
| 62771 | Player directory load | Added `handicap_index ??` |
| 62930 | Non-member display | Added `handicap_index ??` |
| 63357 | Edit member modal | Added `handicap_index ??` |
| 77422 | Event registration | Added `handicap_index ??` |
| 78211/78297 | Join request | Added `handicap_index ??` |
| 80827 | Invite golfer search | Added `handicap_index ??` |
| 89651 | Player handicap display | Added `handicap_index ??` |

### Fix 5: Database Queries Include handicap_index
**File:** `public/index.html` lines 48045, 49177, 49206
```javascript
// OLD:
.select('line_user_id, name, profile_data')

// NEW:
.select('line_user_id, name, profile_data, handicap_index')
```

### Fix 6: Database Sync Tools Created
- `fix_handicaps.html` - Fix specific players (Alan, Ryan, Pluto)
- `sync_all_handicaps.html` - Sync ALL players' handicap_index from universal handicap

### Fix 7: Pete Park golfInfo.handicap Fixed
Direct database update to set `profile_data.golfInfo.handicap = "3.2"` (was 0).

---

## Correct Handicap Data Priority

**ALWAYS use this priority when reading handicaps:**
```
1. society_handicaps (society-specific if available)
2. society_handicaps (universal where society_id IS NULL)
3. user_profiles.handicap_index
4. user_profiles.profile_data.handicap
5. user_profiles.profile_data.golfInfo.handicap
6. Fallback (0 or 36 depending on context)
```

**ALWAYS update ALL locations when writing handicaps:**
```javascript
// Use HandicapManager.setHandicap() which updates:
// 1. society_handicaps table
// 2. user_profiles.handicap_index
// 3. user_profiles.profile_data.handicap
// 4. user_profiles.profile_data.golfInfo.handicap
```

---

## Plus Handicap Format

- **Display**: "+1.6" (string with plus sign)
- **Storage (numeric fields)**: -1.6 (negative number)
- **Storage (string fields)**: "+1.6" (string with plus sign)

```javascript
// Parsing:
if (str.startsWith('+')) {
    return -parseFloat(str.substring(1)); // "+1.6" → -1.6
}

// Formatting:
if (num < 0) return '+' + Math.abs(num).toFixed(1); // -1.6 → "+1.6"
```

---

## Prevention Rules

### Rule 1: Never Read from golfInfo.handicap First
Always check `handicap_index` and `profile_data.handicap` before `golfInfo.handicap`.

### Rule 2: Always Update All 4 Locations
When setting handicap, update:
- society_handicaps (universal)
- user_profiles.handicap_index
- profile_data.handicap
- profile_data.golfInfo.handicap

### Rule 3: Use HandicapManager Functions
```javascript
// Reading (async, from database):
const hcp = await HandicapManager.getHandicap(golferId, societyId);

// Reading (sync, from profile object):
const hcp = HandicapManager.getFromProfile(profile, fallback);

// Writing (updates all locations):
await HandicapManager.setHandicap(golferId, handicapValue, societyId);

// Formatting for display:
const display = HandicapManager.formatDisplay(handicap);
// or: window.formatHandicapDisplay(handicap);
```

### Rule 4: Include handicap_index in Queries
When selecting user_profiles, always include `handicap_index`:
```javascript
.select('line_user_id, name, profile_data, handicap_index')
```

### Rule 5: Clear Cache When Debugging Stableford Issues
If stableford points look wrong (e.g., 5 points for a par), check:
1. Course cache may have 72 holes instead of 18
2. Bump cache version or clear localStorage
3. Verify `allocHandicapShots()` is receiving 18 holes

---

## Correct Supabase Credentials

**Production Database:**
- URL: `https://pyeeplwsnupmhgbguwqs.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk`

**DO NOT USE:**
- `bptodqfwmnbmprqqyrcc.supabase.co` (OLD/WRONG)

---

## Key Player IDs

| Player | LINE User ID |
|--------|--------------|
| Pete Park | `U2b6d976f19bca4b2f4374ae0e10ed873` |
| Alan Thomas | `U214f2fe47e1681fbb26f0aba95930d64` |
| TRGG Society | `7c0e4b72-d925-44bc-afda-38259a7ba346` |

---

## Diagnostic Tools

1. **check.js** - View all user handicaps across all storage locations
2. **fix_handicaps.html** - Fix specific players' handicaps
3. **sync_all_handicaps.html** - Sync ALL players' handicap_index

---

## Commits Made

1. `Fix stableford calculation: deduplicate holes when tee not found`
2. `Fix: Bump default cache version to 6 to force cache clear for hole deduplication`
3. `Fix player search to read handicap_index and profile_data.handicap correctly`
4. `Fix plus handicaps: store as negative numbers, update TRGG society too`
5. `Fix player directory handicap loading - add handicap_index to all queries and fallback chain`
6. `COMPREHENSIVE FIX: Fix ALL handicap reading locations to use correct priority`

---

## Lessons Learned

1. **Handicaps have 4 storage locations** - ALL must be kept in sync
2. **Code had wrong read priority** - 25+ places were reading golfInfo.handicap first
3. **Cache can cause stale data** - Bump version to force refresh
4. **Plus handicaps need special handling** - Store as negative, display with "+"
5. **Always include handicap_index in queries** - Don't rely on profile_data alone
6. **Use centralized functions** - HandicapManager.getFromProfile() ensures correct priority

---

**End of Session Catalog**
