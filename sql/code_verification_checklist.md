# Code Verification Checklist - Multi-Group Competition

## ✅ Frontend Code Verification (COMPLETED)

### 1. LiveGamesSystem Module
- ✅ **Line 36656**: `const LiveGamesSystem = { ... }` - System defined
- ✅ **Line 37020**: `window.LiveGamesSystem = LiveGamesSystem` - Exported globally
- ✅ **Methods implemented**:
  - `createPool()` - Create side game pool
  - `joinPool()` - Join existing pool
  - `leavePool()` - Leave pool
  - `getAvailablePools()` - Fetch pools for course/date
  - `updateProgress()` - Update player progress
  - `computeHolesCompleted()` - Calculate holes from scores
  - `commonCutoffHole()` - Fairness cutoff calculation

### 2. UI Elements - Join Side Games Modal
- ✅ **Line 22680**: `<div id="joinGamesModal">` - Modal container exists
- ✅ **Line 22701**: `<div id="availablePoolsList">` - Available pools list
- ✅ **Line 22711**: `<div id="myPoolsList">` - My joined pools list
- ✅ **Line 22467**: Join Side Games button with `onclick="LiveScorecardManager.showJoinGamesModal()"`

### 3. UI Elements - Public Game Creation
- ✅ **Checkboxes exist**:
  - `<input id="publicSkins">` - Create Skins pool (checked by default)
  - `<input id="publicMatchPlay">` - Create Match Play pool
  - `<input id="publicNassau">` - Create Nassau pool
- ✅ **Skins value input**: `<input id="skinsValueInput">` - Points per hole

### 4. LiveScorecardManager Methods
- ✅ `showJoinGamesModal()` - Open join games modal
- ✅ `closeJoinGamesModal()` - Close join games modal
- ✅ `loadAvailablePools()` - Load pools from database
- ✅ `renderAvailablePoolsList()` - Render pools UI
- ✅ `joinPublicPool()` - Join pool handler
- ✅ `leavePublicPool()` - Leave pool handler
- ✅ `createPublicPools()` - Create pools on round start
- ✅ `updatePublicPoolProgress()` - Update progress on score post

### 5. Competition Leaderboard Integration
- ✅ **Line 22477**: Competition tab button `onclick="LiveScorecardManager.showLeaderboard('competition')"`
- ✅ **Competition leaderboard rendering**:
  - Shows joined pools
  - Displays cutoff hole
  - Rankings per pool
  - Game type icons (Skins 🟠, Match Play 🟣, Nassau 🔵)

### 6. Progress Tracking
- ✅ **Score posting integration**: Calls `updatePublicPoolProgress(hole)` after score posted
- ✅ **Hooks into**: `postScore()` method in LiveScorecardManager
- ✅ **Updates all joined pools**: Loops through `publicPoolIds` array

## ✅ Database Schema Verification (TO BE RUN)

### Required Tables (4 total)
1. ✅ `side_game_pools` - Pool definitions
2. ✅ `pool_entrants` - Players in pools
3. ✅ `live_progress` - Real-time progress tracking
4. ✅ `pool_leaderboards` - Cached leaderboard data

### Required Functions (3 total)
1. ✅ `get_pool_cutoff_hole(UUID)` - Calculate fairness cutoff
2. ✅ `update_live_progress(UUID, TEXT, INTEGER)` - Update player progress
3. ✅ `update_pool_timestamp()` - Trigger function for pool updates

### Required Indexes
- ✅ `idx_pools_scope` on `(course_id, date_iso, event_id)`
- ✅ `idx_pools_type` on `(type)`
- ✅ `idx_pools_public` on `(is_public)` WHERE is_public = true
- ✅ `idx_entrants_pool` on `(pool_id)`
- ✅ `idx_entrants_player` on `(player_id)`
- ✅ `idx_progress_pool` on `(pool_id)`
- ✅ `idx_progress_player` on `(player_id)`

### Required RLS Policies (10+ total)
**side_game_pools**:
- ✅ Anyone can view public pools
- ✅ Creator can update pool
- ✅ Creator can delete pool
- ✅ Authenticated users can create pools

**pool_entrants**:
- ✅ Users can join pools
- ✅ Users can leave pools
- ✅ Anyone can view entrants

**live_progress**:
- ✅ Anyone can view progress
- ✅ System can update progress

**pool_leaderboards**:
- ✅ Anyone can view leaderboards
- ✅ System can update leaderboards

## 🔍 How to Verify Database

### Step 1: Run Verification Script
```sql
-- In Supabase SQL Editor, run:
sql/verify_all_systems.sql
```

This will output a comprehensive report showing:
- ✅ All tables exist
- ✅ All columns correct
- ✅ All indexes present
- ✅ RLS enabled
- ✅ All policies active
- ✅ All functions defined
- ✅ Sample data check

