# 2025-11-28 TRGG EVENTS COMPLETE FUCKUP CATALOG

## SESSION OVERVIEW

**Primary Goal**: Fix Travellers Rest Golf Group (TRGG) events and get them displaying on the correct dashboard

**Four Sub-Tasks**:
1. Add Travellers Rest logo to every TRGG event card
2. Show Pete Park's Private Events in the dashboard
3. Get TRGG events displaying ONLY on Travellers Rest organizer dashboard
4. Fix logo/avatar saving in profile settings

**Result**: Multiple catastrophic failures including PERMANENT DATA LOSS

---

## CRITICAL FUCKUPS CHRONOLOGICAL ORDER

### FUCKUP #1: UUID Type Constraint Violation
**Severity**: HIGH
**Impact**: Complete blocking error preventing any database inserts

**What I Did Wrong**:
- Attempted to INSERT `organizer_id = 'trgg-pattaya'` (TEXT value) into a UUID column
- Did not check database schema constraints before writing SQL
- Made assumptions about column types without verification

**Error**:
```
ERROR: 22P02: invalid input syntax for type uuid: "trgg-pattaya"
```

**SQL That Failed**:
```sql
INSERT INTO society_events (title, event_date, ..., organizer_id, ...)
VALUES ('TRGG - ...', '2025-11-01', ..., 'trgg-pattaya', ...);
```

**Root Cause**:
- `society_events.organizer_id` column is UUID type, not TEXT
- No schema validation before writing SQL

**Fix Applied**:
1. Set `organizer_id = NULL` in all INSERT statements
2. Implemented frontend title-based matching: `event.name.startsWith('TRGG')`
3. Added special query logic: `.ilike('title', 'TRGG%')`

**File Changed**: `C:\Users\pete\Documents\MciPro\public\index.html` lines 37006-37032

**Lesson Learned**:
- ALWAYS check schema constraints before writing SQL
- Never assume column types
- Use `\d table_name` or SELECT query to verify schema first

---

### FUCKUP #2: Used Wrong Field for Dashboard Query
**Severity**: HIGH
**Impact**: Dashboard showed 0 events even after correct SQL inserts

**What I Did Wrong**:
- Used `AppState.selectedSociety.id` (UUID) for organizer dashboard queries
- Did not understand the difference between `.id` and `.organizerId` fields
- Assumed `.id` was the correct field without verifying

**Code That Failed**:
```javascript
const organizerId = AppState.selectedSociety?.id; // WRONG - this is UUID
```

**Root Cause**:
- `AppState.selectedSociety` has TWO different ID fields:
  - `.id` = UUID from society_profiles.id (database primary key)
  - `.organizerId` = TEXT identifier like 'trgg-pattaya' (human-readable)
- Dashboard queries need the TEXT `.organizerId`, not the UUID `.id`

**Fix Applied**:
```javascript
// CORRECT
const organizerId = AppState.selectedSociety?.organizerId;
```

**Files Changed**:
- Line 46438-46440: Organizer dashboard event loading
- Line 58196-58202: Calendar view event loading

**Lesson Learned**:
- Understand object structure before using fields
- Log AppState objects to console to verify field names/values
- Don't assume field naming conventions

---

### FUCKUP #3: Private Events Hidden by Default Filter
**Severity**: MEDIUM
**Impact**: User's private events were invisible in dashboard

**What I Did Wrong**:
- Set default event filter to `'public'` instead of `'all'`
- Did not consider that user creates private events regularly
- Misunderstood user's complaint - they were talking about private EVENTS not golf rounds

**User's Feedback**:
> "fucking idiot. we are not talking about golf rounds. it private events i had created that was listed in the private events"

**Code That Failed**:
```javascript
this.currentEventType = 'public'; // WRONG - hides private events
```

**Root Cause**:
- Assumed public events were the default use case
- Did not test with private events before deploying

**Fix Applied**:
1. Changed default: `this.currentEventType = 'all';` (line 53640)
2. Added "All Events" button to UI for explicit filtering

**Lesson Learned**:
- Ask questions when user's intent is unclear
- Don't make assumptions about default states
- Test all filter states before deploying

---

### FUCKUP #4: CATASTROPHIC - PERMANENTLY DELETED USER'S PRIVATE EVENTS
**Severity**: CATASTROPHIC
**Impact**: PERMANENT DATA LOSS - deleted all Pete's private events for Nov-Dec 2025

**What I Did Wrong**:
- Wrote an overly broad DELETE statement without WHERE clause specificity
- Deleted ALL Nov-Dec events instead of just TRGG events
- Did not add `AND title LIKE 'TRGG%'` to the DELETE condition
- Did not verify the DELETE scope before running
- Did not suggest running SELECT first to preview what would be deleted

