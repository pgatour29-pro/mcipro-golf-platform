# Society Events Not Loading - Troubleshooting Guide

## Problem
Society events are not displaying in the Browse Events tab.

## Most Likely Cause
**The database table `society_events` is empty** - the SQL import scripts may not have been run in Supabase.

## Quick Diagnosis

### Step 1: Run the Diagnostic Test Page

1. Go to: **https://mycaddipro.com/test-society-events.html**
2. Click "🧪 Run All Tests"
3. Check the results

### Step 2: Interpret Results

**If Test 2 shows "No events found":**
- The table exists but is EMPTY
- **Solution:** Run the SQL import scripts (see below)

**If Test 1 fails:**
- Supabase connection issue
- Check your internet connection
- Verify Supabase service status

**If Test 3 or 4 fails:**
- RLS policy issue
- May need to re-apply policies (see below)

## Solution: Import Event Data

### Option 1: Run SQL Scripts in Supabase (RECOMMENDED)

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `voxwtgkffaqmowpxhxbp`
3. Go to **SQL Editor**
4. Create a **New Query**
5. Copy and paste the contents of **BOTH** files:
   - `Documents/MciPro/sql/import-trgg-october-schedule.sql`
   - `Documents/MciPro/sql/import-trgg-november-schedule.sql`
6. Click **RUN**
7. Verify: Should see "Success" and event count

### Option 2: Quick Verification Query

Run this query in Supabase SQL Editor to check if events exist:

```sql
SELECT COUNT(*) as total_events FROM society_events;
SELECT * FROM society_events ORDER BY date LIMIT 5;
```

**Expected result:**
- Total events should be > 0 (probably 20-30 events)
- Should see TRGG events listed

**If count = 0:**
- Run the import scripts from Option 1

## Additional Checks

### Check Table Schema
Verify the table exists and has correct columns:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'society_events';
```

**Expected columns:**
- id (TEXT)
- name (TEXT)
- date (DATE)
- organizer_id (TEXT)
- organizer_name (TEXT)
- course_name (TEXT)
- max_players (INTEGER)
- status (TEXT)
- and more...

### Check RLS Policies

```sql
SELECT * FROM pg_policies WHERE tablename = 'society_events';
```

**Expected policies:**
- `Events are viewable by everyone` (SELECT)
- `Events are insertable by everyone` (INSERT)
- `Events are updatable by everyone` (UPDATE)
- `Events are deletable by everyone` (DELETE)

**If policies are missing:**
- Run: `Documents/MciPro/sql/society-golf-schema.sql`

## Manual Event Insert (Testing)

If you want to manually insert a test event:

```sql
INSERT INTO society_events (
  id,
  name,
  date,
  start_time,
  base_fee,
  max_players,
  organizer_id,
  organizer_name,
  status,
  course_name,
  created_at,
  updated_at
) VALUES (
  'test-event-001',
  'Test Golf Event',
  '2025-10-25',
  '09:00',
  1500,
  40,
  'test-organizer',
  'Test Society',
  'open',
  'Test Golf Course',
  NOW(),
  NOW()
);
```

Then refresh the diagnostic test page and check if it appears.

## After Fixing

1. Go back to **https://mycaddipro.com/test-society-events.html**
2. Click "🧪 Run All Tests" again
3. Test 2 should now show: "✅ Found X events in database"
4. You should see event cards displayed
5. Go to the main app and navigate to **Society Events** tab
6. Events should now load!

## Still Not Working?

### Check Browser Console

1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for errors starting with:
   - `[GolferEventsSystem]`
   - `[SocietyGolf]`
   - Any red error messages

### Common Errors

**"Failed to fetch"**
- Network connection issue
- Check if Supabase is accessible

**"permission denied for table society_events"**
- RLS policy issue
- Re-run: `sql/society-golf-schema.sql`

**"relation society_events does not exist"**
- Table not created
- Run: `sql/society-golf-schema.sql`

## Contact Support

If still having issues, provide:
1. Screenshot of diagnostic test results
2. Browser console errors
3. Result of SQL query: `SELECT COUNT(*) FROM society_events;`

---

**Last Updated:** 2025-10-21
**Diagnostic Tool:** https://mycaddipro.com/test-society-events.html
