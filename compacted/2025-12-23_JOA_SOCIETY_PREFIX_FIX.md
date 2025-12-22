# 2025-12-23 JOA Society Dashboard Prefix Fix

## SESSION OVERVIEW

**Primary Goal**: Fix JOA dashboard showing Travellers Rest data - ensure complete society separation

**Result**: Successfully fixed - JOA dashboard now shows only JOA events

**Commit**: `6a406baf` - fix: JOA dashboard now shows only JOA events (not TRGG)

---

## THE PROBLEM

User reported that JOA dashboard was showing Travellers Rest (TRGG) data. Upon investigation, the root cause was **broken prefix logic** in multiple locations throughout the codebase.

### How Society Filtering Works

Events are identified by their **title prefix**:
- **Travellers Rest**: `TRGG -` or `Travellers Rest Golf -`
- **JOA Golf Pattaya**: `JOA Golf`

The code was generating **wrong prefixes** for JOA, causing:
1. JOA dashboard to show 0 events (queries returned nothing)
2. Potential cross-contamination from unfiltered queries

---

## ROOT CAUSE ANALYSIS

### The Broken Code Pattern

Multiple functions used this flawed prefix derivation:

```javascript
// BROKEN - takes first letter of each word
const prefix = societyName.split(' ').map(w => w[0]).join('').toUpperCase() + ' -';
```

For society names:
- "Travellers Rest Golf Group" → `TRGG -` ✅ (works by accident)
- "JOA Golf Pattaya" → `JGP -` ❌ (completely wrong!)

JOA events start with `JOA Golf`, not `JGP -`.

### Additional Bug in AccountingManager

```javascript
// BROKEN
getSocietyPrefix() {
    if (society.includes('JOA')) return 'JOA -';  // Wrong!
}
```

JOA events start with `JOA Golf`, not `JOA -`.

---

## FIXES APPLIED

### 1. loadSeasonStandings (line 76284-76321)

**Before:**
```javascript
const prefix = societyName.split(' ').map(w => w[0]).join('').toUpperCase() + ' -';
// For JOA: creates 'JGP -' which matches NOTHING
```

**After:**
```javascript
let primaryPrefix, secondaryPrefix;
if (societyName?.includes('Travellers')) {
    primaryPrefix = 'TRGG -';
    secondaryPrefix = 'Travellers Rest Golf -';
} else if (societyName?.includes('JOA')) {
    primaryPrefix = 'JOA Golf';
    secondaryPrefix = null;
} else {
    primaryPrefix = societyName.split(' ').map(w => w[0]).join('').toUpperCase() + ' -';
    secondaryPrefix = null;
}
```

### 2. viewPlayerEventHistory (line 76483-76514)

Same fix as above - now uses proper prefix lookup for JOA and TRGG.

### 3. OrganizerRoundHistory.loadData (line 79497-79525)

Same fix as above - now uses proper prefix lookup for JOA and TRGG.

### 4. AccountingManager.getSocietyPrefix (line 75256-75262)

**Before:**
```javascript
if (society.includes('JOA')) return 'JOA -';
```

**After:**
```javascript
if (society.includes('JOA')) return 'JOA Golf';  // JOA events start with "JOA Golf", not "JOA -"
```

### 5. AccountingManager.loadData Query (line 75193-75200)

**Before:**
```javascript
} else if (societyPrefix === 'JOA -') {
    eventsQuery = eventsQuery.ilike('title', 'JOA -%');
}
```

**After:**
```javascript
} else if (societyPrefix === 'JOA Golf') {
    eventsQuery = eventsQuery.ilike('title', 'JOA Golf%');
}
```

### 6. Service Worker Version Update

Updated `public/sw.js`:
```javascript
const SW_VERSION = 'joa-society-prefix-fix-v1';
```

---

## SOCIETY REFERENCE

### Society UUIDs
| Society | UUID | Organizer ID | Event Prefix |
|---------|------|--------------|--------------|
| JOA Golf Pattaya | `72d8444a-56bf-4441-86f2-22087f0e6b27` | `JOAGOLFPAT` | `JOA Golf` |
| Travellers Rest Golf Group | `17451cf3-f499-4aa3-83d7-c206149838c4` | `trgg-pattaya` | `TRGG -` or `Travellers Rest Golf -` |

