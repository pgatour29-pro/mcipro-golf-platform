# Session Summary: December 21, 2025

## Overview
Fixed critical scoring data flow issues, first hole save bug, game point defaults, and Team Match Play with Nassau display.

---

## 1. Live Scorecard → Spectate Live Data Flow (CRITICAL)

### Problem
OrganizerScoringSystem (Spectate Live) was only querying the `rounds` table, but Live Scorecard saves to `scorecards` + `scores` tables. Result: **Spectators saw NOTHING until rounds were completed**.

### Root Cause
- Live Scorecard saves to: `scorecards` table (metadata) + `scores` table (hole-by-hole)
- OrganizerScoring reads from: `rounds` table (archived history only)
- Data only transfers when round is COMPLETED via `saveRoundToHistoryNew()` → `archive_scorecard_to_history` RPC

### Solution
Modified `refreshScores()` in OrganizerScoringSystem to query scorecards for in-progress events:

```javascript
async refreshScores() {
    // Get current event status to decide data source
    const currentEvent = this.allEvents.find(e => e.id === this.currentEventId);
    const eventStatus = currentEvent?.status;

    let leaderboardData = [];

    // FIX: For in-progress events, query SCORECARDS for LIVE data
    if (eventStatus !== 'completed') {
        console.log('[OrganizerScoring] 🔴 LIVE EVENT - Querying scorecards for real-time data');

        const { data: scorecards, error: scError } = await window.SupabaseDB.client
            .from('scorecards')
            .select(`*, scores (*)`)
            .eq('event_id', this.currentEventId);

        if (!scError && scorecards && scorecards.length > 0) {
            leaderboardData = this.transformScorecardsToLeaderboard(scorecards);
        }
    }

    // Also fetch archived rounds (for completed rounds or as fallback)
    const { data: rounds, error } = await window.SupabaseDB.client
        .from('rounds')
        .select('*')
        .eq('society_event_id', this.currentEventId);

    // Merge, preferring live scorecards over archived rounds
    // ...
}
```

Added new helper function:
```javascript
transformScorecardsToLeaderboard(scorecards) {
    return scorecards.map(card => {
        let totalGross = 0, totalStableford = 0, holesPlayed = 0;

        if (card.scores && card.scores.length > 0) {
            for (const score of card.scores) {
                if (score.gross_score) { totalGross += score.gross_score; holesPlayed++; }
                if (score.stableford_points !== undefined) { totalStableford += score.stableford_points; }
            }
        }

        return {
            id: card.id,
            golfer_id: card.player_id,
            player_name: card.player_name,
            handicap_used: card.handicap || 0,
            total_gross: holesPlayed > 0 ? totalGross : null,
            total_stableford: totalStableford,
            holes_played: holesPlayed,
            status: card.status || 'in_progress',
            is_live: true,  // Mark for UI indication
            scores: (card.scores || []).sort((a, b) => a.hole_number - b.hole_number)
        };
    });
}
```

### UI Enhancement
Updated `renderSingleLeaderboard()` to show live status:
```javascript
if (round.is_live) {
    const holesPlayed = round.holes_played || 0;
    status = `<span class="text-red-600 font-medium">🔴 Live (${holesPlayed}/18)</span>`;
}
```

### Files Modified
- `public/index.html` - Lines 71947-72065

---

## 2. First Hole Score Not Recording

### Problem
When entering the first hole score, scores weren't being saved to the database. The code crashed silently because `scorecardId.startsWith('local_')` was called without checking if `scorecardId` existed.

### Root Cause
In `saveCurrentScore()`:
```javascript
// BUG: No validation that scorecardId exists
const scorecardId = this.scorecards[this.currentPlayerId];
// ...later...
if (scorecardId.startsWith('local_')) {  // CRASH if scorecardId is undefined!
```

### Solution
Added validation and error handling:

```javascript
// FIX: Validate scorecardId exists before saving
if (!scorecardId) {
    console.error(`[LiveScorecard] ❌ NO SCORECARD ID for player ${player?.name || this.currentPlayerId}!`);
    console.error('[LiveScorecard] this.scorecards:', this.scorecards);
    NotificationManager.show('Error: Scorecard not found. Please restart the round.', 'error');
    // Still save to cache so UI works, but warn user
}

// Added detailed logging
console.log(`[LiveScorecard] 📝 Saving score: Player=${player?.name}, Hole=${this.currentHole}, Score=${score}, ScorecardID=${scorecardId || 'MISSING!'}`);

// FIX: Check scorecardId exists before trying to save
if (!scorecardId) {
    console.warn('[LiveScorecard] ⚠️ Score saved to cache only (no scorecard ID)');
    return; // Exit early - score is in cache for UI but not saved to DB
}
```

Also added validation after scorecard creation in `startRound()`:
```javascript
// FIX: Validate all players have scorecard IDs
const missingScorecardsPlayers = this.players.filter(p => !this.scorecards[p.id]);
if (missingScorecardsPlayers.length > 0) {
    console.error('[LiveScorecard] ❌ Some players missing scorecard IDs after creation:',
        missingScorecardsPlayers.map(p => ({ name: p.name, id: p.id })));
}
```

### Files Modified
- `public/index.html` - Lines 46997-47062, 46553-46562

---

## 3. Game Points Default to Zero

### Problem
All game point values defaulted to 100/200, requiring manual changes every round. Users often forgot to change values.

