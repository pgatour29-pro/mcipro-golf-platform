# CRITICAL: Read This Before Making Changes

## Session Failure Catalog - January 23, 2026
## SW Versions: v243 → v251 (9 failed deployments in one session)

---

## THE PROBLEMS THAT WERE SUPPOSED TO BE FIXED

1. **Society event deletion** - Booking kept reappearing after deletion
2. **Login requires multiple attempts** - Users clicking 3+ times
3. **Data not loading after login** - Dashboard shows empty
4. **Duplicate round saves** - 7+ identical rounds posted
5. **Handicap showing wrong value** - 4.4 instead of 2.9

---

## FAILURE #1: Society Event Deletion (v241-v243)

**Issue:** TRGG booking for Jan 23 kept reappearing after deletion

**Attempts:**
- v241: Mark events as 'cancelled' status → Forgot to filter cancelled from fetch
- v242: Added `.neq('status', 'cancelled')` → Events were never marked (NULL status)
- v243: Changed to hard DELETE → **RLS BLOCKS CLIENT-SIDE DELETE**

**Lesson:** Supabase Row Level Security blocks DELETE from anon/authenticated clients. Must use SQL function with SECURITY DEFINER or run from Supabase dashboard.

---

## FAILURE #2: OAuth Delay - Comment vs Code Mismatch (v244)

**Issue:** Comment said 2000ms delay but code had 500ms

```javascript
// WRONG - Comment says one thing, code does another
// Delay 2000ms to let Supabase connections fully settle
setTimeout(() => { ... }, 500);  // Actually 500ms!
```

**Lesson:** Always verify the actual code matches your intent, not just the comments.

---

## FAILURE #3: Variable Name Typo (v247)

**Issue:** `ReferenceError: Cannot access 'now' before initialization`

```javascript
// Line 21723: const cacheNow = Date.now();
// Line 21750: this._caddyBookingsCacheTime = now;  // WRONG! Should be cacheNow
```

**Lesson:** Use consistent variable names. Search for the variable before using it.

---

## FAILURE #4: Login Debounce Never Reset (v248)

**Issue:** `_loginClicked` set to true but never reset - users can't retry login

```javascript
let _loginClicked = false;
window.loginWithLINE = function() {
    if (_loginClicked) return;
    _loginClicked = true;  // Set but NEVER reset!
    LineAuthentication.loginWithLINE();
};
```

**Fix:** Added 5-second auto-reset timeout and `resetLoginClick()` function.

---

## FAILURE #5: Delay Yo-Yo (v244-v251)

**Timeline:**
- v244: 1.5s OAuth delay, 2s redirect delay → Too slow for user
- v248: 300ms OAuth, 0ms redirect → AbortErrors everywhere
- v250: No delays, immediate load → Massive AbortErrors
- v251: Back to 2s delay → Works

**Lesson:** Supabase has connection limits. Too many concurrent requests = AbortErrors. Need delays OR request queuing.

---

## FAILURE #6: Duplicate Round Saves (v246, v249)

**Issue:** "End Round" saves 7+ duplicate rounds

**First Attempt (v246):**
```javascript
// BUG: Check uses '' but INSERT uses null
.eq('course_id', courseId || '')  // Check
course_id: courseId || null,       // Insert - doesn't match!
```

**Second Attempt (v249):** Added session-level Set + removed course_id requirement

**Lesson:** Comparison operators must match exactly. `'' != null` in database queries.

---

## FAILURE #7: Handicap Stored in 4+ Places

**Issue:** Pete's handicap showed 4.4 instead of 2.9

**Storage locations discovered:**
1. `user_profiles.profile_data.handicap` (root level)
2. `user_profiles.profile_data.golfInfo.handicap`
3. `society_handicaps` table where `society_id IS NULL` (universal)
4. `society_handicaps` table where `society_id = TRGG UUID`
5. Possibly `global_players` table

**My SQL only updated some, not all.**

**Lesson:** Understand the FULL data model before making changes. Check compacted docs for `HANDICAP_STORAGE_AND_DISPLAY.md`.

---

## FAILURE #8: SQL Column Name Wrong

**Issue:** `ERROR: column "line_user_id" does not exist`

```sql
-- WRONG: global_players doesn't have this column
UPDATE global_players SET handicap = 2.9
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
```

