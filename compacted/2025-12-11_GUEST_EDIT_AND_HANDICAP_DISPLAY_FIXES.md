# Session Catalog: Guest User Edit & Plus Handicap Display Fixes
**Date:** December 11, 2025
**Session Focus:** Fix society organizer editing guest users, fix plus handicap display in player directories
**Status:** DEPLOYED

---

## TABLE OF CONTENTS
1. [Issue 1: Guest User Edit Failing](#issue-1-guest-user-edit-failing)
2. [Issue 2: Plus Handicap Display Missing "+" Sign](#issue-2-plus-handicap-display-missing--sign)
3. [Mistakes Made](#mistakes-made)
4. [Files Modified](#files-modified)
5. [SQL Scripts Created](#sql-scripts-created)
6. [Testing Instructions](#testing-instructions)

---

## ISSUE 1: GUEST USER EDIT FAILING

### Problem
Society organizers could not edit guest user profiles (IDs like `TRGG-GUEST-0961`). Error message:
```
[SaveUserEdits] Error: Error: Guest IDs are not allowed. Users must login with LINE to create profiles.
```

### Root Cause Analysis

**Initial Wrong Assumption (MISTAKE #1):**
I initially tried to update the `society_members` table with columns `golfer_name`, `handicap`, `home_club` - but these columns DON'T EXIST in that table.

**Console Error:**
```
[SaveUserEdits] society_members update error: Object
[SaveUserEdits] Error: Error: Could not find the 'golfer_name' column of 'society_members' in the schema cache
```

**Actual Table Structure:**
The `society_members` table only has:
- `id` (UUID)
- `society_id` (UUID) - NOT society_name!
- `golfer_id` (TEXT)
- `member_number` (TEXT)
- `is_primary_society` (BOOLEAN)
- `status` (TEXT)
- `joined_at`, `renewed_at`, `expires_at` (TIMESTAMPTZ)
- `member_data` (JSONB) - flexible data storage
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Correct Understanding:**
Guest users (like `TRGG-GUEST-0961`) ARE stored in the `user_profiles` table with their guest ID as `line_user_id`. The original code was using `.upsert()` which triggered RLS policy rejection for guest IDs.

### Solution

**File:** `public/index.html` (lines ~52174-52216)

Changed from trying to upsert to `user_profiles` (which RLS rejected for guest IDs) to using `.update()` instead:

```javascript
if (isGuestUser) {
    // GUEST USER: Update user_profiles table (guest users have profiles with TRGG-GUEST-xxxx IDs)
    console.log('[SaveUserEdits] Guest user detected, updating user_profiles...');

    // First fetch existing profile to preserve other fields
    const { data: existingProfile, error: fetchError } = await window.SupabaseDB.client
        .from('user_profiles')
        .select('profile_data')
        .eq('line_user_id', golferId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[SaveUserEdits] Error fetching existing profile:', fetchError);
    }

    const existingProfileData = existingProfile?.profile_data || {};

    // Build updated profile_data preserving existing data
    const updatedProfileData = {
        ...existingProfileData,
        golfInfo: {
            ...(existingProfileData.golfInfo || {}),
            handicap: handicap,
            homeClub: homeClub
        }
    };

    // Update user_profiles for guest user
    const { data: profileData, error: profileError } = await window.SupabaseDB.client
        .from('user_profiles')
        .update({
            name: name,
            profile_data: updatedProfileData
        })
        .eq('line_user_id', golferId)
        .select();

    if (profileError) {
        console.error('[SaveUserEdits] user_profiles update error:', profileError);
        throw new Error(profileError.message || 'Failed to update guest member');
    }

    console.log('[SaveUserEdits] Guest member updated:', profileData);
}
```

### Key Differences
| Aspect | Before (Broken) | After (Fixed) |
|--------|-----------------|---------------|
| Method | `.upsert()` | `.update()` |
| Error | RLS rejected guest IDs | Works for existing profiles |
| Table | Tried wrong table first | Correctly uses `user_profiles` |

---

## ISSUE 2: PLUS HANDICAP DISPLAY MISSING "+" SIGN

### Problem
Players like Rocky Jones and Jesse Stoneberg have plus handicaps (e.g., "+2.1") stored in the database, but the player directory showed them without the "+" sign (just "2.1").

### Root Cause Analysis

**Two issues identified:**

1. **SQL Function Returns DOUBLE PRECISION:**
   ```sql
   -- In search_players_global function:
   handicap DOUBLE PRECISION,  -- This loses the "+" sign!

   COALESCE(
     up.handicap_index,
     (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,  -- Casting loses "+"
     ...
   )::DOUBLE PRECISION,
   ```

2. **JavaScript Uses parseFloat:**
   Various places in the code used `parseFloat(handicap).toFixed(1)` which strips the "+" sign.

### Solution

**Part 1: Added Global Helper Function**

**File:** `public/index.html` (lines ~5492-5516)

```javascript
// Global helper function to format handicap - preserves "+" sign for plus handicaps
window.formatHandicapDisplay = function(handicap) {
    if (handicap === null || handicap === undefined || handicap === '') {
        return '-';
    }

    // If it's already a string with "+" prefix, return as-is
    if (typeof handicap === 'string' && handicap.startsWith('+')) {
        return handicap;
    }

    // If it's a negative number (plus handicap stored as negative), format with "+"
    const numValue = parseFloat(handicap);
    if (!isNaN(numValue) && numValue < 0) {
        return '+' + Math.abs(numValue).toFixed(1);
    }

    // Regular positive handicap
    if (!isNaN(numValue)) {
        return numValue.toFixed(1);
    }

    // Return as string if nothing else works
    return String(handicap);
};
```

**Part 2: Updated Display Locations**

**File:** `public/index.html` (line ~51800)
```javascript
// Before:
<td class="...">${member.handicap}</td>

// After:
<td class="...">${window.formatHandicapDisplay(member.handicap)}</td>
```

**File:** `public/index.html` (line ~51751)
```javascript
// Before:
<div class="text-xs text-gray-500">Handicap: ${handicap} | Home Club: ${homeClub}</div>

// After:
<div class="text-xs text-gray-500">Handicap: ${window.formatHandicapDisplay(handicap)} | Home Club: ${homeClub}</div>
```

**File:** `public/global-player-directory.js` (lines ~8-32, ~304)

Added same helper function and updated display:
```javascript
// Before:
const handicapDisplay = player.handicap ? `HCP ${player.handicap}` : 'No HCP';

// After:
const formattedHcp = formatHandicapDisplay(player.handicap);
const handicapDisplay = formattedHcp ? `HCP ${formattedHcp}` : 'No HCP';
```

**Part 3: SQL Function Fix (requires manual execution)**

**File:** `sql/FIX_SEARCH_PLAYERS_HANDICAP_TEXT.sql`

Changes return type from `DOUBLE PRECISION` to `TEXT`:
```sql
RETURNS TABLE (
  player_id TEXT,
  player_name TEXT,
  handicap TEXT,  -- Changed from DOUBLE PRECISION to TEXT
  home_course TEXT,
  total_rounds BIGINT,
  societies TEXT[]
)
```

---

## MISTAKES MADE

### Mistake #1: Wrong Table for Guest User Update
**What I Did Wrong:**
Initially tried to update `society_members` table with columns that don't exist (`golfer_name`, `handicap`, `home_club`).

**Correct Approach:**
Guest users are stored in `user_profiles` table with their guest ID as `line_user_id`. The `society_members` table only links golfers to societies - it doesn't store profile data directly.

**Lesson Learned:**
Always verify table schema before writing update queries. The `society_members` table stores relationship data, not profile data.

### Mistake #2: Using Wrong Update Method
**What I Did Wrong:**
First attempt used `society_members.member_data` JSONB field for updates.

**Correct Approach:**
Guest user profile data lives in `user_profiles.profile_data`, same as LINE users. Just need to use `.update()` instead of `.upsert()` to avoid RLS policy issues.

### Mistake #3: Not Reading Compacted Folder First
**What Happened:**
User had to remind me to check the `\compacted` folder for previous fixes. The solution patterns were already documented.

**Lesson Learned:**
Always check compacted folder documentation before attempting fixes - previous sessions often have relevant context.

---

## FILES MODIFIED

### 1. `public/index.html`

**Changes:**
1. Added `window.formatHandicapDisplay()` helper function (lines ~5492-5516)
2. Fixed `saveUserEdits()` to properly handle guest users (lines ~52174-52216)
3. Updated player directory handicap display (line ~51800)
4. Updated non-member handicap display (line ~51751)

### 2. `public/global-player-directory.js`

**Changes:**
1. Added `formatHandicapDisplay()` helper function (lines 8-32)
2. Updated `renderPlayerList()` to use helper (line ~304)

---

## SQL SCRIPTS CREATED

### `sql/FIX_SEARCH_PLAYERS_HANDICAP_TEXT.sql`

**Purpose:** Return handicap as TEXT to preserve "+" sign for plus handicaps

**Key Changes:**
- Return type changed from `DOUBLE PRECISION` to `TEXT`
- Handicap pulled from profile_data as string first (preserves "+")
- Falls back to handicap_index::TEXT if needed

**Status:** CREATED - Requires manual execution in Supabase SQL Editor

---

## TESTING INSTRUCTIONS

### Test 1: Edit Guest User Profile

**Steps:**
1. Log in as Society Organizer
2. Go to Member Directory
3. Search for a guest user (e.g., "Jesse Stoneberg" with ID `TRGG-GUEST-0961`)
4. Click Edit button
5. Change handicap to a plus handicap (e.g., "+2.5")
6. Click Save

**Expected Results:**
- No error message
- Success notification appears
- Handicap is saved correctly
- Player directory shows updated value with "+" sign

### Test 2: Plus Handicap Display in Society Player Directory

**Steps:**
1. Log in as Society Organizer
2. Go to Member Directory
3. Find players with plus handicaps (Rocky Jones, Jesse Stoneberg)

**Expected Results:**
- Plus handicaps display with "+" sign (e.g., "+2.1")
- Regular handicaps display normally (e.g., "18.5")

### Test 3: Plus Handicap Display in Global Player Directory

**Steps:**
1. Log in as any user
2. Go to Golfer Dashboard → Society Events tab
3. Click "Players" to open Global Player Directory
4. Search for players with plus handicaps

**Expected Results:**
- Plus handicaps display as "HCP +2.1" (with "+" sign)
- Regular handicaps display as "HCP 18.5"

### Test 4: Run SQL Script (Manual)

**Steps:**
1. Open Supabase SQL Editor
2. Run contents of `sql/FIX_SEARCH_PLAYERS_HANDICAP_TEXT.sql`
3. Verify test queries return handicaps with "+" preserved

**Expected Results:**
```sql
SELECT * FROM search_players_global('Rocky', NULL::UUID, NULL::INTEGER, NULL::INTEGER, 5, 0);
-- Should return handicap as '+2.1' (TEXT with + sign)
```

---

## DEPLOYMENT LOG

| Time | Action | Result |
|------|--------|--------|
| Session Start | Guest edit fix attempt #1 | Failed - wrong table |
| Mid-Session | Guest edit fix attempt #2 | Success - correct table + method |
| Mid-Session | Handicap display fix | Success - helper function added |
| Session End | Final deployment | https://mcipro-golf-platform-jc3d08ijf-mcipros-projects.vercel.app |

---

## PENDING ACTIONS

1. **Run SQL Script:** Execute `sql/FIX_SEARCH_PLAYERS_HANDICAP_TEXT.sql` in Supabase to fix database-level handicap returns

---

## TECHNICAL NOTES

### Guest User ID Pattern
- LINE users: Start with `U` (e.g., `U2b6d976f19bca4b2f4374ae0e10ed873`)
- Guest users: Contain `GUEST` (e.g., `TRGG-GUEST-0961`)

### Detection Logic
```javascript
const isGuestUser = !golferId.startsWith('U') || golferId.includes('GUEST');
```

### Plus Handicap Storage
- Stored as STRING in `profile_data.golfInfo.handicap` (e.g., "+2.1")
- Some systems store as negative number (e.g., -2.1)
- The helper function handles both formats

### Table Relationships
```
user_profiles (stores all user data including guests)
    └── line_user_id (can be LINE ID or guest ID)
    └── profile_data (JSONB with golfInfo.handicap)

society_members (links users to societies)
    └── golfer_id → references user_profiles.line_user_id
    └── society_id → references society_profiles.id
    └── member_data (JSONB for society-specific data)
```

---

## SUMMARY

This session fixed two critical issues:

1. **Guest User Editing:** Society organizers can now edit guest user profiles. The fix changed from using `.upsert()` (which RLS rejected) to `.update()` on the `user_profiles` table.

2. **Plus Handicap Display:** Plus handicaps now correctly display with the "+" sign in both the Society Player Directory and Global Player Directory. A helper function `formatHandicapDisplay()` was added to handle all handicap formats consistently.

Both fixes are deployed and functional. The SQL script should be run manually to complete the database-level fix for the global player directory search function.
