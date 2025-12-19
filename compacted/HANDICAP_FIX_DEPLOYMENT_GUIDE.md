# Handicap Adjustment System - Fix & Deployment Guide

**Date:** 2025-11-29
**Status:** Ready to Deploy
**Impact:** HIGH - Enables automatic handicap updates after every round

---

## Problem Found

Handicap adjustments are NOT happening after golfers complete rounds because:

### Root Cause Analysis

1. **Handicap trigger exists** in database ✅
2. **Handicap_history table exists** ✅
3. **BUT: Rounds have NULL data in critical columns** ❌

### What's Happening

When rounds are saved via `saveRoundToHistory()`:

1. Code tries to insert into "canonical" schema with new columns:
   - `total_gross`
   - `tee_marker`
   - `completed_at`
   - `status = 'completed'`

2. Canonical insert fails (likely RLS policy issue)

3. Code falls back to "legacy" insert with old columns:
   - `total_score` ✅ (works)
   - `tee_used` ✅ (works)
   - `played_at` ✅ (works)
   - `status = 'completed'` ✅ (works)

4. **PROBLEM:** Legacy insert doesn't populate NEW columns!

5. Handicap trigger checks for:
   ```sql
   status = 'completed'
   AND total_gross IS NOT NULL
   AND tee_marker IS NOT NULL
   ```

6. **Trigger never fires** because `total_gross` and `tee_marker` are NULL!

### Evidence from Database

```
Round ID: 7bf1ac5f-ed04-458f-9a97-f8b995925cb0
Status: completed ✅
total_score: 84 ✅ (legacy column)
total_gross: NULL ❌ (new column - TRIGGER NEEDS THIS!)
tee_used: white ✅ (legacy column)
tee_marker: NULL ❌ (new column - TRIGGER NEEDS THIS!)
played_at: 2025-11-05 ✅ (legacy column)
completed_at: NULL ❌ (new column - TRIGGER NEEDS THIS!)
```

---

## Solution

### Fix 1: Update Existing Rounds (SQL)

Copy legacy column values to new columns so existing rounds trigger handicap calculation.

**File:** `sql/fix_rounds_for_handicap_trigger.sql`

```sql
UPDATE public.rounds
SET
  total_gross = total_score,
  tee_marker = tee_used,
  completed_at = played_at
WHERE
  status = 'completed'
  AND total_gross IS NULL
  AND total_score IS NOT NULL;
```

### Fix 2: Update Code (JavaScript)

Make legacy insert ALSO populate new columns for future rounds.

**File:** `public/index.html` (line ~41500)

**Before:**
```javascript
const legacyInsert = await window.SupabaseDB.client
    .from('rounds')
    .insert({
        golfer_id: player.lineUserId,
        course_id: courseId || null,
        course_name: courseName,
        played_at: new Date().toISOString(),
        holes_played: holesPlayed,
        tee_used: teeMarker,
        total_score: totalGross,
        // ... other legacy fields
    })
```

**After:**
```javascript
const legacyInsert = await window.SupabaseDB.client
    .from('rounds')
    .insert({
        golfer_id: player.lineUserId,
        course_id: courseId || null,
        course_name: courseName,
        played_at: new Date().toISOString(),
        holes_played: holesPlayed,
        tee_used: teeMarker,
        total_score: totalGross,
        // ... other legacy fields

        // CRITICAL FIX: Also populate NEW columns for handicap trigger
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_gross: totalGross,
        tee_marker: teeMarker,
        total_stableford: totalStableford
    })
```

---

## Deployment Steps

### Step 1: Verify Handicap System Deployed

Check if trigger is already deployed:

```bash
cd C:\Users\pete\Documents\MciPro
node diagnose_handicap_system.js
```

**Expected:** "handicap_history table EXISTS"

If NOT, deploy the SQL:

1. Open Supabase SQL Editor
2. Run: `sql/create_automatic_handicap_system.sql`
3. Verify: `SELECT * FROM handicap_history LIMIT 1;`

### Step 2: Fix Existing Rounds

Run the SQL migration:

1. Open Supabase SQL Editor
2. Run: `sql/fix_rounds_for_handicap_trigger.sql`
3. Verify:

```sql
SELECT
  COUNT(*) AS total_completed,
  COUNT(total_gross) AS has_gross,
  COUNT(tee_marker) AS has_tee,
  COUNT(completed_at) AS has_completed
FROM rounds
WHERE status = 'completed';
```

**Expected:** All counts should be equal (e.g., 3, 3, 3, 3)

### Step 3: Deploy Code Fix

**File already updated:** `C:\Users\pete\Documents\MciPro\public\index.html`

The code fix has been applied at line ~41500.

Deploy to production:
1. Commit changes to git
2. Push to hosting/CDN
3. Clear browser cache

### Step 4: Run Manual Handicap Recalculation

Backfill handicaps for existing rounds:

```sql
SELECT * FROM recalculate_all_handicaps();
```

This will:
- Calculate handicaps for all golfers with completed rounds
- Create entries in handicap_history
- Update user_profiles with new handicaps

### Step 5: Verify System Working

```bash
cd C:\Users\pete\Documents\MciPro
node diagnose_handicap_system.js
```

**Expected output:**
```
✅ handicap_history table EXISTS
✅ Found N completed rounds
✅ Found N handicap history entries
✅ Handicap system is WORKING!
```

---

## Testing

### Test 1: Check Existing Rounds

```bash
node check_all_rounds.js
```

**Expected:**
- All completed rounds have `total_gross`, `tee_marker`, `completed_at`

### Test 2: Complete a New Round

1. Open app
2. Start a live scorecard
3. Complete 18 holes
4. End round
5. Check database:

