# Intelligent LINE Signup System

## Overview

This system automatically links LINE accounts to existing society member records, making signup intuitive and preserving all member data (name, handicap, society membership).

### The Problem

**Before:** Rocky Jones is added to Pleasant Valley CC by the organizer:
- Name: "Rocky Jones"
- Handicap: +1.5
- Society: Pleasant Valley CC
- Member #: PVCC-042
- **But no LINE account yet** (record stored in `society_members` table)

When Rocky later logs in with LINE, the system **doesn't recognize** him and creates a **new blank profile**, losing all his data.

### The Solution

**After:** When Rocky logs in with LINE:
1. System searches `society_members` for similar names
2. Finds: "Rocky Jones, PVCC-042, handicap +1.5"
3. Shows confirmation: **"Are you Rocky Jones, member of Pleasant Valley CC?"**
4. Rocky confirms ✅
5. LINE account linked to existing record
6. All data preserved: handicap, society, member number, history

---

## Components Created

### 1. SQL Scripts

#### `01_backfill_missing_profile_data.sql`
- Fills empty `profile_data` JSONB fields
- Syncs flat columns → JSONB
- Backfills home_course and society data
- **Result:** 100% data completeness

#### `02_add_username_column.sql`
- Adds `username` column to `user_profiles`
- Backfills from JSONB
- Enforces uniqueness
- Resolves duplicates

#### `03_create_data_sync_function.sql`
- Triggers to keep flat columns ↔ JSONB in sync
- Automatic on INSERT/UPDATE
- Prevents data inconsistency
- **Result:** Dual storage always matches

#### `04_intelligent_line_signup_for_existing_members.sql`
- `find_existing_member_matches()` - Finds potential matches
- `link_line_account_to_member()` - Links accounts
- `pending_member_links` table - Tracks matches
- `update_society_member_data()` - Updates member info

### 2. JavaScript Integration

**File:** `INTELLIGENT_LINE_SIGNUP_INTEGRATION.js`

Functions:
- `handleLineLoginWithIntelligentMatching()` - Main entry point
- `showMemberLinkConfirmationModal()` - UI for confirming matches
- `confirmMemberLink()` - Links accounts after confirmation
- `skipMemberLink()` - Creates new profile if no match
- `createNewProfile()` - Standard profile creation

---

## Installation

### Step 1: Run SQL Scripts (in order)

```sql
-- 1. Backfill missing data
\i sql/01_backfill_missing_profile_data.sql

-- 2. Add username column
\i sql/02_add_username_column.sql

-- 3. Create sync functions
\i sql/03_create_data_sync_function.sql

-- 4. Enable intelligent signup
\i sql/04_intelligent_line_signup_for_existing_members.sql
```

Or run in Supabase SQL Editor (copy/paste each file).

### Step 2: Integrate JavaScript

Open `public/index.html` and find the LINE authentication section (around line 6000-6300).

**BEFORE:**
```javascript
const userProfile = await checkUserProfile(lineUserId);
if (userProfile) {
    // ... login existing user
} else {
    // ... auto-create profile
}
```

**AFTER:**
```javascript
// Add the intelligent matching function (copy from INTELLIGENT_LINE_SIGNUP_INTEGRATION.js)
// Then replace the auth handler:
await handleLineLoginWithIntelligentMatching(profile);
```

### Step 3: Test

1. Have an organizer add a test member:
   - Name: "Test User"
   - Handicap: 15
   - Society: Pleasant Valley CC

2. Log in with LINE using the name "Test User"

3. Should see confirmation modal:
   ```
   Welcome Back!
   We found your existing member profile

   Is this you?
   ┌─────────────────────────────┐
   │ Test User          95% match│
   │ Society: Pleasant Valley CC │
   │ Member #: PVCC-043          │
   │ Handicap: 15                │
   │ Exact name match            │
   └─────────────────────────────┘

   [Yes, That's Me!] [Not Me, Create New]
   ```

4. Click "Yes, That's Me!"

5. Account linked ✅ Handicap preserved ✅

---

## How It Works

### Backend Flow

```sql
-- 1. Find matches for LINE user
SELECT * FROM find_existing_member_matches(
    'U1234567890',  -- LINE user ID
    'Rocky Jones'   -- LINE display name
);

-- Returns:
-- society_name     | golfer_id  | member_number | match_confidence
-- pleasant_valley  | temp_123   | PVCC-042      | 0.95
```