### Step 2: Check for FAIL Status
If any section shows **FAIL**:

**Missing Tables/Functions**:
```sql
-- Run the schema file:
sql/side_game_pools_schema.sql
```

**Missing Chat Table**:
```sql
-- Run the chat schema:
sql/chat_messages_schema.sql
```

**Missing Users**:
- Ensure Pete Park and Donald Lump have logged in via LINE
- Both should have LINE picture URLs in `profile_data`

### Step 3: Verify Success
All items should show:
- ✅ Tables: **PASS**
- ✅ RLS Enabled: **PASS**
- ✅ Policies: **PASS**
- ✅ Functions: **PASS**
- ✅ Users: **PASS** (or WARN if < 2 users)

## 🧪 Ready to Test When:

### Database Status
- ✅ All 4 pool tables exist
- ✅ RLS enabled on all tables
- ✅ All policies active
- ✅ Helper functions created
- ✅ Indexes in place

### Frontend Status
- ✅ LiveGamesSystem exported to `window`
- ✅ Join Games modal exists
- ✅ Public pool checkboxes exist
- ✅ Competition leaderboard tab exists
- ✅ Progress tracking integrated

### User Status
- ✅ Pete Park exists with LINE picture
- ✅ Donald Lump exists (test user)
- ✅ Both can log in via LINE

## 📝 Testing Flow

Once verified, follow this exact sequence:

### 1. Pete Creates Pools (5 min)
1. Login as Pete Park
2. Live Scorecard → Select "Bangpakong"
3. Start New Round
4. Check: ✅ Skins, ✅ Match Play, ✅ Nassau
5. Create Public Games
6. **Verify**: Notification shows "Created 3 public games"

### 2. Donald Joins Pools (5 min)
1. Login as Donald Lump (different browser)
2. Live Scorecard → Select "Bangpakong"
3. Start New Round
4. Click "Join Side Games"
5. **Verify**: See 3 available pools
6. Join Skins pool
7. **Verify**: Badge shows "2 players"

### 3. Post Scores & Check Leaderboard (10 min)
1. Pete: Post scores holes 1-6
2. Donald: Post scores holes 1-3
3. Both: Click "Competition" tab
4. **Verify**: Shows "Through Hole 3" (fairness cutoff)
5. **Verify**: Rankings based on holes 1-3 only
6. Donald: Post hole 4
7. **Verify**: Updates to "Through Hole 4"

## 🎯 Success Criteria

### All Green When:
- ✅ Pools create successfully
- ✅ Other users can join
- ✅ Progress updates in real-time
- ✅ Cutoff hole calculated correctly
- ✅ Leaderboard shows only common holes
- ✅ Multiple pools display independently
- ✅ No console errors

## 📊 Console Logs to Expect

### On Pool Creation:
```
[LiveScorecard] Created and joined Skins pool: <uuid>
[LiveScorecard] Created and joined Match Play pool: <uuid>
[LiveScorecard] Created and joined Nassau pool: <uuid>
```

### On Joining Pool:
```
[LiveScorecard] Joined pool: <uuid>
```

### On Score Posting:
```
[LiveScorecard] Updated progress for pool <uuid>: hole 3
[LiveScorecard] Updated progress for pool <uuid>: hole 3
[LiveScorecard] Updated progress for pool <uuid>: hole 3
```

### On Leaderboard View:
```
[Competition] Cutoff hole: 3
[Competition] Displaying leaderboard through hole 3
```

## ⚠️ Common Issues & Fixes

### Issue: "No pools available"
- **Check**: Course ID matches (e.g., 'bangpakong')
- **Check**: Date matches (today's date in ISO format)
- **Check**: `is_public = true` in database

### Issue: "Failed to join pool"
- **Check**: RLS policy allows INSERT on `pool_entrants`
- **Check**: User authenticated with LINE
- **Check**: Not already joined (unique constraint)

### Issue: Cutoff always 0
- **Check**: Scores posted successfully
- **Check**: `live_progress` table has entries
- **Check**: `get_pool_cutoff_hole()` function exists

### Issue: Leaderboard empty
- **Check**: At least 1 common hole completed by all
- **Check**: Entrants have scores in rounds table
- **Check**: Course ID and date match

## 🚀 Post-Testing

### If All Tests Pass:
1. ✅ Mark Phase 2 complete
2. ✅ Document user guide
3. ✅ Announce to test users
4. ✅ Monitor production usage

### If Tests Fail:
1. Check console errors
2. Verify database queries
3. Review RLS policies
4. Check user authentication
5. Report specific error messages

---

**Current Status**: Code verified ✅ | Database pending ⏳ | Testing pending ⏳
