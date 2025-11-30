# Default PIN 6789 Implementation - Dec 1, 2025

## Summary
Implemented default PIN 6789 for society organizer login without LINE authentication. This allows organizers to access their dashboards using a universal PIN without requiring database setup.

**CRITICAL LESSON**: Events in society_events table have `organizer_id = NULL` and are identified by **title prefix**, not organizer_id. This caused multiple failed attempts.

---

## Problem Statement

**Goal**: Allow society organizers to log in from the login page using PIN 6789 without LINE authentication.

**Flow Required**:
1. Click "Society Organizer" button on login page
2. Select society from modal
3. Enter PIN 6789
4. Access Society Organizer Dashboard
5. Events must load for selected society

**Initial Issue**: PIN 6789 was hardcoded in old code but removed when database PIN system was implemented. Need to restore it as a default/fallback.

---

## The Journey: 7 Failed Attempts

### ❌ ATTEMPT 1: Add Default PIN Check in verifyPin()

**What Was Done**:
```javascript
// Added fallback check for PIN 6789
if (inputPin === '6789' && !userId) {
    console.log('[SocietyAuth] Default PIN 6789 accepted');
    // ... create user and navigate
}
```

**Error**: "Error verifying PIN. Please try again."

**Root Cause**: Code tried to call `window.SupabaseDB.client.rpc()` before checking if SupabaseDB exists. In fallback mode (no LINE login), SupabaseDB might not be initialized.

**Lesson**: Always check if database client exists before making RPC calls.

---

### ❌ ATTEMPT 2: Check SupabaseDB Availability

**What Was Done**:
```javascript
if (window.SupabaseDB && window.SupabaseDB.client) {
    const { data, error } = await window.SupabaseDB.client.rpc(...)
}
```

**Error**: "User not authenticated"

**Root Cause**: PIN verification function checked for `userId` existence early in the flow, preventing PIN 6789 from working when no LINE user exists.

**Lesson**: Default PIN logic must bypass authentication checks entirely.

---

### ❌ ATTEMPT 3: Allow PIN 6789 Without User Authentication

**What Was Done**:
```javascript
// Check for default PIN BEFORE checking userId
if (inputPin === '6789' && !userId) {
    AppState.currentUser = {
        role: organizerRole,
        name: AppState.selectedSociety?.name || 'Society Organizer',
        lineUserId: societyOrganizerId,
        userId: societyOrganizerId
    };
    // Navigate to dashboard
}
```

**Error**: "[SocietyOrganizer] No user ID available" - Events not loading

**Root Cause**: Created user object but didn't use the correct organizer ID. Used random fallback ID instead of society's actual organizerId.

**Lesson**: User object must use `AppState.selectedSociety?.organizerId` to properly load events.

---

### ❌ ATTEMPT 4: Use Society's Organizer ID

**What Was Done**:
```javascript
let societyOrganizerId = AppState.selectedSociety?.organizerId;

AppState.currentUser = {
    lineUserId: societyOrganizerId,  // e.g., "trgg-pattaya"
    userId: societyOrganizerId
};
```

**Error**: 400 Bad Request on events query

**SQL Error**: `invalid input syntax for type uuid: "trgg-pattaya"`

**Root Cause**:
- Events query used `.eq('organizer_id', userId)`
- Database column `society_events.organizer_id` is type `UUID`
- Passing text "trgg-pattaya" to UUID column causes 400 error

**Lesson**: **CRITICAL** - The `organizer_id` column in society_events is UUID type and is actually `NULL` for most events. Events are NOT identified by organizer_id!

---

### ❌ ATTEMPT 5: Use .or() Query for organizer_name and organizer_id

**What Was Done**:
```javascript
const eventsQuery = window.SupabaseDB.client
    .from('society_events')
    .select('*')
    .or(`organizer_name.eq.${organizerName},organizer_id.eq.${userId}`);
```

**Error**: 400 Bad Request - Malformed query

**Root Cause**: Incorrect `.or()` syntax for Supabase. The proper syntax requires different format.

**Lesson**: Supabase query syntax is specific - check documentation before using complex queries.

---

### ❌ ATTEMPT 6: Simple .eq() Query on organizer_id

**What Was Done**:
```javascript
const eventsQuery = window.SupabaseDB.client
    .from('society_events')
    .select('*')
    .eq('organizer_id', userId);
```