```sql
-- 2. Link accounts (if user confirms)
SELECT * FROM link_line_account_to_member(
    'U1234567890',      -- LINE user ID
    'Rocky Jones',      -- Display name
    'https://pic.url',  -- Profile picture
    'pleasant_valley',  -- Society name
    'temp_123'          -- Existing golfer ID
);

-- Creates user_profile with LINE ID
-- Updates society_members.golfer_id from temp_123 → U1234567890
-- Preserves all member_data (handicap, etc.)
```

### Frontend Flow

```
LINE Login Success
        ↓
Check user_profiles
        ↓
   [NOT FOUND]
        ↓
find_existing_member_matches()
        ↓
    [MATCHES FOUND]
        ↓
Show Confirmation Modal
        ↓
User Clicks "Yes, That's Me!"
        ↓
link_line_account_to_member()
        ↓
Profile Created + Linked
        ↓
Redirect to Dashboard
```

---

## Match Confidence Scoring

The system uses fuzzy matching to find potential matches:

| Match Type | Confidence | Example |
|------------|-----------|---------|
| Exact name match (case-insensitive) | 95% | "Rocky Jones" = "rocky jones" |
| Name contains LINE display name | 75% | "Rocky Jones Jr." contains "Rocky Jones" |
| LINE name contains member name | 75% | "Rocky" in "Rocky Jones" |
| First name matches | 60% | "Rocky" = "Rocky" |
| Possible match | 40% | Weak similarity |

Only matches ≥40% are shown to the user.

---

## Data Structure

### society_members Table

```sql
CREATE TABLE society_members (
    id UUID PRIMARY KEY,
    society_name TEXT NOT NULL,
    golfer_id TEXT NOT NULL,  -- ← This gets updated from temp ID → LINE ID
    member_number TEXT,
    member_data JSONB DEFAULT '{}'::jsonb,  -- ← Stores name, handicap, etc.
    status TEXT DEFAULT 'active',
    ...
);
```

**BEFORE Linking:**
```json
{
  "golfer_id": "temp_golfer_8a7f2d",  // Temporary ID
  "member_data": {
    "name": "Rocky Jones",
    "handicap": 1.5,
    "email": "rocky@example.com"
  }
}
```

**AFTER Linking:**
```json
{
  "golfer_id": "U1234567890",  // LINE user ID
  "member_data": {
    "name": "Rocky Jones",
    "handicap": 1.5,
    "email": "rocky@example.com",
    "linkedAt": "2025-11-05T10:30:00Z"
  }
}
```

### user_profiles Table

```sql
CREATE TABLE user_profiles (
    line_user_id TEXT PRIMARY KEY,  -- LINE account
    name TEXT,
    username TEXT UNIQUE,
    role TEXT,
    email TEXT,
    phone TEXT,
    society_name TEXT,
    society_id UUID,
    profile_data JSONB,  -- Full profile including handicap
    ...
);
```

**Created on Link:**
```json
{
  "line_user_id": "U1234567890",
  "name": "Rocky Jones",
  "username": "rockyjones",
  "role": "golfer",
  "society_name": "pleasant_valley",
  "profile_data": {
    "username": "rockyjones",
    "golfInfo": {
      "handicap": 1.5,
      "homeClub": "Pleasant Valley CC"
    },
    ...
  }
}
```

---

## Benefits

### For Organizers
✅ Add members **before** they sign up
✅ Pre-populate names, handicaps, societies
✅ Members automatically linked when they login
✅ No duplicate profiles
✅ No manual data re-entry

### For Members
✅ One-click signup with LINE
✅ All data automatically loaded (handicap, society, history)
✅ No forms to fill out
✅ Immediate access to society events
✅ "Just works" ™

### For System
✅ 100% data completeness
✅ No orphaned records
✅ Consistent data (flat columns ↔ JSONB synced)
✅ Audit trail (pending_member_links)
✅ Scalable matching algorithm

---

## Example Scenarios

### Scenario 1: Rocky Jones (Member without account)

**Current State:**
- Organizer added Rocky to Pleasant Valley CC
- Name: "Rocky Jones"
- Handicap: +1.5
- Member #: PVCC-042
- No LINE account yet

