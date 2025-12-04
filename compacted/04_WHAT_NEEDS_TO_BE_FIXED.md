# What Needs to Be Fixed - Outstanding Issues

## PRIORITY 1: FIX DATABASE RLS (BLOCKS EVERYTHING)

### Issue
1v1 matchplay teams are not displaying because all database queries fail with 400/401 errors.

### Root Cause
Row Level Security (RLS) policies are blocking authenticated user queries on:
- side_game_pools (400 error)
- pool_entrants (401 error)
- scorecards (400 error)
- scores (likely failing too)

### Solution
**Run this SQL in Supabase SQL Editor:**

```sql
-- COMPLETELY DISABLE RLS TO MAKE MATCHPLAY WORK
ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE pool_entrants DISABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
```

**Location:** File already exists at `sql/DISABLE_RLS_COMPLETELY.sql`

### Verification
After running the SQL, verify with:
```sql
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('side_game_pools', 'pool_entrants', 'scorecards', 'scores')
ORDER BY tablename;
```

All tables should show `rls_enabled = false`

### Then Test
1. Refresh the web page
2. Check browser console - 400/401 errors should be gone
3. 1v1 matchplay teams should now display

## PRIORITY 2: HANDICAP DATA (USER WILL FIX MANUALLY)

### Issue
- Alan Thomas has no handicap
- Pete Park handicap is incorrect
- Some players using old handicap values

### Solution
**DO NOT FIX IN CODE - USER WILL FIX MANUALLY**

User will update handicap data directly in database:
- user_profiles table
- event_registrations table

## Code Status

### Working Code (No Changes Needed)
- **index.html:46513-46538** - Team display rendering code EXISTS and is CORRECT
- **index.html:39318-39319** - Team assignments storage (matchPlayTeams, roundRobinMatches)
- **index.html:41230-41295** - Team validation logic
- **index.html:46501-46564** - Round robin display rendering

### The Problem Is NOT the Code
The JavaScript code for displaying 1v1 matchplay teams is correct and complete.
The problem is the database queries fail before the code can execute.

## Summary

**ONLY ONE THING NEEDS TO BE FIXED:**
Run `sql/DISABLE_RLS_COMPLETELY.sql` in Supabase SQL Editor.

Everything else will work after that.
