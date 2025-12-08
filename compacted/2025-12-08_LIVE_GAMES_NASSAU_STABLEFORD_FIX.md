# Live Games Nassau Stableford Fix Session
**Date:** 2025-12-08
**Session Summary:** Fixed multiple issues with Live Games module scoring and pool management

---

## Issues Fixed

### 1. Stableford Points Not Saving to Database
**Location:** `public/index.html` line 40322

**Problem:** The `SocietyGolfDB.saveScore()` function was NOT saving `stableford_points` to the `scores` table. It was commented out with a note "temporarily removed".

**Fix:** Added `stableford_points: stablefordPoints` back to the upsert operation.

```javascript
// BEFORE (broken)
.upsert([{
    scorecard_id: scorecardId,
    hole_number: holeNumber,
    par: par,
    stroke_index: strokeIndex,
    gross_score: grossScore,
    net_score: netScore,
    handicap_strokes: strokesReceived
    // stableford column temporarily removed
}])

// AFTER (fixed)
.upsert([{
    scorecard_id: scorecardId,
    hole_number: holeNumber,
    par: par,
    stroke_index: strokeIndex,
    gross_score: grossScore,
    net_score: netScore,
    handicap_strokes: strokesReceived,
    stableford_points: stablefordPoints
}])
```

---

### 2. Column Name Mismatch
**Location:** `public/index.html` line 40390

**Problem:** Code was using `s.stableford` but the database column is `stableford_points`.

**Fix:** Changed to `s.stableford_points` for consistency.

```javascript
// BEFORE
const totalStableford = scores.reduce((sum, s) => sum + (s.stableford || 0), 0);

// AFTER
const totalStableford = scores.reduce((sum, s) => sum + (s.stableford_points || 0), 0);
```

---

### 3. Stableford Calculation Double-Counting Handicap
**Location:** `public/index.html` lines 40289-40310

**Problem:** The stableford calculation was adding `strokesReceived` to the base points, which double-counts the handicap (since net score already accounts for handicap strokes).

**Fix:** Removed the `+ strokesReceived` from all stableford point calculations.

```javascript
// BEFORE (wrong - double counting)
if (scoreToPar === 0) {
    stablefordPoints = 2 + strokesReceived;  // WRONG!
}

// AFTER (correct)
if (scoreToPar === 0) {
    stablefordPoints = 2;  // Correct - net score already has handicap applied
}
```

**Correct Stableford Points (based on NET score):**
- Net Eagle or better: 4 points
- Net Birdie: 3 points
- Net Par: 2 points
- Net Bogey: 1 point
- Net Double bogey or worse: 0 points

---

### 4. Old Pools Not Being Cleaned Up
**Location:** `public/index.html` lines 55147-55234

**Problem:** When a round ended, pools were left in 'active' status. Old pools from previous days were showing up for other golfers trying to join games.

**Fixes Applied:**

#### A. Delete empty pools when last player leaves
```javascript
async leavePool(poolId, playerId) {
    // ... delete player from pool ...

    // Check if pool is now empty and delete it
    const { data: remaining } = await window.SupabaseDB.client
        .from('pool_entrants')
        .select('player_id')
        .eq('pool_id', poolId);

    if (!remaining || remaining.length === 0) {
        await window.SupabaseDB.client
            .from('side_game_pools')
            .delete()
            .eq('id', poolId);
    }
}
```

#### B. Clean up old pools on startup
```javascript
async cleanupOldPools() {
    const today = new Date().toISOString().split('T')[0];

    // Get pools not from today
    const { data: oldPools } = await window.SupabaseDB.client
        .from('side_game_pools')
        .select('id, date_iso')
        .neq('date_iso', today);

    // Filter to pools from before today and delete them
    const poolsToDelete = (oldPools || []).filter(p => p.date_iso < today);
    if (poolsToDelete.length > 0) {
        const idsToDelete = poolsToDelete.map(p => p.id);
        await window.SupabaseDB.client
            .from('side_game_pools')
            .delete()
            .in('id', idsToDelete);
    }
}
```

#### C. Cleanup called on Live Scorecard init
```javascript
async init() {
    // ... other init code ...

    // Clean up old public game pools from past dates
    if (window.LiveGamesSystem?.cleanupOldPools) {
        window.LiveGamesSystem.cleanupOldPools();
    }
}
```

---

## SQL Scripts Created/Updated

### 1. ADD_STABLEFORD_COLUMN.sql
Adds the `stableford_points` column to the `scores` table if it doesn't exist.

### 2. RECALCULATE_STABLEFORD.sql
Recalculates stableford points for ALL existing scores using the correct formula.

```sql
UPDATE scores
SET stableford_points = CASE
    WHEN (net_score - par) <= -2 THEN 4  -- Net Eagle or better
    WHEN (net_score - par) = -1 THEN 3   -- Net Birdie
    WHEN (net_score - par) = 0 THEN 2    -- Net Par
    WHEN (net_score - par) = 1 THEN 1    -- Net Bogey
    ELSE 0                                -- Net Double bogey or worse
END;
```

### 3. CLEANUP_OLD_POOLS.sql
Cleans up old pools from past dates.

```sql
DELETE FROM side_game_pools
WHERE date_iso < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
```

---

## Commits Made

1. `b68234f3` - Fix Nassau Stableford - add stableford_points to score save
2. `41759dd6` - Fix Live Games pool cleanup - delete old pools on startup and when empty
3. `b4aa2406` - Fix pool cleanup - handle TEXT date_iso column properly
4. `e5735bb5` - Fix Stableford calculation - remove double-counting of handicap strokes

---

## Files Modified

- `public/index.html` - Main application file
- `sql/RECALCULATE_STABLEFORD.sql` - SQL to fix existing scores
- `sql/ADD_STABLEFORD_COLUMN.sql` - SQL to add missing column
- `sql/CLEANUP_OLD_POOLS.sql` - SQL to clean up old pools

---

## Testing Checklist

- [x] Stableford points save to database when scores entered
- [x] Live Games leaderboard shows correct stableford scores
- [x] Old pools from previous days are cleaned up on startup
- [x] Empty pools are deleted when last player leaves
- [x] Only today's pools show in "Join Games" modal
- [x] Nassau format displays F9/B9/Total correctly

---

## Deployment

All changes deployed to www.mycaddipro.com via Vercel.
