# Session Fixes - December 10, 2025
**Summary:** Fixed society directory edit/delete, Admin stats accuracy, subscription pricing disabled, handicap adjustment timing

---

## Issues Fixed

### 1. Handicap Adjustment Not Running After Rounds
**Problem:** Players completing rounds weren't getting handicap adjustments - handicaps stayed the same

**Root Cause:** The `adjustHandicapAfterRound()` call was placed AFTER an early return in `saveRoundToHistory()`. When `shotAllocation` was missing, the function returned before ever reaching the handicap adjustment code.

**Fix:** Moved `adjustHandicapAfterRound()` call BEFORE the early return:
```javascript
// HANDICAP ADJUSTMENT - runs first
try {
    await this.adjustHandicapAfterRound(player, totalGross, holesPlayed, round.course_rating || 72, round.slope_rating || 113);
} catch (handicapError) {
    console.error('[LiveScorecard] Error adjusting handicap:', handicapError);
}

// THEN do hole-by-hole save (which has the early return)
const shotAllocation = LiveScorecardSystem?.GolfScoringEngine?.allocHandicapShots(...);
if (!shotAllocation) {
    return round.id; // Now handicap is already adjusted
}
```

**Location:** `public/index.html` ~line 44400

---

### 2. Society Directory - Cannot Edit or Delete Members
**Problem:** Edit, delete, and primary toggle buttons in society directory weren't working

**Root Cause:** Three functions were using `society_name` column but the `society_members` table uses `society_id`:
- `removeSocietyMember()` - delete failing silently
- `setPrimarySociety()` - primary toggle not working
- `togglePrimarySociety()` - inline query using wrong column

**Fix:** All functions now look up `society_id` from `society_name` first:
```javascript
async removeSocietyMember(societyName, golferId) {
    // First get the society_id from society_name
    const { data: societyData } = await window.SupabaseDB.client
        .from('society_profiles')
        .select('id')
        .eq('society_name', societyName)
        .single();

    const societyId = societyData.id;

    // Delete using society_id (correct column name)
    await window.SupabaseDB.client
        .from('society_members')
        .delete()
        .eq('society_id', societyId)
        .eq('golfer_id', golferId);
}
```

**Locations:**
- `removeSocietyMember()` ~line 40103
- `setPrimarySociety()` ~line 40154
- `togglePrimarySociety()` ~line 51359

---

### 3. Duplicate Members in Society Directory
**Problem:** Same player appearing multiple times in society directory

**Fix:** Added automatic duplicate cleanup:

1. **New function `cleanupDuplicateMembers(societyId)`** - Detects and removes duplicate entries for same golfer
2. **Refresh button now cleans duplicates** - `refreshPlayerDirectory()` calls cleanup before loading
3. **SQL script created** - `sql/FIX_DUPLICATE_MEMBERS.sql` for manual cleanup and adding unique constraint

```javascript
async cleanupDuplicateMembers(societyId) {
    // Find duplicates: same golfer_id appearing multiple times
    const { data: allMembers } = await window.SupabaseDB.client
        .from('society_members')
        .select('id, golfer_id, joined_at')
        .eq('society_id', societyId)
        .order('joined_at', { ascending: false });

    // Group by golfer_id, keep newest, delete rest
    // ...
}
```

**SQL Script Fix:** Changed from `MAX(id)` to `joined_at` comparison because `id` is UUID:
```sql
DELETE FROM society_members sm1
WHERE EXISTS (
    SELECT 1 FROM society_members sm2
    WHERE sm2.society_id = sm1.society_id
    AND sm2.golfer_id = sm1.golfer_id
    AND sm2.joined_at > sm1.joined_at
);
```

---

### 4. Admin Dashboard - Fake "Active Today" Numbers
**Problem:** "Active Today" showed 30% of total users (fake calculation)

**Fix:** Now queries actual scorecards created today:
```javascript
const { count: activeToday } = await window.SupabaseDB.client
    .from('scorecards')
    .select('player_id', { count: 'exact', head: true })
    .gte('created_at', todayStr);
```

---

### 5. Admin Dashboard - New Member Growth Stats
**Problem:** No visibility into member growth trends

**New Feature:** Added stats row showing:
- **Today** - New members signed up today
- **This Week** - New members since Monday
- **This Month** - New members since 1st of month
- **Year to Date** - New members since January 1st

```javascript
async updateMemberGrowthStats() {
    const [todayResult, weekResult, monthResult, ytdResult] = await Promise.all([
        window.SupabaseDB.client.from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', formatDate(todayStart)),
        // ... similar for week, month, ytd
    ]);

    document.getElementById('admin-new-today').textContent = todayResult.count;
    document.getElementById('admin-new-week').textContent = weekResult.count;
    document.getElementById('admin-new-month').textContent = monthResult.count;
    document.getElementById('admin-new-ytd').textContent = ytdResult.count;
}
```

**Location:** `public/index.html` AdminSystem ~line 37303

---

### 6. Subscription Pricing - Disabled for Testing
**Problem:** Pricing inputs wouldn't save, reverted to old values. System not ready for monetization.

**Fix:** Disabled all pricing during testing phase:
- All tier prices set to ฿0 (Silver, Gold, Platinum)
- Pricing inputs disabled and grayed out
- Added yellow notice: "Testing Phase - All tiers FREE"
- Revenue displays show "฿0 (Free)"
- Save Pricing button disabled

```javascript
// ALL FREE during testing phase
const prices = {free: 0, silver: 0, gold: 0, platinum: 0};
document.getElementById('admin-monthly-revenue').textContent = `฿0 (Free)`;
```

---

## Commits Made

1. `a1b758ef` - Fix handicap adjustment - move before early return in saveRoundToHistory
2. `db07ed01` - Fix society directory - edit/delete now works, duplicate cleanup added
3. `a8f831a3` - Fix SQL script - use joined_at instead of MAX(id) for UUID columns
4. `672fe319` - Add accurate Admin stats - Active Today from scorecards, member growth metrics
5. `aea76007` - Disable subscription pricing - all tiers FREE during testing phase

---

## Files Modified

- `public/index.html` - All fixes
- `sql/FIX_DUPLICATE_MEMBERS.sql` - New SQL script for duplicate cleanup

---

## Key Technical Notes

### Society Members Table Structure
- Uses `society_id` (UUID) as foreign key, NOT `society_name`
- Must look up `society_id` from `society_profiles` table first
- Same pattern needed for any society_members operations

### Admin Stats Date Calculations
- Week starts on Monday (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
- All dates formatted as ISO strings for Supabase queries
- Queries run in parallel with Promise.all for performance

### Handicap Adjustment System
- Runs after each completed round (9+ holes)
- Calculates differential: (Gross - Course Rating) × (113 / Slope)
- Moves handicap 20% toward differential, capped at ±1.0 per round
- Supports plus handicaps (+X format)

---

## Testing Checklist

- [x] Society directory edit button works
- [x] Society directory delete button works
- [x] Primary society toggle works
- [x] Duplicate members cleaned on refresh
- [x] Admin "Active Today" shows real count
- [x] Admin member growth stats display correctly
- [x] Subscription pricing shows as disabled/free
- [x] Handicap adjusts after round completion

---

## Deployment

All changes deployed to www.mycaddipro.com via Vercel.
