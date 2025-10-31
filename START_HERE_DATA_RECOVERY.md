# 🚨 START HERE - DATA RECOVERY PROCESS

**Date:** October 31, 2025
**Issue:** Data lost after October 25th rollback
**Status:** Recovery scripts ready to execute

---

## WHAT I FOUND

I've analyzed your codebase and found backup data in your SQL files. I've created comprehensive restoration scripts to recover:

1. ✅ **Pete Park** (your profile) - Username 007, Handicap 2, TRGG member
2. ✅ **Travellers Rest Golf Group (TRGG)** - Society organizer profile
3. ✅ **Database structure** - user_profiles, society_profiles, society_members

---

## EXECUTE THIS IN ORDER

### 🔍 STEP 1: Check Table Structure (30 seconds)

**Why:** First verify what tables and columns actually exist in your database.

**What to do:**
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/editor
2. Open file: `C:\Users\pete\Documents\MciPro\sql\CHECK_TABLE_STRUCTURE.sql`
3. Copy ALL contents
4. Paste into Supabase SQL Editor
5. Click **RUN**
6. Review output - do the tables exist? What columns do they have?

**What to look for:**
- ✅ Does `user_profiles` table exist?
- ✅ Does it have columns: `line_user_id`, `name`, `username`, `home_course_name`, `society_name`, `profile_data`?
- ⚠️ Does `society_profiles` table exist? (May need to create it)
- ⚠️ Does `society_members` table exist? (May need to create it)

---

### 📊 STEP 2: Diagnostic Check (1 minute)

**Why:** See what data currently exists and what's missing.

**What to do:**
1. Open file: `C:\Users\pete\Documents\MciPro\sql\DIAGNOSTIC_CHECK_ALL_DATA.sql`
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **RUN**
5. **TAKE SCREENSHOTS** of the results

**What to look for:**
- How many user profiles exist?
- Is Pete Park in there? With correct data?
- Are any societies listed?
- What data is missing?

---

### 🔧 STEP 3: Create Missing Tables (if needed - 30 seconds)

**If** Step 1 showed that `society_profiles` or `society_members` tables don't exist:

1. Open file: `C:\Users\pete\Documents\MciPro\sql\society-golf-schema.sql`
2. Copy contents
3. Paste into Supabase SQL Editor
4. Click **RUN**
5. This creates the missing tables

**Skip this step** if tables already exist.

---

### 🚀 STEP 4: Restore All Data (2 minutes)

**Why:** This is the main restoration - fixes Pete's profile, creates TRGG society, links everything.

**What to do:**
1. Open file: `C:\Users\pete\Documents\MciPro\sql\MASTER_DATA_RESTORATION.sql`
2. **REVIEW SECTION 5** - If you know other users who need restoration, add them now
3. Copy ALL contents
4. Paste into Supabase SQL Editor
5. Click **RUN**
6. Watch for success messages

**Expected output:**
```
========== RESTORING PETE PARK ==========
========== RESTORING TRGG ORGANIZER ==========
========== RESTORING SOCIETY PROFILES ==========
========== RESTORING SOCIETY MEMBERS ==========
...
============================================================================
MASTER DATA RESTORATION COMPLETE
============================================================================
RESTORED DATA:
  - User Profiles: X
  - Organizers: X
  - Societies: X

✅ Pete Park (Username 007, Handicap 2, TRGG Member)
✅ Travellers Rest Golf Group (Organizer)
✅ Society Profiles Created
✅ Society Memberships Linked
```

**If you see errors:**
- Note the exact error message
- It might be due to missing tables (go back to Step 3)
- Or due to column name mismatches (I can fix this)

---

### ✅ STEP 5: Verify in Application (2 minutes)

**What to do:**
1. Open https://mycaddipro.com
2. Log in with LINE as Pete Park
3. Check your profile page