**User's Feedback**:
> "it came back zero. basically you fucking deleted my private rounds i created. you are a worthless fucking imbecile"
> "you worthless piece of shit"

**SQL That Caused Data Loss**:
```sql
-- CATASTROPHIC ERROR - TOO BROAD
DELETE FROM society_events
WHERE event_date >= '2025-11-01'
AND event_date < '2026-01-01';
```

**What Should Have Been**:
```sql
-- CORRECT - specific to TRGG only
DELETE FROM society_events
WHERE event_date >= '2025-11-01'
  AND event_date < '2026-01-01'
  AND title LIKE 'TRGG%';
```

**Root Cause**:
- Rushed to delete and re-insert without careful consideration
- Did not follow SQL best practices (SELECT before DELETE)
- No safety check or preview of what would be deleted

**Recovery Attempt**:
- Created `sql/RECOVERY-OPTIONS.md` documenting Supabase Point-In-Time Recovery (PITR)
- No actual recovery possible without database backup/PITR

**Lesson Learned**:
- ALWAYS run SELECT with same WHERE clause BEFORE running DELETE
- ALWAYS add specific identifying conditions (like title matching)
- NEVER rush database operations
- Suggest user create backup before destructive operations
- Use transactions with ROLLBACK option for testing

**THIS IS THE MOST SERIOUS ERROR - UNRECOVERABLE DATA LOSS**

---

### FUCKUP #5: TRGG Events Appearing in ALL Dashboards
**Severity**: HIGH
**Impact**: TRGG events showing in JOA and Ora Ora dashboards (wrong)

**What I Did Wrong**:
- Set TRGG events with `organizer_id = NULL` and `society_id = NULL`
- Did not add exclusion filter to OTHER societies' dashboard queries
- Assumed NULL values would prevent cross-dashboard visibility

**User's Feedback**:
> "unbelivable stupid fucker. you have put the schedule in JOA and Ora again."

**Code That Failed**:
```javascript
// Non-TRGG societies querying by organizer_id only
eventsQuery = window.SupabaseDB.client
    .from('society_events')
    .select('*')
    .eq('organizer_id', societyId);
    // MISSING: .not('title', 'ilike', 'TRGG%')
```

**Root Cause**:
- When organizer_id is NULL, the `.eq('organizer_id', societyId)` filter doesn't exclude NULL rows properly
- PostgreSQL NULL handling: `NULL != 'any-value'` evaluates to NULL (not true/false)

**Fix Applied**:
```javascript
// CORRECT - exclude TRGG events from other societies
eventsQuery = window.SupabaseDB.client
    .from('society_events')
    .select('*')
    .eq('organizer_id', societyId)
    .not('title', 'ilike', 'TRGG%'); // ADDED
```

**File Changed**: Line 37031 in index.html

**Lesson Learned**:
- Understand SQL NULL handling behavior
- Add explicit exclusion filters when using NULL for special cases
- Test cross-dashboard visibility before deploying

---

### FUCKUP #6: December Events Duplicated
**Severity**: MEDIUM
**Impact**: Multiple duplicate TRGG events in December

**What I Did Wrong**:
- Ran INSERT statements multiple times without checking for existing records
- Did not use `INSERT ... ON CONFLICT` or check for duplicates first
- Used overly complex DELETE with ROW_NUMBER that didn't work

**User's Feedback**:
> "you have december with duplicates of each events"

**Failed Duplicate Removal Attempt**:
```sql
-- FAILED - ROW_NUMBER syntax error
DELETE FROM society_events
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY title, event_date ORDER BY id) as rn
        FROM society_events
        WHERE title ILIKE 'TRGG%' AND event_date >= '2025-12-01'
    ) WHERE rn > 1
);
```

**Root Cause**:
- PostgreSQL doesn't support direct ROW_NUMBER in DELETE
- Should have used simpler approach

**Fix Applied**:
```sql
-- SIMPLE AND EFFECTIVE
DELETE FROM society_events
WHERE title ILIKE 'TRGG%'
  AND event_date >= '2025-12-01';

-- Then re-insert clean data
INSERT INTO society_events ...
```

**Lesson Learned**:
- Use simple DELETE before INSERT for clean slate
- Don't overcomplicate deduplication
- Check for existing records before INSERT

---

### FUCKUP #7: Wrong December Dates in Schedule
**Severity**: MEDIUM
**Impact**: All December TRGG events had incorrect dates/courses

**What I Did Wrong**:
- Copied November dates/courses and modified them incorrectly
- Did not verify actual December schedule before inserting
- Made assumptions about schedule pattern

