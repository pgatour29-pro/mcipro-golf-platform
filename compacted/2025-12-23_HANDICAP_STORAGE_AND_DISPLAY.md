# 2025-12-23 Handicap Storage & Display - Critical Reference

## PROBLEM SUMMARY

Bubba's handicap showed as "+10" instead of "10" on the Registration page. Wasted 1 hour debugging because of unclear understanding of where handicaps are stored.

---

## HANDICAP STORAGE LOCATIONS

### Primary Table: `society_handicaps`
```sql
-- This is where ALL handicaps are stored (universal AND society-specific)
SELECT * FROM society_handicaps WHERE golfer_id = 'USER_ID';

-- Columns:
-- id (uuid)
-- golfer_id (text) - LINE user ID like 'U9e64d5456b0582e81743c87fa48c21e2'
-- society_id (uuid) - NULL for universal handicap, society UUID for society-specific
-- handicap_index (numeric) - THE ACTUAL HANDICAP VALUE
-- updated_at (timestamp)
```

### Universal vs Society Handicap
| Type | society_id | Description |
|------|------------|-------------|
| Universal | NULL | Used for non-members, casual rounds |
| Society | UUID | Society-specific handicap |

### Secondary Table: `global_players`
```sql
-- Also stores handicap but society_handicaps takes precedence
SELECT * FROM global_players WHERE display_name ILIKE '%player_name%';
```

### NOT Used for Handicaps
- `golfer_handicaps` - DOES NOT EXIST
- `profiles.handicap` - Not the primary source

---

## HOW HANDICAPS ARE FETCHED

### In Pairings (RegistrationsManager.fetchCurrentHandicaps)
Location: `public/index.html` ~line 74620-74652

```javascript
// Fetches from society_handicaps table
const { data: records } = await window.SupabaseDB.client
    .from('society_handicaps')
    .select('*')
    .in('golfer_id', playerIds);

// Priority:
// 1. Society-specific handicap (society_id = selected society UUID)
// 2. Universal handicap (society_id = NULL)
// 3. Registration handicap (fallback)
```

### Console Log Pattern
```
[Pairings] ✅ USER_ID: Using SOCIETY handicap: X.X
[Pairings] ⚠️ USER_ID: No society record, using universal: X.X
[Pairings] ❌ USER_ID: No handicap records found
```

---

## THE BUG: Negative Handicap Values

### What Happened
- Bubba's universal handicap was stored as `-10.0` in `society_handicaps`
- Code displayed negative values with "+" prefix (treating as plus handicap)
- `-10.0` displayed as `+10.0` instead of `10.0`

### Root Cause
Someone (or code) stored the handicap as negative. Plus handicaps should be stored as negative (e.g., +2 scratch golfer = -2.0), but regular handicaps should be positive.

### The Fix
```sql
UPDATE society_handicaps
SET handicap_index = 10.0
WHERE golfer_id = 'U9e64d5456b0582e81743c87fa48c21e2';
```

---

## formatHandicapDisplay Function

Location: `public/index.html` ~line 5540-5572

```javascript
window.formatHandicapDisplay = function(handicap) {
    // Handles null/undefined
    if (handicap === null || handicap === undefined || handicap === '') {
        return '-';
    }

    // Already has + prefix
    if (typeof handicap === 'string' && handicap.startsWith('+')) {
        return handicap;
    }

    const numValue = parseFloat(handicap);
    if (isNaN(numValue)) {
        return String(handicap);
    }

    // Negative values: only -4 to 0 are real plus handicaps
    if (numValue < 0) {
        if (numValue >= -4) {
            // Real plus handicap (scratch/pro)
            return '+' + Math.abs(numValue).toFixed(1);
        } else {
            // Data error - display as positive
            console.warn(`[Handicap] Value ${numValue} is likely a data error`);
            return Math.abs(numValue).toFixed(1);
        }
    }

    return numValue.toFixed(1);
};
```

### Where formatHandicapDisplay is Used
- Registration player table (line 74168)
- Waitlist table (line 74239)
- Pairings display (line 74308, 74350)
- Print view (line 74810)
- Roster modal (line 58454)
- LINE notifications (line 74698, 74732, 74749)

---

## QUICK DIAGNOSTIC QUERIES

### Find a player's handicaps
```sql
SELECT * FROM society_handicaps
WHERE golfer_id = 'LINE_USER_ID';
```

### Find player by name
```sql
SELECT * FROM global_players
WHERE display_name ILIKE '%name%';
```

### Fix wrong handicap value
```sql
UPDATE society_handicaps
SET handicap_index = CORRECT_VALUE
WHERE golfer_id = 'LINE_USER_ID'
  AND society_id IS NULL;  -- for universal
```

### Check all tables with handicap column
```sql
SELECT table_name FROM information_schema.columns
WHERE column_name = 'handicap' AND table_schema = 'public';
-- Returns: event_waitlist, scorecards, event_registrations,
--          event_join_requests, global_players
```

---

## HANDICAP CONVENTIONS

| Stored Value | Display | Player Type |
|--------------|---------|-------------|
| 10.0 | 10.0 | Regular golfer |
| 0.0 | 0.0 | Scratch golfer |
| -2.0 | +2.0 | Plus handicap (pro level) |
| -10.0 | 10.0 | DATA ERROR - should be 10.0 |

### Rules
- Regular handicaps: Positive numbers (0 to 54)
- Plus handicaps: Negative numbers (-0.1 to -4 realistic)
- Anything below -4: Almost certainly a data entry error

---

## NEVER AGAIN CHECKLIST

1. Handicaps are in `society_handicaps` table, NOT `golfer_handicaps`
2. Universal handicap has `society_id = NULL`
3. Check console for `[Pairings]` logs to see raw values
4. If seeing wrong "+X" display, check the actual database value first
5. Use `formatHandicapDisplay()` everywhere handicaps are shown

---

**Session Date**: 2025-12-23
**Time Wasted**: ~1 hour
**Lesson**: Know your schema before debugging display issues
