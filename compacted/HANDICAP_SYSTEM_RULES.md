# HANDICAP SYSTEM RULES - READ THIS BEFORE TOUCHING HANDICAPS

## CRITICAL RULES - NEVER BREAK THESE

### Rule 1: Handicaps Are STRINGS, Not Numbers
```javascript
// ❌ WRONG - This destroys plus handicaps
const handicap = parseFloat("+2.1"); // Returns 2.1 (NO PLUS SIGN!)

// ✅ CORRECT - Keep as string
const handicap = "+2.1"; // Keeps the + sign intact
```

### Rule 2: NEVER Use type="number" for Handicap Inputs
```html
<!-- ❌ WRONG - Browser strips the + sign -->
<input type="number" id="handicap" step="0.1">

<!-- ✅ CORRECT - Use text input with pattern validation -->
<input type="text" id="handicap" pattern="^(\+)?\d+\.?\d*$" placeholder="e.g., +2.1 or 18">
```

### Rule 3: NEVER Call parseFloat() on Handicaps
```javascript
// ❌ WRONG - Strips plus sign
const hcp = parseFloat(user.handicap);

// ✅ CORRECT - Use as-is
const hcp = user.handicap;

// ✅ CORRECT - If you need numeric value for calculations
const numericValue = user.handicap.startsWith('+')
    ? -Math.abs(parseFloat(user.handicap.slice(1)))
    : parseFloat(user.handicap);
```

### Rule 4: ALWAYS Parse and Preserve Plus Signs
```javascript
// ✅ CORRECT - Parsing logic that preserves + sign
function parseHandicap(input) {
    if (!input || input.trim() === '') return null;

    const match = input.match(/^(\+)?(\d+\.?\d*)$/);
    if (match) {
        const isPlus = match[1] === '+';
        const value = parseFloat(match[2]);
        // Return as STRING to preserve formatting
        return isPlus ? `+${value}` : value.toString();
    }
    return null;
}
```

### Rule 5: NEVER Spread Old Profile Objects Without Cleaning
```javascript
// ❌ WRONG - May include invalid top-level fields
const updated = {
    ...existingProfile,
    profile_data: {...}
};

// ✅ CORRECT - Remove invalid fields first
const { handicap: _unused, ...cleanProfile } = existingProfile;
const updated = {
    ...cleanProfile,
    profile_data: {
        ...(cleanProfile.profile_data || {}),
        golfInfo: {
            handicap: newHandicap // String like "+2.1"
        }
    }
};
```

### Rule 6: NEVER Auto-Sync Profiles Without Validation
```javascript
// ❌ WRONG - Blindly syncs potentially corrupted data
async function syncProfiles() {
    const profiles = getLocalProfiles();
    await Promise.all(profiles.map(p => saveUserProfile(p)));
}

// ✅ CORRECT - Only save when explicitly edited
// Auto-sync is DISABLED for profiles (bookings only)
```

---

## DATABASE SCHEMA

### Correct Structure
```javascript
{
    name: "Player Name",
    line_user_id: "U123456789",
    email: "player@example.com",
    profile_data: {  // JSONB column
        golfInfo: {
            handicap: "+2.1",  // STRING - not number!
            homeClub: "Course Name"
        }
    }
    // NO top-level "handicap" column exists!
}
```

### What Does NOT Exist
```javascript
// ❌ WRONG - "handicap" is NOT a column in user_profiles table
{
    handicap: "+2.1",  // This column does not exist!
    profile_data: {...}
}
```

---

## LOCATIONS WHERE HANDICAPS ARE USED

### Input Fields
1. **Admin Edit User Modal** - `public/index.html`
   - Input: `#adminEditUserHandicap` - type="text"

2. **Society Organizer Edit User Modal** - `public/index.html`
   - Input: `#editHandicap` - type="text"

3. **Profile Settings Modal** - `public/index.html`
   - Input: `#handicapInput` - type="text"

### Save Functions
1. **Admin saveUserEdits** - `public/index.html:36549-36610`
   - Must parse and preserve + sign

2. **Society Organizer saveUserEdits** - `public/index.html:49188-49206`
   - Must parse and preserve + sign
   - Must remove top-level handicap field

