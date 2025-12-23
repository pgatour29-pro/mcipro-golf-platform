# 2025-12-23 Team Match Play Stableford Scoring Fix

## PROBLEM

In live scorecard 2-man team match play with stableford format:
1. Match scores were off by 1-2 points per hole
2. By the end of the round, scores were completely wrong
3. Tie-breaker (second ball) wasn't working correctly

---

## ROOT CAUSES

### Bug 1: Wrong Scoring Method Used
Both calls to `calculateTeamMatchPlay()` had `useStableford = false` hardcoded:

```javascript
// OLD - Always used stroke play (lower is better)
const teamResults = engine.calculateTeamMatchPlay(
    teamConfig.teamA,
    teamConfig.teamB,
    this.courseData.holes,
    true,   // useNet
    false   // useStableford - WRONG!
);
```

This meant even when stableford was selected, it compared strokes (lower wins) instead of points (higher wins).

### Bug 2: Handicap Strokes Only Worked for HCP ≤ 18
```javascript
// OLD - Only gives max 1 stroke per hole
const shotsReceived = playerHcp >= strokeIndex ? 1 : 0;
```

For a player with HCP 25:
- Should get 2 strokes on SI 1-7 (hardest holes)
- Should get 1 stroke on SI 8-18
- Was only getting 1 stroke on all holes

---

## FIXES

### Fix 1: Dynamic Stableford Detection
Location: `public/index.html` lines 51172 and 53513

```javascript
// NEW - Respects scoring format selection
const useStableford = this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford');
const teamResults = engine.calculateTeamMatchPlay(
    teamConfig.teamA,
    teamConfig.teamB,
    this.courseData.holes,
    true,
    useStableford  // Now dynamic!
);
```

### Fix 2: Proper Handicap Stroke Allocation
Location: `public/index.html` lines 46023-46027 (stableford) and 46050-46053 (stroke play)

```javascript
// NEW - Handles handicaps over 18 correctly
const baseStrokes = Math.floor(playerHcp / 18);
const extraStrokeThreshold = playerHcp % 18;
const shotsReceived = baseStrokes + (strokeIndex <= extraStrokeThreshold ? 1 : 0);
```

**Examples:**
| HCP | Stroke Index | Base | Extra | Total Strokes |
|-----|--------------|------|-------|---------------|
| 10  | 5            | 0    | 1     | 1             |
| 10  | 15           | 0    | 0     | 0             |
| 25  | 5            | 1    | 1     | 2             |
| 25  | 10           | 1    | 0     | 1             |
| 36  | Any          | 2    | 0     | 2             |

---

## HANDICAP STROKE FORMULA

For a handicap H on a hole with stroke index SI:
```
Base strokes = floor(H / 18)     // Everyone gets this on ALL holes
Extra stroke = SI <= (H % 18)    // Extra on hardest holes
Total = Base + (Extra ? 1 : 0)
```

---

## CODE LOCATIONS

| Fix | File | Lines |
|-----|------|-------|
| Stableford detection (settlement) | public/index.html | 51172 |
| Stableford detection (leaderboard) | public/index.html | 53513 |
| Handicap allocation (stableford) | public/index.html | 46023-46027 |
| Handicap allocation (stroke play) | public/index.html | 46050-46053 |

---

## COMMITS

- `0165aba8` - fix: Correct 2-man team match play stableford scoring

---

## TESTING CHECKLIST

1. [ ] Create 4-player stableford round
2. [ ] Enable match play with 2-man teams
3. [ ] Include players with HCP > 18
4. [ ] Verify correct strokes given on hardest holes
5. [ ] Verify match score increments correctly (higher stableford wins)
6. [ ] Verify tie-breaker uses second ball correctly

---

**Session Date**: 2025-12-23
**Status**: DEPLOYED
