# DATA RESTORATION GUIDE
**Created:** October 31, 2025
**Purpose:** Restore all lost data after October 25th rollback

---

## WHAT HAPPENED

Your code was rolled back to October 25th version, but the database was NOT rolled back. This means:
- ❌ User profile data may be incomplete or missing
- ❌ Society data may be incomplete
- ❌ Some users may have lost handicaps, home courses, society memberships
- ❌ Your personal data (Pete Park) needs restoration

---

## WHAT WE'RE RESTORING

Based on the SQL files in your `/sql` folder, I've found backup data for:

1. **Pete Park** (YOU)
   - LINE ID: U2b6d976f19bca4b2f4374ae0e10ed873
   - Username: 007
   - Handicap: 2
   - Home Course: Pattaya CC Golf
   - Society: Travellers Rest Golf Group

2. **Travellers Rest Golf Group (TRGG)**
   - Organizer profile
   - Society profile
   - Logo and website info

3. **Database Schema**
   - user_profiles
   - society_profiles
   - society_members linkage

---

## STEP-BY-STEP RESTORATION

### STEP 1: CHECK CURRENT STATE

1. Go to Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/editor
   ```

2. Open this file and copy ALL contents:
   ```
   C:\Users\pete\Documents\MciPro\sql\DIAGNOSTIC_CHECK_ALL_DATA.sql
   ```

3. Paste into Supabase SQL Editor and click **RUN**

4. Review the output:
   - How many user profiles exist?
   - Are names missing?
   - Is your profile (Pete Park) correct?
   - Are societies missing?
   - Do you see any data at all?

5. **IMPORTANT:** Take screenshots or copy the results for comparison later

---

### STEP 2: RESTORE ALL DATA

1. Open this file in a text editor:
   ```
   C:\Users\pete\Documents\MciPro\sql\MASTER_DATA_RESTORATION.sql
   ```

2. **REVIEW SECTION 5** - "RESTORE OTHER KNOWN USERS"
   - This section has a template for adding more users
   - If you know other users' data (names, LINE IDs, handicaps), uncomment and fill in
   - If not, we'll add them later as you identify them

3. Copy the ENTIRE contents of `MASTER_DATA_RESTORATION.sql`

4. Paste into Supabase SQL Editor

5. Click **RUN**

6. Watch for success messages in the output:
   - ✅ Pete Park restored
   - ✅ TRGG organizer restored
   - ✅ Society profiles created
   - ✅ Verification queries run

7. Check the verification output at the bottom:
   - Does Pete Park show correct data?
   - Do societies appear?
   - Are there any error messages?

---

### STEP 3: VERIFY IN APPLICATION

1. Open your application: `https://mycaddipro.com`

2. Log in as Pete Park (LINE login)

3. Check your profile:
   - Name: Pete Park ✅
   - Username: 007 ✅
   - Handicap: 2 ✅
   - Home Course: Pattaya CC Golf ✅
   - Society: Travellers Rest Golf Group ✅

4. Check Society Dashboard:
   - Go to Society Organizer view
   - Should see "Travellers Rest Golf Group" ✅
   - Logo should display ✅

5. Test creating an event or browsing events

---

### STEP 4: IDENTIFY MISSING USERS

After restoration, if you notice users are still missing:

1. Ask them to log in once to create their LINE user entry

2. Once they log in, run this query in Supabase to see their data:
   ```sql
   SELECT line_user_id, name, email, role, home_course_name, society_name
   FROM user_profiles
   WHERE name ILIKE '%their name%';
   ```

3. If their data is incomplete, add a new section to `MASTER_DATA_RESTORATION.sql` following the template in SECTION 5

4. Re-run the restoration script

---

## FILES CREATED FOR YOU

| File | Purpose |
|------|---------|
| `sql/DIAGNOSTIC_CHECK_ALL_DATA.sql` | Check current database state |
| `sql/MASTER_DATA_RESTORATION.sql` | Restore all known data |
| `DATA_RESTORATION_GUIDE.md` | This guide |

---

## WHAT DATA IS CURRENTLY RESTORED

### User Profiles:
- ✅ Pete Park (Handicap 2, Username 007, TRGG member)

### Societies:
- ✅ Travellers Rest Golf Group (TRGG)
- ✅ Ora Ora Golf (if exists)

### Society Memberships:
- ✅ Pete Park → TRGG (Primary society)

### What's NOT restored yet:
- ❌ Other users (need to identify them from diagnostic check)
- ❌ Event registrations (if any were lost)
- ❌ Round history (if any were lost)
- ❌ Other society members