### Solution
Changed all defaults from 100/200 to 0:

#### HTML Input Changes
| Input | Before | After |
|-------|--------|-------|
| stablefordPoints | value="100" | value="0" |
| strokePlayPoints | value="100" | value="0" |
| skinsValueInput | (no default) | value="0" |
| nassauFront9Points | value="100" | value="0" |
| nassauBack9Points | value="100" | value="0" |
| nassauTotalPoints | value="200" | value="0" |
| matchPlayPoints | value="100" | value="0" |

Also changed `min="1"` to `min="0"` for all inputs.

#### JavaScript Fallback Changes
All fallback values changed from `|| '100'` / `|| 100` to `|| '0'` / `|| 0`:
```javascript
// Before
front9: parseInt(document.getElementById('nassauFront9Points')?.value || '100'),
perHole: parseInt(document.getElementById('skinsValueInput')?.value || '100')

// After
front9: parseInt(document.getElementById('nassauFront9Points')?.value || '0'),
perHole: parseInt(document.getElementById('skinsValueInput')?.value || '0')
```

### Files Modified
- `public/index.html` - Multiple locations (40 insertions, 40 deletions)

---

## 4. Team Match Play with Nassau Display

### Problem
When 2-man Team Match Play was selected with Nassau format:
- Only showed overall "X UP/DOWN" status
- No visibility into Front 9 or Back 9 match results separately
- Back 9 appeared to not track correctly (it was tracked, just not displayed)

### Root Cause
The **calculation was correct** - `calculateTeamMatchPlay()` properly tracks:
- `front9`: holes won/lost on holes 1-9
- `back9`: holes won/lost on holes 10-18
- `overall`: running total for all 18 holes

The **display was incomplete** - `renderTeamMatchPlayLeaderboard()` only showed the overall status.

### Solution
Modified `renderTeamMatchPlayLeaderboard()` to detect Nassau mode and show all 3 matches:

```javascript
// Check if Nassau format is also selected
const isNassauMode = this.scoringFormats && this.scoringFormats.includes('nassau');

// Helper to format match status
const formatMatchStatus = (holes) => {
    if (holes > 0) return `<span class="text-green-700 font-bold">${holes} UP</span>`;
    if (holes < 0) return `<span class="text-red-700 font-bold">${Math.abs(holes)} DN</span>`;
    return '<span class="text-gray-600">AS</span>';
};
```

Added Nassau Match Summary box when both formats selected:
```html
<!-- Nassau Team Match Summary -->
<div class="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-300">
    <div class="font-bold text-gray-900 mb-3 text-center">🏆 Nassau Match Status</div>
    <div class="grid grid-cols-3 gap-3 text-center">
        <div class="p-3 bg-blue-100 rounded-lg">
            <div class="text-xs text-gray-600 mb-1">Front 9</div>
            <div class="text-lg font-bold">Team A: 2 UP</div>
        </div>
        <div class="p-3 bg-green-100 rounded-lg">
            <div class="text-xs text-gray-600 mb-1">Back 9</div>
            <div class="text-lg font-bold">Team B: 1 UP</div>
        </div>
        <div class="p-3 bg-yellow-100 rounded-lg">
            <div class="text-xs text-gray-600 mb-1">Overall 18</div>
            <div class="text-lg font-bold">Team A: 1 UP</div>
        </div>
    </div>
</div>
```

Changed table columns for Nassau mode:
```javascript
${isNassauMode && isTeamMode ? `
    <th class="py-2 px-2 text-center bg-blue-50">Front 9</th>
    <th class="py-2 px-2 text-center bg-green-50">Back 9</th>
    <th class="py-2 px-2 text-center bg-yellow-50 font-bold">Overall</th>
` : `
    <th class="py-2 px-2 text-center bg-green-50">Won</th>
    <th class="py-2 px-2 text-center bg-red-50">Lost</th>
    <th class="py-2 px-2 text-center bg-gray-50 font-bold">Status</th>
`}
```

### Files Modified
- `public/index.html` - Lines 51447-51592 (90 insertions, 23 deletions)

---

## Git Commits

```
5d0daf61 fix: Team Match Play with Nassau now shows Front 9, Back 9, Overall separately
0dde973c fix: Zero out all game point values by default
2033bf29 fix: Live scoring now visible in Spectate Live + first hole save fix
```

---

## Testing Checklist

### Live Scorecard → Spectate Live
- [ ] Start a round with Live Scorecard on a society event
- [ ] Have someone view OrganizerScoring (Spectate Live)
- [ ] They should see scores update with "🔴 Live (X/18)" status
- [ ] Scores should appear in real-time, not just after round completion

### First Hole Saving
- [ ] Check browser console for `[LiveScorecard] 📝 Saving score:` messages
- [ ] If scorecard ID is missing, error notification should appear
- [ ] All holes should save successfully

### Game Points
- [ ] All point inputs should default to 0
- [ ] Users must manually set values for each game

### Team Match Play + Nassau
- [ ] Select both "Match Play" and "Nassau" formats
- [ ] Configure 2-man teams
- [ ] Start round and enter scores
- [ ] Leaderboard should show "Team Match Play (Nassau)" header
- [ ] Yellow summary box shows Front 9, Back 9, Overall status
- [ ] Table shows separate columns for each Nassau segment
- [ ] Back 9 tracks independently from Front 9