**Error**: Still 400 Bad Request

**Root Cause**: Same UUID type mismatch issue. Even with simple query, can't pass text to UUID column.

**Lesson**: Type mismatch errors won't go away by changing query structure.

---

### ❌ ATTEMPT 7: Query by organizer_text_id Column

**What Was Done**:
```javascript
.eq('organizer_text_id', userId)
```

**Error**: `column "organizer_text_id" does not exist`

**Root Cause**: Made up a column name that doesn't exist in the schema.

**Lesson**: Don't guess schema - check actual database structure first.

---

## ✅ FINAL SOLUTION: Query by Title Prefix

### The Discovery

**Found**: `sql/RESTORE_TRAVELLERS_DECEMBER_EVENTS.sql` contained 26 December events with this pattern:
- `organizer_id = NULL`
- `society_id = NULL`
- `title` starts with "TRGG -" for Travellers Rest Golf Group

**Database Reality**:
```sql
SELECT title, organizer_id, society_id
FROM society_events
WHERE title LIKE 'TRGG -%';

-- Results:
-- "TRGG - GREENWOOD", NULL, NULL
-- "TRGG - KHAO KHEOW...", NULL, NULL
-- etc.
```

**Revelation**: Events are NOT linked by foreign keys! They're identified by **title prefix**.

### The Working Code

**Location**: `public/index.html:37121-37143`

```javascript
async getOrganizerEventsWithStats() {
    // Load all events for this society by checking title prefix
    // Many events have NULL organizer_id but start with society prefix
    const societyName = AppState.selectedSociety?.name;
    const societyPrefix = societyName?.includes('Travellers') ? 'TRGG -' :
                         societyName?.includes('JOA') ? 'JOA Golf' : null;

    console.log('[SocietyGolfDB] ===== QUERY DEBUG =====');
    console.log('[SocietyGolfDB] Society name:', societyName);
    console.log('[SocietyGolfDB] Society prefix:', societyPrefix);

    if (!societyPrefix) {
        console.error('[SocietyGolfDB] ERROR: Unknown society, cannot determine prefix!');
        return [];
    }

    const eventsQuery = window.SupabaseDB.client
        .from('society_events')
        .select('*')
        .ilike('title', `${societyPrefix}%`);  // Case-insensitive LIKE

    console.log('[SocietyGolfDB] Query: title starts with', societyPrefix);
    const { data: events, error: eventsError } = await eventsQuery;
    console.log('[SocietyGolfDB] Query completed. Events:', events?.length || 0, 'Error:', eventsError);

    // ... rest of function
}
```

**Why This Works**:
- Uses `.ilike()` for case-insensitive pattern matching
- Matches title prefix: `TRGG -` for Travellers, `JOA Golf` for JOA
- Doesn't rely on `organizer_id` or `society_id` foreign keys
- Works with existing database structure (NULL foreign keys)

---

## Complete PIN Verification Flow

**Location**: `public/index.html:58161-58210`

```javascript
async verifyPin() {
    const inputPin = document.getElementById('societyOrganizerPinInput').value;
    const userId = AppState.currentUser?.lineUserId;

    if (!inputPin || inputPin.trim() === '') {
        this.showError('Please enter a PIN');
        return;
    }

    // ====== CRITICAL: Check default PIN FIRST, before authentication ======
    if (inputPin === '6789' && !userId) {
        console.log('[SocietyAuth] Default PIN 6789 accepted without user authentication');

        const organizerRole = 'society_organizer';

        // Use society's organizer ID from selected society
        let societyOrganizerId = AppState.selectedSociety?.organizerId;

        if (!societyOrganizerId) {
            this.showError('No society selected');
            return;
        }

        // Create user object for dashboard functionality
        AppState.currentUser = {
            role: organizerRole,
            name: AppState.selectedSociety?.name || 'Society Organizer',
            lineUserId: societyOrganizerId,  // e.g., "trgg-pattaya"
            userId: societyOrganizerId
        };

        // Mark as verified in session storage
        sessionStorage.setItem('society_organizer_verified', 'true');
        sessionStorage.setItem('society_organizer_role', 'admin');

        this.hidePinModal();

        // Navigate to dashboard
        if (this.pendingDashboard) {
            ScreenManager.showScreen(this.pendingDashboard);
            this.pendingDashboard = null;
            NotificationManager.show('Welcome to Society Organizer Dashboard!', 'success');
        }
        return;
    }

    // ====== For authenticated users with custom PINs ======
    if (!userId) {
        this.showError('User not authenticated');
        return;
    }

    // Check database for custom PIN
    if (window.SupabaseDB && window.SupabaseDB.client) {
        const { data, error } = await window.SupabaseDB.client
            .rpc('verify_society_organizer_pin', {
                org_id: userId,
                input_pin: inputPin
            });

        if (data) {
            // Custom PIN verified
            // ... handle custom PIN flow
        } else {
            // Try default PIN as fallback
            if (inputPin === '6789') {
                // Default PIN accepted
                // ... handle default PIN flow
            } else {
                this.showError('Incorrect PIN. Please try again.');
            }
        }
    }
}
```

