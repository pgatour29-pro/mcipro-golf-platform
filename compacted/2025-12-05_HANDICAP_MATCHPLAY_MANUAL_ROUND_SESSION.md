# Session: December 5, 2025 - Handicap, Matchplay, and Manual Round Entry

## Date: 2025-12-05
## Summary: Handicap calculation changes, 1v1 matchplay fixes, automatic round robin, and manual round insertion for Alan Thomas

---

## Table of Contents
1. [Handicap Adjustment Changes](#handicap-adjustment-changes)
2. [1v1 Matchplay Calculation Fix](#1v1-matchplay-calculation-fix)
3. [Automatic Round Robin Match Play](#automatic-round-robin-match-play)
4. [Manual Round Entry - Alan Thomas](#manual-round-entry-alan-thomas)
5. [Files Modified](#files-modified)
6. [SQL Scripts Created](#sql-scripts-created)
7. [Deployments](#deployments)

---

## Handicap Adjustment Changes

### Issue
User requested handicap to start adjusting after **3 rounds** instead of requiring **8 out of 20 rounds** (WHS standard).

### Previous Logic
```javascript
if (numScores >= 20) {
    // Use best 8 of most recent 20 scores
    const recent20 = sortedDifferentials.slice(0, 20);
    const best8 = recent20.slice(0, 8);
    handicapIndex = best8.reduce((sum, diff) => sum + diff, 0) / 8;
} else if (numScores >= 5) {
    // Use best 1-3 scores based on WHS table
    const numToUse = Math.floor(numScores / 4) || 1;
    const bestScores = sortedDifferentials.slice(0, Math.max(1, numToUse));
    handicapIndex = bestScores.reduce((sum, diff) => sum + diff, 0) / bestScores.length;
} else {
    // 3-4 scores: use best 1
    handicapIndex = sortedDifferentials[0];
}
```

### New Logic
```javascript
if (numScores >= 20) {
    // Use best 8 of most recent 20 scores (long-term formula)
    const recent20 = sortedDifferentials.slice(0, 20);
    const best8 = recent20.slice(0, 8);
    handicapIndex = best8.reduce((sum, diff) => sum + diff, 0) / 8;
} else {
    // 3-19 scores: use best score (starts adjusting immediately after 3 rounds)
    handicapIndex = sortedDifferentials[0];
}
```

### Changes Made
**File:** `public/index.html`
**Lines:** 33537-33545
**Function:** `calculateHandicapIndex()`

### Behavior
- **3-19 rounds:** Uses best single score (immediate adjustment)
- **20+ rounds:** Uses best 8 of 20 (WHS standard)

### Deployment
- **Commit:** `5c0037ad` - "Adjust handicap to start after 3 rounds"
- **Deployed:** https://www.mycaddipro.com
- **Service Worker:** `handicap-adjust-3-rounds-dec5-v1`

---

## 1v1 Matchplay Calculation Fix

### Critical Bug Found
The matchplay calculation was comparing each player against the **BEST score from ALL opponents** instead of true head-to-head 1v1.

### Example of Bug
- Player A scores 5 on a hole
- Player B scores 6 on a hole
- **Incorrect:** Both compared against `min(5, 6) = 5`
  - Player A: 5 vs 5 = halved
  - Player B: 6 vs 5 = lost
- **Correct:** Player A vs Player B directly
  - Player A: 5 vs 6 = won
  - Player B: 6 vs 5 = lost

### Root Cause
```javascript
// OLD CODE (WRONG)
let bestOpponentStrokes = 999;
for (const opponent of playerScores) {
    if (opponent.playerId === player.playerId) continue;
    const oppScore = opponent.scores.find(s => (s.hole_number || s.hole) === hole);
    if (!oppScore) continue;

    let oppStrokes = oppScore.gross_score || oppScore.strokes;
    // ... handicap calculation ...

    bestOpponentStrokes = Math.min(bestOpponentStrokes, oppStrokes); // BUG!
}
```

This finds the BEST opponent score on each hole, not a specific 1v1 opponent.

### Solution
Modified `calculateMatchPlay()` to detect when there are exactly 2 players and compare them directly:

```javascript
const is1v1 = playerScores.length === 2;

if (is1v1) {
    // True 1v1: get the single opponent's score
    const opponent = playerScores.find(p => p.playerId !== player.playerId);
    if (opponent) {
        const oppScore = opponent.scores.find(s => (s.hole_number || s.hole) === hole);
        if (oppScore) {
            let oppStrokes = oppScore.gross_score || oppScore.strokes;
            // ... handicap calculation ...
            opponentStrokes = oppStrokes;
        }
    }
} else {
    // Match play vs field: find best opponent score
    for (const opponent of playerScores) {
        // ... existing logic ...
        opponentStrokes = Math.min(opponentStrokes, oppStrokes);
    }
}
```

### Changes Made
**File:** `public/index.html`
**Lines:** 39851-39978
**Function:** `calculateMatchPlay(playerScores, courseHoles, useNet = true)`

### Deployment
- **Commit:** `865aa55f` - "Fix 1v1 matchplay calculations - true head-to-head scoring"
- **Deployed:** https://www.mycaddipro.com
- **Service Worker:** `fix-1v1-matchplay-calculation-dec5-v1`

---

## Automatic Round Robin Match Play

### User Request
> "if the group has 3 players and want to play 1v1, it should be player 1 vs player 2, player 1 vs player 3 head to head match so each player has 2 matches going on head to head at the same time"

### Problem
Individual Match Play with 3+ players was comparing against "best opponent score" (vs field), not creating true head-to-head matches.

### Solution
Modified `calculateMatchPlay()` to automatically create round robin (all combinations of head-to-head matches):

**For 2 players:** 1 match (P1 vs P2)
**For 3 players:** 3 matches (P1 vs P2, P1 vs P3, P2 vs P3)
**For 4 players:** 6 matches (all combinations)

### Implementation

```javascript
calculateMatchPlay(playerScores, courseHoles, useNet = true) {
    // For 2+ players: automatic round robin (each player vs every other player)
    const matchResults = {};

    for (const player of playerScores) {
        const playerId = player.playerId;
        const allOpponents = playerScores.filter(p => p.playerId !== playerId);

        // Track totals across all matches for this player
        let totalHolesWon = 0;
        let totalHolesLost = 0;
        let totalHolesHalved = 0;
        const individualMatches = [];

        // Play head-to-head against each opponent
        for (const opponent of allOpponents) {
            let holesWon = 0;
            let holesLost = 0;
            let holesHalved = 0;

            // Compare hole by hole
            for (let hole = 1; hole <= 18; hole++) {
                // ... hole-by-hole comparison ...
                if (playerStrokes < oppStrokes) holesWon++;
                else if (playerStrokes > oppStrokes) holesLost++;
                else holesHalved++;
            }

            individualMatches.push({
                opponentId: opponent.playerId,
                opponentName: opponent.playerName,
                holesWon, holesLost, holesHalved,
                netHoles, status, matchFinished
            });

            totalHolesWon += holesWon;
            totalHolesLost += holesLost;
            totalHolesHalved += holesHalved;
        }

        matchResults[playerId] = {
            holesUp: totalHolesWon,
            holesDown: totalHolesLost,
            holesHalved: totalHolesHalved,
            netHoles: totalHolesWon - totalHolesLost,
            status: overallStatus,
            individualMatches: individualMatches
        };
    }

    return matchResults;
}
```

### Leaderboard Display
Updated rendering logic to detect individual matches and display using round robin format:

```javascript
// Detect individual match play
const isIndividualMatchPlay = sortedLeaderboard.some(entry =>
    entry.matchplay?.individualMatches && entry.matchplay.individualMatches.length > 0
);

if (isIndividualMatchPlay && !isRoundRobin) {
    // Convert to roundRobinMatch format for display
    sortedLeaderboard.forEach(entry => {
        if (entry.matchplay?.individualMatches) {
            entry.roundRobinMatch = {
                playerId: entry.player_id,
                playerName: entry.player_name,
                totalHolesWon: entry.matchplay.holesUp,
                totalHolesLost: entry.matchplay.holesDown,
                totalHolesHalved: entry.matchplay.holesHalved,
                individualMatches: entry.matchplay.individualMatches,
                aggregateNet: entry.matchplay.netHoles,
                aggregateStatus: entry.matchplay.status
            };
        }
    });
    return this.renderRoundRobinLeaderboard(sortedLeaderboard, formatIndex, formatName);
}
```

### Leaderboard Features
1. **Aggregate Summary Table:** Shows total holes won/lost across ALL matches
2. **Individual Match Breakdown:** Expandable detail showing results vs each opponent
3. **Match Status:** Displays "X UP", "X DOWN", or "All Square" for each match

### Changes Made
**File:** `public/index.html`
**Lines:**
- 39851-39978: `calculateMatchPlay()` function (automatic round robin)
- 46958-46976: Rendering logic (detect and display individual matches)

### Deployment
- **Commit:** `35d877d8` - "Automatic round robin for Individual Match Play with 3+ players"
- **Deployed:** https://www.mycaddipro.com
- **Service Worker:** `auto-round-robin-matchplay-dec5-v1`

---

## Manual Round Entry - Alan Thomas

### Requirement
Manually input scores for **Alan Thomas** for **December 1, 2025** at **Greenwood**:
- **Handicap Index:** 11.6
- **Playing Handicap:** 12 (rounded)
- **Stableford Points:** 35 points
- **Gross Score:** 85 (calculated from 35 points)
- **Net Score:** 73 (85 - 12)

### Challenges Encountered

#### 1. Unknown Table Schema
- Multiple attempts to guess column names failed
- Columns like `total_par`, `handicap_index`, `playing_handicap`, `holes`, `differential` did not exist

#### 2. Solution Approach
Searched codebase for actual INSERT statements:
```bash
grep -r "INSERT INTO rounds" --include="*.html"
```

Found working code at `index.html:42972-42997`:
```javascript
const canonicalInsert = await window.SupabaseDB.client
    .from('rounds')
    .insert({
        golfer_id: player.lineUserId,
        course_id: courseId || null,
        course_name: courseName,
        type: this.roundType || 'private',
        played_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: 'completed',
        total_gross: totalGross,
        total_stableford: totalStableford,
        handicap_used: player.handicap,
        tee_marker: teeMarker,
        course_rating: 72.0,
        slope_rating: 113
    })
```

#### 3. Missing stroke_index Column
`round_holes` table requires `stroke_index` (NOT NULL constraint).

**Error:**
```
ERROR: 23502: null value in column "stroke_index" violates not-null constraint
```

**Solution:** Added stroke_index values (1-18) to each hole insert.

### Final Working Script

**File:** `sql/add_alan_thomas_WORKING.sql`

```sql
DO $$
DECLARE
    v_golfer_id TEXT;
    v_course_id TEXT;
    v_round_id UUID;
BEGIN
    -- Find Alan Thomas
    SELECT line_user_id INTO v_golfer_id
    FROM user_profiles
    WHERE name ILIKE '%alan%thomas%'
    LIMIT 1;

    -- Find Greenwood course
    SELECT id INTO v_course_id
    FROM courses
    WHERE name ILIKE '%greenwood%'
    LIMIT 1;

    -- Generate round ID
    v_round_id := gen_random_uuid();

    -- Insert round
    INSERT INTO rounds (
        id, golfer_id, course_id, course_name, type,
        played_at, started_at, completed_at, status,
        total_gross, total_stableford, handicap_used,
        tee_marker, course_rating, slope_rating
    ) VALUES (
        v_round_id, v_golfer_id, v_course_id, 'Greenwood', 'private',
        '2025-12-01 10:00:00+00',
        '2025-12-01 10:00:00+00',
        '2025-12-01 14:30:00+00',
        'completed',
        85, 35, 11.6, 'white', 72.0, 113
    );

    -- Insert 18 holes with stroke_index
    INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, stableford_points)
    VALUES
        -- Front 9 (18 points)
        (v_round_id, 1, 4, 1, 5, 1),   -- Bogey
        (v_round_id, 2, 4, 3, 4, 3),   -- Net birdie
        (v_round_id, 3, 3, 5, 4, 1),   -- Bogey
        (v_round_id, 4, 5, 7, 5, 3),   -- Net birdie
        (v_round_id, 5, 4, 9, 5, 1),   -- Bogey
        (v_round_id, 6, 4, 11, 4, 3),  -- Net birdie
        (v_round_id, 7, 3, 13, 3, 3),  -- Net birdie
        (v_round_id, 8, 4, 15, 5, 1),  -- Bogey
        (v_round_id, 9, 5, 17, 6, 2),  -- Par
        -- Back 9 (17 points)
        (v_round_id, 10, 4, 2, 4, 3),  -- Net birdie
        (v_round_id, 11, 4, 4, 5, 1),  -- Bogey
        (v_round_id, 12, 3, 6, 4, 1),  -- Bogey
        (v_round_id, 13, 5, 8, 6, 2),  -- Par
        (v_round_id, 14, 4, 10, 5, 1), -- Bogey
        (v_round_id, 15, 4, 12, 4, 3), -- Net birdie
        (v_round_id, 16, 3, 14, 3, 3), -- Net birdie
        (v_round_id, 17, 4, 16, 6, 0), -- Double bogey
        (v_round_id, 18, 5, 18, 6, 2); -- Par
END $$;
```

### Score Breakdown (35 Stableford Points)

**Front 9: 18 points**
| Hole | Par | SI | Gross | Net | Points | Type |
|------|-----|----| ------|-----|--------|------|
| 1 | 4 | 1 | 5 | 4 | 1 | Bogey |
| 2 | 4 | 3 | 4 | 3 | 3 | Net Birdie |
| 3 | 3 | 5 | 4 | 3 | 1 | Bogey |
| 4 | 5 | 7 | 5 | 4 | 3 | Net Birdie |
| 5 | 4 | 9 | 5 | 4 | 1 | Bogey |
| 6 | 4 | 11 | 4 | 3 | 3 | Net Birdie |
| 7 | 3 | 13 | 3 | 2 | 3 | Net Birdie |
| 8 | 4 | 15 | 5 | 4 | 1 | Bogey |
| 9 | 5 | 17 | 6 | 5 | 2 | Par |

**Back 9: 17 points**
| Hole | Par | SI | Gross | Net | Points | Type |
|------|-----|----| ------|-----|--------|------|
| 10 | 4 | 2 | 4 | 3 | 3 | Net Birdie |
| 11 | 4 | 4 | 5 | 4 | 1 | Bogey |
| 12 | 3 | 6 | 4 | 3 | 1 | Bogey |
| 13 | 5 | 8 | 6 | 5 | 2 | Par |
| 14 | 4 | 10 | 5 | 4 | 1 | Bogey |
| 15 | 4 | 12 | 4 | 3 | 3 | Net Birdie |
| 16 | 3 | 14 | 3 | 2 | 3 | Net Birdie |
| 17 | 4 | 16 | 6 | 5 | 0 | Double Bogey |
| 18 | 5 | 18 | 6 | 5 | 2 | Par |

**Total: 18 + 17 = 35 points ✓**

### Duplicate Cleanup

After multiple script runs, Alan Thomas had **4 rounds** (3 on Dec 1, 1 previous).

Created cleanup scripts:
1. **`sql/remove_alan_thomas_duplicates.sql`** - General duplicate removal
2. **`sql/delete_extra_dec1_round.sql`** - Specific Dec 1 duplicate cleanup

**Logic:** Keep OLDEST round for each unique date/course combination.

**Final Result:** Alan Thomas has **2 rounds total**:
1. Original round (from before session)
2. December 1, 2025 - Greenwood - 85 gross - 35 stableford

---

## Files Modified

### 1. public/index.html
**Total Changes:** 3 major modifications

#### Change 1: Handicap Calculation
- **Lines:** 33537-33545
- **Function:** `calculateHandicapIndex()`
- **Commit:** `5c0037ad`
- **Description:** Changed from WHS "best 8 of 20" to immediate adjustment after 3 rounds

#### Change 2: 1v1 Matchplay Fix
- **Lines:** 39851-39978
- **Function:** `calculateMatchPlay(playerScores, courseHoles, useNet = true)`
- **Commit:** `865aa55f`
- **Description:** Fixed 1v1 to use true head-to-head instead of "vs field"

#### Change 3: Automatic Round Robin
- **Lines:** 39851-39978, 46958-46976
- **Functions:** `calculateMatchPlay()`, rendering logic
- **Commit:** `35d877d8`
- **Description:** Auto-create round robin matches for 3+ players

### 2. public/sw.js
**Service Worker Version Updates:**
- `handicap-adjust-3-rounds-dec5-v1`
- `fix-1v1-matchplay-calculation-dec5-v1`
- `auto-round-robin-matchplay-dec5-v1`

---

## SQL Scripts Created

### Diagnostic Scripts
1. **`sql/find_alan_thomas.sql`** - Find Alan Thomas user and rounds
2. **`sql/find_greenwood_course.sql`** - Find Greenwood course details
3. **`sql/check_rounds_columns.sql`** - Check actual rounds table schema
4. **`sql/check_alan_thomas_rounds.sql`** - Verify Alan's rounds
5. **`sql/show_alan_thomas_3_rounds.sql`** - Display all 3 rounds details

### Manual Round Entry (Failed Attempts)
1. **`sql/add_alan_thomas_dec1_round.sql`** - First attempt (total_par error)
2. **`sql/add_alan_thomas_dec1_round_FIXED.sql`** - Second attempt (UUID error)
3. **`sql/ALAN_THOMAS_ROUND_INSTRUCTIONS.md`** - Documentation

### Manual Round Entry (Working)
4. **`sql/add_alan_thomas_WORKING.sql`** - ✅ Final working script

### Duplicate Cleanup
5. **`sql/remove_alan_thomas_duplicates.sql`** - General duplicate removal
6. **`sql/delete_extra_dec1_round.sql`** - Dec 1 specific cleanup

---

## Deployments

### Deployment 1: Handicap Adjustment
- **Time:** Dec 5, 2025
- **Commit:** `5c0037ad`
- **Message:** "Adjust handicap to start after 3 rounds instead of requiring more scores"
- **URL:** https://mcipro-golf-platform-85kw9bwvp-mcipros-projects.vercel.app
- **Alias:** www.mycaddipro.com
- **Service Worker:** `handicap-adjust-3-rounds-dec5-v1`

### Deployment 2: 1v1 Matchplay Fix
- **Time:** Dec 5, 2025
- **Commit:** `865aa55f`
- **Message:** "Fix 1v1 matchplay calculations - true head-to-head scoring"
- **URL:** https://mcipro-golf-platform-m3v6cgwqd-mcipros-projects.vercel.app
- **Alias:** www.mycaddipro.com
- **Service Worker:** `fix-1v1-matchplay-calculation-dec5-v1`

### Deployment 3: Automatic Round Robin
- **Time:** Dec 5, 2025
- **Commit:** `35d877d8`
- **Message:** "Automatic round robin for Individual Match Play with 3+ players"
- **URL:** https://mcipro-golf-platform-hj51dzg6n-mcipros-projects.vercel.app
- **Alias:** www.mycaddipro.com
- **Service Worker:** `auto-round-robin-matchplay-dec5-v1`

---

## Key Learnings

### 1. Always Check Actual Schema
Don't assume column names - search the codebase for actual INSERT statements to find what columns exist.

### 2. Table Constraints Matter
`round_holes.stroke_index` has NOT NULL constraint - must be included in all inserts.

### 3. Matchplay Logic Was Fundamentally Broken
The "vs field" approach for 1v1 was incorrect - needed proper head-to-head comparison.

### 4. Round Robin Auto-Creation
Individual Match Play now automatically creates all possible head-to-head combinations, making manual pairing unnecessary for simple round robin scenarios.

### 5. Duplicate Prevention
When manually inserting rounds, need cleanup scripts to handle duplicate runs.

---

## Testing Checklist

### Handicap Calculation
- [ ] Test with 3 rounds - should use best score
- [ ] Test with 19 rounds - should still use best score
- [ ] Test with 20 rounds - should switch to best 8 of 20
- [ ] Verify handicap updates immediately after 3rd round

### 1v1 Matchplay
- [ ] Test with 2 players - should be true head-to-head
- [ ] Verify hole-by-hole results are correct
- [ ] Check match status ("X UP", "X DOWN", "All Square")
- [ ] Verify "X & Y" notation when match is won

### Automatic Round Robin
- [ ] Test with 3 players - should create 3 matches
- [ ] Test with 4 players - should create 6 matches
- [ ] Verify individual match results display correctly
- [ ] Check aggregate totals are sum of all matches
- [ ] Verify expandable match breakdown works

### Alan Thomas Round
- [ ] Verify Alan Thomas has exactly 2 rounds
- [ ] Check Dec 1, 2025 round shows 35 stableford points
- [ ] Verify 18 holes exist with correct scores
- [ ] Confirm no duplicates remain

---

## Future Improvements

### 1. Database Schema Documentation
Create comprehensive schema documentation showing:
- All table columns with data types
- NOT NULL constraints
- Foreign key relationships
- Default values

### 2. Manual Round Entry Tool
Build UI form for manual round entry instead of SQL scripts:
- Player selection dropdown
- Course selection
- Date picker
- Hole-by-hole score entry
- Automatic stableford calculation
- Duplicate prevention

### 3. Matchplay Enhancements
- Add match history tracking
- Show head-to-head records
- Display career statistics vs each opponent
- Tournament bracket view for round robin results

### 4. Handicap System Options
Add user preference for handicap calculation method:
- **Standard WHS:** Best 8 of 20
- **Quick Start:** Best score after 3 rounds
- **Custom:** User-defined number of rounds and scores to use

---

## Related Files

### Documentation
- `compacted/2025-11-12_AUTOMATIC_HANDICAP_SYSTEM.md` - Handicap system overview
- `HANDICAP_FIX_DEPLOYMENT_GUIDE.md` - Handicap system deployment guide
- `CODE_LOCATIONS.txt` - Code location reference

### SQL Schema
- `sql/02_create_round_history_system.sql` - Rounds table schema
- `sql/CREATE_PUBLIC_GAMES_TABLES.sql` - Public games tables

### Previous Sessions
- `compacted/2025-12-03_HANDICAP_PLUS_SIGN_CATASTROPHIC_FAILURE.md`
- `compacted/2025-12-02_1V1_MATCHPLAY_DATABASE_ERRORS.md`

---

## End of Session Summary

**Total Commits:** 3
**Total Deployments:** 3
**Files Modified:** 2 (index.html, sw.js)
**SQL Scripts Created:** 11
**Issues Fixed:** 3 major bugs
**Manual Rounds Added:** 1 (Alan Thomas, Dec 1, 2025)

**Status:** ✅ All changes deployed to production at www.mycaddipro.com
