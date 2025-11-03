# 🚨 CRITICAL: Database Schema Fix Required

**Problem:** Rounds are not saving because database columns are missing
**Impact:** No score history, no organizer leaderboards
**Status:** ❌ BLOCKING - Must fix immediately

---

## What's Wrong

The code expects **NEW database columns** that don't exist yet:

### Missing Columns in `rounds` table:
- ❌ `completed_at` - when round finished
- ❌ `started_at` - when round began
- ❌ `golfer_id` - Supabase user ID
- ❌ `society_event_id` - links to society events
- ❌ `course_name` - course name
- ❌ `type` - practice/private/society
- ❌ `status` - completed/in_progress
- ❌ `total_gross` - total score
- ❌ `total_stableford` - stableford points
- ❌ `handicap_used` - handicap for round
- ❌ `tee_marker` - tee color

### Wrong Column Names in queries:
- ❌ `society_events.date` → Should be `event_date`

---

## Error Messages You're Seeing

```
pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?
select=*&order=completed_at.desc - 400 ERROR

Column "completed_at" does not exist
```

---

## The Fix (2 Steps)

### Step 1: Run SQL Migration (REQUIRED)

**Option A: Supabase Dashboard** (Recommended)

1. Go to **Supabase Dashboard** → https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy ENTIRE contents of file: `sql/URGENT_FIX_rounds_schema.sql`
6. Paste into SQL editor
7. Click **Run** button (bottom right)
8. Wait for success message:
   ```
   ✅ rounds table schema updated successfully
   ✅ Added columns: completed_at, started_at, golfer_id, society_event_id, etc.
   ✅ Created performance indexes
   ✅ Migrated existing data
   ```

**Option B: Supabase CLI**

```bash
cd C:\Users\pete\Documents\MciPro
cat sql/URGENT_FIX_rounds_schema.sql | supabase db execute
```

---

### Step 2: Deploy Fixed Code (REQUIRED)

**Already prepared - just run:**

```bash
cd C:\Users\pete\Documents\MciPro
cp index.html public/index.html
git add .
git commit -m "Fix database schema mismatches for rounds saving"
vercel --prod
```

---

## What the Migration Does

### 1. Adds Missing Columns
Safely adds all required columns to `rounds` table without breaking existing data.

### 2. Creates Indexes
Adds performance indexes for:
- `golfer_id` - fast lookups by player
- `society_event_id` - fast lookups by event
- `completed_at` - fast sorting by date

### 3. Migrates Existing Data
- Copies `played_at` → `completed_at` and `started_at`
- Sets default `type` = 'practice'
- Sets default `status` = 'completed'

### 4. Backward Compatible
- Keeps all existing columns
- Doesn't delete anything
- Old data still accessible

---

## Testing After Migration

### Test 1: Verify Migration Succeeded

Run this query in Supabase SQL Editor:

```sql
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'rounds'
ORDER BY ordinal_position;
```

**Expected output:** Should show all new columns including `completed_at`, `started_at`, `golfer_id`, etc.

### Test 2: Play a Test Round

1. Go to Live Scorecard
2. Select any course
3. Add yourself as player
4. Enter scores for 9 holes
5. Click **Finish Round**
6. Check console logs - should see:
   ```
   [LiveScorecard] ✅ ROUND SAVED SUCCESSFULLY
   [LiveScorecard] Round ID: abc123...
   [LiveScorecard] Society Event ID: xyz789...
   ```
7. Go to **Round History** tab
8. Should see your round with "Live" badge

### Test 3: Check Organizer Scoring

1. As organizer, go to **Organizer → Scoring** tab
2. Select a society event
3. Should see player scores on leaderboard
4. Names should appear (not LINE IDs)

---

## If Migration Fails

### Common Issues

**Issue 1: Permission Denied**
```
ERROR: permission denied for table rounds
```

**Solution:** Run as database owner/admin user in Supabase dashboard

---

**Issue 2: Table Doesn't Exist**
```
ERROR: relation "rounds" does not exist
```

**Solution:** You need to create the rounds table first. Run:
```sql
CREATE TABLE IF NOT EXISTS rounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Then re-run the migration.

---

**Issue 3: Constraint Violations**
```
ERROR: violates not-null constraint
```

**Solution:** The migration handles this automatically. If you see this, your database has corrupted data. Run:
```sql
DELETE FROM rounds WHERE user_id IS NULL;
```

---

## Rollback (If Needed)

If something goes wrong, you can remove the new columns:

```sql
ALTER TABLE rounds
    DROP COLUMN IF EXISTS completed_at,
    DROP COLUMN IF EXISTS started_at,
    DROP COLUMN IF EXISTS golfer_id,
    DROP COLUMN IF EXISTS society_event_id,
    DROP COLUMN IF EXISTS course_name,
    DROP COLUMN IF EXISTS type,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS total_gross,
    DROP COLUMN IF EXISTS total_net,
    DROP COLUMN IF EXISTS total_stableford,
    DROP COLUMN IF EXISTS handicap_used,
    DROP COLUMN IF EXISTS tee_marker;
```

---

## Summary

| Task | Status | Action |
|------|--------|--------|
| SQL Migration | ❌ NOT DONE | Run `URGENT_FIX_rounds_schema.sql` |
| Code Fixes | ✅ READY | Deploy with vercel |
| Testing | ⏳ PENDING | Test after migration |

---

## Next Steps

1. **IMMEDIATELY:** Run SQL migration in Supabase Dashboard
2. **THEN:** Deploy code with `vercel --prod`
3. **FINALLY:** Test round saving

**Estimated Time:** 5 minutes
**Priority:** 🚨 CRITICAL - Nothing works without this

---

**Files:**
- Migration SQL: `sql/URGENT_FIX_rounds_schema.sql`
- Fixed Code: `index.html` (ready to deploy)
- This Guide: `CRITICAL_DATABASE_FIX.md`

---

**Questions?** Check the console logs - they now show detailed error messages to help debug.