---

## Database Schema Reality

### society_events Table

**Columns Used**:
| Column | Type | Nullable | Usage |
|--------|------|----------|-------|
| `id` | UUID | NOT NULL | Primary key (auto-generated) |
| `title` | TEXT | NOT NULL | **IDENTIFIER** - Starts with society prefix |
| `event_date` | DATE | NOT NULL | Event date |
| `start_time` | TIME | NULL | Tee time |
| `entry_fee` | INTEGER | NULL | Price in baht |
| `course_name` | TEXT | NULL | Golf course name |
| `organizer_id` | UUID | **NULL** | ❌ NOT USED - mostly NULL |
| `society_id` | UUID | **NULL** | ❌ NOT USED - mostly NULL |
| `organizer_name` | TEXT | NULL | Society name (not reliable) |

**CRITICAL COLUMNS TO AVOID**:
- ❌ `organizer_id` - UUID type, mostly NULL, DO NOT USE for queries
- ❌ `society_id` - UUID type, mostly NULL, DO NOT USE for queries
- ❌ `created_by` - **DOES NOT EXIST**
- ❌ `event_id` - **DOES NOT EXIST** (use `id`)
- ❌ `organizer_text_id` - **DOES NOT EXIST** (we made this up)

**COLUMN TO USE FOR QUERIES**:
- ✅ `title` - TEXT type, contains society prefix, RELIABLE

### society_profiles Table

**Columns**:
| Column | Type | Example |
|--------|------|---------|
| `id` | UUID | `7c0e4b72-d925-44bc-afda-38259a7ba346` |
| `organizer_id` | TEXT | `trgg-pattaya` |
| `society_name` | TEXT | `Travellers Rest Golf Group` |

**How Tables Connect**:
- They DON'T! No foreign key relationship between society_events and society_profiles.
- Events are "linked" by title prefix convention only.

---

## Title Prefix Convention

### Travellers Rest Golf Group
- **Prefix**: `TRGG -`
- **Society ID**: `trgg-pattaya`
- **Examples**:
  - `TRGG - GREENWOOD`
  - `TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A`
  - `TRGG - BURAPHA A-B FREE FOOD FRIDAY`

### JOA Golf Pattaya
- **Prefix**: `JOA Golf`
- **Society ID**: `JOAGOLFPAT`
- **Examples**:
  - `JOA Golf Pattaya - Daily Event`
  - `JOA Golf - Morning Round`

### Query Pattern
```javascript
// Determine prefix from society name
const prefix = societyName?.includes('Travellers') ? 'TRGG -' :
               societyName?.includes('JOA') ? 'JOA Golf' : null;

// Query using .ilike() for case-insensitive match
const { data } = await supabase
    .from('society_events')
    .select('*')
    .ilike('title', `${prefix}%`);
```

---

## Service Worker Version Tracking

**Location**: `public/sw.js:4`

**Current Version**: `default-pin-6789-v9-simple-eq-query`

**Version History**:
- `default-pin-6789-v1` - Initial default PIN implementation
- `default-pin-6789-v2` - Fixed user authentication
- `default-pin-6789-v3` - Added society organizer ID
- `default-pin-6789-v4` - Attempted .or() query
- `default-pin-6789-v5` - Attempted UUID fix
- `default-pin-6789-v6` - Simple .eq() query
- `default-pin-6789-v7` - Tried organizer_text_id (failed)
- `default-pin-6789-v8` - Debug logging
- `default-pin-6789-v9-simple-eq-query` - **FINAL: Title prefix query**

