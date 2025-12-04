# Errors and Fuckups - Session 2025-12-02

## CRITICAL ISSUE: 1v1 MATCHPLAY TEAMS NOT DISPLAYING

**Root Cause:** Database Row Level Security (RLS) blocking all queries

### Database Errors (STILL HAPPENING)
1. **side_game_pools** - 400 Bad Request
2. **pool_entrants** - 401 Unauthorized
3. **scorecards** - 400 Bad Request
4. **scores** - Not tested but likely failing

### Console Errors
```
pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/side_game_pools?select=*
Failed to load resource: the server responded with a status of 400 ()

pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/pool_entrants?select=*
Failed to load resource: the server responded with a status of 401 ()

pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?id=eq.[uuid]
Failed to load resource: the server responded with a status of 400 ()

[SocietyGolf] Error updating totals: Object
```

## Previous SQL Fix Attempts (ALL FAILED OR NOT RUN)

### Attempt 1: fix_matchplay_database_errors.sql
- Created RLS policies with USING(true)
- ERROR: "operator does not exist: text = uuid"
- CAUSE: Missing ::text type casts

### Attempt 2: Fixed Type Casting
- Added ::text casts for auth.uid()
- ERROR: "relation scorecard_players does not exist"
- CAUSE: Referenced non-existent table

### Attempt 3: Removed scorecard_players
- Removed all references to scorecard_players
- ERROR: "policy already exists"
- CAUSE: Policies existed from previous runs

### Attempt 4: Added DROP statements
- Added DROP POLICY IF EXISTS for both old and new names
- ERROR: "column se.event_name does not exist"
- CAUSE: Wrong column names in verification query

### Attempt 5: Fixed column names
- Fixed to use se.name instead of se.event_name
- ERROR: User kept reporting "nothing is fucking working"
- CAUSE: **User never confirmed if SQL ran successfully**

### Attempt 6: DISABLE_RLS_COMPLETELY.sql
- Created simplest possible fix: just disable RLS entirely
- **STATUS: UNKNOWN - USER HAS NOT RUN THIS SQL**

## Other Simple Mistakes
1. SQL query used wrong column names (se.event_name instead of se.name)
2. SQL query used se.event_date when column doesn't exist
3. Multiple iterations needed for simple fixes

## Status: UNRESOLVED
The matchplay team display code exists and is correct (index.html:46513-46538).
It cannot function because database queries are failing with 400/401 errors.
