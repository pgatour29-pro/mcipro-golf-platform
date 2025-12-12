# MyCaddiPro Leaderboard & Scoring Systems Catalog
**Date:** 2025-12-12
**Status:** REFERENCE DOCUMENT

## Overview
This document catalogs ALL leaderboard systems in MyCaddiPro and how they calculate/display scores to ensure global consistency.

---

## Database Schema - Scores Storage

### `scorecards` Table
Stores round-level totals:
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `player_id` | TEXT | Player's LINE user ID (starts with U) |
| `event_id` | UUID | Associated event |
| `total_gross` | INT | Sum of all gross scores |
| `total_net` | INT | Sum of all net scores |
| `status` | TEXT | 'in_progress', 'completed' |
| `created_at` | TIMESTAMP | Round date |

**NOTE:** There is NO `total_stableford` column in scorecards table! Stableford must be calculated from `scores` table.

### `scores` Table
Stores hole-by-hole details:
| Column | Type | Description |
|--------|------|-------------|
| `scorecard_id` | UUID | FK to scorecards |
| `hole_number` | INT | 1-18 |
| `gross_score` | INT | Actual strokes |
| `net_score` | INT | Gross minus handicap strokes |
| `stableford_points` | INT | Points for this hole |
| `handicap_strokes` | INT | Shots received on this hole |

---

## Scoring Calculation Engine

### Location: `public/index.html` lines 41501-41680

### `LiveScorecardSystem.GolfScoringEngine`

**Thailand Stableford Points (Default):**
```javascript
defaultStableford: {
    doubleBogeyOrWorse: 0,
    bogey: 1,
    par: 2,
    birdie: 3,
    eagle: 4,
    albatross: 5,
    condor: 6
}
```

**Modified Stableford Points:**
```javascript
modifiedStablefordPoints: {
    doubleBogeyOrWorse: -3,
    bogey: -1,
    par: 0,
    birdie: 2,
    eagle: 5,
    albatross: 8,
    condor: 10
}
```

### Key Functions:

1. **`allocHandicapShots(courseHoles, handicap)`** - Distributes handicap strokes across holes based on stroke index
2. **`calculateStablefordTotal(scores, courseHoles, handicap, useNet, customPoints)`** - Calculates total stableford from hole scores
3. **`calculateNassau(playerScores, courseHoles, handicap, method)`** - Calculates front 9, back 9, and total for Nassau

---

## Leaderboard Systems

### 1. LIVE EVENT LEADERBOARD (During Play)

**File:** `public/index.html`
**Function:** `SocietyGolfDB.getLeaderboard()` (lines 41304-41406)

**Data Flow:**
1. Calls `getEventScorecards(eventId)` - queries scorecards WITH `scores(*)` joined
2. Calculates `total_stableford` by summing `stableford_points` from each hole score
3. Sorts by scoring format (stableford=descending, stroke=ascending)
4. Applies countback tie-breaking (last 9, last 6, last 3, last 1)

**Query:**
```javascript
const { data: scorecards } = await window.SupabaseDB.client
    .from('scorecards')
    .select(`*, scores (*)`)
    .eq('event_id', eventId);
```

**Displays:**
- Position (with ties shown as T1, T2, etc.)
- Player Name
- Handicap
- Gross Score
- Net Score
- Stableford Points (calculated from `scores.stableford_points`)
- Thru (holes completed or "F" for finished)

**Sorting Rules:**
| Format | Primary Sort | Tie-Break |
|--------|--------------|-----------|
| Stableford | Highest points first | Last 9, Last 6, Last 3, Last 1 (higher wins) |
| Net | Lowest net first | Last 9, Last 6, Last 3, Last 1 (lower wins) |
| Gross | Lowest gross first | Last 9, Last 6, Last 3, Last 1 (lower wins) |

---

### 2. HOLE-BY-HOLE LEADERBOARD (Spectate View)

**File:** `public/hole-by-hole-leaderboard-enhancement.js`
**Function:** `LiveScorecardManager.renderHoleByHoleLeaderboard()`

**Data Source:** Same as Live Event Leaderboard (`SocietyGolfDB.getLeaderboard()`)

**Displays:**
- Player name and handicap
- Individual score for each hole (color-coded)
- Running total
- Thru count

**Color Coding:**
| Score vs Par | Color |
|--------------|-------|
| Eagle or better | Yellow background |
| Birdie | Red background |
| Par | Gray background |
| Bogey | Light blue background |
| Double+ bogey | Darker blue background |

---

### 3. TIME-WINDOWED LEADERBOARD (Golfers Tab - Daily/Weekly/Monthly/Yearly)

**File:** `public/time-windowed-leaderboards.js`
**Class:** `TimeWindowedLeaderboards`
**Function:** `getStandings(period, societyFilter)`

**Data Flow:**
1. Queries scorecards WITH `scores(*)` joined
2. Filters by date range (daily/weekly/monthly/yearly)
3. Calculates stableford by summing `scores.stableford_points`
4. Aggregates by player across multiple rounds
5. Sorts by TOTAL stableford points (higher = better)

**Query:**
```javascript
const { data: scorecards } = await this.supabase
    .from('scorecards')
    .select('id, player_id, total_gross, total_net, created_at, scores(*)')
    .gte('created_at', startDateStr);
```

**Stableford Calculation:**
```javascript
let totalStableford = 0;
if (card.scores && Array.isArray(card.scores)) {
    for (const score of card.scores) {
        totalStableford += score.stableford_points || 0;
    }
}
```

**Displays:**
| Column | Description |
|--------|-------------|
| Rank | Position based on stableford points |
| Player | Name with avatar |
| Gross | Total gross (or average if multiple rounds) |
| Net | Total net (or average if multiple rounds) |
| Pts | Total stableford points |
| Rds | Number of rounds played |