3. **ProfileSystem saveProfileFromForm** - `public/index.html:15927-15939`
   - Must parse and preserve + sign

### Load Functions
1. **Admin loadUserForEdit** - `public/index.html:37422-37427`
   - Must NOT use parseFloat
   - Keep as string

2. **Society Organizer loadUserForEdit** - Similar logic
   - Must NOT use parseFloat

### Display Functions
1. **Member initialization** - `public/society-golf-system.js:488`
   - Must NOT use parseFloat
   - Keep as string

---

## TESTING PROTOCOL

### Every Time You Touch Handicap Code

#### Test Case 1: Save Plus Handicap
1. Edit user profile
2. Enter "+2.1" in handicap field
3. Click Save
4. Verify console shows NO errors
5. Reload page
6. Verify handicap displays as "+2.1"
7. Check database: should be "+2.1" (not "2.1")

#### Test Case 2: Save Regular Handicap
1. Edit user profile
2. Enter "18" in handicap field
3. Click Save
4. Verify saves as "18"

#### Test Case 3: Logout/Login Cycle
1. Save "+2.1" handicap
2. Logout
3. Login
4. Check profile
5. Verify STILL shows "+2.1" (not corrupted to "2.1")

#### Test Case 4: Edit Other Field
1. User has "+2.1" handicap
2. Edit their name or home club
3. Save
4. Verify handicap UNCHANGED (still "+2.1")

#### Test Case 5: Both Modals
1. Test saving "+2.1" in Admin modal
2. Test saving "+2.1" in Society Organizer modal
3. Both should work identically

### SQL Verification
```sql
-- Check specific user
SELECT name, profile_data->'golfInfo'->>'handicap' as handicap
FROM user_profiles
WHERE name = 'Rocky Jones';

-- Should return: "+2.1" (with the + sign)
-- NOT: "2.1" or 2.1
```

---

## COMMON MISTAKES AND HOW TO AVOID THEM

### Mistake 1: "But handicaps are numbers!"
**Wrong Thinking**: "A handicap is a number, so I should use number type"
**Correct Thinking**: "A handicap is a formatted value that needs its formatting preserved"
**Solution**: Store as string, convert to number only for calculations

### Mistake 2: "parseFloat is safe for validation"
**Wrong Thinking**: "I'll use parseFloat to validate it's a number"
**Correct Thinking**: "parseFloat destroys the format I need to preserve"
**Solution**: Use regex matching: `/^(\+)?\d+\.?\d*$/`

### Mistake 3: "The database has a handicap column"
**Wrong Thinking**: "I'll just update the handicap column"
**Correct Thinking**: "There is NO handicap column, it's nested in profile_data"
**Solution**: Always update `profile_data.golfInfo.handicap`

### Mistake 4: "Auto-sync keeps data fresh"
**Wrong Thinking**: "I'll sync profiles on every page load"
**Correct Thinking**: "Auto-sync can overwrite good data with corrupted data"
**Solution**: Only save profiles when explicitly edited by user

### Mistake 5: "Spreading is convenient"
**Wrong Thinking**: "I'll just spread the existing profile to keep all fields"
**Correct Thinking**: "Old profiles may have invalid fields"
**Solution**: Destructure to remove invalid fields first

---

## WHAT TO DO IF HANDICAPS GET CORRUPTED AGAIN

### Step 1: Stop the Bleeding
1. Identify what code changed
2. Look for any new parseFloat() calls
3. Look for any new type="number" inputs
4. Look for any new auto-sync logic

### Step 2: Backup Current State
```sql
-- Run this FIRST
SELECT name, line_user_id, profile_data->'golfInfo'->>'handicap' as handicap
FROM user_profiles
WHERE profile_data->'golfInfo'->>'handicap' IS NOT NULL
ORDER BY name;

-- Save output to text file
```

### Step 3: Fix the Code
- Follow the rules in this document
- Review the fixes in `2025-12-03_HANDICAP_PLUS_SIGN_CATASTROPHIC_FAILURE.md`

