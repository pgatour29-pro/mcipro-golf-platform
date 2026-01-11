# MyCaddiPro Handicap Fix Session
**Date**: January 11, 2026
**Issue**: Handicaps displaying incorrectly (Pete showing 0, Tristan wrong values)
**Status**: FIXED

---

## Problem Summary

After anchor team match play implementation, handicaps were broken:
- Pete showing handicap 0 instead of 3.2
- Tristan showing wrong handicap instead of 13.2
- Console logs showed: `[ProfileSystem] Updating handicap to: 0 (display: 0.0)`

---

## Root Cause

**Inconsistent profile_data structure:**
```javascript
profile_data.golfInfo.handicap = 0      // WRONG - code was reading this
profile_data.handicap = "3.2"           // CORRECT - but ignored
```

The code reads `golfInfo.handicap` first, which was set to 0, ignoring the correct root-level `handicap` value.

---

## Mistakes Made

### 1. Wrong Supabase URL
Initial fix attempts used wrong database:
- **WRONG**: `bptodqfwmnbmprqqyrcc.supabase.co`
- **CORRECT**: `pyeeplwsnupmhgbguwqs.supabase.co`

The fix_handicaps.ps1 and check.js files in the root had the OLD Supabase URL. The correct URL is in `/scripts/` folder files.

### 2. Network Access Blocked
Terminal (PowerShell, Node.js, curl) could not resolve Supabase DNS:
```
Invoke-RestMethod : The remote name could not be resolved: 'pyeeplwsnupmhgbguwqs.supabase.co'
```

Had to use browser-based solution instead.

### 3. Variable Name Conflict
First HTML fix had:
```javascript
const supabase = window.supabase.createClient(...)
```

Error: `Identifier 'supabase' has already been declared`

The Supabase library already defines `window.supabase`, so the variable conflicted.

### 4. Confused Universal vs Society Handicaps
Initially tried to only update `society_handicaps` table, but the system requires updating BOTH:
1. `society_handicaps` table (where `society_id IS NULL` for universal)
2. `user_profiles.handicap_index`
3. `user_profiles.profile_data.handicap`
4. `user_profiles.profile_data.golfInfo.handicap`

---

## Solution

Created `fix_handicaps.html` that runs in browser (bypasses network issues):

```javascript
const db = window.supabase.createClient(
    'https://pyeeplwsnupmhgbguwqs.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // anon key
);

// For each user (Pete, Tristan):
// 1. Update society_handicaps where society_id IS NULL
await db.from('society_handicaps')
    .update({ handicap_index: X.X, calculation_method: 'MANUAL' })
    .eq('golfer_id', oderId)
    .is('society_id', null);

// 2. Update user_profiles (handicap_index + profile_data)
const pd = profile.profile_data || {};
pd.handicap = 'X.X';
pd.golfInfo.handicap = 'X.X';
await db.from('user_profiles')
    .update({ handicap_index: X.X, profile_data: pd })
    .eq('line_user_id', oderId);
```

---

## Files Modified/Created

| File | Action |
|------|--------|
| `fix_handicaps.html` | Created - browser-based fix tool |
| `fix_handicaps.ps1` | Existed but had WRONG Supabase URL |
| `check.js` | Existed but had WRONG Supabase URL |

---

## Correct Handicap Data Locations

The handicap system stores data in MULTIPLE places that must stay in sync:

### 1. society_handicaps table
```sql
-- Universal handicap (applies everywhere)
golfer_id = 'Uxxxxx'
society_id = NULL
handicap_index = 3.2

-- Society-specific handicap (optional override)
golfer_id = 'Uxxxxx'
society_id = '7c0e4b72-...'  -- TRGG society ID
handicap_index = 2.5
```

### 2. user_profiles table
```sql
handicap_index = 3.2  -- Direct column
```

### 3. user_profiles.profile_data (JSONB)
```json
{
    "handicap": "3.2",
    "golfInfo": {
        "handicap": "3.2",
        "lastHandicapUpdate": "2026-01-11T..."
    }
}
```

**ALL THREE must be updated together or the system breaks.**

---

## Reference: Correct Supabase Credentials

**Production Database:**
- URL: `https://pyeeplwsnupmhgbguwqs.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk`

**DO NOT USE:**
- `bptodqfwmnbmprqqyrcc.supabase.co` (OLD/WRONG)

---

## Key Player IDs

| Player | LINE User ID |
|--------|--------------|
| Pete Park | `U2b6d976f19bca4b2f4374ae0e10ed873` |
| Alan Thomas | `U214f2fe47e1681fbb26f0aba95930d64` |
| TRGG Society | `7c0e4b72-d925-44bc-afda-38259a7ba346` |

---

## Verification

After fix, verified:
- Pete: Universal handicap = 3.2
- Tristan: Universal handicap = 13.2
- Both profile_data.handicap and profile_data.golfInfo.handicap updated

---

## Lessons Learned

1. **Always check which Supabase URL** - project has multiple databases, scripts may have outdated URLs
2. **Handicaps require updating 4 locations** - society_handicaps + 3 places in user_profiles
3. **Browser can access Supabase when terminal cannot** - network/firewall may block terminal access
4. **Variable naming with libraries** - don't reuse library global names

---

## Related Scripts (with CORRECT credentials)

- `/scripts/fix_pete_handicap_now.js` - Full handicap recalculation
- `/scripts/handicap_health_check.js` - Diagnostic tool
- `/scripts/fix_society_handicaps_to_universal.js` - Sync all society handicaps
- `/fix_handicaps_now.ps1` - PowerShell manual fix (has correct URL)

---

**End of Session Catalog**
