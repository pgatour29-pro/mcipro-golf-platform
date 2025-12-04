# SQL That Needs to Be Run

## REQUIRED: Disable RLS on Tables

**File:** `sql/DISABLE_RLS_COMPLETELY.sql`

**Run this in Supabase SQL Editor:**

```sql
-- COMPLETELY DISABLE RLS TO MAKE MATCHPLAY WORK
-- Run this in Supabase SQL Editor

-- Disable RLS completely on side_game_pools
ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;

-- Disable RLS completely on pool_entrants
ALTER TABLE pool_entrants DISABLE ROW LEVEL SECURITY;

-- Disable RLS completely on scorecards
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;

-- Disable RLS completely on scores
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('side_game_pools', 'pool_entrants', 'scorecards', 'scores')
ORDER BY tablename;
```

## Expected Output

After running the verification query, you should see:

```
tablename            | rls_enabled
---------------------+-------------
pool_entrants        | f
scorecards           | f
scores               | f
side_game_pools      | f
```

All tables should show `f` (false) for rls_enabled.

## After Running SQL

1. **Refresh** the web page completely (hard refresh: Ctrl+Shift+R)
2. **Check** browser console - the 400/401 errors should be gone
3. **Test** the 1v1 matchplay - teams should now display

## If Errors Persist

If you still see 400/401 errors after running the SQL:

1. Check the SQL ran successfully (no errors in Supabase SQL Editor)
2. Run the verification query to confirm RLS is disabled
3. Clear browser cache and hard refresh
4. Check if there are other RLS policies on related tables

## Alternative: Use RLS Policies (More Complex)

If you want to keep RLS enabled for security, use:
**File:** `sql/fix_matchplay_database_errors.sql`

This creates proper RLS policies, but is more complex and had errors in previous attempts.
The DISABLE approach is simpler and will work immediately.