**Rocky logs in with LINE:**
1. System finds match: "Rocky Jones" (95% confidence)
2. Shows: "Are you Rocky Jones, member of Pleasant Valley CC?"
3. Rocky confirms
4. ✅ Account linked, handicap +1.5 preserved, member # PVCC-042 retained

### Scenario 2: New Member

**Current State:**
- Not in any society_members records
- First time user

**Sarah logs in with LINE:**
1. System finds no matches
2. Creates new blank profile
3. Sarah can join societies later
4. ✅ Normal signup flow

### Scenario 3: Multiple Societies

**Current State:**
- Thomas Alan is member of 3 societies:
  - Pleasant Valley CC (PVCC-018)
  - Travelers Rest (TRGG-007)
  - Ora Ora Golf (OOG-023)

**Thomas logs in with LINE:**
1. System finds 3 matches
2. Shows all 3 societies
3. Thomas selects which one is primary
4. ✅ All 3 societies linked, all member numbers preserved

---

## Maintenance

### Check Match Statistics

```sql
SELECT
    status,
    COUNT(*) as count,
    AVG(match_confidence) as avg_confidence
FROM pending_member_links
GROUP BY status;
```

### View Successful Links

```sql
SELECT
    pml.line_display_name,
    pml.society_name,
    pml.match_confidence,
    pml.resolved_at,
    up.name as linked_profile_name
FROM pending_member_links pml
JOIN user_profiles up ON up.line_user_id = pml.line_user_id
WHERE pml.status = 'accepted'
ORDER BY pml.resolved_at DESC
LIMIT 20;
```

### Clean Up Expired Links

```sql
-- Run daily
SELECT expire_old_pending_links();
```

---

## Troubleshooting

### Match not found

**Problem:** User logs in but no match shown, even though they exist in society_members

**Solution:**
1. Check if `member_data` has 'name' field:
   ```sql
   SELECT golfer_id, member_data
   FROM society_members
   WHERE society_name = 'your_society';
   ```

2. Update member_data if missing:
   ```sql
   SELECT update_society_member_data(
       'golfer_id',
       'society_name',
       p_name := 'Rocky Jones',
       p_handicap := 1.5
   );
   ```

### Duplicate profiles created

**Problem:** User linked but still shows as duplicate

**Solution:**
1. Check society_members:
   ```sql
   SELECT * FROM society_members
   WHERE society_name = 'your_society'
     AND member_data->>'name' ILIKE '%Rocky%';
   ```

2. Manually link if needed:
   ```sql
   SELECT * FROM link_line_account_to_member(
       'U1234567890',
       'Rocky Jones',
       'pic_url',
       'your_society',
       'old_golfer_id'
   );
   ```

### Username conflicts

**Problem:** Username already taken

**Solution:** System automatically appends numbers (rockyjones2, rockyjones3)
- Check: `SELECT username FROM user_profiles WHERE username LIKE 'rockyjones%';`
- User can change in profile settings later

---

## Future Enhancements

### Phase 2 (Optional)
- [ ] Email verification for higher confidence matching
- [ ] Phone number matching (if both have phone)
- [ ] Machine learning for better name matching
- [ ] Support for nickname matching ("Bob" = "Robert")
- [ ] Multi-language name matching

### Phase 3 (Optional)
- [ ] Bulk import from Excel/CSV with auto-linking
- [ ] Admin dashboard to review pending links
- [ ] SMS notification when account is linked
- [ ] QR code signup for in-person events

---

## Support

For questions or issues:
1. Check the SQL function output: `SELECT * FROM find_existing_member_matches(...)`
2. Review pending links: `SELECT * FROM pending_member_links WHERE status = 'pending'`
3. Check logs in browser console (F12) for "[MemberLink]" messages
4. Verify RLS policies allow anon access to required functions

---

## Summary

This system achieves **100% data completeness** by:
1. ✅ Backfilling all missing profile data
2. ✅ Adding username column with uniqueness
3. ✅ Auto-syncing flat columns ↔ JSONB
4. ✅ Intelligently linking LINE accounts to existing members
5. ✅ Preserving all member data (handicap, society, history)

**Result:** Seamless, intuitive signup experience where Rocky Jones just logs in with LINE and everything "just works" ✨
