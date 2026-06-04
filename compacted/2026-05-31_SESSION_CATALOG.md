# SESSION CATALOG — May 31, 2026

## Summary
Universal Schedule Creator finalized with week-by-week spreadsheet, import/export, existing event loading, inline fees, mobile 2-line layout. Proximity data fix (approach_proximity only saved on GIR). Score entry permanent fix. JOA June events manual insert. Multiple scheduler layout iterations. 31 commits.

---

## FUCKUPS

### FUCKUP #1: Scheduler Courses Not Loading from System
**Issue:** Course dropdown only had GolfCoursesDatabase courses, missing the full system list.
**Fix:** Pull from scorecardCourseSelect (hardcoded full list of 27 courses).
**Lesson:** The source of truth for courses is the scorecard dropdown, not GolfCoursesDatabase.

### FUCKUP #2: JOA Schedule Upload Failed — organizer_id Type Mismatch
**Issue:** Edge Function tried inserting LINE user ID (text) into organizer_id (UUID column). Failed silently.
**Root Cause:** Never checked column type before inserting.
**Fix:** Removed organizer_id from insert, match by organizer_name instead.
**Lesson:** ALWAYS check column data types before inserting.

### FUCKUP #3: JOA Schedule Upload Failed — Anthropic API Credits Empty
**Issue:** Claude Vision API returned "credit balance too low." Upload appeared to succeed but parsed nothing.
**Fix:** Manually read the Korean schedule image and inserted 30 events via SQL.
**Lesson:** Check API credits. Build local alternatives that don't depend on paid APIs.

### FUCKUP #4: Upload Schedule Button in Wrong Location
**Issue:** JOA saw the old photo upload button on Events tab, not the new Schedule Creator.
**Root Cause:** Replaced the Admin tab button but the Events tab had a separate copy.
**Fix:** Replaced Events tab button with Schedule Maker link.
**Lesson:** grep for ALL instances of a button/feature before claiming it's replaced.

### FUCKUP #5: Score Entry — _inputLocked Timer (4th Recurrence)
**Issue:** Score rejected on first tap, needed multiple attempts.
**Root Cause:** 150ms timer-based lock + renderHole() reset clearing scores mid-entry.
**Fix Chain:** 80ms → renderHole reset (WORSE) → remove lock entirely (double-tap risk) → **final: _saving event flag** (set on digit, cleared after UI update, no timer).
**Lesson:** Timer-based input locks are fundamentally wrong. Use event-based flags.

### FUCKUP #6: Approach Proximity Only Saved on GIR Holes — DATA LOSS
**Issue:** Pete entered 1st putt distances on every hole, but only GIR holes had data in DB.
**Root Cause:** Save code at line 74677 had `&& holeStats.gir === true` condition. UI showed both rows on ALL holes but save still gated on GIR.
**Data Lost:** Pete's May 30 round — 1st putt distances on non-GIR holes gone permanently.
**Fix:** Removed the GIR gate from the save code.
**Lesson:** When changing UI to show a feature on ALL holes, ALSO update the SAVE code. UI and save must be in sync.

### FUCKUP #7: Make % Always Showed 0%
**Issue:** "3ft Make: 0% (0/11)" — impossible for 11 putts from 3ft to all miss.
**Root Cause:** Make % used `proximity` (2nd putt distance) and checked `putts === 1`. Since proximity records AFTER the 1st putt, putts can never be 1.
**Fix:** Changed to use `approach_proximity` (1st putt distance). Added separate 2nd putt make % row.
**Lesson:** Know which field means what. proximity ≠ approach_proximity.

### FUCKUP #8: Admin Secret Prompt Blocking TRGG
**Issue:** Pete couldn't use TRGG handicap paste — prompted for admin secret.
**Fix:** Removed prompt. Changed to direct insert (tmp_insert policy allows it).

