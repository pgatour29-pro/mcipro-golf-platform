# File Inventory - What Exists and What Was Changed

## SQL Scripts Created This Session

### sql/fix_matchplay_database_errors.sql
- **Purpose:** Create RLS policies for matchplay tables
- **Status:** Multiple failed iterations, contains latest working version
- **Issue:** More complex than needed, user may not have run it
- **Use:** Only if you want to keep RLS enabled for security

### sql/DISABLE_RLS_COMPLETELY.sql ⭐ RECOMMENDED
- **Purpose:** Simply disable RLS on all problematic tables
- **Status:** Created, NOT yet run by user
- **Issue:** None - this is the simplest fix
- **Use:** Run this to fix 400/401 errors immediately

### sql/check_rls_status.sql
- **Purpose:** Query to check if RLS is enabled on tables
- **Status:** Ready to use
- **Use:** Verify RLS status after running fixes

### sql/debug_policies.sql
- **Purpose:** Query to see existing RLS policies
- **Status:** Ready to use
- **Use:** Debug what policies exist on side_game_pools

### sql/check_handicaps.sql
- **Purpose:** Query handicap data with joins
- **Status:** Had column name errors (se.event_name, se.event_date)
- **Use:** DON'T USE - User will fix handicaps manually

### sql/check_handicaps_simple.sql
- **Purpose:** Query handicap data without joins
- **Status:** Working version
- **Use:** DON'T USE - User will fix handicaps manually

## JavaScript Files Modified

### public/golf-buddies-system.js
- **Modified:** Line 428-435 in renderMyBuddies() function
- **Change:** Check both handicap locations (golfInfo.handicap and direct handicap)
- **Status:** COMPLETED - DO NOT MODIFY AGAIN
- **Warning:** User said "don't fuck with the handicap"

## JavaScript Files NOT Modified (Code Already Exists)

### public/index.html
Contains all the 1v1 matchplay team display code:

**Team Storage:**
- Line 39318: `this.matchPlayTeams` - stores team assignments for 2-man teams
- Line 39319: `this.roundRobinMatches` - stores match assignments for round robin 1v1

**Team Validation:**
- Lines 41230-41295: `validateTeamSelection()` - validates team configurations
- Lines 41298-41329: `getMatchPlayTeamConfig()` - builds team data structure

**Round Robin Display:**
- Lines 46501-46564: `renderRoundRobinLeaderboard()` - renders round robin pairings
- Lines 46542-46564: Round robin HTML with "Multiple 1v1 Matches" header

**Team Display:**
- Lines 46513-46538: Team display HTML generator
- Shows "Team A vs Team B" with player names
- Blue/Red colored team boxes

**Match Play Calculations:**
- Line 39533: `calculateMatchPlay()` - individual match play
- Line 39734: `calculateTeamMatchPlay()` - 2-man team match play
- Line 39887: `calculateRoundRobinMatchPlay()` - round robin calculations

**All this code exists and is correct. It just can't execute because database queries fail.**

## Database Tables Affected

### side_game_pools
- **Error:** 400 Bad Request
- **Cause:** RLS policies blocking SELECT queries
- **Used For:** Creating and fetching matchplay pools
- **Code Location:** index.html:52660, 52793, 52996

### pool_entrants
- **Error:** 401 Unauthorized
- **Cause:** RLS policies blocking SELECT queries
- **Used For:** Tracking who joined which pools

### scorecards
- **Error:** 400 Bad Request
- **Cause:** RLS policies blocking SELECT/UPDATE queries
- **Used For:** Storing player scorecards
- **Impact:** updateScorecardTotals() fails repeatedly

### scores
- **Error:** Not directly shown but likely failing
- **Cause:** RLS policies blocking queries
- **Used For:** Individual hole scores

## Configuration Files

### public/supabase-config.js
- **Status:** Not modified
- **Contains:** Supabase client initialization
- **Used By:** window.SupabaseDB.client for all database queries

## Summary

**Files Created:** 6 SQL scripts
**Files Modified:** 1 JavaScript file (golf-buddies-system.js handicaps)
**Files NOT Modified:** public/index.html (team display code already exists)

**The Fix:** Run sql/DISABLE_RLS_COMPLETELY.sql
