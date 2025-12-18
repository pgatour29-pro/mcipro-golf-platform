# Standings & Leaderboard Fix - December 18, 2025

## Summary
Fixed the Leaderboard and My Standings pages to properly query and display player statistics from the `event_results` table.

---

## Problem
1. Leaderboard and My Standings were not showing all events/players
2. Code was querying `society_events` first, then matching to `event_results`
3. Most rounds had `society_event_id = NULL` so they weren't being found
4. Only 1 event was showing despite 78 rounds existing in database

---

## Root Cause
The `event_results` table was being populated with `gen_random_uuid()` for events without `society_event_id`, but the leaderboard code required matching IDs in `society_events` table.

---

## Fixes Applied

### 1. time-windowed-leaderboards.js
**Commit:** `0f37069e`

Changed `getStandings()` to query `event_results` directly by `event_date` instead of requiring `society_events` linkage:

```javascript
// BEFORE: Required society_events match
const { data: events } = await this.supabase
    .from('society_events')
    .select('id')
    .gte('event_date', startDateStr)
    .lt('event_date', endDateStr);
eventIds = (events || []).map(e => e.id);

const { data: results } = await this.supabase
    .from('event_results')
    .select('*')
    .in('event_id', eventIds);

// AFTER: Query event_results directly by date
const { data: results } = await this.supabase
    .from('event_results')
    .select('*')
    .gte('event_date', startDateStr)
    .lt('event_date', endDateStr);
```

### 2. index.html - loadPlayerStandings()
**Commits:** `a68db94b`, `3e8c0b30`

Changed `loadPlayerStandings()` to query `event_results` directly:

```javascript
// BEFORE: Required society_events prefix matching
const prefixes = societyProfiles.map(sp => ...);
let allEvents = [];
for (const prefix of prefixes) {
    const { data: events } = await window.SupabaseDB.client
        .from('society_events')
        .select('id, title, event_date')
        .ilike('title', `${prefix}%`);
}
const { data: results } = await window.SupabaseDB.client
    .from('event_results')
    .select('*')
    .in('event_id', eventIds);

// AFTER: Query event_results directly by date
const { data: results } = await window.SupabaseDB.client
    .from('event_results')
    .select('*')
    .gte('event_date', yearStart)
    .lte('event_date', yearEnd);
```

Also removed orphaned `allEvents` reference that caused `ReferenceError`.

---

## SQL Scripts Used

### Populate event_results from ALL rounds since Dec 1, 2025
```sql
DELETE FROM event_results;

INSERT INTO event_results (
    event_id, round_id, player_id, player_name, position, score,
    score_type, points_earned, status, is_counted, event_date
)
SELECT
    COALESCE(ranked.society_event_id, gen_random_uuid()),
    ranked.round_id,
    ranked.golfer_id,
    ranked.player_name,
    ranked.position,
    ranked.total_stableford,
    'stableford',
    GREATEST(0, 11 - ranked.position::int),
    'completed',
    true,
    ranked.event_date
FROM (
    SELECT
        r.society_event_id,
        r.id as round_id,
        r.golfer_id,
        COALESCE(r.player_name, r.golfer_id) as player_name,
        r.total_stableford,
        r.course_name,
        COALESCE(r.started_at::date, r.created_at::date) as event_date,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(r.society_event_id::text, r.course_name || COALESCE(r.started_at::date, r.created_at::date))
            ORDER BY r.total_stableford DESC NULLS LAST
        ) as position
    FROM rounds r
    WHERE r.status = 'completed'
    AND r.total_stableford IS NOT NULL
    AND COALESCE(r.started_at, r.created_at) >= '2025-12-01'
) ranked;
```

### Clean up invalid players
```sql
DELETE FROM event_results
WHERE player_name IS NULL
   OR player_name = ''
   OR player_name LIKE 'player_%'
   OR player_name LIKE 'U%'
   OR player_name LIKE 'TRGG-GUEST-%'
   OR player_name = 'Bubba Gump';
```

### Verify player stats
```sql
SELECT
    player_name,
    player_id,
    COUNT(*) as events_played,
    SUM(points_earned) as total_points,
    SUM(CASE WHEN position = 1 THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN position <= 3 THEN 1 ELSE 0 END) as top_3,
    MIN(position) as best_finish,
    ROUND(AVG(points_earned), 1) as avg_points
FROM event_results
GROUP BY player_id, player_name
ORDER BY total_points DESC;
```

---

## Final Results

| Rank | Player | Events | Points | Wins | Top 3 | Best |
|------|--------|--------|--------|------|-------|------|
| 1 | Pete Park | 13 | 90 | 4 | 8 | 1st |
| 2 | Gilbert, Tristan | 13 | 79 | 4 | 8 | 1st |
| 3 | Alan Thomas | 8 | 73 | 3 | 7 | 1st |
| 4 | Rocky Jones | 5 | 37 | 1 | 4 | 1st |
| 5 | Billy Shepley | 3 | 10 | 1 | 1 | 1st |
| 6 | Angelof, Nic | 1 | 9 | 0 | 1 | 2nd |
| 7 | Jimmy | 1 | 8 | 0 | 1 | 3rd |
| 8 | See-Hoe, Perry | 1 | 7 | 0 | 0 | 4th |

**Total:** 45 results, 8 players

---

## Commits (Chronological)

| Commit | Message |
|--------|---------|
| `974d32b1` | fix: Use correct column name event_id for scorecards table |
| `0f37069e` | fix: Query event_results directly by date instead of requiring society_events |
| `a68db94b` | fix: Query event_results directly by date in My Standings |
| `3e8c0b30` | fix: Remove allEvents reference in loadPlayerStandings |

---

## Key Learnings

1. **Don't require table joins when not necessary** - The leaderboard didn't need to match society_events, it just needed event_results by date
2. **Test SQL incrementally** - Many SQL errors could have been caught by testing each part
3. **Check for orphaned references** - After removing code, search for any remaining references to removed variables
4. **Use COALESCE for nullable fields** - player_name can be NULL, always provide fallback

---

## Files Modified
- `public/time-windowed-leaderboards.js` - Simplified getStandings() query
- `public/index.html` - Simplified loadPlayerStandings() query
- `sql/BULK_ASSIGN_POINTS_DEC2025.sql` - Created (not fully working, use SQL above instead)
