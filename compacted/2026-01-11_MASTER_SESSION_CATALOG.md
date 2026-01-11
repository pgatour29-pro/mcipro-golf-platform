# MyCaddiPro Master Session Catalog - January 11, 2026
**Status**: ALL FIXES DEPLOYED AND VERIFIED

---

## Session Overview

This session fixed critical bugs in:
1. **Match Play Scoring** - Was using Net Strokes instead of Stableford
2. **Handicap System** - 25+ locations reading wrong priority
3. **Pete Park Handicap** - Flip-flopping between 0 and 3.2
4. **Course Data Cache** - 72 holes instead of 18 causing wrong stableford points

---

## PROBLEM 1: Match Play Using Wrong Scoring Method

### Symptoms
- 5-player anchor team match play showing wrong win/loss
- Stableford scoring selected but match play compared net strokes (lower wins instead of higher wins)
- Results inverted from expected

### Root Cause
Line 31239 had radio button defaulting to "Net Strokes":
```html
<input type="radio" name="matchPlayMethod" value="stroke" checked class="mr-2">
```

The fallback logic ONLY checked scoringFormats if NO radio was selected:
```javascript
// BROKEN:
const anchorUseStableford = anchorMatchPlayMethodRadio
    ? anchorMatchPlayMethodRadio.value === 'stableford'  // Radio is 'stroke', returns FALSE
    : (this.scoringFormats.includes('stableford'));      // Never reaches this!
```

### Fix Applied
Changed to use Stableford if EITHER radio OR scoringFormats indicates it:
```javascript
// FIXED:
const stablefordIsScoring = this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford');
const anchorUseStableford = anchorMatchPlayMethodRadio?.value === 'stableford' || stablefordIsScoring;
```

### Locations Fixed (7 total)
| Line | Context |
|------|---------|
| 59880-59884 | Anchor team match play leaderboard |
| 59971-59974 | 4-player team match play leaderboard |
| 59811-59814 | Round robin match play |
| 60058-60061 | Individual match play vs field |
| 57447-57450 | Settlement calculation |
| 54959-54962 | Score save - team match play |
| 55025-55028 | Score save - individual match play |

---

## PROBLEM 2: Pete Park Handicap Flip-Flopping (0 ↔ 3.2)

### Symptoms
- Pete Park's handicap showing 0 on profile page
- Sometimes showing 3.2, sometimes 0
- Database had correct value (3.2) in handicap_index

### Root Causes

**Root Cause 1**: Profile form read wrong field first (line 19550)
```javascript
// BROKEN:
value="${profile.golfInfo?.handicap || profile.roleSpecific?.handicap || ''}"
// golfInfo.handicap was 0, so it returned 0
```

**Root Cause 2**: localStorage profile restore missing handicap_index (lines 8986-9003)
```javascript
// BROKEN: fullProfile object didn't include handicap_index
```

**Root Cause 3**: Database had stale data
```
handicap_index: 3.2 ✓
profile_data.handicap: 3.2 ✓
profile_data.golfInfo.handicap: 0 ← WRONG!
```

### Fixes Applied

**Fix 1: Profile Form Priority (line 19550)**
```javascript
// FIXED:
value="${profile.handicap || profile.golfInfo?.handicap || profile.roleSpecific?.handicap || ''}"
```

**Fix 2: localStorage Restore (lines 8986-9003)**
```javascript
// FIXED:
const correctHandicap = userProfile.handicap_index ?? userProfile.profile_data?.handicap ?? userProfile.profile_data?.golfInfo?.handicap;
const fullProfile = {
    // ... existing fields ...
    handicap_index: userProfile.handicap_index,  // ADDED
    handicap: correctHandicap,                    // ADDED
    // ... rest of fields ...
};
```

**Fix 3: Database Update**
Direct update: `profile_data.golfInfo.handicap = "3.2"` (was 0)

---

## PROBLEM 3: Comprehensive Handicap Read Priority (25+ Locations)

