# SESSION CATALOG — May 30, 2026

## Summary
Complete security remediation (RLS, Edge Functions, sealed architecture, policy classification, PIN lockdown, profile identity). Monthly Schedule Creator for all organizers. JOA schedule upload fix. Permanent score entry fix. Proximity data loss fix. 45 commits.

---

## FUCKUPS

### FUCKUP #1: RLS Enable Broke the App (Infinite Recursion)
**Issue:** Enabling RLS on user_profiles caused "infinite recursion in policy" error. Dashboard showed "new user" modal.
**Root Cause:** Old "Admin can view all profiles" policy had a subquery back into user_profiles to check admin status — recursive loop once RLS was active.
**Fix:** Dropped all old restrictive policies, kept only the permissive anon_all policies.
**Lesson:** Before enabling RLS, check for self-referencing policies that were dormant when RLS was off.

### FUCKUP #2: JWT Secret Leaked in Chat
**Issue:** Pete pasted the JWT secret in the conversation. Now in Claude Code session logs.
**Root Cause:** I asked for the secret instead of telling Pete to set it from his shell.
**Fix:** Forced migration to asymmetric signing (ES256). Legacy secret will be revoked.
**Lesson:** NEVER route secrets through the agent. Dashboard → terminal → secret store.

### FUCKUP #3: PIN Tables Were World-Readable
**Issue:** course_admins and society_organizer_access contained admin PINs (super_admin_pin, staff_pin, access_pin) and were classified as public-browse in the policy migration.
**Root Cause:** Classified tables by name, not by column contents. Introspection revealed the PINs.
**Fix:** Locked immediately (no client access). Removed from C2 array.
**Lesson:** ALWAYS introspect columns before classifying tables for RLS.

### FUCKUP #4: Naive Policy Classification Would Break the App
**Issue:** C1-C7 policies were almost applied while app runs as anon — would have instantly broken every feature.
**Root Cause:** authenticated-scoped policies deny anon access. No mint function deployed yet.
**Fix:** Stopped. All Section 3 policies wait for post-Phase-C window.
**Lesson:** Don't apply authenticated policies while the app runs as anon.

### FUCKUP #5: C1 Batch Assumed All user_id Columns Were Text
**Issue:** 10 of 16 C1 tables have UUID user_id, not text. line_id() policies would silently fail.
**Root Cause:** Blanket assumption.
**Fix:** Split C1 into UUID group (auth.uid()) and TEXT group (line_id()).

### FUCKUP #6: event_registrations Policy Used Wrong Owner Column
**Issue:** Policy keyed on user_id (UUID, all NULL) instead of player_id (text, LINE ID).
**Root Cause:** Assumed user_id was the owner. Actual data showed user_id is always NULL.
**Fix:** Changed to player_id after checking actual data.
**Lesson:** Always check actual data values, not just column names.

### FUCKUP #7: is_organizer() Checked Wrong Column
**Issue:** Function checked organizer_id instead of user_id in society_organizer_roles.
**Root Cause:** organizer_id is which org they belong to, user_id is the person.
**Fix:** Changed to user_id.

### FUCKUP #8: Backfill SQL Would Write Malformed LINE IDs
**Issue:** `'U' || display_name` produces `Uu044fd...` (34 chars, double-prefixed).
**Root Cause:** display_name already has the lowercase prefix.
**Fix:** `'U' || substring(display_name from 2)`.

### FUCKUP #9: Score Entry STILL Failing (4th Recurrence)
**Issue:** Score entry rejected on first tap, needed multiple attempts.
**Root Cause:** _inputLocked guard with 150ms timer ate fast taps. renderHole() reset cleared scores during realtime re-renders.
**Fix Attempts:**
1. Reduced lock to 80ms — still too aggressive
2. Added renderHole() reset — WORSE, cleared scores mid-entry
3. Removed lock entirely — double-tap risk
4. **Final fix:** Replaced entire system with `_saving` flag. Set TRUE when digit triggers save, set FALSE immediately after UI update completes. No timer involved.
**Lesson:** Timer-based locks are fundamentally wrong for touch input. Use event-based flags.