**Leaderboard Reset Date:** 2025-12-12 (only counts rounds from this date forward)

**Period Calculations:**
- **Daily:** Current day (midnight to midnight)
- **Weekly:** Monday to Sunday
- **Monthly:** 1st of month to end of month
- **Yearly:** January 1st to December 31st

---

### 4. ORGANIZER SCORING VIEW

**File:** `public/index.html` (OrganizerScoringSystem)
**Location:** Lines 32030-32156

**Data Source:** `SocietyGolfDB.getLeaderboard()` with format selection

**Displays:**
- Position
- Player
- Handicap
- Gross
- Net
- Score (based on selected format)
- Thru
- Points (championship points allocation)

---

### 5. QUICK SCORE ENTRY STABLEFORD CALCULATION

**File:** `public/index.html`
**Function:** `QuickScoreEntryManager.calculateStablefordPoints()` (lines 67816-67878)

**Logic:**
```javascript
calculateStablefordPoints(score, par, playerHcp, holeHcp) {
    const grossScore = parseInt(score);
    const holePar = parseInt(par) || 4;
    const holeHandicap = parseInt(holeHcp) || 1;
    const playerHandicap = parseFloat(playerHcp) || 0;

    // Calculate shots received on this hole
    let shotsReceived = 0;
    if (playerHandicap >= holeHandicap) {
        shotsReceived = 1;
        if (playerHandicap >= 18 + holeHandicap) {
            shotsReceived = 2;
        }
    }

    // Net score
    const netScore = grossScore - shotsReceived;

    // Stableford points
    const diff = holePar - netScore;
    if (diff >= 3) return 5;      // Albatross or better
    if (diff === 2) return 4;     // Eagle
    if (diff === 1) return 3;     // Birdie
    if (diff === 0) return 2;     // Par
    if (diff === -1) return 1;    // Bogey
    return 0;                      // Double bogey or worse
}
```

---

## Score Saving Flow

### When a score is entered:

**File:** `public/index.html`
**Function:** `LiveScorecardManager.saveHoleScore()` (lines 45186-45225)

1. Get shot allocation from `GolfScoringEngine.allocHandicapShots()`
2. Calculate net score: `netScore = grossScore - shotsReceived`
3. Calculate stableford: `stablefordPoints = Math.max(0, (par - netScore) + 2)`
4. Upsert to `scores` table:
```javascript
const { data } = await window.SupabaseDB.client
    .from('scores')
    .upsert([{
        scorecard_id: scorecardId,
        hole_number: holeNum,
        gross_score: grossScore,
        net_score: netScore,
        stableford_points: stablefordPoints,
        handicap_strokes: shotsReceived
    }]);
```

5. Update scorecard totals:
```javascript
const totalGross = scores.reduce((sum, s) => sum + (s.gross_score || 0), 0);
const totalNet = scores.reduce((sum, s) => sum + (s.net_score || 0), 0);
const totalStableford = scores.reduce((sum, s) => sum + (s.stableford_points || 0), 0);

await window.SupabaseDB.client
    .from('scorecards')
    .update({
        total_gross: totalGross,
        total_net: totalNet
        // NOTE: total_stableford NOT stored in scorecards table
    })
    .eq('id', scorecardId);
```

---

## Critical Consistency Rules

### 1. Stableford Must Always Be Calculated From `scores` Table
Never read stableford from `scorecards` table - it doesn't exist there. Always:
```javascript
const totalStableford = scores.reduce((sum, s) => sum + (s.stableford_points || 0), 0);
```

### 2. Always Join `scores(*)` When Fetching Scorecards for Leaderboards
```javascript
.select('id, player_id, total_gross, total_net, created_at, scores(*)')
```

### 3. Sorting Rules Are Format-Dependent
- **Stableford:** Higher is better (descending sort)
- **Stroke/Net:** Lower is better (ascending sort)

### 4. Handicap Shot Allocation Uses Stroke Index
Holes with lower stroke index receive handicap shots first. A 18-handicapper gets 1 shot per hole. A 36-handicapper gets 2 shots per hole.

### 5. Net Score Calculation
```javascript
netScore = grossScore - shotsReceived
```
Where `shotsReceived` comes from `allocHandicapShots()` based on player handicap and hole stroke index.

---

## Files Reference

| File | Purpose |
|------|---------|
| `public/index.html` | Main app - SocietyGolfDB, LiveScorecardSystem, GolfScoringEngine |
| `public/time-windowed-leaderboards.js` | Daily/Weekly/Monthly/Yearly standings |
| `public/hole-by-hole-leaderboard-enhancement.js` | Hole-by-hole display view |
| `public/live-scorecard-enhancements.js` | Visual indicators (birdie/eagle/bogey circles) |
| `public/fix-multi-format-scorecard.js` | Multi-format score display fixes |

---

## Known Issues Fixed

1. **Wrong column names** - `total_score` and `stableford_points` don't exist in `scorecards` table. Use `total_gross`, `total_net`, and calculate stableford from `scores` table.

2. **Averaging bug** - Time-windowed leaderboard was averaging scores incorrectly. Now shows actual scores for single rounds, averages for multiple rounds.

3. **Leaderboard reset** - Added `LEADERBOARD_START_DATE = '2025-12-12'` to start fresh and ignore historical data.

---

## Testing Checklist

- [ ] Live leaderboard shows correct gross, net, stableford
- [ ] Time-windowed leaderboard matches live leaderboard scores
- [ ] Hole-by-hole view shows correct per-hole scores
- [ ] Stableford points calculated correctly with handicap
- [ ] Rankings sort correctly (higher stableford = better position)
- [ ] Ties display correctly (T1, T2, etc.)
