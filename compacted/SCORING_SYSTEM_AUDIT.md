# Scoring System Sanity Check

**Audit Date:** 2026-01-01
**Status:** COMPLETE - All issues fixed

## Systems Audited

### 1. Golfer Live Scoring System
- **File:** `public/index.html`
- **Function:** `SocietyGolfDB.saveScore()` (line ~48200)
- **Status:** FIXED

### 2. Society Organizer Scoring System
- **Class:** `OrganizerScoringSystem` (line ~84392)
- **Functions:**
  - `calcStablefordPts()` - Edit score modal
  - `calculateStablefordPoints()` - Quick score entry
  - `calcShotsOnHole()` - Stroke allocation
- **Status:** FIXED

### 3. Core Scoring Engine
- **Class:** `GolfScoringEngine` (line ~48928)
- **Functions:**
  - `allocHandicapShots()` - Handicap stroke distribution
  - `stablefordPointsForHole()` - Point calculation
  - `calculateStablefordTotal()` - Round total
- **Status:** CANONICAL (no changes needed)

## Issues Found & Fixed

### Issue 1: Stableford Point Inconsistencies
**Problem:** 3 different functions calculated Stableford points differently:
- Live scoring: Max 4 pts (missing albatross)
- Organizer edit: Max 4 pts (missing albatross)
- Organizer quick score: Max 5 pts (had albatross)
- GolfScoringEngine: Max 6 pts (condor, albatross, eagle)

**Fix:** Standardized all calculations to WHS standard:
```
Condor (net -4 or better): 6 pts (rare)
Albatross (net -3): 5 pts
Eagle (net -2): 4 pts
Birdie (net -1): 3 pts
Par (net 0): 2 pts
Bogey (net +1): 1 pt
Double+ (net +2 or worse): 0 pts
```

**Files Modified:**
- Line 48232-48250: Live scoring save
- Line 48665-48672: Scorecard recalculation
- Line 85341-85373: `calcStablefordPts()`
- Line 86383-86425: `calculateStablefordPoints()`

### Issue 2: Plus Handicap Handling
**Problem:** Organizer functions didn't handle plus handicaps (negative values) correctly.
- `Math.floor(-2/18)` = -1 (wrong)
- `(-2) % 18` = -2 (wrong)

**Fix:** Added proper plus handicap detection and inverted stroke allocation:
```javascript
const isPlus = roundedHcp < 0;
const absHcp = Math.abs(roundedHcp);
if (isPlus) {
    // Give strokes on EASIEST holes (highest SI)
    shots = -(fullStrokes + (si > (18 - remainingStrokes) ? 1 : 0));
} else {
    // Receive strokes on HARDEST holes (lowest SI)
    shots = fullStrokes + (si <= remainingStrokes ? 1 : 0);
}
```

**Files Modified:**
- Line 85341-85373: `calcStablefordPts()`
- Line 85472-85484: `calcShotsOnHole()`
- Line 86383-86425: `calculateStablefordPoints()`

### Issue 3: Canonical Engine Usage
**Enhancement:** Updated organizer functions to use `GolfScoringEngine` when available:
```javascript
const engine = window.GolfScoringEngine || window.AppState?.GolfScoringEngine;
if (engine) {
    const courseHoles = [{ hole: 1, stroke_index: si, par: par }];
    const shots = engine.allocHandicapShots(courseHoles, handicap);
    const netScore = engine.netStrokesForHole(score, shots[1] || 0);
    return engine.stablefordPointsForHole(netScore, par, engine.defaultStableford);
}
```

## Verified Working Components

### Handicap Stroke Allocation
- Regular handicaps: Strokes on hardest holes (SI 1, 2, 3...)
- Plus handicaps: Strokes given on easiest holes (SI 18, 17, 16...)
- 18+ handicaps: Multiple strokes per hole distributed correctly

### Scoring Formats Supported
1. **Stableford** - Points-based (higher = better)
2. **Modified Stableford** - Alternative point values
3. **Stroke Play** - Lowest gross/net wins
4. **Nassau** - Front 9, Back 9, Overall
5. **Match Play** - Hole-by-hole comparison
6. **Team Match Play** - Best ball
7. **Skins** - Hole winner takes points
8. **Scramble** - Team best score

### Leaderboard Calculations
- Auto-refresh every 30 seconds
- Live scorecard support
- Division-based leaderboards
- Championship points allocation
- Proper tie handling

### Data Flow
```
Golfer enters score
    ↓
Live scorecard saves to `scores` table
    ↓
Organizer leaderboard reads from `scorecards` + `rounds`
    ↓
Results published to `event_results`
```

## Testing Recommendations

1. **Test Plus Handicap:**
   - Create player with +2 handicap
   - Verify they ADD strokes on easy holes
   - Verify Stableford points calculated correctly

2. **Test High Handicap:**
   - Create player with 25 handicap
   - Verify they get 2 strokes on SI 1-7, 1 stroke on SI 8-18

3. **Test Albatross Scenario:**
   - Player with 18 handicap on Par 5
   - Gets 1 stroke on that hole
   - Gross 3 = Net 2 = Net Albatross = 5 pts

4. **Test Organizer Score Entry:**
   - Use Quick Score Entry modal
   - Enter hole-by-hole scores
   - Verify Stableford totals match