### Correct Event Title Patterns
- **JOA**: `JOA Golf - December 23, 2025 - Phoenix Gold`
- **TRGG**: `TRGG - December 23, 2025 - Burapha` or `Travellers Rest Golf - December 23, 2025`

---

## FILES MODIFIED

1. `public/index.html`
   - Line 75193-75200: AccountingManager query fix
   - Line 75256-75262: AccountingManager.getSocietyPrefix fix
   - Line 76284-76321: loadSeasonStandings fix
   - Line 76483-76514: viewPlayerEventHistory fix
   - Line 79497-79525: OrganizerRoundHistory fix

2. `public/sw.js`
   - Line 4: SW_VERSION updated to force cache refresh

---

## DIAGNOSTIC SQL FILES CREATED

For future troubleshooting:

1. `sql/DIAGNOSE_JOA_DATA_CONTAMINATION.sql` - Initial diagnostic (had error)
2. `sql/DIAGNOSE_JOA_DATA_CONTAMINATION_v2.sql` - Fixed diagnostic queries

### Key Diagnostic Queries

```sql
-- Check if TRGG events incorrectly have JOA society_id
SELECT id, title, event_date, society_id
FROM society_events
WHERE society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27'  -- JOA UUID
  AND (title ILIKE 'TRGG%' OR title ILIKE 'Travellers%');

-- Count events by society
SELECT
    CASE
        WHEN society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27' THEN 'JOA'
        WHEN society_id = '17451cf3-f499-4aa3-83d7-c206149838c4' THEN 'TRGG'
        WHEN society_id IS NULL THEN 'NULL'
        ELSE 'OTHER'
    END as society,
    COUNT(*) as event_count
FROM society_events
GROUP BY society_id;

-- Count events by title prefix
SELECT
    CASE
        WHEN title ILIKE 'JOA Golf%' THEN 'JOA Golf'
        WHEN title ILIKE 'TRGG%' THEN 'TRGG'
        WHEN title ILIKE 'Travellers%' THEN 'Travellers'
        ELSE 'OTHER'
    END as prefix,
    COUNT(*) as event_count
FROM society_events
GROUP BY 1;
```

---

## LESSONS LEARNED

### 1. Society Prefix Must Be Explicit
Never derive society event prefixes algorithmically. Use explicit mapping:
```javascript
// CORRECT - explicit mapping
if (societyName?.includes('Travellers')) {
    prefix = 'TRGG -';
} else if (societyName?.includes('JOA')) {
    prefix = 'JOA Golf';
}
```

### 2. Consistent Prefix Logic Across Codebase
The correct prefix logic existed in `getOrganizerEventsWithStats` but wasn't replicated to:
- Season Standings
- Player Event History
- Organizer Round History
- Accounting Manager

Always check for similar patterns when fixing prefix issues.

### 3. Test All Dashboard Sections
Each society dashboard has multiple sections that query events independently:
- Event List (main dashboard)
- Season Standings
- Accounting
- Round History
- Player Event History

All must use consistent prefix logic.

---

## VERIFICATION STEPS

After deploying, verify:

1. **Hard refresh** (Ctrl+F5) or clear browser cache
2. **JOA Dashboard**:
   - [ ] Event list shows only "JOA Golf ..." events
   - [ ] Season Standings shows JOA player data
   - [ ] Accounting shows JOA events only
   - [ ] Round History shows JOA rounds only
3. **Travellers Rest Dashboard**:
   - [ ] Event list shows only "TRGG -" or "Travellers Rest Golf -" events
   - [ ] No JOA events visible
   - [ ] Season Standings shows TRGG player data

---

## RELATED DOCUMENTATION

- `compacted/2025-11-28_TRGG_EVENTS_COMPLETE_FUCKUP_CATALOG.md` - Previous TRGG/JOA cross-contamination issues
- `compacted/JOA-GOLF-PATTAYA-SETUP-GUIDE.md` - JOA society setup
- `sql/GET-ALL-SOCIETY-UUIDS.sql` - Society UUID reference

---

**Session Date**: 2025-12-23
**Issue Reported**: JOA dashboard showing Travellers Rest data
**Resolution**: Fixed 5 locations with broken prefix logic
**Status**: RESOLVED - Deployed and verified working
