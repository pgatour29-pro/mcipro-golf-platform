# Scoring Consistency Fix - December 18, 2025

**Session Focus:** Fix stableford scoring calculations across all systems to ensure consistency between Society Organizer Dashboard, Golfer Dashboard, Live Scorecard, and Database.

---

## Problem Summary

Pete Park with HCP 2.8 scored gross 4 on hole 2 (SI 3, par 4) at Royal Lakeside. The system showed 2 points instead of the correct 3 points (net birdie).

### Root Causes Identified:
1. **Decimal handicap not rounded** - `parseInt(2.8) = 2` instead of `Math.round(2.8) = 3`
2. **Wrong stroke index in database** - Royal Lakeside hole 2 had SI 4 instead of SI 3
3. **Inconsistent scoring formulas** - Different calculation methods across systems
4. **Leaderboard showing stored values** - Not recalculating with correct course data

---

## Fixes Applied

### 1. OrganizerScoring.calcStablefordPts() - Society Organizer Dashboard

**File:** `public/index.html` (lines 71820-71834)

```javascript
calcStablefordPts(score, par, handicap, si) {
    if (!score) return 0;
    // Round handicap to integer for stroke allocation
    const roundedHcp = Math.round(handicap);
    const fullStrokes = Math.floor(roundedHcp / 18);
    const remainingStrokes = roundedHcp % 18;
    const shotsOnHole = fullStrokes + (si <= remainingStrokes ? 1 : 0);
    const netScore = score - shotsOnHole;
    const scoreToPar = netScore - par;
    if (scoreToPar <= -2) return 4;
    if (scoreToPar === -1) return 3;
    if (scoreToPar === 0) return 2;
    if (scoreToPar === 1) return 1;
    return 0;
}
```

### 2. Handicap Rounding in Edit Score Functions

**File:** `public/index.html`

All functions now use `Math.round()`:
- `renderEditScorecard()` - line 71792
- `updateEditHoleScore()` - line 71850
- `updateEditScoreTotals()` - line 71861
- `saveEditedScore()` - line 71884

```javascript
const handicap = Math.round(this.editingRound.handicap_used || 0);
```

### 3. Hardcoded Verified Royal Lakeside Course Data

**File:** `public/index.html` (lines 71715-71742)

```javascript
const verifiedCourseData = {
    'royal_lakeside': [
        { hole_number: 1, par: 5, handicap: 7 },
        { hole_number: 2, par: 4, handicap: 3 },  // SI 3 NOT 4!
        { hole_number: 3, par: 3, handicap: 17 },
        { hole_number: 4, par: 4, handicap: 13 },
        { hole_number: 5, par: 4, handicap: 5 },
        { hole_number: 6, par: 3, handicap: 15 },
        { hole_number: 7, par: 5, handicap: 9 },
        { hole_number: 8, par: 4, handicap: 1 },
        { hole_number: 9, par: 4, handicap: 11 },
        { hole_number: 10, par: 5, handicap: 12 },
        { hole_number: 11, par: 4, handicap: 8 },
        { hole_number: 12, par: 3, handicap: 16 },
        { hole_number: 13, par: 4, handicap: 6 },
        { hole_number: 14, par: 4, handicap: 4 },
        { hole_number: 15, par: 3, handicap: 18 },
        { hole_number: 16, par: 4, handicap: 2 },
        { hole_number: 17, par: 4, handicap: 14 },
        { hole_number: 18, par: 5, handicap: 10 }
    ]
};
```

### 4. Leaderboard Recalculates Points

**File:** `public/index.html` (lines 71592-71615)

Changed from showing stored `round.total_stableford` to recalculating on-the-fly:

```javascript
let recalculatedStableford = 0;
for (let h = 1; h <= 18; h++) {
    const holeData = holeScores[h];
    const par = courseData.holes[h - 1]?.par || 4;
    const si = courseData.holes[h - 1]?.handicap || h;
    if (holeData && holeData.gross_score) {
        const pts = this.calcStablefordPts(score, par, handicap, si);
        recalculatedStableford += pts;
    }
}
const stableford = recalculatedStableford || '-';
```

### 5. Quick Score Entry (QSE) Formula Fixed

**File:** `public/index.html` (lines 72727-72752)

Changed from simplified formula to WHS standard:

```javascript
calculateStablefordPoints(score, par, playerHcp, holeHcp) {
    if (!score || score === '') return 0;
    const grossScore = parseInt(score);
    const holePar = parseInt(par) || 4;
    const holeHandicap = parseInt(holeHcp) || 1;
    // CRITICAL: Round handicap to integer (2.8 -> 3, not truncate to 2)
    const handicap = Math.round(parseFloat(playerHcp) || 0);

    // Calculate shots received using WHS formula
    const fullStrokes = Math.floor(handicap / 18);
    const remainingStrokes = handicap % 18;
    const shots = fullStrokes + (holeHandicap <= remainingStrokes ? 1 : 0);
    // ... rest of function
}
```

### 6. SQL Function Updated

**File:** `sql/verify_and_fix_all_scores.sql`

