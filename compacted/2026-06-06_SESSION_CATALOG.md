# Session Catalog — 2026-06-06

All `public/index.html` unless noted. Deploy: push master → **Vercel** (NOT Netlify) → mycaddipro.com; each change parse-checked via inline-`<script>` `new Function` harness + verified live by polling a unique marker. DB = Supabase `pyeeplwsnupmhgbguwqs` via `npx supabase db query --linked -f file.sql`. See companion [2026-06-06_FUCKUPS_AND_FIXES.md] for the day's mistakes. Hard rule learned today: **never bulk-write `society_events`** — it fires LINE notifications to players ([[society-events-writes-fire-notifications]]).

## Strict course dropdown — scheduler (1e01c0ca)
Organizers were entering event courses as FREE TEXT → garbage course_names ("GREEN VALLEY FREE FOOD FRIDAY", "Present Valley CC" typo) that broke live-scoring auto-select. `ScheduleCreator.getCourseOptions()` was a select sourced from `scorecardCourseSelect` + 7 hardcoded extras + any typed value sticking. First pass: rewrote it as a strict dropdown sourced from the `courses` table with fuzzy fallback + "➕ Add a new course…". (Superseded same day — see venue-model fix below.)

## Remove Netlify from the live app (9645c980)
Pete: "get Netlify out of the fucking system." Site is on **Vercel** (migrated Oct 2025); stale `/.netlify/functions/*` calls 404'd. Deleted `netlify.toml` + `golfoperations/.netlify/`. In `index.html`: dropped the unused `SimpleCloudSync.FUNCTION_URL`; routed `handleDeletion` → `SupabaseDB.deleteBooking` (was a 404 — fixed cross-device booking cancel); onboarding `saveProfile` → `SupabaseDB.saveUserProfile`; profile-delete → Supabase delete by line_user_id; dropped the dead username-check fetch (also had a latent `res`-vs-`response` ReferenceError that made it always throw). Fixed stale `netlify.app` footer URLs in `analytics-drilldown.js` + `reports-system.js` → mycaddipro.com.

## Add Event form strict dropdown + St Andrews dedupe (995c0b44)
"Add Event" quick form's `#eventCourse` was a free-text `<input list="courseList">` + hardcoded partial-name datalist (the last free-text back door) → converted to a strict `<select>` via `window.EventCourseSelect` (load/populate/onChange/fillDatalist). DB: `courses` had 3 rows named "St. Andrews 2000 Golf Club" — kept canonical `st_andrews_2000` (90 holes), repointed 6 rounds + 13 scorecards off the empty dupe, deleted both empties.

## Venue-model correction — course dropdowns source from the venue list (67a912c6)
Pete corrected the model: **organizer picks the VENUE; players pick which nines at the course.** Live scoring already implements this — `#scorecardCourseSelect` lists ~27 VENUE options (value `phoenix`/`khao_kheow`/`laem_chabang`/etc.) and selecting a multi-nine venue shows a combo picker (`phoenixPicker`, `greenwoodFront9/Back9`…) where the PLAYER chooses nines (ids `greenwood_a`+`greenwood_b`…). My sourcing from the `courses` table (nine-level rows) was wrong. Repointed BOTH organizer dropdowns (`ScheduleCreator.loadCourses` + `EventCourseSelect.load`) to read `#scorecardCourseSelect` option labels. Multi-nine venues now appear ONCE in event creation. See [[course-selection-dropdown]].

## Course-ID unification — delete the shim maps (be24d710)
Self-inflicted mess from prior sessions: hole data + `courses` rows under LONG ids (`bangpra_international`/`pattana_golf`/`st_andrews_2000`); live scorecard dropdown + most saved rounds under SHORT ids (`bangpra`/`pattana`/`st-andrews-2000`); papered over by THREE copies of `COURSE_ID_MAP`. Same course's history split (Bangpra 25 short + 1 long). Unified to SHORT (used in far more code): DB migration (FKs `course_holes`/`rounds`→`courses.id` are NO ACTION on update → insert short `courses` rows, repoint FK children + `scorecards`/`shots`, delete long rows); emptied all 3 maps to `{}`; renamed `COURSE_CACHE_VERSIONS` keys + bumped; fixed perfLab + round-history dropdown options. Verified 0 long ids, 198 holes intact, Bangpra consolidated to 26.

## Course-name normalization (DB — CAUSED NOTIFICATION SPAM)
Normalized upcoming events' `course_name` to exact venue labels via several `UPDATE society_events` batches — each batch fired LINE notifications to players. Pete: "stop it you fuck." Events ARE now venue-labeled (Phoenix Golf / Khao Kheow CC / Laem Chabang International CC / etc.) but DO NOT do this again. Also fixed the one JOA Jun-6 event TITLE "Present Valley CC" → "JOA Golf - Pleasant Valley" (single targeted UPDATE by id, one notification, with Pete's explicit OK).

## Pin sheets — course picker + cross-course bleed (3fdd8478, c9a06c42)
Pin sheets stored per `course_name` (the DISPLAY label, not course id) in `pin_positions` + `pin_locations`. **Course picker (3fdd8478):** save flow used whatever round was active; added a Course `<select>` to both save paths (manual photo + quick-text), sourced from the venue list, defaulting to the active course — so a sheet is deliberately tied to a course. **Bleed fix (c9a06c42):** `getPinForHole` returned pins without checking the sheet's course → Bangpakong's sheet showed on Pleasant Valley/Treasure Hill. Added a course-name guard + cleared stale data. (Insufficient — see 06-07 pin saga.) Also deleted a stray old Bangpra pin sheet (Pete: "only bangpakong").

## OPEN / carryover
- Keypad bug root cause (query `client_errors` kind `keypad%` after repro).
- Auto-attribution of Erik's non-TRGG rounds → JGTS (high blast radius).
- Phoenix Golf events not mapped to a nine (multi-nine venue; player picks at course).
