### SQL Scripts Installation Guide - FIXED VERSION ✅

## What Was Fixed

**Error:** `invalid input syntax for type uuid: ""`

**Cause:** `home_course_id` column was UUID type, but scripts tried to use empty string `''` when NULL.

**Fix Applied:**
- Script 1: Cast UUID to TEXT: `COALESCE(home_course_id::text, '')`
- Script 3: Added exception handling and proper UUID casting
- Created quick-fix script to verify table structure

---

## Installation Steps (Supabase SQL Editor)

### **Step 0: Quick Fix (Optional but Recommended)** ⏱️ 10 seconds

This verifies your table structure and prevents errors:

```sql
-- Copy/paste contents of: sql/00_SUPABASE_QUICK_FIX.sql
-- Click "Run"
-- ✅ Should show your column types
```

---

### **Step 1: Backfill Missing Data** ⏱️ 10 seconds

```sql
-- Copy/paste contents of: sql/01_backfill_missing_profile_data.sql
-- Click "Run"
-- ✅ Should see: "BACKFILL COMPLETE! Updated X profiles"
```

**What this does:**
- Fills empty `profile_data` JSONB fields
- Syncs flat columns → JSONB
- Backfills society data from `society_members`
- **Result:** 100% data completeness

---

### **Step 2: Add Username Column** ⏱️ 5 seconds

```sql
-- Copy/paste contents of: sql/02_add_username_column.sql
-- Click "Run"
-- ✅ Should see: "USERNAME COLUMN ADDED SUCCESSFULLY!"
```

**What this does:**
- Adds `username TEXT UNIQUE` column
- Backfills from existing data
- Resolves duplicates automatically
- **Result:** Username field with uniqueness enforced

---

### **Step 3: Create Data Sync Functions** ⏱️ 3 seconds

```sql
-- Copy/paste contents of: sql/03_create_data_sync_function.sql
-- Click "Run"
-- ✅ Should see: "DATA SYNC FUNCTIONS CREATED SUCCESSFULLY!"
```

**What this does:**
- Creates triggers on INSERT/UPDATE
- Keeps flat columns ↔ JSONB in sync
- Prevents data inconsistency
- **Result:** Dual storage always matches

---

### **Step 4: Intelligent LINE Signup** ⏱️ 5 seconds

```sql
-- Copy/paste contents of: sql/04_intelligent_line_signup_for_existing_members.sql
-- Click "Run"
-- ✅ Should see: "INTELLIGENT LINE SIGNUP SYSTEM CREATED!"
```

**What this does:**
- Creates `find_existing_member_matches()` function
- Creates `link_line_account_to_member()` function
- Creates `pending_member_links` table
- **Result:** Smart name matching for Rocky Jones scenario

---

## Verification

Run this after all 4 scripts:

```sql
-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
    'find_existing_member_matches',
    'link_line_account_to_member',
    'sync_profile_jsonb_to_columns',
    'sync_profile_columns_to_jsonb',
    'manual_sync_all_profiles'
);
-- Should return 5 rows

-- Check username column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name = 'username';
-- Should return 1 row: username | text

-- Check data completeness
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE profile_data::text != '{}') as with_data,
    ROUND(100.0 * COUNT(*) FILTER (WHERE profile_data::text != '{}') / COUNT(*), 2) as percentage
FROM user_profiles;
-- Should show 100% (or close to it)
```

---

## Common Errors & Solutions

### Error 1: `function already exists`

**Solution:** Functions use `CREATE OR REPLACE`, so this is safe. Just means script was run before.

### Error 2: `column "username" already exists`

**Solution:** Script 2 uses `ADD COLUMN IF NOT EXISTS`, safe to run multiple times.

### Error 3: `relation "pending_member_links" already exists`

**Solution:** Script 4 uses `CREATE TABLE IF NOT EXISTS`, safe to run multiple times.

### Error 4: `invalid input syntax for type uuid`

**Solution:** Run `00_SUPABASE_QUICK_FIX.sql` first, then try again. Issue is likely `home_course_id` column type mismatch.

---

## What Each Script Does (Summary)

| Script | Time | Purpose | Result |
|--------|------|---------|--------|
| 0 (optional) | 10s | Verify table structure | Prevents UUID errors |
| 1 | 10s | Backfill missing data | 100% completeness |
| 2 | 5s | Add username column | Unique usernames |
| 3 | 3s | Create sync functions | Data consistency |
| 4 | 5s | Intelligent signup | Smart matching |

**Total:** ~35 seconds

---

## Test the System

After running all scripts:

### **Test 1: Check functions**
```sql
SELECT * FROM find_existing_member_matches(
    'test_line_id',
    'Test User'
);
-- Should return empty result or matches if "Test User" exists
```

### **Test 2: Manual sync**
```sql
SELECT * FROM manual_sync_all_profiles();
-- Should return: (count, 'All profiles synced successfully')
```

### **Test 3: Data completeness**
```sql
SELECT
    line_user_id,
    name,
    username,
    CASE WHEN profile_data::text = '{}' THEN 'EMPTY' ELSE 'OK' END as profile_data_status
FROM user_profiles
LIMIT 10;
-- All should show 'OK' in profile_data_status
```

---

## Next Steps

✅ **After SQL installation:**

1. Read `FINAL_SIGNUP_FLOW.md` for complete flow explanation
2. Integrate JavaScript from `INTELLIGENT_LINE_SIGNUP_INTEGRATION.js`
3. Test with a real member signup
4. Verify handicap preservation
5. Check society membership application

---

## Rollback (If Needed)

```sql
-- Remove functions
DROP FUNCTION IF EXISTS find_existing_member_matches CASCADE;
DROP FUNCTION IF EXISTS link_line_account_to_member CASCADE;
DROP FUNCTION IF EXISTS sync_profile_jsonb_to_columns CASCADE;
DROP FUNCTION IF EXISTS sync_profile_columns_to_jsonb CASCADE;
DROP FUNCTION IF EXISTS manual_sync_all_profiles CASCADE;

-- Remove triggers
DROP TRIGGER IF EXISTS trigger_sync_jsonb_to_columns ON user_profiles;
DROP TRIGGER IF EXISTS trigger_sync_columns_to_jsonb ON user_profiles;

-- Remove table
DROP TABLE IF EXISTS pending_member_links CASCADE;

-- Remove username column (optional)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS username;

-- Note: Cannot rollback data backfill (data was only added, not changed)
```

---

## Support

**Still getting errors?**

1. Check Supabase logs: Dashboard → Logs → API Logs
2. Run `00_SUPABASE_QUICK_FIX.sql` to see column types
3. Send error message + column types for troubleshooting

**Common column type issues:**
- `home_course_id` should be TEXT (or UUID with proper casting)
- `society_id` should be UUID
- `profile_data` should be JSONB

---

## Success Criteria

✅ **Installation successful if:**
- All 4 scripts run without errors
- 5 functions created
- `username` column exists
- No UUID casting errors
- Data completeness near 100%

✅ **System working if:**
- Test queries return results
- No errors in Supabase logs
- Ready for JavaScript integration

---

**All scripts are now FIXED and ready to run!** 🚀

Start with Step 0 (quick fix) to prevent errors, then run Steps 1-4 in order.
