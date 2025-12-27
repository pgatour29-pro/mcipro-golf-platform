# Compacted Folder Catalog

This index catalogs the contents of `Documents/MciPro/compacted` and records the latest work completed so you can quickly resume.

## Recent Work (December 27, 2025)

**Society Handicap Round Start Fix**

- Fixed critical bug where universal handicap was used instead of society-specific handicap
- Added handicap refresh in `startRound()` before creating scorecards
- Example: Pete Park 3.6 universal → 2.5 Travellers Rest was showing -4 strokes instead of -3
- File: `2025-12-27_SOCIETY_HANDICAP_ROUND_START_FIX.md`

---

## Recent Work (December 26, 2025)

**Handicap System Overhaul**

- Created HandicapManager class for centralized handicap management
- Fixed match play handicap calculation algorithm
- Fixed auto handicap adjustment sync after rounds
- Added Photo Score feature (AI scorecard analysis)
- File: `CHANGES_2025-12-26.md`

---

## Previous Work (October 17, 2025)

**Live Scorecard Multi-Format & Scramble Tracking**

- Scramble In-Round Tracking UI
  - Added drive/putt selection interface that appears after all players score each hole
  - Displays whose drive was used per hole with remaining drive counter
  - Tracks who made the putt on each hole
  - Automatic display with 500ms smooth transition
  - Data stored: `scrambleDriveData`, `scramblePuttData`, `scrambleDriveCount`
  - Methods: `showScrambleTracking()`, `saveScrambleTracking()`

- Multi-Format Scorecard Display FIX
  - Fixed format header: Now shows "Stableford • Stroke Play • Scramble" (all selected formats)
  - Fixed score rows: Stableford Points row displays when stableford selected
  - Fixed 8 locations using singular `scoringFormat` → array `scoringFormats`
  - Summary section now shows totals for all selected formats
  - Resolves user issue: "still only has stroke play" bug

- Syntax Error Fixes
  - Fixed missing closing brace in `nextHole()` method (line 29970)
  - Removed extra closing brace after Scramble methods (line 30055)
  - Resolved: `Uncaught SyntaxError: Unexpected token '{'`
  - Resolved: `Uncaught ReferenceError: LiveScorecardManager is not defined`

- Groundhog Day Sync Loop FIX
  - Added 3-attempt retry limit for offline scorecard sync
  - Auto-cleanup failed scorecards after 3 attempts
  - Prevents infinite loop of 400 errors on every page load
  - Resolves user issue: "why the same long list of errors. we are in a groundhog day"

- Favicon Added
  - Added favicon links using existing `mcipro.png` logo
  - Browser tab icon, bookmarks, iOS home screen icons
  - Resolved: `GET /favicon.ico 404 (Not Found)`

- Files Modified
  - `index.html` - +183 additions, -23 deletions (6 commits)
  - Commits: 86a9e5f0, 15cc2abf, 62e2af55, 555ff2de, d7acf9e1, c59a4669

## How To Verify

**Multi-Format Scorecard:**
- Select: Thailand Stableford + Stroke Play + Scramble
- Start round, play 1 hole, complete round
- Verify finalized scorecard shows all 3 formats with separate score rows

**Scramble Tracking:**
- Enable "Track Drive Usage" and "Track Who Made Each Putt"
- Enter scores for all players
- Verify Scramble UI appears with drive/putt selection dropdowns
- Check drive counter updates correctly

**Sync Loop Fix:**
- Clear localStorage: Run script in browser console (see session doc)
- Hard refresh, verify console clean with no repeated 400 errors

**Syntax Fixes:**
- Verify can add players to Live Scorecard
- Verify can start round without errors

## Compact Folder Contents (Catalog)

High‑level docs and session logs useful for resuming work:

- 00‑READ‑ME‑FIRST.md — Session continuity guide; how to use this folder.
- README.md — Overview of the compacted docs.
- 02‑roadmap‑all‑tasks.md — Consolidated roadmap of tasks.
- NEXT_SESSION_TASKS.md — Immediate next actions.
- aiagent.txt — Guidance for coding agents in this repo.

