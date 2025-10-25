# HOME COURSE MISSING - Complete Fix (ALL PROFILES)

**Date:** 2025-10-21
**Status:** ✅ CODE FIXED + DEPLOYED | ⏳ SQL NEEDS TO BE RUN
**Commit:** e9da3370
**Scope:** 🌍 ALL USER PROFILES (not just Pete)

---

## What Happened

Home course data is missing from **ALL golfer profiles**. The field shows as empty/undefined in the UI even though the data exists in the database.

---

## Root Cause

The `user_profiles` table was migrated to add new columns:
- `home_course_id` (TEXT)
- `home_course_name` (TEXT)
- `society_id` (UUID)
- `society_name` (TEXT)
- `member_since` (TIMESTAMPTZ)

**HOWEVER**, the `saveUserProfile()` method in `supabase-config.js` was **NEVER UPDATED** to save these new columns.

### The Problem:

When a profile is saved with `.upsert()`:
1. ✅ It saves the old columns: `name`, `role`, `email`, `home_club` (deprecated), etc.
2. ❌ It does NOT save the new columns: `home_course_name`, `society_name`, etc.
3. 🔴 The upsert **OVERWRITES** the entire row without these columns
4. 🔴 Result: New columns are set to NULL, **WIPING OUT** existing data

**This happened every time you:**
- Logged in (profile restore triggers save)
- Updated your profile
- Any operation that called `saveUserProfile()`

---

## The Fix (2 Parts)

### Part 1: Code Fix ✅ DEPLOYED

**File:** `supabase-config.js` (lines 257-264)

**What Changed:**

The `saveUserProfile()` method now saves ALL the new columns:

```javascript
// ===== NEW: Society Affiliation Fields =====
society_id: profile.society_id || profile.societyId || null,
society_name: profile.society_name || profile.societyName || profile.organizationInfo?.societyName || '',
member_since: profile.member_since || profile.memberSince || null,

// ===== NEW: Home Course Fields =====
home_course_id: profile.home_course_id || profile.homeCourseId || profile.golfInfo?.homeCourseId || '',
home_course_name: profile.home_course_name || profile.homeCourseName || profile.golfInfo?.homeClub || '',
```

Also added `organizationInfo` to the `profile_data` JSONB (line 270).

**Deployment:**
- Commit: e9da3370
- Deployed: 2025-10-21T13:50:36Z
- Status: ✅ Live on Netlify

**Effect:**
- Future profile saves will now correctly preserve these columns
- Prevents the data from being wiped out again

---

### Part 2: Data Restoration ⏳ NEEDS TO BE RUN

**File:** `sql/RESTORE_HOME_COURSE_FROM_JSONB.sql`

**What It Does:**

Even though the columns were set to NULL, the data still exists in the `profile_data` JSONB column (in `golfInfo.homeClub` and `organizationInfo.societyName`).

This SQL extracts that data and populates the dedicated columns:

```sql
UPDATE user_profiles
SET
    home_course_name = COALESCE(
        home_course_name,
        profile_data->'golfInfo'->>'homeClub',
        home_club
    ),
    society_name = COALESCE(
        society_name,
        profile_data->'organizationInfo'->>'societyName'
    ),
    home_club = COALESCE(
        home_club,
        profile_data->'golfInfo'->>'homeClub'
    )
WHERE profile_data IS NOT NULL;
```

---

## How to Fix (Step-by-Step)

### Step 1: Clear Browser Cache

The code fix is already deployed, but you need to clear your cache:

1. Open DevTools (F12)
2. Go to **Application** > **Service Workers**
3. Click **Unregister**
4. Close and reopen browser completely
5. Hard refresh: **Ctrl+Shift+R**

### Step 2: Run SQL to Restore Data

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select project: **pyeeplwsnupmhgbguwqs**
3. Go to **SQL Editor**
4. Click **New Query**
5. Open this file on your computer:
   ```
   C:\Users\pete\Documents\MciPro\sql\RESTORE_HOME_COURSE_FROM_JSONB.sql
   ```
6. Copy the ENTIRE contents
7. Paste into SQL Editor
8. Click **RUN** (⏵)

### Step 3: Verify

You should see query results showing:
```
✅ Home Course Data Restored
total_profiles: [number of profiles]
profiles_with_old_home_club: [count]
profiles_with_new_home_course: [count]
profiles_with_society: [count]
```

The SQL also shows ALL profiles with their restored data:
```
line_user_id | name | old_home_club | new_home_course_name | society_name
-------------|------|---------------|----------------------|-------------
U2b6d976...  | Pete | Pattana Golf  | Pattana Golf Resort  | Travellers...
[... all other profiles ...]
```

**IMPORTANT:** This restores data for **ALL users in the database**, not just one profile.

### Step 4: Test in Production

1. Go to https://mycaddipro.com
2. Log in with LINE (any user account)
3. Go to Profile page
4. **Expected for all users:**
   - ✅ Home course visible (if they had one before)
   - ✅ Society name visible (if they were in one)
   - ✅ All fields populated correctly

**Note:** This fix restores data for **every user profile** in the system, not just the admin/Pete account.

---

## Why This Happened

This issue was introduced when the database schema was migrated to add new columns, but the corresponding code changes in `supabase-config.js` were never implemented.

The migration files were created:
- `sql/add_home_course_to_user_profiles.sql` - Added columns to DB ✅
- `sql/add_society_affiliation_to_user_profiles.sql` - Added columns to DB ✅
- `PROFILE_UPDATE_INSTRUCTIONS.md` - Documented what code changes needed to be made ✅

But the instructions in `PROFILE_UPDATE_INSTRUCTIONS.md` were never followed:
- ❌ Code in `supabase-config.js` was never updated
- ❌ Migration SQL (`migrate_existing_profile_data.sql`) was likely never run

---

## Files Modified

### Code Changes (Deployed):
1. `supabase-config.js` - Updated `saveUserProfile()` method (lines 257-270)
2. `sw.js` - Service Worker version bump

### SQL Scripts Created:
1. `sql/RESTORE_HOME_COURSE_FROM_JSONB.sql` - Data restoration script

### Documentation:
1. `HOME_COURSE_FIX_2025-10-21.md` - This file

---

## Summary

| Component | Issue | Status | Action Required |
|-----------|-------|--------|-----------------|
| Database Schema | ✅ Columns exist | Working | None |
| Code (saveUserProfile) | ❌ Not saving new columns | ✅ FIXED (e9da3370) | Clear browser cache |
| Profile Data | ❌ Columns are NULL | ⏳ Needs restore | Run SQL script |
| Future Saves | ❌ Would wipe data | ✅ FIXED | None - code deployed |

---

## Next Steps

1. ✅ Code fix is deployed (commit e9da3370)
2. ⏳ **Run SQL:** `sql/RESTORE_HOME_COURSE_FROM_JSONB.sql` in Supabase
3. ⏳ **Clear cache** and test in browser
4. ✅ System will be 100% working

---

## Prevention

The `saveUserProfile()` method now includes ALL columns in the `user_profiles` table schema:

**Saved Fields:**
- ✅ line_user_id, name, role, caddy_number, phone, email
- ✅ home_club (old/deprecated but kept for compatibility)
- ✅ language
- ✅ **society_id** (NEW)
- ✅ **society_name** (NEW)
- ✅ **member_since** (NEW)
- ✅ **home_course_id** (NEW)
- ✅ **home_course_name** (NEW)
- ✅ profile_data (JSONB with all nested data including organizationInfo)

Future schema changes must ALWAYS be accompanied by corresponding code updates in `supabase-config.js`.
