# Live Leaderboard & Spectator Page Session
**Date:** 2025-12-08
**Session Summary:** Created public spectator page, fixed scoring issues, fixed round history

---

## Features Implemented

### 1. Public Spectator Page (`/live.html`)
**Purpose:** Allow non-participants to watch live leaderboards remotely without login

**Features:**
- No authentication required - anyone can view
- Auto-refreshes every 5 seconds for near real-time updates
- Shows all active events and public pools from today
- Displays Stableford and Nassau leaderboards with winner highlighting
- Mobile responsive design
- Red pulsing "LIVE" indicator

**URL:** `https://www.mycaddipro.com/live.html`

**Navigation:** Added "Spectate Live" tab to golfer menu (desktop nav + mobile drawer)

---

## Issues Fixed

### 1. Wrong Supabase Credentials in live.html
**Problem:** live.html had wrong Supabase URL and anon key (from different project)

**Fix:** Updated to correct credentials:
```javascript
const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 2. Wrong Column Names in society_events Query
**Problem:** Query used `event_name` but column is `title`

**Fix:**
```javascript
// BEFORE
.select('id, event_name, event_date, course_name, society_id, societies (name)')

// AFTER
.select('id, title, event_date, course_name, organizer_name')
```

### 3. Multiple Scorecards Causing Double-Counting
**Problem:** Players with multiple scorecards from today (restarted rounds) had scores summed together

**Fix:** Use scorecard with MOST HOLES per player (the active round):
```javascript
// Use scorecard with MOST HOLES per player (the active round, not abandoned ones)
const bestScorecardByPlayer = {};
for (const sc of scorecards) {
    const holesCount = (sc.scores || []).length;
    if (!bestScorecardByPlayer[sc.player_id] ||
        holesCount > (bestScorecardByPlayer[sc.player_id].scores || []).length) {
        bestScorecardByPlayer[sc.player_id] = sc;
    }
}
```

### 4. Round History Not Showing Scores (0 totals)
**Problem:** `rounds` table had `total_gross=0` and `total_stableford=0` because `saveRoundToHistory()` read from empty in-memory cache instead of database

**Location:** `public/index.html` lines ~44108-44144

**Fix:** Read scores from database instead of cache:
```javascript
// FIX: Read scores from DATABASE instead of unreliable in-memory cache
const scoresArray = [];
if (scorecardId) {
    const { data: dbScores, error: scoresError } = await window.SupabaseDB.client
        .from('scores')
        .select('hole_number, gross_score, stableford_points')
        .eq('scorecard_id', scorecardId)
        .order('hole_number');

    if (!scoresError && dbScores && dbScores.length > 0) {
        for (const s of dbScores) {
            totalGross += s.gross_score || 0;
            totalStableford += s.stableford_points || 0;
            scoresArray.push({ hole_number: s.hole_number, gross_score: s.gross_score });
        }
    }
}
```

### 5. Plus Handicap Not Deducting Strokes
**Problem:** Players with plus handicaps (e.g., +2.1) weren't losing strokes on high SI holes

**Example:** Rocky Jones (+2.1) should lose strokes on SI 17 and SI 18 holes, but got full points

**SQL Fix for affected player:**
```sql
-- Fix handicap_strokes for plus handicap (loses strokes on SI 17 & 18)
UPDATE scores s
SET
    handicap_strokes = CASE WHEN s.stroke_index >= 17 THEN -1 ELSE 0 END,
    net_score = s.gross_score - (CASE WHEN s.stroke_index >= 17 THEN -1 ELSE 0 END)
WHERE s.scorecard_id IN (
    SELECT sc.id FROM scorecards sc
    JOIN user_profiles up ON up.line_user_id = sc.player_id
    WHERE sc.created_at >= CURRENT_DATE AND up.name = 'Rocky Jones'
);

-- Recalculate stableford
UPDATE scores s
SET stableford_points = CASE
    WHEN (s.net_score - s.par) <= -2 THEN 4
    WHEN (s.net_score - s.par) = -1 THEN 3
    WHEN (s.net_score - s.par) = 0 THEN 2
    WHEN (s.net_score - s.par) = 1 THEN 1
    ELSE 0
END
WHERE s.scorecard_id IN (...);
```

---

## Database Architecture Notes

### Two Different Data Sources:
1. **`scorecards` + `scores` tables** - Used by Live Scorecard and Live Leaderboard
2. **`rounds` table** - Used by Round History

When a round completes, `saveRoundToHistory()` should copy totals from `scores` to `rounds`.

### Key Tables:
- `scorecards` - One per player per round, links to scores
- `scores` - Individual hole scores with stableford_points
- `rounds` - Summary records for round history display
- `side_game_pools` - Public game pools for live games
- `pool_entrants` - Players in each pool

---

## Files Modified

- `public/live.html` - NEW: Public spectator leaderboard page
- `public/index.html` - Added Spectate Live nav tab, fixed saveRoundToHistory

---

## Commits Made

1. `4d87bdca` - Add public spectator leaderboard page at /live.html
2. `c60528d8` - Change spectator page refresh to 5 seconds for near real-time updates
3. `ac04f7ef` - Add Spectate Live tab to golfer navigation menu
4. `70f4d26c` - Fix live.html - use correct Supabase credentials
5. `e3281ded` - Fix live.html - use correct society_events column names
6. `94ae6a64` - Fix live leaderboard - only use most recent scorecard per player
7. `ece023ea` - Debug live leaderboard - log scorecard selection
8. `8f1f3e8d` - Fix round history - read scores from DB instead of unreliable in-memory cache

---

## Known Issues / Future Work

1. **Plus handicap stroke allocation** - May need code review to ensure plus handicaps correctly lose strokes on highest SI holes during score entry (not just SQL fix after the fact)

2. **Stableford calculation timing** - Stableford points are calculated when scores are entered. If handicap is wrong at entry time, points will be wrong.

3. **Round totals sync** - The `rounds` table totals should ideally be kept in sync with `scores` table via database trigger

---

## Testing Checklist

- [x] Live leaderboard page loads without login
- [x] Auto-refresh works (5 second interval)
- [x] Correct player scores display
- [x] Nassau format shows F9/B9/Total correctly
- [x] Only uses one scorecard per player (most holes)
- [x] Spectate Live tab visible in navigation
- [x] Round history shows correct totals (after DB read fix)

---

## Deployment

All changes deployed to www.mycaddipro.com via Vercel.