**Expected results:**
- Name: **Pete Park** ✅
- Username: **007** ✅
- Handicap: **2** ✅
- Home Course: **Pattaya CC Golf** ✅
- Society: **Travellers Rest Golf Group** ✅

4. Go to Society Dashboard
5. Should see "Travellers Rest Golf Group" in the list
6. Logo should display

**If something is wrong:**
- Check browser console for errors (F12)
- Re-run diagnostic SQL to see database state
- Let me know what specific field is wrong

---

## 📁 FILES CREATED FOR YOU

| File | Purpose | When to Use |
|------|---------|-------------|
| `sql/CHECK_TABLE_STRUCTURE.sql` | See what tables/columns exist | Step 1 - Before restoration |
| `sql/DIAGNOSTIC_CHECK_ALL_DATA.sql` | Check current data state | Step 2 - See what's missing |
| `sql/MASTER_DATA_RESTORATION.sql` | **MAIN RESTORATION SCRIPT** | Step 4 - Restore everything |
| `DATA_RESTORATION_GUIDE.md` | Detailed troubleshooting guide | If you encounter problems |
| `START_HERE_DATA_RECOVERY.md` | This file - Quick start guide | Start here! |

---

## 🆘 IF THINGS GO WRONG

### Error: "relation society_profiles does not exist"
**Solution:** Go to Step 3, create missing tables with `society-golf-schema.sql`

### Error: "column organizer_name does not exist"
**Solution:** Already fixed! Re-download the updated `MASTER_DATA_RESTORATION.sql`

### Pete's data is still incomplete after restoration
**Solution:**
1. Run diagnostic check again
2. See which specific fields are missing
3. Manually run UPDATE query for those fields:
```sql
UPDATE user_profiles
SET
    username = '007',
    home_course_name = 'Pattaya CC Golf',
    society_name = 'Travellers Rest Golf Group'
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
```

### Other users are missing
**Solution:**
1. Get list of expected users
2. Edit `MASTER_DATA_RESTORATION.sql` SECTION 5
3. Add their data using the template provided
4. Re-run restoration script

---

## 💡 IMPORTANT NOTES

1. **Safe to run multiple times** - All scripts use `ON CONFLICT DO UPDATE`, so you can run them repeatedly without duplicating data

2. **Transaction protected** - Uses BEGIN/COMMIT, so if anything fails, database rolls back (no partial changes)

3. **Incremental approach** - You don't need to restore everyone at once. Start with Pete, verify it works, then add others

4. **No code changes required** - These are pure SQL scripts. Your application code doesn't change.

---

## WHAT TO DO AFTER RESTORATION

1. ✅ Commit the restoration scripts to git:
   ```bash
   git add sql/*.sql *.md
   git commit -m "Add data restoration scripts - recovery from Oct 25 rollback"
   git push
   ```

2. ✅ Test all workflows:
   - Login
   - Profile editing
   - Society event creation
   - Scorecard entry
   - Round history

3. ✅ Ask other users to log in and verify their data

4. ✅ Keep restoration scripts for future reference

---

## TIMELINE

| Step | Time | Cumulative |
|------|------|------------|
| 1. Check table structure | 30s | 30s |
| 2. Run diagnostic | 1 min | 1m 30s |
| 3. Create tables (if needed) | 30s | 2m |
| 4. Restore all data | 2 min | 4m |
| 5. Verify in app | 2 min | 6m |

**Total time: ~6 minutes from start to verified restoration**

---

## READY TO START?

1. **Open Supabase:** https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/editor

2. **Start with Step 1:** Run `CHECK_TABLE_STRUCTURE.sql`

3. **Follow the steps in order**

4. **Report back:** Let me know the results at each step

---

## NEED HELP?

If you encounter any issues:
1. Note the exact error message
2. Send me the output from the diagnostic check
3. Tell me which step failed
4. I'll create custom fix for your specific situation

---

**Good luck! Let's get your data back. 🚀**