### FUCKUP #9: Scheduler Not Loading Events — society_profiles.id ≠ societies.id (5 ATTEMPTS)
**Issue:** TRGG and JOA scheduler showed blank — no existing events populated.
**Root Cause:** `AppState.selectedSociety.id` comes from `society_profiles` table, but `society_events.society_id` references the `societies` table. Different UUIDs for the same society.
**Fix Attempts:**
1. Query by society_id → wrong ID, empty results
2. Query by organizer_name → TRGG has organizer_name = NULL
3. OR filter with society_id + organizer_name → PostgREST broke on spaces in name
4. Two separate queries with fallback → still missed some
5. **Final: query by title prefix** (TRGG%, JOA%) — works for everything because event titles always start with the society name
**Lesson:** There are TWO tables (`societies` and `society_profiles`) with DIFFERENT IDs for the same society. Never assume they're interchangeable. Title prefix is the most reliable match.

### FUCKUP #10: Scheduler Transport Fee Wrong for JOA
**Issue:** JOA should have ฿400 transport but showed ฿300.
**Root Cause:** Transport fee was set AFTER buildWeeks() — rows already rendered with default 300.
**Fix:** Set transport fee BEFORE calling init/buildWeeks.
**Lesson:** Execution order matters. Set defaults before rendering.

### FUCKUP #11: Desktop Scheduler Column Misalignment (3 ATTEMPTS)
**Issue:** Course dropdown stretched full width, pushing fees to the far right.
**Fix Chain:**
1. Used flex layout → columns didn't align with headers
2. Used HTML table → worked but no fixed widths
3. Added table-layout:fixed with colgroup → Course had no width, stretched again
4. **Final: Course column width:35%** — fees sit tight against it
**Lesson:** Use `table-layout:fixed` with explicit `<col>` widths for aligned columns.

### FUCKUP #12: Mobile Scheduler — "Course" Header Vertical, Dropdowns Missing
**Issue:** On mobile, the fixed-width table collapsed the Course column to nothing.
**Fix Chain:**
1. Horizontal scroll → works but bad UX on mobile
2. **Final: 2-line mobile layout** — Line 1: Day + Course + Booking, Line 2: Green + Trans + Comp
**Lesson:** Mobile needs its own layout, not a squeezed desktop table.

### FUCKUP #13: Desktop Broke When Adding Mobile Layout
**Issue:** Adding the mobile layout reverted the desktop column fix.
**Root Cause:** Rebuilt the desktop table but forgot to include the `width:35%` on the course column.
**Fix:** Restored `col style="width:35%;"` on the desktop table.
**Lesson:** When adding mobile layout, do NOT touch the working desktop code. Verify desktop still works after every mobile change.

### FUCKUP #14: Scheduler Async Load Blocked Rendering
**Issue:** Scheduler showed blank — weeks never rendered.
**Root Cause:** `loadExistingAndBuild()` was async, queried DB BEFORE rendering. If query slow, nothing shows.
**Fix:** Render weeks instantly (empty), load existing in background, re-render when data arrives.
**Lesson:** RENDER BEFORE ASYNC. Never block UI on DB calls.

### FUCKUP #15: Missing Catch Block — Syntax Error
**Issue:** JS syntax error broke the page entirely.
**Root Cause:** try block without catch in loadExistingEvents.
**Fix:** Added catch block.
**Lesson:** Syntax check (node -c equivalent) before EVERY push.

---

## NEW FEATURES

### Universal Monthly Schedule Creator
**Final state after all iterations:**
- **Week-by-week spreadsheet** — Mon through Sun per week
- **Course dropdown** — all 27 courses from the system
- **Fee dropdown** — ฿100-600 (100 step), ฿650-3000 (50 step), ฿3500-15000 (500 step) + Custom
- **Inline transport/comp fees** — auto-set per society (JOA=฿400/฿250, others=฿300/฿250)
- **Booking name** per day
- **"Same as above" checkbox** — copies previous week's data
- **Preview button** — shows full schedule table before generating
- **Generate** — batch creates events with dedup (updates existing)
- **Export CSV** — downloads schedule file
- **Download Template** — blank CSV for offline editing
- **Import from Excel/CSV** — populates the form from a filled template
- **Loads existing events** from DB and pre-fills (green ✓ on days with events)
- **Monday-first weeks** (Mon-Sun, not Sun-Sat)
- **Desktop:** single-row table with aligned columns (table-layout:fixed, course=35%)
- **Mobile:** 2-line per day (Line 1: Day + Course + Booking, Line 2: fees)
- **Title prefix matching** — finds events by TRGG%, JOA% etc. (no society_id needed)

