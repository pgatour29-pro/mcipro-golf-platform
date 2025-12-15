# Session Catalog: Stableford Scoring Fix - Live Scorecard vs Spectate Live

**Date:** December 15, 2025

---

## Summary

Fixed critical bug where Live Scorecard and Spectate Live Leaderboard showed different stableford points for the same round. The root cause was two different handicap stroke allocation algorithms being used.

---

## 1. The Problem

**User Report:** "Live Scorecard and Spectate Live scores are not matching - gross scores correct but stableford is wrong"

**Symptoms:**
- Live Scorecard (in-app) showed different stableford points than Spectate Live (live.html)
- Round History showed correct stableford (matching what was saved)
- The discrepancy was confusing for spectators watching live events

---

## 2. Root Cause Analysis

### Two Different Stableford Calculations

**Live Scorecard (real-time display):** Used `GolfScoringEngine.allocHandicapShots()` which correctly allocates strokes across all 18 holes based on stroke index.

**Database Save (`saveScore()`):** Used a BUGGY algorithm with incorrect "combined nines" detection:

```javascript
// OLD BUGGY CODE (line 41881)
const isCombinedNines = strokeIndex <= 9; // WRONG!
```

This incorrectly assumed any hole with stroke index 1-9 was on a "combined nine" course, causing it to use `halfHandicap / 9` allocation for those holes while using `fullHandicap / 18` for holes with SI 10-18.

### Example of the Bug

For a player with handicap 11 on hole with SI=4:
- **Buggy algorithm:** `halfHandicap = 6`, `fullStrokes = 0`, `remaining = 6`, SI 4 <= 6, so `strokesReceived = 1`
- **Correct algorithm:** `fullStrokes = 0`, `remaining = 11`, SI 4 <= 11, so `strokesReceived = 1`

The bug caused inconsistent stroke allocation especially on holes with SI near the boundary.

---

## 3. Fixes Applied

### Fix 1: Corrected `saveScore()` Algorithm

**File:** `public/index.html` (lines 41879-41894)

**Before (buggy):**
```javascript
const isCombinedNines = strokeIndex <= 9;
let strokesReceived;
if (isCombinedNines) {
    const halfHandicap = Math.round(Math.abs(playingHandicap) / 2);
    const fullStrokes = Math.floor(halfHandicap / 9);
    const remainingStrokes = halfHandicap % 9;
    strokesReceived = fullStrokes + (strokeIndex <= remainingStrokes ? 1 : 0);
} else {
    const fullStrokes = Math.floor(Math.abs(playingHandicap) / 18);
    const remainingStrokes = Math.abs(playingHandicap) % 18;
    strokesReceived = fullStrokes + (strokeIndex <= remainingStrokes ? 1 : 0);
}
```

**After (fixed):**
```javascript
// HANDICAP STROKE ALLOCATION
// Uses the same algorithm as GolfScoringEngine.allocHandicapShots() for consistency
// Full 18-hole course: SI 1-18, allocate full handicap across all holes
const fullStrokes = Math.floor(Math.abs(playingHandicap) / 18);
const remainingStrokes = Math.abs(playingHandicap) % 18;

let strokesReceived;
if (playingHandicap >= 0) {
    // Regular handicap: receive strokes on hardest holes (lowest SI first)
    strokesReceived = fullStrokes + (strokeIndex <= remainingStrokes ? 1 : 0);
} else {
    // Plus handicap: give strokes on easiest holes (highest SI first)
    strokesReceived = -(fullStrokes + (strokeIndex > (18 - remainingStrokes) ? 1 : 0));
}
```

### Fix 2: Always Calculate Stableford for Leaderboards

**File:** `public/index.html` (lines 49720-49732)

Added code to ALWAYS calculate stableford in `getGroupLeaderboard()`, regardless of selected scoring format:

```javascript
// ALWAYS calculate stableford for leaderboard display (regardless of selected format)
// This ensures Event Leaderboard always has stableford points
if (this.courseData && this.courseData.holes) {
    const handicapForStableford = this.scoringFormats.includes('scramble')
        ? this.calculateTeamHandicap()
        : player.handicap;
    totalStableford = engine.calculateStablefordTotal(
        scoresArray,
        this.courseData.holes,
        handicapForStableford,
        true // useNet
    );
}
```

### Fix 3: Updated Event Leaderboard Display

**File:** `public/index.html` (lines 50703-50740)

Updated `renderEventLeaderboard()` to show Gross, Net, and Stableford columns (matching Group Leaderboard):

```javascript
renderEventLeaderboard(leaderboard) {
    // Now shows: Pos | Player | Thru | Gross | Net | Pts
    // Previously only showed: Pos | Player | Thru | Total (net only)
}
```

### Fix 4: Historical Data Correction Script

Created console script to fix all existing scores in database:

```javascript
(async function() {
    // Processes all scorecards with 1-second pause every 50 to avoid rate limits
    // Recalculates: stableford_points, handicap_strokes, net_score
    // Uses correct algorithm: fullStrokes + (SI <= remainingStrokes ? 1 : 0)
})();
```

**Today's round fix results:**
- Found 3 scorecards from today (Bangpakong)
- Updated 7 scores with incorrect stableford
- Players affected: Tristan (holes 4,9,16), Alan (holes 4,9,16), Pete (hole 5)

---

## 4. Algorithm Verification

Both algorithms now produce identical results:

### `allocHandicapShots()` (Live Display)
```javascript
const holesSorted = [...courseHoles].sort((a, b) => siA - siB);
let remaining = Math.round(handicapValue);
while (remaining > 0) {
    for (const h of holesSorted) {
        if (remaining <= 0) break;
        shots[holeNum] = (shots[holeNum] || 0) + 1;
        remaining--;
    }
}
```