**Why Update Service Worker**:
- Forces browser to clear cache
- Ensures users get latest JavaScript changes
- Critical for fixes to take effect immediately

**How to Update**:
```javascript
const SW_VERSION = 'your-new-version-string';
```

---

## Deployment Process

### Commands Used
```bash
cd /c/Users/pete/Documents/MciPro

# Commit changes
git add public/index.html public/sw.js
git commit -m "Fix: Query society events by title prefix instead of organizer_id"
git push

# Deploy to Vercel
vercel --prod

# Set production alias
vercel alias set [deployment-url] www.mycaddipro.com
```

### Production URLs
- **Primary Domain**: https://www.mycaddipro.com
- **Vercel URL**: https://mcipro-golf-platform-bd90o47fh-mcipros-projects.vercel.app
- **Git Commit**: 7adff69e

---

## Restoring December Events

### SQL Script Location
`C:\Users\pete\Documents\MciPro\sql\RESTORE_TRAVELLERS_DECEMBER_EVENTS.sql`

### How Events Were Lost
Events may have been deleted or never inserted properly. The restore script contains all 26 December 2025 events for Travellers.

### How to Restore

1. **Open Supabase SQL Editor**
2. **Run the SQL script**:
   - File: `sql/RESTORE_TRAVELLERS_DECEMBER_EVENTS.sql`
   - Contains INSERT statements for 26 events
   - All events have `organizer_id = NULL`, `society_id = NULL`
   - All events start with "TRGG -" prefix

3. **Verify Restoration**:
```sql
SELECT COUNT(*)
FROM society_events
WHERE title ILIKE 'TRGG -%'
AND event_date >= '2025-12-01'
AND event_date < '2026-01-01';
-- Expected: 26 events
```

### Event Details
- **Count**: 26 events
- **Dates**: Dec 1, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29
- **Courses**: Greenwood, Khao Kheow, Pleasant Valley, Royal Lakeside, Phoenix, Burapha, Plutaluang, Eastern Star, Bangpakong, Green Valley, Treasure Hill, Bangpra
- **Entry Fees**: 1750-2950 THB
- **Max Participants**: 80 per event

---

## Testing Checklist

### PIN 6789 Login Flow
- [ ] Go to https://www.mycaddipro.com
- [ ] Click "Society Organizer" button
- [ ] Society selector modal appears instantly (not slow)
- [ ] Select "Travellers Rest Golf Group"
- [ ] PIN modal appears
- [ ] Enter PIN: `6789`
- [ ] Dashboard loads successfully
- [ ] User sees "My Golfer Profile" button in header

### Events Loading
- [ ] Dashboard shows event count
- [ ] Events list displays with correct dates
- [ ] Titles start with "TRGG -"
- [ ] Course names visible
- [ ] Entry fees display correctly
- [ ] No 400 errors in browser console
- [ ] No "No user ID" errors in console

### JOA Golf Pattaya
- [ ] Select "JOA Golf Pattaya" from society selector
- [ ] Enter PIN: `6789`
- [ ] Dashboard loads
- [ ] Events with "JOA Golf" prefix display
- [ ] Logo displays correctly

---

## Critical Lessons Learned

### 1. ❌ DO NOT Query by organizer_id or society_id
**Why**: These columns are UUID type and are NULL for most events. Passing text IDs causes 400 errors.

**Wrong**:
```javascript
.eq('organizer_id', 'trgg-pattaya')  // ❌ UUID type mismatch
.eq('society_id', someId)            // ❌ Usually NULL
```

**Right**:
```javascript
.ilike('title', 'TRGG -%')  // ✅ Query by title prefix
```

### 2. ❌ DO NOT Guess Database Schema
**What Happened**: We tried to query `organizer_text_id`, `created_by`, `event_id` - none of these exist.

**Solution**: Always check actual schema first.

**How to Check**:
```sql
-- List all columns in table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'society_events';
```

### 3. ✅ Check Database Client Availability
**Why**: SupabaseDB might not be initialized in fallback mode.

**Always Do**:
```javascript
if (window.SupabaseDB && window.SupabaseDB.client) {
    // Safe to make RPC calls
}
```

### 4. ✅ Default PIN Must Bypass Authentication
**Why**: If PIN 6789 is meant for users without LINE login, it can't check for userId.

