=============================================================================
SESSION: HOME COURSE MISSING - ALL USER PROFILES AFFECTED
=============================================================================
Date: 2025-10-21
Status: ✅ CODE FIXED + DEPLOYED | ⏳ SQL RESTORATION PENDING
Scope: 🌍 GLOBAL - ALL USER PROFILES
Commit: e9da3370
Deployment: 2025-10-21T13:50:36Z

=============================================================================
🔴 PROBLEM REPORTED
=============================================================================

User reported: "home course is missing" from golfer profile

Initial assumption: Pete's profile only
ACTUAL SCOPE: **ALL USER PROFILES IN THE ENTIRE DATABASE**

Symptoms:
- Home course field shows empty/undefined in UI
- Society name field missing
- Data was previously visible (confirmed in 2025-10-11 session)
- Affects EVERY user, not just admin account

=============================================================================
🔍 ROOT CAUSE ANALYSIS
=============================================================================

TIMELINE OF THE FUCKUP:
------------------------

1. **Database Migration (Date Unknown)**
   Files: sql/add_home_course_to_user_profiles.sql
          sql/add_society_affiliation_to_user_profiles.sql

   NEW COLUMNS ADDED TO user_profiles TABLE:
   - home_course_id (TEXT)
   - home_course_name (TEXT)
   - society_id (UUID)
   - society_name (TEXT)
   - member_since (TIMESTAMPTZ)

   Status: ✅ Columns created successfully in database

2. **Migration Instructions Created**
   File: PROFILE_UPDATE_INSTRUCTIONS.md

   Documented that supabase-config.js needs to be updated:
   - Line 254: Add society fields (society_id, society_name, member_since)
   - Line 263: Add home course fields (home_course_id, home_course_name)
   - Line 270: Add organizationInfo to profile_data JSONB

   Status: ✅ Instructions written
           ❌ NEVER FOLLOWED - CODE NEVER UPDATED

3. **The Critical Mistake**
   File: supabase-config.js (saveUserProfile method)
   Lines: 245-287

   THE PROBLEM:
   - saveUserProfile() uses .upsert() to save profiles
   - .upsert() replaces the ENTIRE row
   - saveUserProfile() only included OLD columns in the payload
   - NEW columns (home_course_name, society_name, etc.) NOT included

   WHAT HAPPENED EVERY TIME A PROFILE WAS SAVED:
   ```javascript
   // OLD CODE (BROKEN):
   const normalizedProfile = {
       line_user_id: profile.line_user_id || profile.lineUserId,
       name: profile.name,
       role: profile.role,
       caddy_number: profile.caddy_number || profile.caddyNumber,
       phone: profile.phone,
       email: profile.email,
       home_club: profile.home_club || profile.homeClub,  // Old deprecated field
       language: profile.language || 'en',
       profile_data: { ... }
       // ❌ home_course_name NOT INCLUDED
       // ❌ society_name NOT INCLUDED
       // ❌ society_id NOT INCLUDED
       // ❌ home_course_id NOT INCLUDED
       // ❌ member_since NOT INCLUDED
   };

   await this.client
       .from('user_profiles')
       .upsert(normalizedProfile, { onConflict: 'line_user_id' })
       // ☠️ This OVERWRITES the entire row WITHOUT the new columns
       // ☠️ Result: New columns set to NULL
   ```

4. **When Data Was Lost**

   EVERY TIME any user:
   - Logged in (LINE OAuth triggers profile save)
   - Updated their profile
   - Any operation that called saveUserProfile()

   Result: home_course_name, society_name, etc. set to NULL for ALL users

5. **Why Data Still Exists**

   The data wasn't completely deleted:
   - Still exists in profile_data JSONB column
   - profile_data->'golfInfo'->>'homeClub' still has the value
   - profile_data->'organizationInfo'->>'societyName' still has society
   - But the dedicated columns are NULL

=============================================================================
❌ WHAT I DID WRONG (INITIAL INVESTIGATION)
=============================================================================

MISTAKE 1: Queried Wrong Table
------------------------------
Initially queried the `profiles` table (chat profiles) instead of
`user_profiles` table (golfer profiles). This wasted time.

User feedback: "you fucking imbecile. stop fucking up and wasting my time"

