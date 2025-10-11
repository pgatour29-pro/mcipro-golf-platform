# Multi-Group Competition System - Test Plan

## Overview
This guide will help you test the multi-group live competition system (Phase 2) which allows multiple groups to compete in side games (Skins, Match Play, Nassau) on the same course.

---

## Prerequisites

### 1. Database Setup
First, verify that the side game pools tables exist in Supabase:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('side_game_pools', 'pool_entrants', 'live_progress', 'pool_leaderboards');
```

**Expected Result**: Should return 4 rows (all 4 tables)

**If tables don't exist**:
1. Open `sql/side_game_pools_schema.sql`
2. Run it in Supabase SQL Editor
3. Verify tables were created

### 2. Chat Messages Table (Optional for testing competition)
The chat system needs this table, but it's independent of competition testing:

```sql
-- Check if chat_messages table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'chat_messages';
```

**If not exists**: Run `sql/chat_messages_schema.sql` in Supabase

---

## Test Scenario 1: Create Public Side Games

### Setup
1. Log in as Pete Park (test organizer)
2. Navigate to **Live Scorecard** tab
3. Select a course (e.g., "Bangpakong Country Club")
4. Click **"Start New Round"**

### Create Public Games
1. Scroll down to **"Public Side Games"** section
2. Check the boxes:
   - ✅ Skins Game
   - ✅ Match Play
   - ✅ Nassau
3. Set Skins value (e.g., 100 pts/hole)
4. Click **"Create Public Games"**

### Expected Results
- ✅ Notification: "Created 3 public games - others can now join!"
- ✅ Console logs:
  ```
  [LiveScorecard] Created and joined Skins pool: <pool_id>
  [LiveScorecard] Created and joined Match Play pool: <pool_id>
  [LiveScorecard] Created and joined Nassau pool: <pool_id>
  ```
- ✅ Badge appears on "Join Side Games" button showing available count

### Verify in Database
```sql
-- Check pools were created
SELECT id, type, name, is_public, course_id, date_iso, created_by
FROM side_game_pools
WHERE date_iso = CURRENT_DATE::text
ORDER BY created_at DESC;
```

```sql
-- Check you were auto-joined as entrant
SELECT pe.*, sgp.name as pool_name
FROM pool_entrants pe
JOIN side_game_pools sgp ON pe.pool_id = sgp.id
WHERE pe.player_id = 'YOUR_LINE_USER_ID'
ORDER BY pe.joined_at DESC;
```

---

## Test Scenario 2: Join Existing Public Games

### Setup
1. Log in as **Donald Lump** (second test user) on different browser/device
2. Navigate to **Live Scorecard** tab
3. Select the **same course** (e.g., "Bangpakong Country Club")
4. Click **"Start New Round"**

### Browse & Join Games
1. Scroll to **"Public Side Games"** section
2. Click **"Join Side Games"** button
3. Modal opens showing available games

### Expected Results
- ✅ See 3 available games:
  - 🟠 Skins Game - 100pts/hole
  - 🟣 Match Play - Open
  - 🔵 Nassau - Open
- ✅ Each shows entrant count (e.g., "1 player")
- ✅ Creator name shown (e.g., "Created by Pete Park")

### Join a Game
1. Click **"Join"** on the Skins Game
2. Notification: "✅ Joined game!"
3. Game moves to **"My Joined Games"** section
4. Now shows **"Leave"** button instead

### Verify in Database
```sql
-- Check Donald joined
SELECT pe.*, sgp.name as pool_name, sgp.type
FROM pool_entrants pe
JOIN side_game_pools sgp ON pe.pool_id = sgp.id
WHERE pe.player_id = 'DONALD_LINE_USER_ID'
ORDER BY pe.joined_at DESC;
```

---

## Test Scenario 3: Live Competition & Progress Tracking

### Setup
- Pete Park: Playing holes 1-6 on Bangpakong
- Donald Lump: Playing holes 1-3 on Bangpakong (same course, same day)
- Both joined the Skins pool

### Test Progress Updates

#### Pete Posts Scores (Holes 1-6)
1. As Pete, enter scores for holes 1-6
2. After each hole, check console:
   ```
   [LiveScorecard] Updated progress for pool <pool_id>: hole 1
   [LiveScorecard] Updated progress for pool <pool_id>: hole 2
   ...
   ```

#### Donald Posts Scores (Holes 1-3)
1. As Donald, enter scores for holes 1-3
2. Check console for progress updates

### Verify Progress in Database
```sql
-- Check holes completed per player
SELECT lp.*, up.name as player_name
FROM live_progress lp
JOIN user_profiles up ON lp.player_id = up.line_user_id
WHERE lp.pool_id = 'YOUR_POOL_ID'
ORDER BY lp.holes_completed DESC;
```

**Expected**:
- Pete: `holes_completed = 6`
- Donald: `holes_completed = 3`

---

## Test Scenario 4: Competition Leaderboard with Fairness Cutoff

### View Competition Leaderboard
1. In Live Scorecard, click **"Competition"** tab in leaderboard section
2. Leaderboard displays for each joined pool

### Expected Results

#### Fairness Cutoff Logic
- Pete completed: 6 holes
- Donald completed: 3 holes
- **Cutoff = MIN(6, 3) = 3 holes**
- Leaderboard shows: **"Through Hole 3"**

#### Leaderboard Display
- ✅ Pool name with type icon (🟠 Skins)
- ✅ "Through Hole 3" subtitle
- ✅ Player rankings based on scores for holes 1-3 only
- ✅ Shows net/gross scores
- ✅ Shows holes completed per player

#### Live Updates
1. As Donald, post score for hole 4
2. Leaderboard updates to **"Through Hole 4"**
3. Rankings recalculate including hole 4

### Test Edge Cases

#### No Common Holes Yet
- Create new pool
- Join but don't post scores
- **Expected**: "Waiting for all players to complete at least one hole..."

#### One Player Far Ahead
- Pete at hole 18, Donald at hole 1
- **Cutoff = 1 hole**
- Leaderboard shows: "Through Hole 1"

---

## Test Scenario 5: Multiple Pools & Game Types

### Setup
Join all 3 game types:
- Skins
- Match Play
- Nassau

### Expected Competition Tab Display
- ✅ 3 separate leaderboard sections
- ✅ Each with different icon/color:
  - 🟠 Skins (orange)
  - 🟣 Match Play (purple)
  - 🔵 Nassau (blue)
- ✅ Independent cutoff holes per pool
- ✅ Different rankings per game type

### Test Calculation Logic

#### Skins Game
- Shows points won per hole
- Carry-over if hole tied

#### Match Play
- Shows holes won/lost/tied
- Net match status (e.g., "2 UP")

#### Nassau
- Shows front 9, back 9, total scores
- Points for each segment

---

## Test Scenario 6: Public vs Private Pools

### Create Private Pool
```sql
-- Manually create a private pool via SQL
INSERT INTO side_game_pools (
    course_id, date_iso, type, name, is_public, config, created_by
) VALUES (
    'bangpakong',
    CURRENT_DATE::text,
    'skins',
    'Private Group Skins',
    false,  -- NOT public
    '{"useNet": true, "pointsPerHole": 200}',
    'YOUR_LINE_USER_ID'
);
```

### Expected Behavior
- ✅ Private pool does NOT appear in "Join Side Games" modal for other users
- ✅ Only creator and manually added entrants can see it
- ✅ Creator can still join own private pool

---

## Test Scenario 7: Cross-Course Isolation

### Setup
- Create Skins pool at **Bangpakong** (course_id: 'bangpakong')
- Try to join from **Burapha East** (course_id: 'burapha_east')

### Expected Results
- ✅ Bangpakong pool does NOT appear when at Burapha East
- ✅ Pools are course-specific (scoped by `course_id`)
- ✅ `getAvailablePools()` filters by course_id

---

## Verification Queries

### Check All Active Pools Today
```sql
SELECT
    sgp.id,
    sgp.type,
    sgp.name,
    sgp.course_id,
    sgp.is_public,
    sgp.status,
    COUNT(pe.player_id) as entrants_count
