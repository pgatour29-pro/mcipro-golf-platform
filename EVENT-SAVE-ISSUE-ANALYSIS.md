# EVENT SAVE ISSUE - ROOT CAUSE ANALYSIS & FIX

## ISSUE SUMMARY
Events are not saving to the database when created by either golfers or organizers.

## ROOT CAUSE
**SCHEMA MISMATCH** between the application code and the database schema.

The JavaScript code is trying to INSERT into columns that don't exist in the database:

### What the Code Expects (C:\Users\pete\Documents\MciPro\public\index.html)

**Location**: Lines 36194-36252 (SocietyGolfDB.createEvent function)
**Location**: Lines 57714-57757 (GolferEventsManager.createGolferEvent function)

```javascript
const insertData = {
    id: eventData.id || this.generateId(),
    title: eventData.name,                      // ❌ Column doesn't exist
    event_date: eventData.date,                 // ❌ Column doesn't exist
    start_time: eventData.startTime || null,
    format: eventData.eventFormat || null,      // ❌ Column doesn't exist
    entry_fee: eventData.baseFee || 0,          // ❌ Column doesn't exist
    max_participants: eventData.maxPlayers,     // ❌ Column doesn't exist
    description: eventData.notes || null,       // ❌ Column doesn't exist
    creator_id: eventData.creatorId || null,    // ❌ Column doesn't exist
    creator_type: eventData.creatorType,        // ❌ Column doesn't exist
    is_private: eventData.isPrivate || false    // ❌ Column doesn't exist
};
```

### What the Database Actually Has (C:\Users\pete\Documents\MciPro\sql\society-golf-schema.sql)

**Original Schema** (lines 13-41):

```sql
CREATE TABLE society_events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,              -- Code expects: "title"
    date DATE,                       -- Code expects: "event_date"
    cutoff TIMESTAMPTZ,
    base_fee INTEGER DEFAULT 0,      -- Code expects: "entry_fee"
    max_players INTEGER,             -- Code expects: "max_participants"
    notes TEXT,                      -- Code expects: "description"
    -- Missing: format, start_time, creator_id, creator_type, is_private
);
```

## WHY THIS HAPPENED

1. **Original schema** was created with columns: `name`, `date`, `base_fee`, `max_players`, `notes`
2. **Code was updated** to use more descriptive column names: `title`, `event_date`, `entry_fee`, `max_participants`, `description`
3. **Database was never migrated** to match the new column names
4. **New features added** (golfer event creation, private events) require new columns: `creator_id`, `creator_type`, `is_private`, `format`

## EVIDENCE

### 1. Code Transformation Functions Show Expected Columns

**File**: C:\Users\pete\Documents\MciPro\public\index.html
**Lines**: 36174-36191

```javascript
return data ? {
    id: data.id,
    name: data.title,                   // Reading from "title"
    date: data.event_date,              // Reading from "event_date"
    eventFormat: data.format,           // Reading from "format"
    baseFee: data.entry_fee || 0,       // Reading from "entry_fee"
    maxPlayers: data.max_participants,  // Reading from "max_participants"
    notes: data.description,            // Reading from "description"
    isPrivate: data.is_private || false,
    creatorId: data.creator_id || null,
    creatorType: data.creator_type || 'organizer'
} : null;
```

### 2. Both Event Creation Flows Use Same Column Names

**Organizer Event Creation**:
- File: C:\Users\pete\Documents\MciPro\public\index.html
- Function: `SocietyOrganizerSystem.saveEvent()` (lines 47615-47765)
- Calls: `SocietyGolfDB.createEvent()` (line 47731)

**Golfer Event Creation**:
- File: C:\Users\pete\Documents\MciPro\public\index.html
- Function: `GolferEventsManager.createGolferEvent()` (lines 57668-57801)
- Direct insert: `window.SupabaseDB.client.from('society_events').insert([payload])` (lines 57750-57753)

Both use the same incorrect column names.

### 3. Insert Operations Are Present But Failing Silently

The code DOES have `.insert()` calls:
- Line 36237: `await window.SupabaseDB.client.from('society_events').insert(insertData).select()`
- Line 57752: `await window.SupabaseDB.client.from('society_events').insert([payload]).select()`

But they're inserting into non-existent columns, causing silent failures.

## THE FIX

### Step 1: Diagnose Current Schema