### Symptoms
- Various screens showing wrong handicaps (0, 36, or incorrect values)
- Different parts of app showing different handicap for same player

### Root Cause
Many places read from `golfInfo.handicap` FIRST instead of `handicap_index`:
```javascript
// BROKEN (found in 25+ locations):
const handicap = profile.golfInfo?.handicap || profile.handicap || 0;
```

### Fix Applied
Created centralized helper and fixed all locations:
```javascript
// HandicapManager.getFromProfile() - lines 11501-11529
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

### All 25+ Locations Fixed
| Line | Location | Fix |
|------|----------|-----|
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
| 78211 | Join request | Added `handicap_index ??` |
| 78297 | Join request display | Added `handicap_index ??` |
| 80827 | Invite golfer search | Added `handicap_index ??` |
| 89651 | Player handicap display | Added `handicap_index ??` |

### Database Queries Fixed (3 locations)
Lines 48045, 49177, 49206 - Added `handicap_index` to SELECT:
```javascript
// FIXED:
.select('line_user_id, name, profile_data, handicap_index')
```

---

## PROBLEM 4: Course Data Cache (72 Holes Instead of 18)

### Symptoms
- Stableford points wildly wrong (5 points for a par)
- Net scores way too low

### Root Cause
When tee marker not found, system loaded ALL 72 holes (18 × 4 tees).
`allocHandicapShots()` gave multiple strokes per hole.
Example: 9-handicapper got 4 strokes on hole 1 instead of 1.

### Fixes Applied

**Fix 1: Cache Version Bump (line 52219)**
```javascript
// FIXED:
const expectedVersion = COURSE_CACHE_VERSIONS[courseId] || 6;  // Was 2
```

**Fix 2: Hole Deduplication (lines 52295-52307)**
When loading without tee filter, deduplicate by hole_number to ensure only 18 holes.

---

## Debug Logging Added

### Team Match Play Debug (lines 51062-51071, 51122)
```javascript
console.log(`[TeamMatchPlay] Hole ${holeNum} (SI ${strokeIndex}, Par ${par}):`, {
    team1: { p1: {...}, p2: {...} },
    team2: { p1: {...}, p2: {...} }
});
console.log(`[TeamMatchPlay] Hole ${holeNum} RESULT: ${holeResult} | Team1 best=${...} | Running: ${...}`);
```

### Stableford Detection Debug (line 59884)
```javascript
console.log('[AnchorTeamMatchPlay] Using Stableford:', anchorUseStableford, '| Radio:', anchorMatchPlayMethodRadio?.value, '| Formats:', this.scoringFormats);
```

---

## Manual Handicap Edit Behavior (Documented)

### Question
When manually editing handicap before starting a round, does it:
1. Use the new handicap for all games/scoring?
2. Only affect that round (not change universal handicap)?

### Answer: YES to both

**Code Location**: `promptManualHandicap()` lines 50349-50394

```javascript
promptManualHandicap(playerIndex) {
    const player = this.players[playerIndex];
    // ... parse input ...
    player.handicap = handicapValue;  // ONLY updates local player object
    this.renderPlayersList();
    // Does NOT call HandicapManager.setHandicap() or any database update
}
```

**Behavior**:
- Manual edit updates `player.handicap` in local `this.players` array
- This value is used for ALL scoring calculations in that round
- NO database calls are made - universal handicap unchanged
- Next round will reload handicap from database

---

## Handicap Storage Locations (Reference)

**ALL 4 must stay in sync:**
```
1. user_profiles.handicap_index        (numeric column - SOURCE OF TRUTH)
2. user_profiles.profile_data.handicap (string in JSON)
3. user_profiles.profile_data.golfInfo.handicap (string in JSON)
4. society_handicaps.handicap_index    (where society_id IS NULL for universal)
```

**Read Priority:**
```
handicap_index → profile_data.handicap → golfInfo.handicap → fallback
```

**Plus Handicap Format:**
- Display: "+1.6" (string with plus sign)
- Storage (numeric): -1.6 (negative number)
- Storage (string): "+1.6" (string with plus sign)

---

## Key Player Handicaps (Verified)

| Player | Handicap | handicap_index | golfInfo.handicap |
|--------|----------|----------------|-------------------|
| Pete Park | 3.2 | 3.2 | "3.2" |
| Alan Thomas | 9 | 9 | "9" |
| Tristan Gilbert | 13.2 | 13.2 | "13.2" |
| Ryan Thomas | +1.6 | -1.6 | "+1.6" |
| Pluto | +1.6 | -1.6 | "+1.6" |

---

## 5-Player Anchor Team Match Play (Reference)

### Setup
- **Anchor Team**: 2 fixed players (e.g., Ryan + Pluto)
- **Rotating Pool**: Remaining 3 players (e.g., Pete, Alan, Tristan)
- **Matches Generated**: C(3,2) = 3 matches

### Scoring (Best Ball + Tiebreaker with Stableford)
1. Each player's stableford points calculated per hole (with handicap strokes)
2. Best ball from each team compared (higher wins)
3. If tied, second ball compared (tiebreaker)
4. If still tied, hole is halved (AS)

---

## Database Cleanup Performed

Deleted 48 test scorecards from Eastern Star for today (2026-01-11):
- Ryan Thomas
- Pluto
- Tristan Gilbert
- Alan Thomas

---

## Diagnostic Tools Created

| File | Purpose |
|------|---------|
| `check.js` | View all user handicaps across all storage locations |
| `fix_handicaps.html` | Fix specific players' handicaps |
| `sync_all_handicaps.html` | Sync ALL players' handicap_index from universal handicap |

---

## Commits Made

1. `Add debug logging to team match play stableford calculation`
2. `Fix handicap priority: profile form and localStorage restore now use handicap_index first`
3. `Fix: Match play now uses Stableford when Stableford scoring format is selected`
4. `Fix stableford calculation: deduplicate holes when tee not found`
5. `Fix: Bump default cache version to 6 to force cache clear for hole deduplication`
6. `Fix player search to read handicap_index and profile_data.handicap correctly`
7. `Fix plus handicaps: store as negative numbers, update TRGG society too`
8. `Fix player directory handicap loading - add handicap_index to all queries and fallback chain`
9. `COMPREHENSIVE FIX: Fix ALL handicap reading locations to use correct priority`

---

## Prevention Rules (CRITICAL)

### Rule 1: Match Play Scoring Method
Always check BOTH radio AND scoringFormats:
```javascript
const stablefordIsScoring = this.scoringFormats.includes('stableford');
const useStableford = radio?.value === 'stableford' || stablefordIsScoring;
```

### Rule 2: Profile Handicap Priority
Always read handicap in this order:
1. `profile.handicap_index` or `profile.handicap` (root level)
2. `profile.golfInfo?.handicap`
3. `profile.roleSpecific?.handicap`
4. Fallback (0 or empty)

### Rule 3: localStorage Profile Must Include handicap_index
```javascript
handicap_index: userProfile.handicap_index,
handicap: correctHandicap,  // Using priority chain
```

### Rule 4: Include handicap_index in Queries
```javascript
.select('line_user_id, name, profile_data, handicap_index')
```

### Rule 5: Clear Cache When Debugging Stableford
If stableford points look wrong:
1. Course cache may have 72 holes instead of 18
2. Bump cache version or clear localStorage
3. Verify `allocHandicapShots()` is receiving 18 holes

### Rule 6: Use Centralized Functions
```javascript
// Reading (sync, from profile object):
const hcp = HandicapManager.getFromProfile(profile, fallback);

// Reading (async, from database):
const hcp = await HandicapManager.getHandicap(golferId, societyId);

// Writing (updates all locations):
await HandicapManager.setHandicap(golferId, handicapValue, societyId);
```

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

**End of Master Session Catalog - January 11, 2026**