---

## HOW TO ADD MORE USERS

If you identify more users who need restoration:

1. Find their data from:
   - Old screenshots
   - Previous SQL files in `/sql` folder
   - Your memory of their profile details
   - Ask them directly

2. Edit `MASTER_DATA_RESTORATION.sql` SECTION 5

3. Copy this template and fill in their details:
   ```sql
   INSERT INTO user_profiles (
       line_user_id, name, email, role, home_club, home_course_name, society_name, profile_data, created_at, updated_at
   )
   VALUES (
       'U__THEIR_LINE_ID__',  -- Get this from diagnostic check or ask them to log in
       'User Name',
       'email@example.com',
       'golfer',
       'Their Home Club',
       'Their Home Course',
       'Their Society Name',
       jsonb_build_object(
           'personalInfo', jsonb_build_object('firstName', 'First', 'lastName', 'Last'),
           'golfInfo', jsonb_build_object('handicap', '10', 'homeClub', 'Club Name')
       ),
       NOW(),
       NOW()
   )
   ON CONFLICT (line_user_id) DO UPDATE
   SET
       name = EXCLUDED.name,
       home_club = EXCLUDED.home_club,
       home_course_name = EXCLUDED.home_course_name,
       society_name = EXCLUDED.society_name,
       profile_data = EXCLUDED.profile_data,
       updated_at = NOW();
   ```

4. Re-run the entire `MASTER_DATA_RESTORATION.sql` script

---

## TROUBLESHOOTING

### Problem: "Pete Park data is still not 100%"

**Solution:** Check which specific fields are missing:
```sql
SELECT
    line_user_id,
    name,
    username,
    home_course_name,
    society_name,
    profile_data
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
```

Then manually update the missing fields in the restoration script.

---

### Problem: "Other users are missing"

**Solution:**
1. Run diagnostic check to see who exists
2. Get list of expected users (from memory, old screenshots, etc.)
3. Compare and identify missing ones
4. Add them to SECTION 5 of restoration script

---

### Problem: "Societies don't show up in dashboard"

**Solution:** Check both tables:
```sql
-- Check user_profiles
SELECT * FROM user_profiles WHERE role = 'organizer';

-- Check society_profiles
SELECT * FROM society_profiles;
```

If missing, re-run restoration script. If still broken, check RLS policies:
```sql
-- Check if RLS is blocking access
SELECT * FROM pg_policies WHERE tablename = 'society_profiles';
```

---

### Problem: "Data keeps getting lost again"

**Solution:** This means the application code is overwriting the database. Check:
1. Is the old code (from Oct 25 rollback) still running?
2. Is there a migration script running on app startup?
3. Are user logins triggering profile overwrites?

Fix by updating the code to match the database schema.

---

## IMPORTANT NOTES

1. **Run diagnostic FIRST** - Always check current state before restoring

2. **Transaction safety** - The restoration script uses BEGIN/COMMIT, so if anything fails, nothing changes

3. **Idempotent** - You can run the restoration script multiple times safely (uses ON CONFLICT DO UPDATE)

4. **Incremental** - You don't need all user data at once. Start with Pete, verify it works, then add others

5. **Backups** - This restoration script IS your backup. Keep it safe!

---

## NEXT STEPS AFTER RESTORATION

Once data is restored:

1. ✅ Test all user workflows (login, profile, events, scoring)
2. ✅ Ask other users to log in and verify their data
3. ✅ Commit the restoration scripts to git for future reference
4. ✅ Update application code to prevent data loss in future
5. ✅ Consider adding database backups (Supabase has automatic backups)

---

## CONTACT FOR HELP

If you encounter issues:

1. Check Supabase logs: `https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/logs`
2. Run verification queries from restoration script
3. Check browser console for JavaScript errors
4. Review RLS policies if data appears but isn't accessible

---

## SUCCESS CRITERIA

✅ Pete Park profile shows:
   - Name: Pete Park
   - Username: 007
   - Handicap: 2
   - Home Course: Pattaya CC Golf
   - Society: Travellers Rest Golf Group

✅ TRGG society shows:
   - Appears in society list
   - Logo displays
   - Can create events

✅ Other users (once identified):
   - Profiles exist with complete data
   - Can log in successfully
   - Can interact with societies/events

---

**READY TO START?**

1. Go to Step 1: Check Current State
2. Run diagnostic SQL
3. Review results
4. Proceed to Step 2: Restore All Data

Good luck! 🚀