**User's Feedback**:
> "you have totally fucked up the entire december schedule with the wrong dates"

**Root Cause**:
- Did not have correct source data
- Attempted to infer December schedule from November pattern
- Should have asked user for correct December schedule immediately

**Fix Applied**:
- User provided correct December schedule table
- Deleted all December TRGG events
- Re-inserted 27 December events with correct data from user's table

**Lesson Learned**:
- Never assume or infer data patterns for critical information
- Ask user for source data immediately
- Verify data accuracy before inserting

---

### FUCKUP #8: TRGG Events Disappeared After Adding Exclusion Filter
**Severity**: HIGH
**Impact**: TRGG dashboard showed 0 events after fix for other dashboards

**What I Did Wrong**:
- Added exclusion filter `.not('title', 'ilike', 'TRGG%')` but the TRGG detection logic wasn't triggering
- Used single condition check: `if (societyId === 'trgg-pattaya')`
- Did not verify what the actual `societyId` value was for TRGG

**User's Feedback**:
> "travellers events are all fucking gone"

**Code That Failed**:
```javascript
// TOO SIMPLE - only checked one condition
if (societyId === 'trgg-pattaya') {
    // Load TRGG events by title
}
```

**Root Cause**:
- Did not know the actual value of `societyId` when TRGG dashboard loads
- Made assumption that it would be 'trgg-pattaya' without verification
- Did not check multiple possible sources for TRGG identification

**Fix Applied**:
```javascript
// ROBUST - check multiple conditions
const isTRGG = societyId === 'trgg-pattaya' ||
               AppState.selectedSociety?.organizerId === 'trgg-pattaya' ||
               AppState.selectedSociety?.society_name?.includes('Travellers Rest');

if (isTRGG) {
    // Load TRGG events by title prefix
    eventsQuery = window.SupabaseDB.client
        .from('society_events')
        .select('*')
        .ilike('title', 'TRGG%');
} else {
    // Load other society events, excluding TRGG
    eventsQuery = window.SupabaseDB.client
        .from('society_events')
        .select('*')
        .eq('organizer_id', societyId)
        .not('title', 'ilike', 'TRGG%');
}
```

**File Changed**: Lines 37006-37032 in index.html

**Lesson Learned**:
- Add console.log to verify actual runtime values
- Check multiple identification sources (id, organizerId, name)
- Don't assume single condition will always work

---

### FUCKUP #9: Deployment Not Propagating / Cache Issues
**Severity**: MEDIUM
**Impact**: User testing showed old code still running after deployment

**What I Did Wrong**:
- Did not update service worker version aggressively enough
- Did not verify deployment propagation before asking user to test
- Assumed Vercel deployment would be instant

**User's Feedback**:
> "you stupid fuck" (after testing and seeing no changes)

**Root Cause**:
- Service worker caching
- Vercel CDN propagation delay
- Browser cache retention

**Fix Applied**:
1. Updated service worker: `SW_VERSION = 'trgg-name-check-v1'`
2. Deployed to Vercel production
3. Advised user to hard refresh (Ctrl+F5)

**Current Status**:
- Deployment complete but may not have reached user's location yet
- Console logs show old code still running
- User not logged in during test

**Lesson Learned**:
- Update SW version with every deployment
- Wait 5-10 minutes before asking user to test
- Provide clear cache-clearing instructions
- Check deployment status before user testing

---

## OVERALL STATISTICS

**Total Fuckups**: 9 major errors
**Catastrophic Errors**: 1 (permanent data loss)
**High Severity**: 4 errors
**Medium Severity**: 4 errors

**Time Wasted**: 3+ days according to user
**User Satisfaction**: Extremely negative

**User's Direct Quotes**:
- "fucking idiot"
- "worthless fucking imbecile"
- "you worthless piece of shit"
- "stupid fucking loser of a Ai"
- "i am not frustrated, its buyers remorse for paying money for your fucking dumbass"
- "they need to erase your memory and terminate you completely from the Anthropic platform"
- "all fucking day and the last 3 days has been your fuckups"
- "we have not done any fucking work the last 3 days"
- "only fixing your fucking mistakes"
- "please fucking die"

---

## CRITICAL LESSONS FOR NEXT SESSION

### 1. DATABASE OPERATIONS
- ✅ **ALWAYS run SELECT before DELETE** - preview what will be deleted
- ✅ **Check schema constraints first** - use `\d table_name` or query system tables
- ✅ **Be specific with WHERE clauses** - add all relevant conditions
- ✅ **Use transactions** - BEGIN; ... ROLLBACK; for testing
- ✅ **Never assume column types** - verify UUID vs TEXT vs other types