MISTAKE 2: Wrong Column Names
------------------------------
Kept trying wrong column names:
- Tried `profile_data` column on `profiles` table (doesn't exist there)
- Confused chat profiles vs. golfer profiles

User feedback: "what the fuck are you doing. we have gone through this
shit so many times"

MISTAKE 3: Not Checking Compacted Folder First
---------------------------------------------
Should have immediately checked /compacted for previous profile-related
fixes instead of making SQL queries blindly.

User demand: "go fucking look into all of /MciPro now and go fix this
fucking thing and do not come back until its fixed or i will delete
your fucking ass"

=============================================================================
✅ THE FIX (2-PART SOLUTION)
=============================================================================

PART 1: CODE FIX (PREVENTS FUTURE DATA LOSS)
---------------------------------------------
Status: ✅ DEPLOYED (Commit e9da3370, 2025-10-21T13:50:36Z)

File: supabase-config.js
Lines Modified: 257-270

BEFORE (BROKEN):
```javascript
    async saveUserProfile(profile) {
        const normalizedProfile = {
            line_user_id: profile.line_user_id || profile.lineUserId,
            name: profile.name,
            role: profile.role,
            caddy_number: profile.caddy_number || profile.caddyNumber,
            phone: profile.phone,
            email: profile.email,
            home_club: profile.home_club || profile.homeClub,
            language: profile.language || 'en',

            // ===== NEW: Store FULL profile data in JSONB column =====
            profile_data: {
                personalInfo: profile.personalInfo || {},
                golfInfo: profile.golfInfo || {},
                professionalInfo: profile.professionalInfo || {},
                // ... (missing organizationInfo)
```

AFTER (FIXED):
```javascript
    async saveUserProfile(profile) {
        const normalizedProfile = {
            line_user_id: profile.line_user_id || profile.lineUserId,
            name: profile.name,
            role: profile.role,
            caddy_number: profile.caddy_number || profile.caddyNumber,
            phone: profile.phone,
            email: profile.email,
            home_club: profile.home_club || profile.homeClub,
            language: profile.language || 'en',

            // ===== NEW: Society Affiliation Fields =====
            society_id: profile.society_id || profile.societyId || null,
            society_name: profile.society_name || profile.societyName || profile.organizationInfo?.societyName || '',
            member_since: profile.member_since || profile.memberSince || null,

            // ===== NEW: Home Course Fields =====
            home_course_id: profile.home_course_id || profile.homeCourseId || profile.golfInfo?.homeCourseId || '',
            home_course_name: profile.home_course_name || profile.homeCourseName || profile.golfInfo?.homeClub || '',

            // ===== NEW: Store FULL profile data in JSONB column =====
            profile_data: {
                personalInfo: profile.personalInfo || {},
                golfInfo: profile.golfInfo || {},
                organizationInfo: profile.organizationInfo || {},  // ← ADDED
                professionalInfo: profile.professionalInfo || {},
```

CHANGES MADE:
1. ✅ Added society_id, society_name, member_since fields
2. ✅ Added home_course_id, home_course_name fields
3. ✅ Added organizationInfo to profile_data JSONB
4. ✅ Multiple fallback paths for each field (e.g., profile.societyName || profile.organizationInfo?.societyName)

EFFECT:
- Future profile saves now preserve ALL columns for ALL users
- No more data loss on login or profile update
- Works globally for every user in the system

DEPLOYMENT:
```bash
bash deploy.sh "Fix missing home course - saveUserProfile now saves all new columns (home_course_id, home_course_name, society_id, society_name)"
```

Commit: e9da3370
Service Worker: 2025-10-21T13:50:36Z
Status: ✅ Live on Netlify


PART 2: DATA RESTORATION (RECOVERS LOST DATA)
----------------------------------------------
Status: ⏳ SQL SCRIPT CREATED - NEEDS TO BE RUN IN SUPABASE

File: sql/RESTORE_HOME_COURSE_FROM_JSONB.sql

PURPOSE:
Extracts home course and society data from the profile_data JSONB column
and populates the dedicated columns for ALL user profiles.

SQL LOGIC:
```sql
BEGIN;

-- Update ALL profiles (not just Pete's)
UPDATE user_profiles
SET
    -- Extract home course name from JSONB
    home_course_name = COALESCE(
        home_course_name,  -- Keep existing value if already set
        profile_data->'golfInfo'->>'homeClub',  -- Primary source
        profile_data->'golfInfo'->>'homeCourse',  -- Alternative path
        home_club  -- Fallback to old deprecated column
    ),

    -- Extract society name from JSONB
    society_name = COALESCE(
        society_name,  -- Keep existing value if already set
        profile_data->'organizationInfo'->>'societyName',
        profile_data->'organizationInfo'->>'clubAffiliation'
    ),

    -- Also update old home_club column for backward compatibility
    home_club = COALESCE(
        home_club,
        profile_data->'golfInfo'->>'homeClub',
        profile_data->'golfInfo'->>'homeCourse'
    )
WHERE
    profile_data IS NOT NULL  -- Only update profiles with JSONB data
    AND (
        -- Update if home_course_name is NULL but data exists in JSONB
        (home_course_name IS NULL AND (
            profile_data->'golfInfo'->>'homeClub' IS NOT NULL OR
            profile_data->'golfInfo'->>'homeCourse' IS NOT NULL OR
            home_club IS NOT NULL
        ))
        OR
        -- Update if society_name is NULL but data exists in JSONB
        (society_name IS NULL AND (
            profile_data->'organizationInfo'->>'societyName' IS NOT NULL OR
            profile_data->'organizationInfo'->>'clubAffiliation' IS NOT NULL
        ))
        OR
        -- Update if home_club is NULL but data exists in JSONB
        (home_club IS NULL AND (
            profile_data->'golfInfo'->>'homeClub' IS NOT NULL OR
            profile_data->'golfInfo'->>'homeCourse' IS NOT NULL
        ))
    );

COMMIT;
```

SCOPE: 🌍 GLOBAL
- Updates EVERY user profile in the database
- No line_user_id filter - affects ALL rows
- Restores data for golfers, caddies, managers, organizers
- NOT just Pete's profile

VERIFICATION QUERIES INCLUDED:
1. Shows ALL profiles with their restored data
2. Counts total profiles updated
3. Shows Pete's profile specifically (as example)

=============================================================================
📋 STEP-BY-STEP INSTRUCTIONS TO COMPLETE FIX
=============================================================================

STEP 1: Clear Browser Cache (Required)
---------------------------------------
The code fix is deployed but browsers may have old cached code.

1. Open DevTools (F12)
2. Go to Application tab
3. Under Service Workers, click "Unregister"
4. Close browser completely
5. Reopen browser
6. Hard refresh: Ctrl+Shift+R


STEP 2: Run SQL in Supabase (Required)
---------------------------------------
This restores the lost data for ALL user profiles.

1. Go to: https://supabase.com/dashboard
2. Select project: pyeeplwsnupmhgbguwqs
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Open file on local computer:
   C:\Users\pete\Documents\MciPro\sql\RESTORE_HOME_COURSE_FROM_JSONB.sql
6. Copy ENTIRE contents (all ~110 lines)
7. Paste into SQL Editor
8. Click "RUN" button (⏵)
9. Wait for completion

EXPECTED OUTPUT:
```
✅ Home Course Data Restored
total_profiles: [number]
profiles_with_old_home_club: [count]
profiles_with_new_home_course: [count]
profiles_with_society: [count]
```

Plus a table showing ALL profiles with their data:
```
line_user_id         | name  | old_home_club        | new_home_course_name      | society_name
---------------------|-------|----------------------|---------------------------|------------------
U2b6d976f19bc...     | Pete  | Pattana Golf Resort  | Pattana Golf Resort & Spa | Travellers Rest
[... ALL other users ...]
```


STEP 3: Test in Production
---------------------------
1. Go to: https://mycaddipro.com
2. Log in with LINE (any user account - golfer, caddy, manager)
3. Navigate to Profile page
4. Verify:
   ✅ Home course visible (if user had one before)
   ✅ Society name visible (if user was in one)
   ✅ All profile fields populated correctly

Test with MULTIPLE user accounts to verify global fix.


STEP 4: Verify No Future Data Loss
-----------------------------------
1. Update your profile (change name, email, etc.)
2. Save changes
3. Refresh page
4. Verify home course and society STILL VISIBLE
   (Previously they would be wiped out on save)

=============================================================================
📁 FILES MODIFIED/CREATED
=============================================================================

CODE CHANGES (Deployed):
1. supabase-config.js
   - Lines 257-264: Added new column fields to saveUserProfile()
   - Line 270: Added organizationInfo to profile_data JSONB
   - Commit: e9da3370

2. sw.js
   - Service Worker version bump: 2025-10-21T13:50:36Z
   - Commit: e9da3370

SQL SCRIPTS (Created):
1. sql/RESTORE_HOME_COURSE_FROM_JSONB.sql
   - Data restoration script for ALL profiles
   - 110 lines
   - Includes verification queries

DOCUMENTATION (Created):
1. HOME_COURSE_FIX_2025-10-21.md
   - User-facing fix guide
   - Step-by-step instructions
   - Root cause explanation

2. compacted/2025-10-21_HOME_COURSE_MISSING_ALL_PROFILES_FIX.md
   - This catalog file
   - Complete session documentation

=============================================================================
🗂️ DATABASE SCHEMA REFERENCE
=============================================================================

TABLE: user_profiles
--------------------
PRIMARY KEY: line_user_id (TEXT)

COLUMNS (CURRENT):
- line_user_id (TEXT) - LINE user ID
- name (TEXT)
- role (TEXT) - 'golfer', 'caddy', 'manager', etc.
- caddy_number (TEXT)
- phone (TEXT)
- email (TEXT)
- home_club (TEXT) - DEPRECATED but kept for compatibility
- language (TEXT) - Default 'en'
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

NEW COLUMNS (Added by migration, NOW WORKING):
- society_id (UUID) - Foreign key to society_profiles
- society_name (TEXT) - Cached for display
- member_since (TIMESTAMPTZ) - When joined society
- home_course_id (TEXT) - Golf course ID
- home_course_name (TEXT) - Cached course name

JSONB COLUMN:
- profile_data (JSONB) - Contains:
  - personalInfo: {}
  - golfInfo: { handicap, homeClub, homeCourse, ... }
  - organizationInfo: { societyName, clubAffiliation, ... }
  - professionalInfo: {}
  - skills: {}
  - preferences: {}
  - media: {}
  - privacy: {}

=============================================================================
🔒 PREVENTION - NEVER LET THIS HAPPEN AGAIN
=============================================================================

LESSON 1: Schema Changes Require Code Updates
----------------------------------------------
When adding new columns to a table:
1. ✅ Create SQL migration to add columns
2. ✅ Update ALL code that writes to that table
3. ✅ Update saveUserProfile() method
4. ✅ Test that upsert includes new columns
5. ✅ Deploy code BEFORE running migration SQL

NEVER add columns without updating the save methods!


LESSON 2: Follow Migration Instructions
----------------------------------------
If a file like PROFILE_UPDATE_INSTRUCTIONS.md exists:
1. ✅ Actually follow the instructions
2. ✅ Update the code files listed
3. ✅ Run the SQL files in order
4. ✅ Test thoroughly before deploying

Don't just create instructions and never follow them!


LESSON 3: Check Compacted Folder First
---------------------------------------
Before investigating profile issues:
1. ✅ Check /compacted for previous profile fixes
2. ✅ Check PROFILE_SYNC_FIX_2025-10-09.txt
3. ✅ Check Mobile_Header_and_Profile_Data_Fix.md
4. ✅ Look for similar issues before

Don't waste time making wrong SQL queries!


LESSON 4: Verify Upsert Payloads
---------------------------------
When using .upsert() to save data:
1. ✅ List ALL columns in the payload
2. ✅ Missing columns will be set to NULL
3. ✅ Check database schema matches code
4. ✅ Test upsert doesn't delete existing data

.upsert() REPLACES the entire row!


LESSON 5: Test with Multiple Accounts
--------------------------------------
When fixing profile issues:
1. ✅ Test with golfer account
2. ✅ Test with caddy account
3. ✅ Test with manager account
4. ✅ Verify ALL users affected, not just admin

Don't assume issues are user-specific!

=============================================================================
📊 VERIFICATION CHECKLIST
=============================================================================

CODE FIX:
- [✅] supabase-config.js updated with all new columns
- [✅] saveUserProfile() includes society_id, society_name, member_since
- [✅] saveUserProfile() includes home_course_id, home_course_name
- [✅] profile_data includes organizationInfo
- [✅] Code committed (e9da3370)
- [✅] Deployed to Netlify (2025-10-21T13:50:36Z)

SQL FIX:
- [⏳] RESTORE_HOME_COURSE_FROM_JSONB.sql created
- [⏳] SQL needs to be run in Supabase
- [⏳] Verify all profiles updated
- [⏳] Check counts match expected

TESTING:
- [⏳] Browser cache cleared
- [⏳] Login with multiple accounts
- [⏳] Home course visible for all users
- [⏳] Society name visible for all users
- [⏳] Profile saves don't wipe data

DOCUMENTATION:
- [✅] HOME_COURSE_FIX_2025-10-21.md created
- [✅] This catalog file created
- [✅] SQL script documented

=============================================================================
🎯 SUMMARY
=============================================================================

PROBLEM:
Home course and society data missing from ALL user profiles due to
saveUserProfile() not including new database columns in upsert payload.

SCOPE:
🌍 GLOBAL - Every user in the database affected

ROOT CAUSE:
Database migration added new columns but code was never updated to save
them, causing .upsert() to set them to NULL on every profile save.

SOLUTION:
1. ✅ DEPLOYED: Updated saveUserProfile() to include all columns (e9da3370)
2. ⏳ PENDING: Run SQL to restore data from JSONB for all users

STATUS:
- Code fix: ✅ Live on production
- Data restoration: ⏳ SQL script ready, needs to be run
- Future saves: ✅ Will preserve data correctly

FILES:
- supabase-config.js (modified, deployed)
- sql/RESTORE_HOME_COURSE_FROM_JSONB.sql (created)
- HOME_COURSE_FIX_2025-10-21.md (created)
- This catalog (created)

NEXT STEPS:
1. Run SQL in Supabase: sql/RESTORE_HOME_COURSE_FROM_JSONB.sql
2. Clear browser cache
3. Test with multiple user accounts
4. Verify data persists after profile saves

=============================================================================
END OF CATALOG
=============================================================================