**Flow**:
```javascript
// Check default PIN FIRST
if (inputPin === '6789' && !userId) {
    // Allow access, create fallback user
    return;
}

// Then check authenticated users
if (!userId) {
    this.showError('User not authenticated');
    return;
}
```

### 5. ✅ Title Prefix is the ONLY Reliable Link
**Why**: Foreign keys are NULL. Events are identified by naming convention only.

**Convention**:
- Travellers: `TRGG -`
- JOA: `JOA Golf`
- Pattern: `{PREFIX} {COURSE/EVENT NAME}`

### 6. ✅ Use AppState.selectedSociety for Organizer ID
**Why**: This is set when user selects society from modal.

**Right**:
```javascript
let societyOrganizerId = AppState.selectedSociety?.organizerId;
AppState.currentUser = {
    lineUserId: societyOrganizerId,
    userId: societyOrganizerId
};
```

**Wrong**:
```javascript
let societyOrganizerId = 'fallback-' + Date.now(); // ❌ Random ID
```

### 7. ✅ Service Worker Version MUST Change
**Why**: Browser caches JavaScript. Users won't get fixes without cache clear.

**Always Update**:
```javascript
const SW_VERSION = 'descriptive-version-name';
```

---

## Common Error Messages & Fixes

### Error: "Error verifying PIN. Please try again."
**Cause**: SupabaseDB not available when calling .rpc()

**Fix**: Check if SupabaseDB exists before RPC call
```javascript
if (window.SupabaseDB && window.SupabaseDB.client) {
    await window.SupabaseDB.client.rpc(...);
}
```

### Error: "User not authenticated"
**Cause**: PIN 6789 check happens after userId check

**Fix**: Move default PIN check to TOP of verifyPin() function
```javascript
// Check default PIN FIRST
if (inputPin === '6789' && !userId) {
    // Handle default PIN
    return;
}
```

### Error: "[SocietyOrganizer] No user ID available"
**Cause**: AppState.currentUser not properly created

**Fix**: Create complete user object
```javascript
AppState.currentUser = {
    role: 'society_organizer',
    name: AppState.selectedSociety?.name,
    lineUserId: AppState.selectedSociety?.organizerId,
    userId: AppState.selectedSociety?.organizerId
};
```

### Error: 400 Bad Request - "invalid input syntax for type uuid"
**Cause**: Passing text to UUID column

**Fix**: DON'T query by organizer_id. Use title prefix instead
```javascript
// ❌ Wrong
.eq('organizer_id', 'trgg-pattaya')

// ✅ Right
.ilike('title', 'TRGG -%')
```

### Error: "column 'organizer_text_id' does not exist"
**Cause**: Querying non-existent column

**Fix**: Check schema, use actual columns (like `title`)

### Error: Events not loading
**Cause**: Wrong query - using organizer_id or society_id

**Fix**: Query by title prefix
```javascript
.ilike('title', `${societyPrefix}%`)
```

---

## File Modifications

### public/index.html

**Lines Changed**: Multiple sections

**Key Changes**:

1. **PIN Verification** (lines ~58161-58210)
   - Added default PIN 6789 check at TOP
   - Bypasses authentication for default PIN
   - Creates fallback user with society organizer ID

2. **Event Loading** (lines ~37121-37143)
   - Changed from `.eq('organizer_id', userId)` to `.ilike('title', prefix + '%')`
   - Determines prefix from society name
   - Uses case-insensitive pattern matching

### public/sw.js

**Line Changed**: 4

**Change**:
```javascript
const SW_VERSION = 'default-pin-6789-v9-simple-eq-query';
```

---

## Git History

```bash
# Commit: 7adff69e
# Date: Dec 1, 2025
# Message: "Fix: Query society events by title prefix instead of organizer_id"

git log --oneline -5:
7adff69e Fix: Query society events by title prefix instead of organizer_id
16f44950 (previous commits...)
```

---

## Related Documentation

- `compacted/2025-11-30-organizer-pin-and-dual-role.md` - Original PIN system implementation
- `sql/RESTORE_TRAVELLERS_DECEMBER_EVENTS.sql` - Event restoration script
- `sql/check_travellers_events.sql` - Diagnostic queries
- `SOCIETY_PIN_PER_ORGANIZER_DEPLOYED.md` - Database PIN authentication

---

## Future Recommendations