### Step 4: Fix the Data
```sql
-- Fix individual user
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{golfInfo,handicap}',
    '"+2.1"'::jsonb
)
WHERE line_user_id = 'USER_ID_HERE';
```

### Step 5: Deploy and Test
1. Commit changes
2. Push to production
3. Hard refresh browser (Ctrl+Shift+R)
4. Run full testing protocol (see above)

---

## FILES TO CHECK

If you're debugging handicap issues, check these files:

### Primary Files
1. **public/index.html**
   - Lines 36549-36610: Admin saveUserEdits
   - Lines 37422-37427: Admin loadUserForEdit
   - Lines 49188-49206: Society Organizer saveUserEdits
   - Lines 15927-15939: ProfileSystem saveProfileFromForm
   - Lines 5510-5525: SimpleCloudSync (should be DISABLED)

2. **public/supabase-config.js**
   - Lines 365-380: saveUserProfile

3. **public/society-golf-system.js**
   - Line 488: Member initialization

### Search Commands
```bash
# Find all parseFloat calls on handicaps (should be NONE)
grep -n "parseFloat.*handicap" public/*.js

# Find all type="number" inputs for handicaps (should be NONE)
grep -n 'type="number".*handicap' public/*.html

# Find all handicap field access
grep -n "\.handicap" public/*.js
```

---

## REFERENCE: CORRECT IMPLEMENTATION

### Complete Working Example
```javascript
// INPUT FIELD
<input type="text"
       id="handicap"
       pattern="^(\+)?\d+\.?\d*$"
       placeholder="e.g., +2.1 or 18">

// PARSING FUNCTION
function parseHandicap(input) {
    if (!input || input.trim() === '') return null;

    const match = input.match(/^(\+)?\d+\.?\d*)$/);
    if (!match) return null;

    const isPlus = match[1] === '+';
    const value = parseFloat(match[2]);

    // Return as STRING
    return isPlus ? `+${value}` : value.toString();
}

// SAVING TO DATABASE
async function saveUserProfile(userId, handicapInput) {
    const handicap = parseHandicap(handicapInput);

    const { data: existing } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('line_user_id', userId)
        .single();

    if (existing) {
        // Remove invalid top-level fields
        const { handicap: _unused, ...clean } = existing;

        const updated = {
            ...clean,
            profile_data: {
                ...(clean.profile_data || {}),
                golfInfo: {
                    ...(clean.profile_data?.golfInfo || {}),
                    handicap: handicap  // STRING like "+2.1"
                }
            }
        };

        await supabase
            .from('user_profiles')
            .upsert(updated);
    }
}

// LOADING FROM DATABASE
async function loadUserProfile(userId) {
    const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('line_user_id', userId)
        .single();

    if (data?.profile_data?.golfInfo) {
        // Keep as STRING - no parseFloat!
        const handicap = data.profile_data.golfInfo.handicap;
        return handicap;
    }
}

// DISPLAYING
function displayHandicap(handicap) {
    // Already a string, just display it
    document.getElementById('handicap').textContent = handicap || 'N/A';
}

// CALCULATING WITH HANDICAP
function calculateWithHandicap(handicap) {
    if (!handicap) return 0;

    // Convert string to numeric for calculations
    if (handicap.startsWith('+')) {
        // Plus handicaps are negative in calculations
        return -Math.abs(parseFloat(handicap.slice(1)));
    } else {
        return parseFloat(handicap);
    }
}
```

---

## SUMMARY

**Golden Rule**: Treat handicaps as FORMATTED STRINGS, not raw numbers.

**Three Steps to Safety**:
1. Input: type="text" with pattern validation
2. Storage: String with + sign preserved
3. Display: Show the string as-is

**Never Ever**:
- Use type="number" for handicap inputs
- Call parseFloat() on handicap values (except for calculations)
- Auto-sync profiles without validation
- Assume old data structure matches current schema

**Related Documents**:
- `2025-12-03_HANDICAP_PLUS_SIGN_CATASTROPHIC_FAILURE.md` - Full incident report
- `sql/backup_handicaps.sql` - Backup script
- `sql/fix_all_corrupted_handicaps.sql` - Fix script