```sql
SELECT * FROM rounds
WHERE golfer_id = 'YOUR_LINE_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

**Verify:**
- `status = 'completed'`
- `total_gross = [your score]`
- `tee_marker = [your tee]`
- `completed_at = [timestamp]`

### Test 3: Verify Handicap Updated

```sql
SELECT * FROM handicap_history
WHERE golfer_id = 'YOUR_LINE_USER_ID'
ORDER BY calculated_at DESC
LIMIT 1;
```

**Expected:**
- New entry created automatically
- `new_handicap` calculated based on last 5 rounds
- `rounds_used` = 1 to 5

### Test 4: Check User Profile

```sql
SELECT
  display_name,
  profile_data->'golfInfo'->>'handicap' AS handicap
FROM user_profiles
WHERE line_user_id = 'YOUR_LINE_USER_ID';
```

**Expected:**
- Handicap matches `new_handicap` from handicap_history

---

## How It Will Work After Fix

### Automatic Workflow

1. **Golfer completes round**
   - scorecard saved with 18 hole scores
   - Total gross calculated (e.g., 85)

2. **saveRoundToHistory() runs**
   ```javascript
   INSERT INTO rounds (
     golfer_id,
     total_gross,  ← 85
     tee_marker,   ← 'blue'
     completed_at, ← '2025-11-29T10:30:00Z'
     status        ← 'completed'
   )
   ```

3. **Database trigger fires automatically**
   ```sql
   trigger_auto_update_handicap
   AFTER INSERT OR UPDATE ON rounds
   WHERE status = 'completed'
     AND total_gross IS NOT NULL
   ```

4. **Handicap calculated**
   - Gets last 5 rounds for golfer
   - Calculates score differential for each:
     ```
     (85 - 72.0) × (113 / 125) = 11.8
     ```
   - Takes best 3 differentials
   - Averages and applies × 0.96
   - Result: New handicap index (e.g., 11.7)

5. **Profile updated**
   ```sql
   UPDATE user_profiles
   SET profile_data = jsonb_set(
     profile_data,
     '{golfInfo,handicap}',
     '11.7'
   )
   WHERE line_user_id = golfer_id;
   ```

6. **History logged**
   ```sql
   INSERT INTO handicap_history (
     golfer_id,
     old_handicap,  ← 12.5
     new_handicap,  ← 11.7
     change,        ← -0.8
     rounds_used,   ← 5
     differentials  ← [9.7, 12.5, 14.3, 15.8, 17.2]
   )
   ```

7. **Done!** Handicap updated automatically, no user action needed.

---

## World Handicap System Formula

### Score Differential
```
(Adjusted Gross Score - Course Rating) × (113 / Slope Rating)
```

**Example:**
- Gross Score: 85
- Course Rating: 72.0 (blue tees)
- Slope Rating: 125 (blue tees)
- **Differential:** (85 - 72.0) × (113 / 125) = **11.8**

### Handicap Index
```
Average of best 3 of last 5 differentials × 0.96
```

**Example:**
- Last 5 rounds: 85, 88, 82, 90, 87
- Differentials: 12.5, 15.8, 9.7, 17.2, 14.3
- Best 3: 9.7, 12.5, 14.3
- Average: (9.7 + 12.5 + 14.3) / 3 = 12.17
- **Handicap Index:** 12.17 × 0.96 = **11.7**

---

## Files Modified

1. ✅ `public/index.html` (line ~41500) - Added new columns to legacy insert
2. ✅ `sql/fix_rounds_for_handicap_trigger.sql` - Migration to fix existing data
3. ✅ `diagnose_handicap_system.js` - Diagnostic tool
4. ✅ `check_all_rounds.js` - Round data inspector
5. ✅ `check_rounds_schema.js` - Schema validator

---

## Rollback Plan

If issues occur:

1. **Revert code change:**
   ```bash
   git checkout HEAD~1 public/index.html
   ```

2. **Disable trigger:**
   ```sql
   DROP TRIGGER IF EXISTS trigger_auto_update_handicap ON public.rounds;
   ```

3. **Restore manually:**
   - Users can still play rounds normally
   - Handicaps remain at current values
   - No data loss

---

## Success Criteria

✅ All existing completed rounds have total_gross, tee_marker, completed_at
✅ New rounds automatically populate all required columns
✅ Trigger fires after each round completion
✅ Handicap_history table receives new entries
✅ User profiles update with new handicaps
✅ No errors in console logs
✅ No performance degradation

---

## FAQ

**Q: Will old rounds trigger handicap recalculation?**
A: Yes, after running Step 2 (SQL migration) and Step 4 (manual recalculation).

**Q: What if a golfer has fewer than 5 rounds?**
A: System adapts:
- 1-2 rounds: Use best 1 × 0.96
- 3 rounds: Use best 2 × 0.96
- 4 rounds: Use best 2 × 0.96
- 5+ rounds: Use best 3 × 0.96

**Q: What tee ratings are used?**
A: Currently hardcoded defaults:
- Black (Championship): 73.5 / 130
- Blue (Men's): 72.0 / 125
- White (Regular): 70.5 / 120
- Yellow (Senior): 69.0 / 115
- Red (Ladies): 67.5 / 110

Future: Read from courses.course_data JSONB

**Q: Can I disable automatic updates?**
A: Yes, drop the trigger:
```sql
DROP TRIGGER trigger_auto_update_handicap ON rounds;
```

**Q: How do I manually recalculate one player?**
A:
```sql
SELECT * FROM calculate_handicap_index('THEIR_LINE_USER_ID');
```

---

**Status:** ✅ Ready to Deploy
**Impact:** All golfers will have accurate, automatically-updated handicaps
**Developer:** Claude Code
**Date:** November 29, 2025
