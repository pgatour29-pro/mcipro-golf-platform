# Session Fixes - December 9, 2025
**Summary:** Fixed society profile editing, admin user count, live leaderboard archive/format, timezone issues, and plus handicap calculation bug

---

## Issues Fixed

### 1. Society Organizer Profile Edit 400 Error
**Problem:** Society organizers couldn't edit player handicaps - getting 400 error from Supabase

**Root Cause:** The `saveUserProfile()` function was receiving the entire existing profile including database metadata fields, causing the upsert to fail.

**Fix:** Changed to direct Supabase upsert with minimal fields:
```javascript
const { data, error } = await window.SupabaseDB.client
    .from('user_profiles')
    .upsert({
        line_user_id: golferId,
        name: name,
        profile_data: updatedProfileData
    }, { onConflict: 'line_user_id' })
    .select();
```

**Location:** `public/index.html` ~line 51291

---

### 2. Admin User Count Capped at 1000
**Problem:** Admin dashboard showed max 1000 users even when database had more

**Root Cause:** Supabase has a default max of 1000 rows per query. Setting `.limit(10000)` doesn't override this.

**Fix:**
- Get exact count using `{ count: 'exact', head: true }`
- Fetch users in batches using `.range()` pagination
- Display total with `toLocaleString()` for proper formatting

**Location:** `public/index.html` AdminSystem.loadData() ~line 37130

---

### 3. Live Leaderboard Event History & Archive
**Problem:** No way to view past event leaderboards after competition day ended

**New Features:**
- Two-column layout: main leaderboard (left/center) + event history sidebar (right)
- Events automatically archived after their date passes
- Right sidebar shows last 30 days of events grouped by date
- Click any event/pool to view its leaderboard
- LIVE badge for today's events, ARCHIVED badge for past events
- Auto-refresh only runs when viewing live events (not archived)
- Mobile responsive design

**Location:** `public/live.html` - complete rewrite

---

### 4. Live Leaderboard Timezone Bug
**Problem:** Events showed as "live" for yesterday's date (December 8th instead of 9th)

**Root Cause:** `toISOString()` returns UTC time, not local time. Thailand is UTC+7.

**Fix:** Use local date components:
```javascript
function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
```

**Location:** `public/live.html` getToday() function

---

### 5. Live Leaderboard Scoring Format
**Problem:** Leaderboard always used Stableford sorting regardless of event settings

**Fix:**
- Fetch `format` field from `society_events` table
- Stroke Play: sort by lowest gross, display "Gross" column
- Stableford: sort by highest points, display "Pts" column
- Show format label in event header

**Location:** `public/live.html` - getEventLeaderboard(), renderEventCard(), renderLeaderboardTable()

---

### 6. Plus Handicap Calculation Bug (CRITICAL)
**Problem:** Rocky Jones (+2.1 handicap) was receiving strokes instead of losing them

**Example:**
- Hole 18 at Bangpakong: Par 5, SI 2
- Rocky scored gross 5 (par)
- Was getting 3 points (net birdie) - WRONG
- Should get 2 points (net par) - CORRECT

**Root Cause:** JavaScript `parseFloat("+2.1")` returns `2.1` (positive), but golf "+2.1" means the player should LOSE strokes.

**Fix:** Convert plus handicap string to negative number:
```javascript
let numericHandicap = handicap;
if (typeof handicap === 'string') {
    if (handicap.startsWith('+')) {
        // Plus handicap: "+2.1" should become -2.1
        numericHandicap = -parseFloat(handicap.substring(1));
    } else {
        numericHandicap = parseFloat(handicap);
    }
}
const playingHandicap = Math.round(numericHandicap);
```

**Functions Fixed:**
- `SocietyGolfDB.saveScore()` ~line 40290
- `LiveScorecardSystem.getHandicapStrokesOnHole()` ~line 43456

**Plus Handicap Logic:**
- +2.1 rounds to -2 playing handicap
- Loses 1 stroke on SI 17 (easiest hole)
- Loses 1 stroke on SI 18 (second easiest hole)
- Net score = gross + 1 on those holes
- Making par on SI 17/18 = net bogey = 1 point (not 2)

---

## SQL Fix for Rocky Jones

Run this to correct his existing scores:

```sql
-- Fix Rocky Jones (+2.1 handicap) scores
-- He should LOSE 1 stroke on SI 17 and SI 18 (easiest holes)

-- Step 1: Update handicap_strokes and net_score
UPDATE scores s
SET
    handicap_strokes = CASE
        WHEN s.stroke_index >= 17 THEN -1
        ELSE 0
    END,
    net_score = s.gross_score - CASE
        WHEN s.stroke_index >= 17 THEN -1
        ELSE 0
    END
WHERE s.scorecard_id IN (
    SELECT sc.id FROM scorecards sc
    WHERE sc.player_id = 'U044fd835263fc6c0c596cf1d6c2414af'
);

-- Step 2: Recalculate stableford points
UPDATE scores s
SET stableford_points = CASE
    WHEN (s.net_score - s.par) <= -2 THEN 4
    WHEN (s.net_score - s.par) = -1 THEN 3
    WHEN (s.net_score - s.par) = 0 THEN 2
    WHEN (s.net_score - s.par) = 1 THEN 1
    ELSE 0
END
WHERE s.scorecard_id IN (
    SELECT sc.id FROM scorecards sc
    WHERE sc.player_id = 'U044fd835263fc6c0c596cf1d6c2414af'
);
```

---

## Commits Made

1. `xxxxxxxx` - Fix society organizer profile edit - use direct upsert instead of saveUserProfile
2. `xxxxxxxx` - Fix Admin user count - fetch all users beyond Supabase 1000 row limit
3. `c3a9297c` - Add event history sidebar and archive view to Live Leaderboard
4. `9add17e2` - Fix live leaderboard timezone - use local date instead of UTC
5. `1c3db5f9` - Live leaderboard now respects event scoring format
6. `db441cd3` - Fix plus handicap calculation - +X was being treated as positive instead of negative

---

## Files Modified

- `public/index.html` - Society profile edit, Admin user count, Plus handicap fix
- `public/live.html` - Complete rewrite with archive, timezone, and format support

---

## Key Technical Notes

### Handicap Stroke Allocation
- **Regular handicaps (0-54):** RECEIVE strokes on LOWEST SI holes (hardest)
- **Plus handicaps (+1 to +5):** LOSE strokes on HIGHEST SI holes (easiest)

### Stroke Index
- SI 1 = Hardest hole
- SI 18 = Easiest hole

### Stableford Points (based on NET score)
- Net Eagle or better: 4 points
- Net Birdie: 3 points
- Net Par: 2 points
- Net Bogey: 1 point
- Net Double bogey+: 0 points

---

## Testing Checklist

- [x] Society organizer can edit player handicaps
- [x] Admin user count shows correct total (>1000)
- [x] Live leaderboard shows correct date (local timezone)
- [x] Event history sidebar shows past events
- [x] Clicking archived event shows its leaderboard
- [x] Stroke play events sort by lowest gross
- [x] Stableford events sort by highest points
- [x] Plus handicaps lose strokes on SI 17/18
- [x] Rocky Jones scores corrected after SQL fix

---

## Deployment

All changes deployed to www.mycaddipro.com via Vercel.
