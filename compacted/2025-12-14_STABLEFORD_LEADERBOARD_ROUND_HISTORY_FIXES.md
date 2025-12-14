# Session Catalog: Stableford, Leaderboard, and Round History Fixes
**Date:** 2025-12-14
**Status:** COMPLETED

## Overview
This session fixed multiple critical issues with the Greenwood Dec 13 event scores, round history saving, and season leaderboard functionality.

---

## Issue 1: Wrong Stableford Points for Greenwood Dec 13 Event

### Problem
The live leaderboard showed wrong stableford scores for the Greenwood C+B event. The handicap stroke allocation was incorrect for combined nines courses.

### Root Cause
1. **`getLeaderboard()` used `card.total_stableford`** which doesn't exist in the `scorecards` table
2. **Combined nines handicap allocation was wrong** - code assumed SI 1-18 for all courses, but Greenwood C+B uses SI 1-9 for each nine

### Database Values (Before Fix)
| Player | DB Stableford | Expected |
|--------|---------------|----------|
| Pete Park | 37 pts | 34 pts |
| Alan Thomas | 40 pts | 33 pts |
| Tristan Gilbert | 33 pts | 26 pts |
| Ludwig | 28 pts | 28 pts |

### Fixes Applied

#### Fix 1: Calculate stableford from scores table in `getLeaderboard()`
**File:** `public/index.html` (line ~41315)
```javascript
// FIX: Calculate stableford from scores table (column doesn't exist in scorecards)
let totalStableford = 0;
if (card.scores && Array.isArray(card.scores)) {
    for (const score of card.scores) {
        totalStableford += score.stableford_points || 0;
    }
}
```

#### Fix 2: Database UPDATE for stableford_points
**File:** `sql/FIX_GREENWOOD_STABLEFORD_DEC13.sql`

Manually updated all 3 players' stableford_points in the `scores` table:
- Pete Park: 34 pts (16 front + 18 back)
- Alan Thomas: 33 pts (16 front + 17 back)
- Tristan Gilbert: 26 pts (13 front + 13 back)

Executed via PowerShell script calling Supabase REST API.

---

## Issue 2: Rounds Not Saving to History for All Players

### Problem
The "Round History" page wasn't showing rounds for players in society events. Only the current logged-in user's rounds appeared.

### Root Cause
1. **`distributeRoundScores()` skipped players without `lineUserId`** (line 45449)
2. **`saveRoundToHistory()` required `player.lineUserId`** to save to rounds table (line 45081)
3. **Manually added players** (like Ludwig) have `lineUserId: null` and only have a generated `player.id`

### Evidence
Ludwig's scorecard had `player_id: player_1765589124360` (generated ID, not LINE ID), so his round was never saved to the `rounds` table.

### Fixes Applied

#### Fix 1: Allow saving rounds for players with generated IDs
**File:** `public/index.html` (line ~45080)
```javascript
// OLD CODE:
if (!player.lineUserId || player.lineUserId.trim() === '') {
    throw new Error(`Cannot save round: Player "${player.name}" is not logged in with LINE`);
}
golfer_id: player.lineUserId

// NEW CODE:
const golferId = player.lineUserId || player.id;
if (!golferId || golferId.trim() === '') {
    throw new Error(`Cannot save round: Player "${player.name}" has no valid ID`);
}
golfer_id: golferId  // Uses LINE ID OR player.id for manually added players
```

#### Fix 2: Don't skip players without lineUserId
**File:** `public/index.html` (line ~45449)
```javascript
// OLD CODE:
if (!player.lineUserId || player.lineUserId.trim() === '') {
    console.log(`Skipping ${player.name} - no LINE user ID (guest player)`);
    continue;
}

// NEW CODE:
const playerId = player.lineUserId || player.id;
if (!playerId || playerId.trim() === '') {
    console.log(`Skipping ${player.name} - no player ID at all`);
    continue;
}
```

#### Fix 3: Inserted missing rounds for Dec 13 event
Manually inserted 4 rounds into the `rounds` table via PowerShell script:
```
Pete Park: golfer_id=U2b6d976f19bca4b2f4374ae0e10ed873, Gross=77, Stableford=34
Alan Thomas: golfer_id=U214f2fe47e1681fbb26f0aba95930d64, Gross=86, Stableford=33
Tristan Gilbert: golfer_id=U533f2301ff76d319e0086e8340e4051c, Gross=95, Stableford=26
Ludwig: golfer_id=player_1765589124360, Gross=98, Stableford=28
```

---

## Issue 3: Duplicate Societies in Season Leaderboard Dropdown

### Problem
"Travellers Rest Golf Group" appeared twice in the dropdown.

