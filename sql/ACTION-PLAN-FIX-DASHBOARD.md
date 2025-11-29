# ACTION PLAN: Get TRGG Events on Dashboard

## Current Situation
- Frontend code has been fixed to query TRGG events by title prefix (`ILIKE 'TRGG%'`)
- Frontend uses `organizerId = 'trgg-pattaya'` to trigger special TRGG query
- Service worker updated to version: `trgg-organizer-query-v1`
- **UNKNOWN**: Are the 51 TRGG events actually in the database?

## Step 1: Diagnose Database State

### Run this SQL in Supabase SQL Editor:
```sql
-- File: DIAGNOSE-DASHBOARD-ISSUE.sql
```

Open Supabase → SQL Editor → Paste and run `DIAGNOSE-DASHBOARD-ISSUE.sql`

**Expected Results:**

### Scenario A: "NO TRGG EVENTS FOUND"
- Count returns 0 events
- **ACTION**: Run `FIX-CLEAN-RESTORE.sql` to insert the 51 TRGG events
- **WARNING**: This will delete ALL events in Nov-Dec 2025 range first

### Scenario B: "TRGG EVENTS EXIST"
- Count returns 51 events
- Events show up in query results
- **ACTION**: Frontend/cache issue - proceed to Step 2

## Step 2: Clear Browser Cache

If events exist in database but don't show on dashboard:

1. Open Developer Tools (F12)
2. Go to Application tab → Storage
3. Click "Clear site data"
4. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Step 3: Check Browser Console for Errors

1. Open Developer Tools (F12) → Console tab
2. Navigate to Travellers Rest organizer dashboard
3. Look for errors mentioning:
   - "Loading events for organizer ID"
   - "TRGG mode"
   - Any Supabase query errors

## Step 4: Verify TRGG Society Profile Exists

If events still don't show, check if TRGG society profile exists:

```sql
SELECT * FROM society_profiles WHERE organizer_id = 'trgg-pattaya';
```

**Expected**: Should return 1 row with TRGG profile

**If no profile exists**, create it:
```sql
INSERT INTO society_profiles (
    organizer_id,
    society_name,
    society_logo,
    created_at,
    updated_at
) VALUES (
    'trgg-pattaya',
    'Travellers Rest Golf Group',
    'societylogos/trgg.jpg',
    NOW(),
    NOW()
);
```

## Step 5: Manual Query Test

Test the exact query the dashboard uses:

```sql
SELECT COUNT(*) as count
FROM society_events
WHERE title ILIKE 'TRGG%';
```

Should return 51 events.

## Quick Summary

✅ **Frontend code fixed** - Uses title matching for TRGG
✅ **Service worker updated** - Cache invalidated
❓ **Database state unknown** - Need to run DIAGNOSE-DASHBOARD-ISSUE.sql
❓ **Society profile unknown** - May need to create TRGG profile

## Most Likely Issue

Based on symptoms, most likely one of these:

1. **TRGG events not in database** (run FIX-CLEAN-RESTORE.sql)
2. **TRGG society profile missing** (run INSERT statement above)
3. **Browser cache not cleared** (hard refresh)