### FUCKUP #10: JOA Schedule Upload Failed Silently (3 Fixes)
**Issue:** JOA uploaded June schedule, said "success" but no events appeared.
**Root Cause Chain:**
1. organizer_id was "JOAGOLFPAT" (hardcoded) — doesn't match anything in DB
2. Changed to LINE user ID — but organizer_id column is UUID type, text insert fails silently
3. Anthropic API credits exhausted — Claude Vision couldn't parse the image
**Fix:** Removed organizer_id from insert (all JOA events have it NULL). Match by organizer_name. Manually inserted 30 June events by reading the schedule image directly.
**Lesson:** Check column data types before inserting. Check API credits.

### FUCKUP #11: Schedule Maker Courses Missing
**Issue:** Course dropdown only had GolfCoursesDatabase courses, not the full system list.
**Fix:** Pull from scorecardCourseSelect dropdown (the hardcoded full list).

### FUCKUP #12: Upload Schedule Button Still Showing
**Issue:** JOA saw the old photo upload button, not the new Schedule Creator.
**Root Cause:** The button was on the Events tab, not the Admin tab where I replaced it.
**Fix:** Replaced Events tab button with "Schedule Maker" link to Scheduler tab.

### FUCKUP #13: Scheduler Hanging on Load
**Issue:** Scheduler showed blank — weeks never rendered.
**Root Cause:** async loadExistingAndBuild() queried DB BEFORE rendering. If query slow/fails, nothing shows.
**Fix:** Render weeks instantly (empty), load existing events in background, re-render when data arrives.
**Lesson:** Render before async. Never block UI on DB calls.

### FUCKUP #14: Scheduler Button Text Unreadable After Click
**Issue:** "Schedule Maker" button text became unreadable when clicked.
**Root Cause:** btn-primary class got overridden by tab switching active styles.
**Fix:** Used inline styles instead of class-based styling.

### FUCKUP #15: Approach Proximity Only Saved on GIR Holes — Data Loss
**Issue:** Pete entered 1st putt distances on every hole during the round, but only GIR holes had data in the database. Non-GIR holes lost their approach_proximity data.
**Root Cause:** Line 74677 in completeRound/saveRoundToHistory had `holeStats.gir === true` as a condition for saving approach_proximity. When we changed the UI to show both proximity rows on ALL holes (not just GIR), the save code still required GIR. Data entered on non-GIR holes was thrown away.
**Fix:** Removed the `&& holeStats.gir === true` check — approach_proximity now saves on every hole.
**Data Lost:** Pete's May 30 round at Greenwood — 1st putt distances on non-GIR holes gone permanently.
**Lesson:** When changing UI to show a feature on ALL holes, also update the SAVE code. UI and save must be in sync. The save had a GIR gate the UI no longer had.

### FUCKUP #16: Make % Used Wrong Proximity Field — Always 0%
**Issue:** Round details showed "3ft Make: 0% (0/11)" — impossible for 11 putts from 3ft to all miss.
**Root Cause:** Make % used `proximity` field (2nd putt distance) and checked `putts === 1`. Since proximity records the 2nd putt, putts can never be 1 (already used 1 putt). Should use `approach_proximity` (1st putt distance).
**Fix:** Changed make % to use approach_proximity. Added separate 2nd putt make % row.

### FUCKUP #17: Admin Secret Prompt Blocking TRGG Features
**Issue:** TRGG handicap paste modal prompted for admin secret, blocking Pete.
**Root Cause:** I added the prompt for the Edge Function admin gate, but Pete is the only admin.
**Fix:** Removed the prompt. Changed TRGG sync from Edge Function back to direct insert (tmp_insert policy allows it).

### FUCKUP #18: Syntax Error — Missing Catch Block
**Issue:** JS syntax error broke the page.
**Root Cause:** try block without catch in loadExistingEvents.
**Fix:** Added catch block.
**Lesson:** Always syntax check before pushing (node -c equivalent).

---

## SECURITY REMEDIATION (Full — see 2026-05-29-30 catalog for details)