Chat System
- 01‑chat‑system‑completed.md — Chat completion summary (DM/group RPCs, RLS, sidebar/backfill, badges).
- 2025‑10‑13_Mobile_Performance_And_Tailwind_Mistake.md — Postmortem: unread badge fix via membership scoping; Tailwind CDN revert and notes.
- 2025‑10‑15_ROOT_FILE_DISCOVERY_SCROLLING_CHAT_FIX.md — Chat container discovery/scroll fixes.
- mobile‑loading‑fix‑attempts‑2025‑10‑15.md — Attempts/results for mobile load time.

Organizer / Bookings / Calendar
- ORGANIZER_EVENTS_SYSTEM_TODO.txt — Organizer backlog.
- FIX_Calendar_Date_Timezone_2025‑10‑10.txt — Timezone normalization.
- FIX_Organizer_Calendar_Clickable_Dates_2025‑10‑10.txt — Calendar click UX fixes.
- FIX_RealTime_Sync_Organizer_Stats_2025‑10‑10.txt — Realtime sync for organizer stats.
- FIX_Registration_Count_Supabase_Column_2025‑10‑10.txt — Registration count correction.

Profiles & Auth
- 2025‑10‑11_Mobile_Header_and_Profile_Data_Fix.md — Mobile header/profile fixes.
- PROFILE_SYNC_FIX_2025‑10‑09.txt — LINE ↔ Supabase profile mapping/sync.

Live Scorecard
- 2025‑10‑17_SCRAMBLE_MULTIFORMAT_SYNC_FIXES.md — **NEW** Scramble tracking UI, multi-format display fix, sync loop fix (groundhog day resolved).
- 2025‑10‑17_SCORECARD_ENHANCEMENTS_SESSION.md — Multi-format backend implementation.
- 2025‑10‑11_LiveScorecard_Complete_Overhaul.md — Overhaul: keypad entry, live leaderboards, offline‑first.
- PLAN_Live_Scorecard_Leaderboard_2025‑10‑10.txt — Leaderboard/scoring plan.

Native App Progress
- MciProNative‑Progress‑2025‑10‑14.md — RN app status and integration points.

Session Logs & Summaries
- 2025‑10‑11_SESSION_CATALOG_FAILURES.md — Session reliability issues and mitigations.
- 2025‑10‑11_Session_Tasks_1‑4_Tab_Fixes.md — Tab fixes batch.
- SESSION_Organizer_Phase1_Complete_2025‑10‑10.txt — Phase completion summary.
- SESSION_CONTINUATION_Organizer_System_2025‑10‑10.txt — Organizer follow‑up.
- SESSION_COMPLETE_Tasks_1‑7.txt — Completed tasks checklist.
- 2025‑10‑15_COMPLETE_ERROR_CATALOG_ALL_FUCKUPS.md — Comprehensive error catalog.
- TECHNICAL_SUMMARY.md — System‑wide technical notes.
- QUICK_REFERENCE.md / QUICK_REFERENCE_Current_State.txt — Quick reference sheets.
- Todos.txt — Short to‑do scratchpad.

Media
- Screenshot 2025‑10‑08 133040.jpg — Visual reference used in discussions.

## Suggested Next Steps

- Optional: add organizer notifications (email/LINE) when a scorecard is finalized (Supabase table + function).
- Optional: wire caddie booking demo UI to backend schema.
- Optional: small UI indicator when chat is in polling mode.

—
Generated: 2025‑10‑16
Updated: 2025-12-27

**Updated Next Steps (2025-12-27):**

**Completed:**
- [x] Society handicap round start fix
- [x] HandicapManager class
- [x] Match play handicap calculation fix
- [x] Photo Score feature (pending API key)

**Immediate:**
- Deploy ANTHROPIC_API_KEY for Photo Score feature
- Test society handicap fix in live round

**Key Files for Handicap System:**
- `LINE_NUMBERS.md` - Line number reference
- `HANDICAP_SYSTEM.md` - System overview
- `CHANGES_2025-12-26.md` - Handicap overhaul details
- `2025-12-27_SOCIETY_HANDICAP_ROUND_START_FIX.md` - Round start fix
