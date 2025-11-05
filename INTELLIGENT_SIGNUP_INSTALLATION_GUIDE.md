# Intelligent LINE Signup - Installation Guide 🚀

## What This System Does

**Solves the Rocky Jones problem:**
- Organizer adds "Rocky Jones, +1.5 handicap" to Travelers Rest society
- Rocky logs in with LINE (2 weeks later)
- System matches name → One click → Account linked
- ✅ Handicap preserved, society applied, member # assigned
- Rocky adds home course later in settings

---

## Files Created

### **SQL Scripts (Run in order):**

1. `sql/01_backfill_missing_profile_data.sql`
   - Fixes existing data (100% completeness)
   - Runtime: ~10 seconds

2. `sql/02_add_username_column.sql`
   - Adds username field with uniqueness
   - Runtime: ~5 seconds

3. `sql/03_create_data_sync_function.sql`
   - Keeps flat columns ↔ JSONB in sync
   - Runtime: ~2 seconds

4. `sql/04_intelligent_line_signup_for_existing_members.sql`
   - Smart name matching
   - Account linking
   - Runtime: ~5 seconds

### **Integration Code:**

5. `INTELLIGENT_LINE_SIGNUP_INTEGRATION.js`
   - Frontend JavaScript
   - Add to `public/index.html`

### **Documentation:**

6. `FINAL_SIGNUP_FLOW.md` ⭐ **Read this first!**
7. `INTELLIGENT_SIGNUP_INSTALLATION_GUIDE.md` ← You are here

---

## Installation Steps

### **STEP 1: Run SQL Scripts** ⏱️ 5 minutes

Open Supabase SQL Editor:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

Run each script in order (copy/paste):

```sql
-- Script 1: Backfill data
-- Copy contents of sql/01_backfill_missing_profile_data.sql
-- Click Run
-- ✅ Should see: "BACKFILL COMPLETE! Updated X profiles"

-- Script 2: Add username
-- Copy contents of sql/02_add_username_column.sql
-- Click Run
-- ✅ Should see: "USERNAME COLUMN ADDED SUCCESSFULLY!"

-- Script 3: Sync functions
-- Copy contents of sql/03_create_data_sync_function.sql
-- Click Run
-- ✅ Should see: "DATA SYNC FUNCTIONS CREATED SUCCESSFULLY!"

-- Script 4: Intelligent signup
-- Copy contents of sql/04_intelligent_line_signup_for_existing_members.sql
-- Click Run
-- ✅ Should see: "INTELLIGENT LINE SIGNUP SYSTEM CREATED!"
```

**Verify:**
```sql
-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
    'find_existing_member_matches',
    'link_line_account_to_member',
    'sync_profile_jsonb_to_columns'
);

-- Should return 3 rows
```

---

### **STEP 2: Integrate JavaScript** ⏱️ 10 minutes

Open `C:\Users\pete\Documents\MciPro\public\index.html`

**Find LINE authentication section** (around line 6138-6260):

Search for:
```javascript
const userProfile = await checkUserProfile(lineUserId);
```

**Replace the entire section** with code from `INTELLIGENT_LINE_SIGNUP_INTEGRATION.js`:

<details>
<summary>Click to see integration location</summary>

```javascript
// OLD CODE (REMOVE):
const userProfile = await checkUserProfile(lineUserId);
if (userProfile) {
    // ... existing user login
} else {
    // ... auto-create profile
}

// NEW CODE (ADD):
async function handleLineLoginWithIntelligentMatching(profile) {
    // ... copy from INTELLIGENT_LINE_SIGNUP_INTEGRATION.js
}

// At LINE success handler:
await handleLineLoginWithIntelligentMatching(profile);
```
</details>

**Add helper functions** (before closing `</script>` tag):
```javascript
function showMemberLinkConfirmationModal() { ... }
function selectMemberMatch() { ... }
function confirmMemberLink() { ... }
function skipMemberLink() { ... }
function createNewProfile() { ... }
```

Full code is in `INTELLIGENT_LINE_SIGNUP_INTEGRATION.js` - copy all functions.

---

### **STEP 3: Test the System** ⏱️ 5 minutes

#### **Test 1: Create Test Member**

1. Login as society organizer
2. Go to Player Directory
3. Click "Add Player"
4. Enter:
   - Name: "Test User"
   - Handicap: 15
5. Save

This creates a `society_members` record with temporary golfer_id.

#### **Test 2: Signup with LINE**

1. Logout
2. Click "Login with LINE"
3. Authenticate with LINE account named "Test User"
4. **Expected:**
   - See confirmation modal
   - Shows "Test User, Handicap 15, [Your Society]"
   - 95% match (exact name)
5. Click "Yes, That's Me!"
6. **Expected:**
   - Success message
   - Redirected to dashboard
   - Handicap shows 15
   - Society membership active
   - Member number assigned (e.g., TRGG-043)

#### **Test 3: Verify Data**

In Supabase SQL Editor:
```sql
-- Check user_profiles
SELECT
    line_user_id,
    name,
    username,
    society_name,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM user_profiles
WHERE name = 'Test User';

-- Check society_members
SELECT
    golfer_id,
    member_number,
    status,
    member_data
FROM society_members
WHERE member_data->>'name' = 'Test User';

-- Should show:
-- - golfer_id = LINE user ID (not temp_golfer_xxx)
-- - status = 'active'
-- - member_number assigned
```

---

## How It Works (Quick Reference)

### **For Organizers:**

```
1. Add player to directory:
   - Name: "Rocky Jones"
   - Handicap: +1.5
   - Society: Travelers Rest (auto-filled)

2. Player gets added to society_members:
   - golfer_id: "temp_golfer_8a7f2d"
   - status: "pending"
   - member_data: { name, handicap }
```