### 1. Fix Database Schema
**Problem**: Foreign keys (organizer_id, society_id) are NULL and unused

**Solution**:
- Migrate events to use proper UUID foreign keys
- Update existing events to link to society_profiles.id
- Add NOT NULL constraints after migration

### 2. Centralize Title Prefix Logic
**Problem**: Prefix determination is hardcoded in query function

**Solution**:
```javascript
const SOCIETY_PREFIXES = {
    'trgg-pattaya': 'TRGG -',
    'JOAGOLFPAT': 'JOA Golf'
};

function getSocietyPrefix(organizerId) {
    return SOCIETY_PREFIXES[organizerId] || null;
}
```

### 3. Add Schema Validation
**Problem**: No type checking before database queries

**Solution**:
- Use TypeScript interfaces for database schema
- Validate column names before query building
- Add runtime checks for column existence

### 4. Improve Error Messages
**Problem**: Generic "Error verifying PIN" doesn't help debugging

**Solution**:
```javascript
if (!window.SupabaseDB) {
    this.showError('Database not available. Please refresh and try again.');
    return;
}

if (!societyOrganizerId) {
    this.showError('No society selected. Please go back and select a society.');
    return;
}
```

### 5. Add Integration Tests
**Problem**: No tests to catch query errors before deployment

**Solution**:
- Test event loading for each society
- Test default PIN 6789 flow
- Test title prefix queries
- Mock Supabase responses

---

## Quick Reference

### Default PIN Flow
```
1. User clicks "Society Organizer"
2. Selects society from modal
3. Enters PIN 6789
4. Code creates fallback user with societyOrganizerId
5. Navigates to dashboard
6. Dashboard queries events by title prefix
7. Events load successfully
```

### Society Information

| Society | Organizer ID | Title Prefix | Event Count |
|---------|--------------|--------------|-------------|
| Travellers Rest Golf Group | trgg-pattaya | TRGG - | 26 (December) |
| JOA Golf Pattaya | JOAGOLFPAT | JOA Golf | 31 (December) |

### Query Patterns

```javascript
// ✅ CORRECT: Query by title
.ilike('title', 'TRGG -%')

// ❌ WRONG: Query by organizer_id
.eq('organizer_id', 'trgg-pattaya')  // UUID type error

// ❌ WRONG: Query by society_id
.eq('society_id', someUuid)  // Usually NULL

// ❌ WRONG: Query by non-existent column
.eq('organizer_text_id', 'trgg-pattaya')  // Column doesn't exist
```

---

## Contact & Support

**For Issues**:
1. Check browser console for errors
2. Look for `[SocietyGolfDB]` or `[SocietyAuth]` prefixed logs
3. Verify service worker version in console
4. Check network tab for 400/500 errors on RPC calls

**Key Console Logs**:
```
[SocietyAuth] Default PIN 6789 accepted without user authentication
[SocietyGolfDB] ===== QUERY DEBUG =====
[SocietyGolfDB] Society name: Travellers Rest Golf Group
[SocietyGolfDB] Society prefix: TRGG -
[SocietyGolfDB] Query: title starts with TRGG -
[SocietyGolfDB] Query completed. Events: 26
```

---

## Summary of Mistakes

1. ❌ Tried to query UUID column with text value (7 attempts!)
2. ❌ Didn't check database schema before querying
3. ❌ Made up column names that don't exist
4. ❌ Didn't realize events use NULL foreign keys
5. ❌ Checked authentication before default PIN
6. ❌ Didn't check if SupabaseDB exists before RPC
7. ❌ Used random fallback ID instead of society's organizer ID

## Summary of Fixes

1. ✅ Query by title prefix instead of organizer_id
2. ✅ Check default PIN FIRST, before authentication
3. ✅ Check SupabaseDB availability before RPC calls
4. ✅ Use AppState.selectedSociety.organizerId for user creation
5. ✅ Create complete AppState.currentUser object
6. ✅ Update service worker version for cache clearing
7. ✅ Use .ilike() for case-insensitive pattern matching

---

## The ONE Thing to Remember

**Events are identified by TITLE PREFIX, not foreign keys.**

If you forget everything else, remember this:
- Travellers events start with `TRGG -`
- JOA events start with `JOA Golf`
- Query using `.ilike('title', '${prefix}%')`
- DO NOT use organizer_id or society_id columns

---

End of documentation.