### `saveScore()` (Database Save)
```javascript
const fullStrokes = Math.floor(Math.abs(playingHandicap) / 18);
const remainingStrokes = Math.abs(playingHandicap) % 18;
strokesReceived = fullStrokes + (strokeIndex <= remainingStrokes ? 1 : 0);
```

**Mathematical equivalence for handicap 25:**
- `fullStrokes = 1`, `remainingStrokes = 7`
- SI 1-7: `1 + 1 = 2` shots each
- SI 8-18: `1 + 0 = 1` shot each
- Total: 7×2 + 11×1 = 25 ✓

---

## 5. Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Fixed `saveScore()` handicap allocation (lines 41879-41894) |
| `public/index.html` | Always calculate stableford in `getGroupLeaderboard()` (lines 49720-49732) |
| `public/index.html` | Updated `renderEventLeaderboard()` display (lines 50703-50740) |
| `sql/FIX_STABLEFORD_POINTS.sql` | SQL script for batch recalculation (not used - console script preferred) |

---

## 6. Data Flow - How Scores Are Stored and Displayed

```
LIVE SCORECARD (in-app)
├── User enters gross score
├── saveScore() called
│   ├── Calculates: handicap_strokes, net_score, stableford_points
│   └── Saves to 'scores' table in Supabase
├── Live display uses GolfScoringEngine.calculateStablefordTotal()
│   └── Reads from this.scoresCache (local)
└── Both should now match!

SPECTATE LIVE (live.html)
├── Queries 'scorecards' table with 'scores' join
├── Sums stableford_points from scores table
└── Displays in leaderboard
    └── Now matches Live Scorecard!

ROUND HISTORY
├── Queries 'rounds' table (total_stableford)
├── OR queries 'scores' and sums stableford_points
└── Shows historical data
```

---

## 7. Testing Checklist

- [x] Live Scorecard shows correct stableford during scoring
- [x] Event Leaderboard (This Event tab) shows correct stableford
- [x] Spectate Live (live.html) shows correct stableford
- [x] New scores saved with correct stableford_points
- [x] Today's round (Bangpakong Dec 15) - 7 scores corrected
- [ ] Historical rounds - need to run batch fix script

---

## 8. Historical Data Fix Script

Run this in browser console at mycaddipro.com to fix all historical scores:

```javascript
(async function() {
    console.log('Fixing ALL historical stableford scores...');

    const { data: scorecards, error: scError } = await window.SupabaseDB.client
        .from('scorecards')
        .select('id, handicap, playing_handicap, player_name');

    if (scError) { console.error('Error:', scError); return; }
    console.log(`Found ${scorecards.length} scorecards to process`);

    let totalUpdated = 0;
    let processed = 0;

    for (const scorecard of scorecards) {
        processed++;
        if (processed % 50 === 0) {
            console.log(`Progress: ${processed}/${scorecards.length} scorecards...`);
            await new Promise(r => setTimeout(r, 1000)); // 1 sec pause every 50
        }

        const handicap = scorecard.playing_handicap ?? scorecard.handicap ?? 0;
        const { data: scores, error } = await window.SupabaseDB.client
            .from('scores').select('*').eq('scorecard_id', scorecard.id);

        if (error || !scores) continue;

        for (const score of scores) {
            if (!score.gross_score || !score.par || !score.stroke_index) continue;

            const playingHandicap = Math.round(parseFloat(handicap) || 0);
            const fullStrokes = Math.floor(Math.abs(playingHandicap) / 18);
            const remainingStrokes = Math.abs(playingHandicap) % 18;

            let strokesReceived = playingHandicap >= 0
                ? fullStrokes + (score.stroke_index <= remainingStrokes ? 1 : 0)
                : -(fullStrokes + (score.stroke_index > (18 - remainingStrokes) ? 1 : 0));

            const netScore = score.gross_score - strokesReceived;
            const scoreToPar = netScore - score.par;

            let stablefordPoints = 0;
            if (scoreToPar <= -2) stablefordPoints = 4;
            else if (scoreToPar === -1) stablefordPoints = 3;
            else if (scoreToPar === 0) stablefordPoints = 2;
            else if (scoreToPar === 1) stablefordPoints = 1;

            if (score.stableford_points !== stablefordPoints) {
                await window.SupabaseDB.client.from('scores').update({
                    stableford_points: stablefordPoints,
                    handicap_strokes: strokesReceived,
                    net_score: netScore
                }).eq('scorecard_id', scorecard.id).eq('hole_number', score.hole_number);
                totalUpdated++;
            }
        }
    }
    console.log(`✅ DONE! Fixed ${totalUpdated} scores across ${scorecards.length} scorecards`);
})();
```

---

## 9. Key Lessons Learned

1. **Algorithm Consistency is Critical** - When the same calculation is done in multiple places (save vs display), they MUST use identical logic.

2. **Don't Assume Course Structure** - The "combined nines" detection was completely wrong. SI 1-9 doesn't mean it's a combined nine course.

3. **Test with Real Data** - The bug only manifested on certain holes with specific stroke indices.

4. **Database vs Real-time** - Spectate Live reads from DB, Live Scorecard calculates fresh. Both must agree.

---

## 10. Status

| Item | Status |
|------|--------|
| `saveScore()` algorithm | ✅ FIXED |
| Live Scorecard display | ✅ FIXED |
| Event Leaderboard display | ✅ FIXED |
| Spectate Live (live.html) | ✅ FIXED (reads from corrected DB) |
| Today's scores | ✅ FIXED (7 scores corrected) |
| Historical scores | ⏳ Pending (run batch script) |
| Deployed to production | ✅ YES |