### Proximity Stats Fix
- approach_proximity now saves on ALL holes (removed GIR gate)
- Make % uses approach_proximity (1st putt distance), not proximity (2nd putt)
- Round detail shows BOTH: 1st Putt Make % (blue) and 2nd Putt Make % (green)

### Permanent Score Entry Fix
- `_saving` event flag replaces all timer-based locks
- Set TRUE on digit entry, FALSE after UI update completes
- Zero timer dependencies

---

## KEY RULES FOR FUTURE REFERENCE

### Scheduler
1. **Title prefix is the reliable match** — `ilike('title', 'TRGG%')` works for all societies. Don't use society_id (two tables, two different IDs).
2. **society_profiles.id ≠ societies.id** — NEVER assume they're the same. Different tables, different UUIDs.
3. **Set defaults BEFORE buildWeeks()** — transport fee, competition fee must be in the DOM before rows render.
4. **Desktop: table-layout:fixed + col widths** — Course=35%, Green=80px, Trans=50px, Comp=50px, Booking=90px.
5. **Mobile: separate layout with different IDs** — `jw` prefix for desktop, `mw` prefix for mobile. collectEvents checks both.
6. **Render before async** — buildWeeks() first (instant), loadExistingEvents() in background.
7. **Fuzzy course matching** — existing event course names may differ from dropdown. Use contains/partial match + custom option fallback.

### Score Entry
8. **No timer-based locks** — use `_saving` event flag. Set on entry, clear after UI update.
9. **All hole navigation must clear input state** — nextHole, prevHole, goToHole, goToLatestHole.

### Proximity Stats
10. **UI change = save code change** — if you show approach_proximity on all holes, remove the GIR gate from the save.
11. **proximity = 2nd putt distance** (after 1st putt). **approach_proximity = 1st putt distance** (where ball landed). Don't mix them up.
12. **Make % uses approach_proximity** — did the first putt go in? (putts === 1).

### General
13. **Check column data types** — UUID vs text. organizer_id is UUID, can't insert text.
14. **grep ALL instances** — before replacing a button/feature, find every copy.
15. **Syntax check before EVERY push** — `node -c` equivalent prevents broken pages.
16. **Don't touch working code when adding new layouts** — verify the unchanged part still works.
17. **Check API credits** — paid APIs fail silently when credits run out.

---

## COMMITS (31)

1. `0a23c609` — Permanent score entry fix (_saving flag)
2. `70c24f23` — Fix JOA schedule: organizer_id UUID mismatch
3. `277833c6` — JOA Schedule Creator (weekly rotation)
4. `d6359d2f` — JOA: booking name per day
5. `a90f0654` — Replace Upload button with Schedule Maker
6. `a81b4b87` — Week-by-week with copy forward
7. `a345feaf` — Course/fee dropdowns, same-as checkbox
8. `7cc331cc` — Preview button
9. `d11344bc` — Expand preview to 80vh
10. `855d2c06` — Fix button text color
11. `94e798cc` — Rename Khao Kheow CC
12. `6a92b076` — Monday-first weeks
13. `d2e6c442` — Export CSV
14. `f887f94b` — Universal Schedule Creator
15. `7ed825e3` — Download Template + Import CSV
16. `b4426916` — Load existing events from DB
17. `347eb6f2` — Render instantly, load in background
18. `c3a1b3f4` — Remove admin secret prompts
19. `2486d254` — Fix make %: use approach_proximity
20. `e8c5a37e` — Both 1st and 2nd putt make %
21. `ae1beee7` — approach_proximity saves on all holes
22. `75fd8d85` — Auto-set transport/comp fees
23. `8ffb6e72` — Inline fees per row
24. `2619b501` — Fix TRGG events: society_id lookup
25. `7e2fc123` — Table layout + fuzzy course matching
26. `62e09539` — Column widths: course 35%
27. `e9b3d11e` — Fix JOA loading + transport fee order
28. `217d4ed5` — Triple fallback query
29. `a85d18c3` — Simplify: title prefix for all lookups
30. `aeaf0795` — Mobile: horizontal scroll (then replaced)
31. `c27bddf1` — Mobile: 2-line layout
32. `6c3dae3b` — Fix desktop: restore course 35%