FROM side_game_pools sgp
LEFT JOIN pool_entrants pe ON sgp.id = pe.pool_id
WHERE sgp.date_iso = CURRENT_DATE::text
AND sgp.status = 'active'
GROUP BY sgp.id
ORDER BY sgp.created_at DESC;
```

### Check Leaderboard Cache
```sql
SELECT
    pl.*,
    sgp.name as pool_name,
    sgp.type as pool_type
FROM pool_leaderboards pl
JOIN side_game_pools sgp ON pl.pool_id = sgp.id
ORDER BY pl.computed_at DESC;
```

### Check RLS Policies
```sql
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('side_game_pools', 'pool_entrants', 'live_progress')
ORDER BY tablename, policyname;
```

---

## Success Criteria

### ✅ Phase 2 Complete When:

1. **Pool Creation**
   - ✅ Can create public Skins/Match Play/Nassau pools
   - ✅ Creator auto-joins
   - ✅ Pools appear in database

2. **Pool Discovery & Joining**
   - ✅ "Join Side Games" button shows available count
   - ✅ Modal displays public pools for same course/date
   - ✅ Can join/leave pools
   - ✅ Joined pools tracked correctly

3. **Live Progress**
   - ✅ Score posting updates `live_progress` table
   - ✅ Holes completed tracked per player/pool
   - ✅ Progress syncs across all joined pools

4. **Fair Competition**
   - ✅ Leaderboard uses cutoff hole (MIN of all players)
   - ✅ Displays "Through Hole X" correctly
   - ✅ Rankings based only on common holes
   - ✅ Updates live as players advance

5. **Multi-Pool Display**
   - ✅ Competition tab shows all joined pools
   - ✅ Each pool has independent leaderboard
   - ✅ Correct icons and styling per game type

6. **Isolation & Security**
   - ✅ Pools scoped by course_id and date_iso
   - ✅ Private pools not visible to non-members
   - ✅ RLS policies enforce access control

---

## Troubleshooting

### Issue: "Join Side Games" button doesn't appear
- **Check**: Tables exist in Supabase
- **Check**: Course selected in Live Scorecard
- **Check**: Round started (not just viewing)

### Issue: No pools shown in modal
- **Check**: Pools exist for same `course_id` and `date_iso`
- **Check**: Pools have `is_public = true`
- **Check**: Pools have `status = 'active'`

### Issue: Leaderboard shows "Waiting for players..."
- **Check**: All entrants have posted at least 1 score
- **Check**: `live_progress` table has entries
- **Check**: Console for cutoff calculation logs

### Issue: Progress not updating
- **Check**: `updateProgress()` called after score posting
- **Check**: Console logs show progress updates
- **Check**: Verify in `live_progress` table

### Issue: Wrong leaderboard rankings
- **Check**: Cutoff hole value
- **Check**: Only scores up to cutoff used
- **Check**: Net vs Gross setting in pool config

---

## Next Steps After Testing

1. **Production Deployment**
   - All SQL schemas run in production Supabase
   - Test with real users on course
   - Monitor performance and fairness cutoff

2. **Future Enhancements**
   - Real-time leaderboard subscriptions (Supabase Realtime)
   - Push notifications when players join pools
   - Historical pool results archive
   - Prize/points tracking
   - Society-wide pool leaderboards

3. **Documentation**
   - User guide for creating/joining pools
   - Video tutorial for competition setup
   - FAQ for fairness cutoff logic
