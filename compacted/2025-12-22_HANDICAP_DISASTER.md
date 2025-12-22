# Handicap Disaster - December 22, 2025 Treasure Hill Round

**Date:** December 22, 2025
**Event:** TRGG Treasure Hill Golf & Country Club
**Severity:** CATASTROPHIC

---

## What Happened

After the Treasure Hill round, handicaps went completely haywire:

| Player | Before (TRGG) | After (TRGG) | Change |
|--------|---------------|--------------|--------|
| Pete Park | 2.8 | **12.2** | +9.4 |
| Tristan Gilbert | 11.0 | **22.4** | +11.4 |
| Billy Shepley | 7.8 | **11.3** | +3.5 |
| Alan Thomas | 11.9 | 12.2 | +0.3 |

The maximum adjustment per round should be ±1.0. These jumps were **10x the allowed amount**.

---

## Root Cause

**The `society_handicaps` table had NO UNIQUE CONSTRAINT on `(golfer_id, society_id)`.**

### What This Caused:

1. **Upsert created duplicates**: When code called `.upsert({...}, { onConflict: 'golfer_id,society_id' })`, PostgreSQL couldn't enforce the conflict because no unique constraint existed. Instead of updating, it **INSERTED new rows**.

2. **Pete Park had 4 universal records**:
   - 3.2 (original)
   - 4.2 (first bad update)
   - 3.5 (second bad update)
   - Plus society records

3. **`.find()` grabbed wrong record**: When loading handicaps, the code used `.find(h => h.society_id === null)` without ORDER BY. With multiple rows, it grabbed an unpredictable one.

4. **Cascading calculations**: Each subsequent player's handicap calculation used corrupted baseline values, making the errors compound.

### Why NULL was special:

PostgreSQL unique constraints treat **NULL as unique from other NULLs**. So even after adding a constraint, two rows with `(golfer_id, NULL)` didn't conflict because `NULL != NULL` in SQL.

---

## Fixes Applied

### 1. Database Fixes

```sql
-- Delete all duplicates, keep most recent
WITH ranked AS (
    SELECT ctid,
           ROW_NUMBER() OVER (
               PARTITION BY golfer_id, COALESCE(society_id::text, 'NULL')
               ORDER BY last_calculated_at DESC
           ) as rn
    FROM society_handicaps
)
DELETE FROM society_handicaps WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

-- Create UNIQUE INDEX that handles NULL properly
CREATE UNIQUE INDEX society_handicaps_golfer_society_idx
ON society_handicaps (golfer_id, COALESCE(society_id::text, 'UNIVERSAL'));
```

### 2. Code Fixes (index.html)

**Before (broken):**
```javascript
// Upsert was creating duplicates!
await supabase.from('society_handicaps')
    .upsert({...}, { onConflict: 'golfer_id,society_id' });
```

**After (fixed):**
```javascript
// DELETE-then-INSERT pattern
await supabase.from('society_handicaps')
    .delete()
    .eq('golfer_id', player.lineUserId)
    .is('society_id', null);  // or .eq('society_id', societyId)

await supabase.from('society_handicaps')
    .insert({...});
```

**Also added ORDER BY to query:**
```javascript
.order('last_calculated_at', { ascending: false })
```

### 3. Handicaps Restored

Manually set back to correct values:
- Pete Park: Universal 3.2, TRGG 2.8
- Tristan Gilbert: Universal 13.2, TRGG 11.0
- Billy Shepley: Universal 7.8, TRGG 7.8
- Alan Thomas: Universal 12.2, TRGG 11.9

---

## Protections Now In Place

1. **Unique Index**: `society_handicaps_golfer_society_idx` blocks duplicate inserts at database level
2. **DELETE+INSERT**: Code no longer relies on upsert
3. **ORDER BY**: Query always gets most recent record if duplicates somehow exist
4. **Cap at ±1.0**: Adjustment formula caps changes (was already in place but useless with corrupted baseline)

---

## Lessons Learned

1. **NEVER assume constraints exist** - verify them
2. **PostgreSQL NULL handling in UNIQUE**: NULL != NULL, use COALESCE in index
3. **Upsert requires actual unique constraint** - without it, it's just INSERT
4. **ORDER BY matters** when using .find() on query results
5. **Test with real data** before production rounds

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | DELETE+INSERT pattern, ORDER BY in query |
| `sql/FIX_HANDICAP_DISASTER_DEC22.sql` | Cleanup script and constraint |

---

## Git Commits

```
0d788b0c fix: Prevent duplicate handicap records - use DELETE+INSERT instead of upsert
```

---

## Never Again

This disaster catalog exists to remind us:
- Always verify database constraints exist
- Test handicap calculations with known values before rounds
- Monitor for duplicate records periodically