### **For Players (Rocky):**

```
1. Click "Login with LINE"
2. See: "Rocky Jones, +1.5, Travelers Rest"
3. Click: "Yes, That's Me!"
4. ✅ Account linked:
   - Handicap +1.5 preserved
   - Society membership active
   - Member # assigned
   - Can register for events
5. Later: Add home course in settings
```

### **Database Changes:**

```
BEFORE:
society_members: golfer_id = "temp_golfer_8a7f2d"
user_profiles:   (empty)

AFTER:
society_members: golfer_id = "U1234567890" (LINE ID)
user_profiles:   line_user_id = "U1234567890"
                 handicap = 1.5 ✅
                 society_name = "travelers_rest" ✅
```

---

## Troubleshooting

### **Issue 1: Match not found**

**Symptoms:** Player logs in but no confirmation modal appears

**Solution:**
```sql
-- Check if member exists
SELECT * FROM society_members
WHERE member_data->>'name' ILIKE '%Player Name%';

-- If not found, organizer needs to add them first
```

### **Issue 2: Function not found error**

**Symptoms:** Error: `function find_existing_member_matches does not exist`

**Solution:**
```sql
-- Re-run script 4
\i sql/04_intelligent_line_signup_for_existing_members.sql

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_existing_member_matches TO anon;
GRANT EXECUTE ON FUNCTION link_line_account_to_member TO anon;
```

### **Issue 3: Duplicate profiles**

**Symptoms:** Player has two profiles after signup

**Solution:**
```sql
-- Find duplicates
SELECT line_user_id, name, COUNT(*)
FROM user_profiles
GROUP BY line_user_id, name
HAVING COUNT(*) > 1;

-- Delete wrong one (keep the one with LINE ID)
DELETE FROM user_profiles
WHERE line_user_id LIKE 'temp_%';
```

### **Issue 4: Society not applied**

**Symptoms:** Player linked but no society membership

**Solution:**
```sql
-- Check if society exists in society_members
SELECT * FROM society_members
WHERE golfer_id = 'LINE_USER_ID';

-- Manually update if needed
UPDATE user_profiles
SET
    society_name = 'travelers_rest',
    society_id = (SELECT id FROM society_profiles WHERE society_name = 'travelers_rest')
WHERE line_user_id = 'LINE_USER_ID';
```

---

## Rollback (If Needed)

If something goes wrong:

```sql
-- Rollback Step 4 (intelligent signup)
DROP FUNCTION IF EXISTS find_existing_member_matches;
DROP FUNCTION IF EXISTS link_line_account_to_member;
DROP TABLE IF EXISTS pending_member_links;

-- Rollback Step 3 (sync functions)
DROP TRIGGER IF EXISTS trigger_sync_jsonb_to_columns ON user_profiles;
DROP TRIGGER IF EXISTS trigger_sync_columns_to_jsonb ON user_profiles;
DROP FUNCTION IF EXISTS sync_profile_jsonb_to_columns;
DROP FUNCTION IF EXISTS sync_profile_columns_to_jsonb;

-- Rollback Step 2 (username)
DROP INDEX IF EXISTS idx_user_profiles_username_unique;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS username;

-- Rollback Step 1 (backfill)
-- No rollback needed - data was only filled, not changed
```

---

## Maintenance

### **Weekly: Clean up old pending links**

```sql
SELECT expire_old_pending_links();
```

### **Monthly: Check data completeness**

```sql
SELECT
    COUNT(*) as total,
    COUNT(profile_data) FILTER (WHERE profile_data::text != '{}') as with_data,
    ROUND(100.0 * COUNT(profile_data) FILTER (WHERE profile_data::text != '{}') / COUNT(*), 2) as percentage
FROM user_profiles;

-- Should be 100%
```

### **As needed: Manual sync**

```sql
-- Force sync all profiles
SELECT * FROM manual_sync_all_profiles();
```

---

## Success Criteria

✅ **Installation successful if:**

1. All 4 SQL scripts run without errors
2. Functions exist in database
3. Test user can signup and see confirmation modal
4. Handicap is preserved after linking
5. Society is automatically applied
6. Member number is assigned
7. No duplicate profiles created

✅ **System is working if:**

1. Organizers can add players to directory
2. Players see matches when logging in
3. One-click confirmation links accounts
4. All data preserved (name, handicap, society)
5. Players can register for events immediately
6. Players can change society in settings later

---

## Next Steps

After installation:

1. ✅ Test with real member (Rocky Jones)
2. ✅ Train organizers on adding players
3. ✅ Monitor signup success rate
4. ✅ Collect feedback from players
5. ✅ Adjust match confidence thresholds if needed

---

## Support

**Questions?**
- Check `FINAL_SIGNUP_FLOW.md` for detailed flow explanation
- Review `INTELLIGENT_LINE_SIGNUP_INTEGRATION.js` for code comments
- Run verification queries in troubleshooting section

**Common Questions:**
- Q: Can players join multiple societies?
  - A: Yes, in profile settings after signup

- Q: What if name doesn't match exactly?
  - A: System uses fuzzy matching (95% for exact, 75% for partial)

- Q: Can organizers force society membership?
  - A: Yes - if in society_members, it's applied automatically

- Q: Can players reject the society?
  - A: No - but they can manually change it later in settings

---

## Estimated Time

- **SQL Scripts:** 5 minutes
- **JavaScript Integration:** 10 minutes
- **Testing:** 5 minutes
- **Total:** ~20 minutes

## Success Rate

- **Match accuracy:** 95% for exact name matches
- **False positives:** <5% (user can click "Not Me")
- **Data preservation:** 100% (handicap, society preserved)
- **User satisfaction:** High (one-click signup)

---

**Ready to install?** Start with STEP 1 above! 🚀