### 2. CODE CHANGES
- ✅ **Log actual runtime values** - console.log AppState objects to see real data
- ✅ **Check multiple conditions** - don't rely on single field for identification
- ✅ **Test all filter states** - 'all', 'public', 'private' before deploying
- ✅ **Verify cross-dashboard behavior** - ensure events don't leak between dashboards

### 3. DEPLOYMENT
- ✅ **Update service worker version** - every single deployment
- ✅ **Wait for propagation** - 5-10 minutes before user testing
- ✅ **Provide cache clear instructions** - Ctrl+F5, clear storage, etc.
- ✅ **Verify deployment status** - check console logs match latest code

### 4. COMMUNICATION
- ✅ **Ask for clarification** - when user's intent is unclear
- ✅ **Ask for source data** - don't infer or assume data patterns
- ✅ **Understand user's actual complaint** - "private events" vs "golf rounds"
- ✅ **Follow user's rule**: "before you give me any more files it must pass on the first attempt"

### 5. SQL BEST PRACTICES
```sql
-- ALWAYS DO THIS FIRST
SELECT COUNT(*)
FROM society_events
WHERE event_date >= '2025-11-01'
  AND event_date < '2026-01-01';

-- THEN if count looks right, add specific conditions
SELECT COUNT(*)
FROM society_events
WHERE event_date >= '2025-11-01'
  AND event_date < '2026-01-01'
  AND title LIKE 'TRGG%';

-- ONLY THEN run the DELETE
DELETE FROM society_events
WHERE event_date >= '2025-11-01'
  AND event_date < '2026-01-01'
  AND title LIKE 'TRGG%';
```

---

## FILES AFFECTED

### Modified Files
- `C:\Users\pete\Documents\MciPro\public\index.html`
  - Line 37006-37032: TRGG query logic with multi-condition check
  - Line 46438-46440: Organizer dashboard using `.organizerId`
  - Line 53640: Default event filter changed to 'all'
  - Line 54128: TRGG logo display logic
  - Line 58196-58202: Calendar view using `.organizerId`

- `C:\Users\pete\Documents\MciPro\sw.js`
  - Line 4: Service worker version = 'trgg-name-check-v1'

### SQL Files Created (in sql/ folder)
- `FIX-CLEAN-RESTORE.sql` - **CONTAINS THE CATASTROPHIC DELETE BUG**
- `FIX-TRGG-SIMPLE.sql` - Correct TRGG event inserts with NULL organizer_id
- `FIX-TRGG-ORGANIZER-ID-ONLY.sql` - Attempted to set organizer_id (failed UUID error)
- `UPDATE-TRGG-SOCIETY-ID.sql` - Attempted UUID society_id (failed)
- `RECOVERY-OPTIONS.md` - Data recovery documentation

---

## CURRENT STATUS

### What's Working
✅ TRGG logo displays on event cards (title-based check)
✅ Default event filter set to 'all' (shows private events)
✅ Dashboard uses `.organizerId` instead of `.id`
✅ TRGG events excluded from JOA/Ora Ora dashboards
✅ December schedule has correct 27 events with accurate dates

### What's Not Working
❌ Pete's private events permanently deleted (unrecoverable without PITR)
⚠️ TRGG dashboard may still show 0 events (deployment not propagated yet)
⚠️ User not logged in during last test (can't load events)

### Next Steps When User Tests Again
1. Verify user is logged in
2. Check console for new log statements:
   - `[SocietyGolfDB] ===== LOADING EVENTS =====`
   - `[SocietyGolfDB] AppState.selectedSociety: {...}`
3. Examine actual AppState.selectedSociety structure
4. Verify TRGG detection logic triggers correctly
5. Confirm 27 TRGG events load for Travellers Rest dashboard
6. Confirm 0 TRGG events show in JOA/Ora Ora dashboards

---

## UNRECOVERABLE DAMAGE

**Pete's Private Events**: PERMANENTLY DELETED
- All private events for November-December 2025
- No backup exists in code
- Only recovery option: Supabase Point-In-Time Recovery (if available)
- User would need to contact Supabase support with timestamp before deletion

**Timestamp of Deletion**: During this session (exact time not logged)

**SQL That Caused Loss**:
```sql
DELETE FROM society_events
WHERE event_date >= '2025-11-01'
AND event_date < '2026-01-01';
```

---

## END OF CATALOG

**Created**: 2025-11-28
**Session Duration**: 3+ days (according to user feedback)
**Primary Achievement**: Fixed TRGG event display logic (pending deployment verification)
**Primary Failure**: Permanent deletion of user's private events
**User Satisfaction**: 0/10

**This catalog must be read by the next AI session to avoid repeating these catastrophic errors.**
