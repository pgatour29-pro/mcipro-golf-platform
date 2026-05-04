# 2026-05-04: Handicap System Fix — Scramble False-Positive & JOA Society Handicap

## The Problem
Pete Park's handicap showed as **6.7** when registering for JOA Golf - Eastern Star CC (May 7). Should have been **1.7** (universal). Billy Shepley also had wrong handicap values.

## Root Causes Found

### 1. Scramble False-Positive (CRITICAL — affected ALL users)
**File:** `calculate_whs_handicap_index()` in Supabase  
**Bug:** Scramble exclusion filter used `r.game_config::text LIKE '%scramble%'`  
**Problem:** Nearly every round has `"scramble": null` in `game_config` JSON. The text `LIKE` matched the key name even when the value was null.  
**Impact:** **196 out of 289 rounds** were falsely excluded from WHS 8-of-20 calculations. Every society handicap in the system was wrong.  
**Fix:** Changed to proper JSONB checks:
```sql
AND NOT (r.scoring_formats @> '["scramble"]'::jsonb)
AND NOT (r.game_config IS NOT NULL
         AND jsonb_typeof(r.game_config->'scramble') = 'object')
```

### 2. JOA Had Its Own Society Handicap (Should Not Exist)
**Bug:** The trigger `auto_update_society_handicaps_on_round()` created `society_handicaps` entries for every society the golfer was a member of — including JOA.  
**Problem:** JOA does not maintain its own handicap system. Only TRGG (Travellers Rest Golf Group) does. JOA events should use the universal handicap.  
**Impact:** JOA event registrations displayed a bogus "society handicap" instead of universal.  
**Fix:**
- Added `manages_handicap` boolean column to `society_profiles` table
- Set `manages_handicap = true` only for Travellers Rest Golf Group
- Set `manages_handicap = false` for JOA Golf Pattaya
- Trigger now joins on `society_profiles.manages_handicap = true` — only creates handicap entries for Travellers
- Deleted all JOA `society_handicaps` rows

### 3. `update_society_handicap_whs()` Ignored Society ID for Round Filtering
**File:** `sql/whs_8of20_handicap_function.sql`  
**Bug:** `calculate_whs_handicap_index(p_golfer_id)` took only golfer ID — used ALL rounds regardless of society. The `p_society_id` passed to `update_society_handicap_whs()` was only used as the upsert key, never for filtering.  
**Problem:** Every society got the identical handicap value (all rounds pooled).  
**Note:** This turned out to be **intentional** for WHS ��� the World Handicap System uses all rounds. But it was confusing because the old `calculate_society_handicap_index()` (best 3-of-5) DID filter by society. The two functions had different philosophies and the trigger was calling the wrong one at different times.  
**Resolution:** Travellers now uses `calculate_society_handicap_index()` (society-filtered, best-of-N). Universal uses the same function with `society_id = NULL`. The `calculate_whs_handicap_index` function was fixed with proper scramble detection but is no longer called by the trigger for society handicaps.

### 4. Registration Records Stored Stale Handicap
**Tables:** `event_registrations`  
**Bug:** When a golfer registered for an event, the handicap was saved at registration time. If the handicap calculation was wrong (due to bugs above), the wrong value was permanently stored.  
**Impact:** Pete Park's JOA Eastern Star registration showed 6.7 even after fixing the calculation.  
**Fix:** Updated all upcoming `event_registrations`:
- TRGG events → use TRGG handicap from `society_handicaps`
- Non-TRGG events → use universal handicap from `society_handicaps`

### 5. Frontend Registration Code Used localStorage (Not DB)
**File:** `public/index.html` — `joinEventWaitlist()` (line ~100436) and `requestToJoinPrivateEvent()` (line ~100347)  
**Bug:** Both functions pulled handicap from `localStorage` profile data:
```javascript
const handicap = profile.handicap_index ?? profile.handicap ?? profile.golfInfo?.handicap ?? currentUser.handicap ?? ...
```
**Problem:** Never queried `society_handicaps` table. Used whatever stale value was in localStorage.  
**Fix:** Both functions now:
1. Check if event is TRGG → query `society_handicaps` for TRGG handicap
2. Otherwise → use universal from `AppState.currentUser` or profile
3. Only fall back to localStorage as last resort

### 6. Event Detail Display Looked Up JOA Society Handicap
**File:** `public/index.html` — event detail view (line ~99267)  
**Bug:** Code mapped JOA event titles to `'JOA Golf Pattaya'` and looked up a society handicap for it:
```javascript
} else if (eventTitle.startsWith('JOA') || eventTitle.includes('JOA Golf')) {
    eventSociety = 'JOA Golf Pattaya';
}
```
**Fix:** Removed JOA from the title-to-society mapping. Now also checks `society_profiles.manages_handicap` before querying — only Travellers qualifies.

## DB Changes Applied (Supabase Management API)

1. **`society_profiles` table:** Added `manages_handicap BOOLEAN DEFAULT false`
   - Travellers Rest Golf Group = `true`
   - JOA Golf Pattaya = `false`

2. **`calculate_whs_handicap_index()`:** Fixed scramble detection from text LIKE to JSONB checks

3. **`update_society_handicap_whs()`:** Unchanged (still uses all rounds for WHS 8-of-20)

4. **`auto_update_society_handicaps_on_round()` trigger:** 
   - Only updates societies with `manages_handicap = true`
   - Uses `calculate_society_handicap_index()` for society handicaps (society-filtered)
   - Universal handicap logic unchanged (every-3-private-rounds)

5. **`society_handicaps` data:**
   - Deleted all JOA entries (2 rows)
   - Recalculated all Travellers entries

6. **`event_registrations` data:**
   - Updated all upcoming registrations with correct handicaps

## Frontend Changes (public/index.html)

1. **Event detail view** — Removed JOA from society handicap lookup, added `manages_handicap` check
2. **`joinEventWaitlist()`** — Replaced localStorage lookup with society-aware DB query
3. **`requestToJoinPrivateEvent()`** — Same fix as above

## Final Handicap Values After Fix

### Pete Park
| Source | Value |
|--------|-------|
| Universal | 1.7 |
| Travellers (TRGG) | 0.8 |
| JOA events | 1.7 (uses universal) |

### Billy Shepley
| Source | Value |
|--------|-------|
| Universal | 6.2 |
| Travellers (TRGG) | 4.1 |
| JOA events | 6.2 (uses universal) |

## Rules (For Future Reference)

- **TRGG** is the only society that maintains its own handicap via `society_handicaps`
- **All other events** (JOA, private, casual) use the **universal** handicap
- The **scorecard system** was already correct — it uses a society dropdown and `getHandicapForSociety()` which falls back to universal when no society match exists
- **Never use text LIKE on JSONB columns** for filtering — use proper JSONB operators (`@>`, `->`, `->>`, `jsonb_typeof`)
- Registration handicaps are **point-in-time snapshots** — if the calculation is wrong, the stored records must also be updated