Run this SQL script to check which columns exist:

```
C:\Users\pete\Documents\MciPro\sql\DIAGNOSE-EVENT-SAVE-ISSUE.sql
```

This will show:
- Which old columns still exist (name, date, base_fee, max_players, notes)
- Which new columns are missing (title, event_date, format, entry_fee, max_participants, description, creator_id, creator_type, is_private)

### Step 2: Apply Schema Migration

Run this SQL script to fix the schema:

```
C:\Users\pete\Documents\MciPro\sql\FIX-EVENT-SAVE-SCHEMA-MISMATCH.sql
```

This script will:
1. **Rename old columns** to new names (preserving existing data)
   - `name` → `title`
   - `date` → `event_date`
   - `base_fee` → `entry_fee`
   - `max_players` → `max_participants`
   - `notes` → `description`

2. **Add new columns** required by the code
   - `format` (TEXT) - for event format (strokeplay, scramble, etc.)
   - `start_time` (TIME) - for tee time
   - `creator_id` (TEXT) - LINE user ID of creator
   - `creator_type` (TEXT) - 'golfer' or 'organizer'
   - `is_private` (BOOLEAN) - for private/public events

3. **Update indexes** to use new column names

4. **Verify the fix** with automatic checks

### Step 3: Test Event Creation

After running the migration:

1. **Test Organizer Event Creation**:
   - Log in as organizer (e.g., TRGG, JOA, Ora Ora)
   - Navigate to Society Organizer dashboard
   - Click "Create New Event"
   - Fill out form and click "Create Event"
   - Check console for success message
   - Verify event appears in dashboard

2. **Test Golfer Event Creation**:
   - Log in as golfer
   - Navigate to Events section
   - Click "Create New Event"
   - Fill out form and click "Create Event"
   - Check console for success message
   - Verify event appears in "My Events"

## AFFECTED FILES

### Database Schema Files:
- `C:\Users\pete\Documents\MciPro\sql\society-golf-schema.sql` (original schema with old column names)
- `C:\Users\pete\Documents\MciPro\sql\DIAGNOSE-EVENT-SAVE-ISSUE.sql` (NEW - diagnostic script)
- `C:\Users\pete\Documents\MciPro\sql\FIX-EVENT-SAVE-SCHEMA-MISMATCH.sql` (NEW - migration script)

### Application Code:
- `C:\Users\pete\Documents\MciPro\public\index.html`
  - Lines 36194-36252: `SocietyGolfDB.createEvent()` function
  - Lines 36174-36191: Data transformation showing expected columns
  - Lines 47615-47765: `SocietyOrganizerSystem.saveEvent()` function
  - Lines 57668-57801: `GolferEventsManager.createGolferEvent()` function

## IMPORTANT NOTES

1. **No Code Changes Required** - The application code is correct. Only the database schema needs to be updated.

2. **Data Preservation** - The migration script uses `RENAME COLUMN` which preserves all existing event data.

3. **Safe to Run Multiple Times** - The script uses `IF EXISTS` checks and will skip steps that have already been completed.

4. **RLS Policies** - Row Level Security policies are already configured correctly (lines 124-140 in society-golf-schema.sql) - they allow everyone to insert/update/delete.

## VERIFICATION CHECKLIST

After running the fix:

- [ ] Run DIAGNOSE script - all checks should show ✅ GOOD
- [ ] All existing events still visible in dashboards
- [ ] Organizer can create new events
- [ ] Golfer can create new events
- [ ] New events save to database
- [ ] New events appear in event lists
- [ ] Console shows success messages (no errors)

## EXPECTED OUTCOME

Once the schema migration is applied:

1. **Organizer event creation** will work - events will save to `society_events` table
2. **Golfer event creation** will work - events will save to `society_events` table
3. **No data loss** - all existing events will be preserved with correct column mappings
4. **No code changes needed** - application will work immediately after schema fix

## SUMMARY

**Problem**: Schema mismatch - code expects columns that don't exist
**Solution**: Rename old columns, add new columns
**Impact**: Both organizer and golfer event creation flows will work
**Risk**: None - migration preserves all data
**Testing**: Required after running migration

---

**Created**: 2025-11-28
**Issue Type**: Database Schema Mismatch
**Severity**: High (blocks core functionality)
**Resolution**: SQL migration script