```sql
CREATE OR REPLACE FUNCTION calculate_stableford_points(
    p_gross_score INT,
    p_par INT,
    p_handicap NUMERIC,
    p_stroke_index INT
) RETURNS INT AS $$
DECLARE
    rounded_hcp INT;
    full_strokes INT;
    remaining_strokes INT;
    shots_received INT;
    net_score INT;
    score_to_par INT;
BEGIN
    -- CRITICAL: Round handicap to integer first (2.8 -> 3, not truncate to 2)
    rounded_hcp := ROUND(p_handicap)::INT;

    full_strokes := FLOOR(rounded_hcp / 18);
    remaining_strokes := rounded_hcp % 18;

    IF p_stroke_index <= remaining_strokes THEN
        shots_received := full_strokes + 1;
    ELSE
        shots_received := full_strokes;
    END IF;
    -- ... rest of function
END;
$$ LANGUAGE plpgsql;
```

### 7. SQL UPDATE Query Fixed

Changed from invalid LEFT JOIN to subqueries:

```sql
UPDATE round_holes rh
SET stableford_points = calculate_stableford_points(
    rh.gross_score,
    COALESCE(
        (SELECT ch.par FROM course_holes ch
         WHERE ch.course_id = (CASE ... END)
         AND ch.hole_number = rh.hole_number
         AND ch.tee_marker = 'white'
         LIMIT 1),
        rh.par
    ),
    r.handicap_used,
    COALESCE(
        (SELECT ch.stroke_index FROM course_holes ch ...),
        rh.stroke_index
    )
)
FROM rounds r
WHERE rh.round_id = r.id
AND rh.gross_score IS NOT NULL
AND rh.gross_score > 0;
```

---

## Scoring Formula - Unified Across All Systems

### WHS Handicap Stroke Allocation:
```
roundedHcp = Math.round(handicap)  // 2.8 -> 3
fullStrokes = floor(roundedHcp / 18)
remainingStrokes = roundedHcp % 18
shotsOnHole = fullStrokes + (SI <= remainingStrokes ? 1 : 0)
```

### Stableford Points:
```
Net Eagle or better (≤-2): 4 pts
Net Birdie (-1): 3 pts
Net Par (0): 2 pts
Net Bogey (+1): 1 pt
Net Double+ (≥+2): 0 pts
```

---

## Example Calculation

**Pete Park on Hole 2:**
- Handicap: 2.8 → rounded to 3
- Stroke Index: 3
- Par: 4
- Gross Score: 4

**Calculation:**
- fullStrokes = floor(3/18) = 0
- remainingStrokes = 3 % 18 = 3
- SI 3 <= 3? YES → shotsOnHole = 0 + 1 = 1
- Net Score = 4 - 1 = 3
- Score to Par = 3 - 4 = -1 (net birdie)
- **Points = 3** ✓

---

## Git Commits

| Commit | Message |
|--------|---------|
| `5f8723b2` | feat: Add score verification system and backfill SQL scripts |
| `e37bd706` | fix: Load course data from verified JSON files first |
| `932a961b` | fix: Hardcode Royal Lakeside course data with correct SI values |
| `0ca8adca` | fix: Recalculate stableford points in leaderboard using correct SI |
| `6d5b971b` | fix: Round handicap to integer before stroke allocation |
| `3616cd53` | fix: Round handicap in all Edit Score functions + cleanup |
| `b0bf995b` | fix: Sync Quick Score Entry stableford calculation with WHS formula |
| `c9173b85` | fix: SQL function now rounds handicap to match JavaScript |
| `ee788881` | fix: SQL UPDATE query uses subqueries instead of invalid LEFT JOIN |

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Fixed calcStablefordPts, calculateStablefordPoints, added hardcoded course data, recalculate leaderboard |
| `sql/verify_and_fix_all_scores.sql` | Added ROUND() for handicap, fixed UPDATE query with subqueries |

---

## Systems Now Synchronized

1. **Society Organizer Dashboard** - `OrganizerScoring.calcStablefordPts()`
2. **Quick Score Entry** - `calculateStablefordPoints()`
3. **Live Scorecard** - `GolfScoringEngine.allocHandicapShots()` (already correct)
4. **Hole-by-hole Leaderboard** - Uses GolfScoringEngine
5. **Database Recalculation** - `calculate_stableford_points()` SQL function

---

## To Fix Existing Database Scores

Run in Supabase SQL Editor:
```sql
-- File: sql/verify_and_fix_all_scores.sql
-- Step 1: Fixes Royal Lakeside stroke indexes
-- Step 2: Creates calculate_stableford_points function
-- Step 3-4: Shows discrepancies
-- Step 5: Fixes all round_holes
-- Step 6: Fixes round totals
-- Step 7: Verification
```

---

## Key Lessons

1. **Always round decimal handicaps** - Use `Math.round()` not `parseInt()` or `::INT`
2. **Verify course data sources** - Database had wrong SI for hole 2
3. **Use consistent formulas everywhere** - WHS standard for all calculations
4. **Recalculate instead of storing** - Leaderboard should recalculate, not show stored values
5. **Hardcode verified data** - When database is unreliable, use verified JSON/hardcoded data

---

## Testing Checklist

- [x] Pete Park hole 2 shows 3 points (net birdie)
- [x] Total shows 36 points (correct)
- [x] Edit Score modal uses correct SI
- [x] Leaderboard recalculates correctly
- [x] SQL script runs without errors
- [x] QSE uses WHS formula
