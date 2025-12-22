# Player Directory Society Handicap Fix

**Date:** December 22, 2025
**Issue:** Player Directory showing wrong handicaps (universal instead of society)

---

## Problem

The Travellers Rest Player Directory was showing incorrect handicaps:

| Player | Displayed | Should Be (TRGG) |
|--------|-----------|------------------|
| Pete Park | 3.2 | **2.8** |
| Alan Thomas | 12.2 | **11.6** |
| Tristan Gilbert | 13.2 | **11.1** |
| Billy Shepley | 7.8 | **7.8** |

---

## Root Cause

`loadPlayerDirectory()` was getting handicaps from `user_profiles.profile_data.golfInfo.handicap` which stores the **UNIVERSAL** handicap, not the society-specific handicap.

**Before (broken):**
```javascript
// Line 55793 - gets universal handicap
handicap: golfInfo.handicap || fallbackHandicap,
```

The `golfInfo.handicap` comes from:
```javascript
const golfInfo = profile?.profile_data?.golfInfo || {};
```

This is the universal handicap stored in `user_profiles`, NOT the TRGG society handicap stored in `society_handicaps`.

---

## Fix Applied

Modified `loadPlayerDirectory()` in `public/index.html` (lines 55773-55834):

### 1. Get Society ID
```javascript
const { data: societyData } = await window.SupabaseDB.client
    .from('society_profiles')
    .select('id')
    .eq('society_name', societyName)
    .single();

const societyId = societyData?.id;
```

### 2. Fetch Society Handicaps
```javascript
let societyHandicapsMap = {};
if (societyId && members.length > 0) {
    const memberIds = members.map(m => m.golfer_id);
    const { data: societyHcps, error: hcpError } = await window.SupabaseDB.client
        .from('society_handicaps')
        .select('golfer_id, handicap_index')
        .eq('society_id', societyId)
        .in('golfer_id', memberIds)
        .order('last_calculated_at', { ascending: false });

    if (!hcpError && societyHcps) {
        societyHcps.forEach(h => {
            if (!societyHandicapsMap[h.golfer_id]) {
                societyHandicapsMap[h.golfer_id] = h.handicap_index;
            }
        });
    }
}
```

### 3. Use Society Handicap with Priority
```javascript
// PRIORITY: Society handicap > Universal handicap > Fallback
const societyHcp = societyHandicapsMap[member.golfer_id];
const handicap = societyHcp !== undefined ? societyHcp : (golfInfo.handicap || fallbackHandicap);

return {
    ...member,
    playerName: profile?.name || fallbackName,
    handicap: handicap,  // Now uses society handicap first!
    homeClub: golfInfo.homeClub || '',
    email: profile?.email || '',
    phone: profile?.phone || ''
};
```

---

## Handicap Priority Order

1. **Society handicap** from `society_handicaps` table (e.g., TRGG-specific)
2. **Universal handicap** from `user_profiles.profile_data.golfInfo.handicap`
3. **Fallback** (36 or parsed from notes)

---

## Files Modified

| File | Line | Change |
|------|------|--------|
| `public/index.html` | 55773-55803 | Added society handicap fetch |
| `public/index.html` | 55822-55824 | Changed handicap priority logic |

---

## Git Commit

```
61371ef8 fix: Player Directory now shows society handicaps instead of universal
```

---

## Related Issues

This fix is part of the larger handicap system disaster from December 22, 2025:
- See `2025-12-22_HANDICAP_DISASTER.md` for full context
- The `society_handicaps` table now has a unique index to prevent duplicates
- All handicap updates use DELETE+INSERT pattern instead of upsert

---

## Correct Handicap Values

| Player | TRGG (Society) | Universal |
|--------|----------------|-----------|
| Pete Park | 2.8 | 3.2 |
| Alan Thomas | 11.6 | 12.2 |
| Tristan Gilbert | 11.1 | 13.2 |
| Billy Shepley | 7.8 | 7.8 |

---

## Testing Checklist

- [x] Player Directory shows TRGG society handicaps
- [x] Falls back to universal if no society record exists
- [x] Console logs show society handicap loading
- [x] Handicaps match values in `society_handicaps` table