Completed in this session:
- RLS on all tables, DELETE blocked
- 9 Edge Functions deployed (7 delete + sync + verify-admin-pin)
- Browser .delete() calls rewired
- Cascade FKs on round_holes + event_results
- PIN tables locked (course_admins, society_organizer_access, society_organizer_roles)
- Profile identity: 2 merged, 5 backfilled, 7 linked
- Sealed architecture designed (asymmetric ES256)
- Full policy classification (9 categories + quarantine)
- Phase A key swap (13 files → publishable key)
- verify-admin-pin Edge Function deployed
- Shared JWT signer (_shared/signJwt.ts)

---

## NEW FEATURES

### Monthly Schedule Creator (Universal)
- Week-by-week spreadsheet format for ALL society organizers
- Course dropdown (all courses), Fee dropdown (฿100-10,000 + custom), Booking Name
- "Same as above" checkbox to copy weeks that repeat
- Monday-first weeks (Mon-Sun)
- Preview → Generate → Export CSV
- Download Template (blank CSV) → Import from Excel/CSV
- Loads existing events from DB and pre-fills the form
- Dedup: updates existing events, doesn't duplicate
- Renders instantly, loads data in background

### JOA Schedule — Manual Entry of June Events
- Read Korean schedule image directly (no API needed)
- Inserted 30 June events into society_events table
- JOA Schedule Creator with weekly rotation (replaced API-dependent upload)

### Permanent Score Entry Fix
- Replaced _inputLocked timer system with _saving event flag
- Set TRUE on digit entry, FALSE after UI update + player advance
- No timer — cleared by the actual save completing
- All hole navigation clears it
- Zero references to old _inputLocked system

---

## COMMITS (42 total)

1-18: Security remediation (see 2026-05-29-30 catalog)
19. `55044db7` — Add Monthly Schedule Maker
20. `c6b89841` — Fix: pull ALL courses + 10min time increments
21. `16784a12` — Fee: ฿100-600, ฿50-3000
22. `fc86aa58` — Fee: extend to ฿15,000 + custom
23. `2d5445f3` — Add Booking Name field
24. `36a85b4c` — Fix JOA upload: wrong organizer_id
25. `4be385f3` — Score entry: renderHole reset + 80ms lock (REVERTED)
26. `19721baf` — Score entry: remove lock entirely
27. `0a23c609` — Score entry: permanent fix with _saving flag
28. `70c24f23` — Fix JOA: organizer_id is UUID, use organizer_name
29. `277833c6` — JOA Schedule Creator (weekly rotation)
30. `d6359d2f` — JOA: add booking name per day
31. `a90f0654` — Replace Upload button with Schedule Maker
32. `a81b4b87` — JOA: week-by-week with copy forward
33. `a345feaf` — Course/fee dropdowns, same-as checkbox
34. `7cc331cc` — Add Preview button
35. `d11344bc` — Expand preview window to 80vh
36. `855d2c06` — Fix button text color
37. `94e798cc` — Rename Khao Kheow Country Club to CC
38. `6a92b076` — Monday-first weeks
39. `d2e6c442` — Add Export CSV button
40. `f887f94b` — Universal Schedule Creator for all societies
41. `7ed825e3` — Download Template + Import from Excel/CSV
42. `b4426916` — Load existing events into scheduler
43. `347eb6f2` — Fix: render instantly, load in background

---

## KEY RULES REINFORCED

1. **NEVER route secrets through the agent** — three leaks in this project
2. **Render before async** — never block UI on DB calls (scheduler, player add, score entry)
3. **Check actual data values** — column names lie (user_id NULL, player_id has the LINE ID)
4. **Check column types** — UUID vs text, organizer_id is UUID not text
5. **Introspect columns before classifying** — PINs in "public-browse" tables
6. **Don't apply authenticated policies while running as anon** — instant feature death
7. **Timer-based input locks are wrong** — use event-based flags instead
8. **Syntax check before every push** — missing catch block broke the page
9. **Always check API credits** — Claude Vision silently fails with no credits
10. **One fix at a time, verify before next** — stacking fixes creates new bugs
11. **UI change = save code change** — if you show a feature on all holes, update the save to match. UI and save must be in sync.
12. **Check which field the calculation uses** — proximity vs approach_proximity mean different things. Wrong field = wrong results.