**Lesson:** Check table schema before writing SQL. Use Supabase dashboard to verify column names.

---

## FAILURE #9: Immediate Load = AbortErrors (v250)

**Issue:** Removing all delays caused every Supabase query to abort

**What I did:**
```javascript
// Fired ALL of these simultaneously:
ScheduleSystem.renderScheduleList();
DashboardUpcomingEvents.load();
DashboardCaddyBooking.init();
DashboardPerformance.load();
GolferCaddyBooking.loadBookings();
GolfScoreSystem.loadRoundHistoryTable();
```

**Result:** Browser connection limit exceeded, all requests aborted.

**Lesson:** Supabase/browser has connection limits (~6 per domain). Must stagger requests or use queuing.

---

## FAILURE #10: Live Scorecard Dropdown (NOT FIXED)

**Issue:** Live Scorecard player dropdown still shows old handicap 4.4

**Status:** Unknown source - need to find where LiveScorecard gets handicap for dropdown.

---

## PATTERNS TO AVOID

### 1. Deploy Without Testing
Every single version was deployed without local verification. Result: 9 broken deployments.

### 2. Comment-Code Mismatch
Changed comments but not actual code values. Always verify both match.

### 3. Incomplete Data Model Understanding
Handicap stored in 4+ places. SQL column names wrong. Must check schema first.

### 4. Over-Correcting
Delays too long → Removed entirely → AbortErrors → Added back. Should have found middle ground.

### 5. Race Conditions
Multiple components firing requests simultaneously. Need sequential loading or delays.

### 6. RLS Ignorance
Tried client-side DELETE when RLS blocks it. Check RLS policies before database operations.

### 7. Variable Name Typos
Used `now` when variable was named `cacheNow`. Search codebase before using variables.

---

## WHAT ACTUALLY WORKS

Based on compacted documentation:

### Login Flow
1. Debounce login button with auto-reset
2. Process OAuth BEFORE LIFF init (use `oauthProcessed` flag)
3. Store `line_user_id` in localStorage for session persistence

### Data Loading
1. Use `waitForReady()` before ALL Supabase queries
2. Skip initial load during OAuth (check `__oauth_in_progress`)
3. Delay post-login data load by 1-2 seconds
4. Let dashboard components load their own data

### Handicap Display
1. ALWAYS use `window.formatHandicapDisplay(handicap)`
2. Handicaps stored in `society_handicaps` table
3. Universal handicap has `society_id = NULL`
4. Plus handicaps stored as negative numbers

### Avoiding Duplicates
1. Check database BEFORE insert
2. Use session-level flags to prevent re-entry
3. Use `finally` block to reset flags

---

## FILES TO READ BEFORE MAKING CHANGES

1. `compacted/00_READ_ME_FIRST_CLAUDE.md` - Project overview
2. `compacted/00_HANDICAP_ISSUE_INDEX.md` - Handicap system docs
3. `compacted/2025-12-23_HANDICAP_STORAGE_AND_DISPLAY.md` - Where handicaps are stored
4. `compacted/2026-01-22_FIRST_LOGIN_DATA_AND_SESSION_PERSISTENCE.md` - Login flow
5. `compacted/LOGIN_AND_DATA_FIX_2026-01-09.md` - Data loading patterns

---

## SQL TO FIX PETE'S HANDICAP

**IMPORTANT:** The original UPDATE statements don't work if records don't exist!

**Use the complete SQL file instead:**
```
sql/fix_pete_handicap_complete.sql
```

This file:
1. Deletes ALL existing society_handicaps records for Pete
2. Inserts fresh records with correct values (2.9 universal, 1.9 TRGG)
3. Updates user_profiles.profile_data
4. Shows before/after verification queries

---

## REMAINING ISSUES (NOT FIXED)

1. **Live Scorecard dropdown** - Run `sql/fix_pete_handicap_complete.sql` in Supabase SQL Editor
2. **Society event deletion** - Run `sql/delete_society_events_admin.sql` then `SELECT admin_delete_society_events('2026-01-23');`
3. **Duplicate round prevention** - May still have edge cases

---

**Session Date:** 2026-01-23
**Total Deployments:** 9 (v243-v251)
**Successful Fixes:** ~3
**Time Wasted:** Entire session