### Root Cause
The `societies` table had two entries with the same name but different IDs:
- `17451cf3-f499-4aa3-83d7-c206149838c4` - "Travellers Rest Golf Group"
- `7c0e4b72-d925-44bc-afda-38259a7ba346` - "Travellers Rest Golf Group"

The code deduplicated by ID but not by name.

### Fix Applied
**File:** `public/time-windowed-leaderboards.js` (line ~41)
```javascript
// OLD CODE: Deduplicate by ID
allSocieties.forEach(s => {
    if (s.id && s.name && !societyMap.has(s.id)) {
        societyMap.set(s.id, { id: s.id, name: s.name });
    }
});

// NEW CODE: Deduplicate by NAME
allSocieties.forEach(s => {
    if (s.id && s.name && !societyMap.has(s.name)) {
        societyMap.set(s.name, { id: s.id, name: s.name });
    }
});
```

---

## Issue 4: Society-Specific Season Standings

### Problem
JOA and other societies needed their own season standings, not just a global view.

### Solution
Restructured the dropdown to show:
1. **🌍 Global Platform** (default) - All players from all societies
2. **── Society Standings ──** (separator)
3. **✈️ Travellers Rest Golf Group** - TRGG only
4. **🏌️ JOA Golf Pattaya** - JOA only

### Implementation
**File:** `public/time-windowed-leaderboards.js`

#### New dropdown structure (line ~83):
```javascript
select.innerHTML = `
    <option value="platform" selected>🌍 Global Platform</option>
`;

// Add separator and individual societies
this.userSocieties.forEach(society => {
    const icon = society.name.includes('JOA') ? '🏌️' :
                society.name.includes('Travellers') ? '✈️' : '⛳';
    option.textContent = `${icon} ${society.name}`;
});
```

#### Society filtering in getStandings() (line ~205):
```javascript
// If filtering by a specific society, get the list of events for that society
if (filterSociety && filterSociety !== 'platform') {
    // Get society name from ID
    const { data: society } = await this.supabase
        .from('societies')
        .select('name')
        .eq('id', filterSociety)
        .single();

    // Get events from this society by organizer_name
    const { data: societyEvents } = await this.supabase
        .from('society_events')
        .select('id')
        .eq('organizer_name', society.name);

    societyEventIds = new Set(societyEvents.map(e => e.id));
}

// Filter scorecards by society events
if (societyEventIds !== null && !societyEventIds.has(card.event_id)) {
    continue; // Skip scorecards from other societies
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Fixed `getLeaderboard()` stableford calculation, fixed `saveRoundToHistory()` to accept player.id |
| `public/time-windowed-leaderboards.js` | Fixed duplicate societies, added society-specific filtering |
| `sql/FIX_GREENWOOD_STABLEFORD_DEC13.sql` | SQL to fix stableford points for Dec 13 event |

## Scripts Created (Temporary)

| Script | Purpose |
|--------|---------|
| `fix_scores.ps1` | Updated stableford_points in scores table |
| `insert_missing_rounds.ps1` | Inserted missing rounds to rounds table |
| `verify_scores.ps1` | Verified stableford totals after fix |
| `query_*.ps1` | Various diagnostic queries |

---

## Verified Results

### Stableford Points (After Fix)
| Player | Front 9 | Back 9 | Total |
|--------|---------|--------|-------|
| Pete Park | 16 | 18 | **34** |
| Alan Thomas | 16 | 17 | **33** |
| Ludwig | 16 | 12 | **28** |
| Tristan Gilbert | 13 | 13 | **26** |

### FedEx Cup Points (Season Leaderboard)
| Position | Player | Stableford | FedEx Points |
|----------|--------|------------|--------------|
| 1st | Pete Park | 34 | **100 pts** |
| 2nd | Alan Thomas | 33 | **50 pts** |
| 3rd | Ludwig | 28 | **35 pts** |
| 4th | Tristan Gilbert | 26 | **25 pts** |

### Dropdown (Season Leaderboard)
- 🌍 Global Platform (default)
- ── Society Standings ──
- ✈️ Travellers Rest Golf Group
- 🏌️ JOA Golf Pattaya

---

## Key Learnings

1. **Combined nines courses** (like Greenwood C+B) use SI 1-9 per nine, not SI 1-18 for full 18 holes
2. **Stableford is NOT stored in scorecards table** - must be calculated from `scores.stableford_points`
3. **Manually added players** have `lineUserId: null` - use `player.id` as fallback for round saving
4. **Deduplicate societies by NAME** not just ID (database may have duplicates)
5. **Society filtering** requires joining with `society_events.organizer_name` (not society_id in events)

---

## Deployment
All changes deployed to Vercel production.
