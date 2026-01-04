# Compacted Folder Catalog

This index catalogs the contents of `Documents/MciPro/compacted` and records the latest work completed so you can quickly resume.

## Recent Work (January 4, 2026)

### Pro Shop Tee Sheet - Caddy Booking Integration
**File:** `2026-01-04_TEESHEET_CADDY_BOOKING_INTEGRATION.md`

Integrated Pro Shop Tee Sheet with main caddy booking system:
- Created `ParentBridge` to access parent window's CaddySystem and BookingManager
- Updated course-select options to match `homeClub` values (10 courses)
- Caddies load from parent CaddySystem, filtered by selected course
- Tee sheet bookings sync to parent BookingManager and Supabase
- Bookings from caddy booking module merge into tee sheet display
- Two-way sync: tee sheet ↔ BookingManager ↔ Supabase

---

### Login & Promo Mobile Responsive
**File:** `2026-01-04_LOGIN_PROMO_MOBILE_RESPONSIVE.md`

Made login page promo and presentation fully mobile responsive:
- Login promo banner: vertical stack on mobile
- Promo slides: internal scrolling, scaled elements
- Slide 5 comparison table: converted to card layout
- Slide 6 booking flow: horizontal compact (3 side-by-side)
- Phone mockup: 255px → 180px on mobile
- Fixed slide transition bug (kept absolute positioning)

---

### Tee Sheet Multilingual Caddy Names
**File:** `2026-01-04_TEESHEET_MULTILINGUAL_CADDY_NAMES.md`

Implemented full multilingual support for caddy names:
- Added `localName` field to 30+ caddies with Thai script names
- Search works with Thai (สมชาย), Korean, Japanese characters
- Dropdown shows local names when language is not English
- Booking data stores both `caddyName` and `caddyLocalName`

### Tee Sheet Session Complete
**File:** `2026-01-04_TEESHEET_SESSION_COMPLETE.md`

| Fix/Feature | Description |
|-------------|-------------|
| Caddy double-booking | Prevented same caddy for multiple golfers in one booking |
| Back-to-top button | Fixed scroll listener for full-screen layout |
| Duplicate settings btn | Removed redundant settings button |
| Clear caddy button | Added × button for first golfer's caddy |
| Course dropdown | Hidden from main sheet (Settings only) |
| Recurring booking | Added standing tee time feature with frequency options |
| Translations | Completed 100% coverage for EN/TH/KO/JA |
| Multilingual caddies | Thai names searchable in caddy dropdown |

**Deployed:** https://mycaddipro.com

---

## Recent Work (December 30, 2025)

**Session Fixes (5 total):**

| Fix | Issue | Solution |
|-----|-------|----------|
| 1 | Caddy booking showing "pending" | Treat null/undefined availability_status as "available" |
| 2 | Event edit badge not showing | Added `setupEarlyEventSubscription()` on page load |
| 3 | Pete Park handicap showing 1.5/2.5/3.6 | Updated PeteFix to 3.0, expanded watch list |
| 4 | Alan Thomas handicap showing 4.0 | Added AlanFix code blocks (same as PeteFix pattern) |
| 5 | iOS LINE OAuth double-login | Added sessionStorage backup + iOS fallback for state |
| 6 | Brad Gaddes missing from database | Manually added as MANUAL-GADDES-BRAD-1101 with handicap 12.0 |

**File:** `2025-12-30_SESSION_FIXES.md`

---

**CRITICAL BUG: Handicap Corruption After Society Event**

After Eastern Star event on Dec 29, handicaps were corrupted:
- Pete Park: Universal went to 5.0 (should be 3.6), TRGG went to 9.9 (should be 2.5)
- Alan Thomas: Dashboard showed 4.0 (should be 11.1)

**Root Issue:** Pete's TRGG jumped +7.4 in one round despite ±1.0 cap in code. Bug not identified.

**Fix Applied:** Manual database correction via PowerShell REST API.

**Diagnostic Scripts Created:**
- `fix_handicaps_now.ps1` - Manual fix script
- `check_alan_hcp.ps1`, `check_pete_hcp.ps1` - Verification scripts
- `check_event_players.ps1`, `check_hcp_history.ps1`, `check_today_round.ps1`, `check_hcp_dupes.ps1`

**File:** `2025-12-30_HANDICAP_CORRUPTION_BUG.md`

**Status:** Data fixed, root cause still needs investigation.

---

## Recent Work (December 28, 2025)

**UI Fixes Session**

Three UI fixes deployed:

| Fix | Description |
|-----|-------------|
| Mobile Language Dropdown | Fixed globe icon dropdown being clipped by `overflow-x-auto` parent - now uses fixed positioning on mobile |
| Caddy Book Link | Fixed "Caddy Book →" link going to blank page - changed tab name from `myCaddies` to `caddies` |
| Back to Top Buttons | Added floating scroll-to-top buttons on Golfer Society Events (green) and Organizer Events (sky blue) pages |

**Key Lines:**
- Language dropdown CSS: 1779-1787
- Language dropdown JS: 5861-5868
- Caddy Book link: 27210
- Golfer back-to-top: 29435-29438, 14464-14506
- Organizer back-to-top: 37056-37059

**File:** `2025-12-28_UI_FIXES_SESSION.md`

---

**Scoring Format Stableford Update**

Updated all game formats to use **Stableford points as default** instead of stroke play (Thailand golf convention):

| Function | Change |
|----------|--------|
| `calculateBetterBall` | Now uses highest Stableford points (was lowest strokes) |
| `calculateSkins` | Winner = highest Stableford points per hole |
| `calculateScramble` | Team Stableford with handicap support |
| Nassau tie handling | Losers now split payment among tied winners |
| Scramble drive validation | Enforces min drives with confirmation dialog |

**Key Lines:**
- `calculateBetterBall`: 49467-49522
- `calculateSkins`: 48958-49052
- `calculateScramble`: 49524-49552
- Nassau tie fix: 54566-54604
- Scramble validation: 52270-52296

**File:** `2025-12-28_SCORING_FORMAT_STABLEFORD_UPDATE.md`

---

**Event Card Border Highlighting**

Added visual border highlighting to event cards to quickly identify event status:

| Status | Border |
|--------|--------|
| Today/Tomorrow | Thick green double ring (`ring-4 ring-green-400 border-2 border-green-600`) |
| Filling Up (≤30% spots) | Thick yellow double ring (`ring-4 ring-yellow-400`) |
| Full | Thick red double ring (`ring-4 ring-red-500`) |
| Past/Future | Default gray (no highlight) |

**Locations Updated:**
1. Golfer Society Events - `GolferEventsManager.renderEventCard()` lines 73106-73124
2. Organizer Calendar Sidebar - `showEventsForDate()` lines 83566-83588
3. Organizer Dashboard Events - `SocietyOrganizerSystem.renderEventCard()` lines 61854-61875

**File:** `2025-12-28_EVENT_CARD_HIGHLIGHTING.md`

---

## Recent Work (December 27, 2025 - Afternoon Session)

**1. Pete Park Handicap Display Fix**
- Fixed +1.0 showing on initial load before switching to 3.6
- Added 4-layer protection with MutationObserver
- Lines: 6456-6502, 8443-8451, 11153-11163, 19352-19360

**2. Admin User Activity Report Redesign**
- Now shows only LINE-verified users (excludes TRGG-GUEST-*)
- Stats bar: Total, Active Today, This Week, New Users
- Detailed table with exact timestamps (DD/MM/YY HH:MM Bangkok)
- Status badges: Active Today, This Week, Inactive
- Lines: 36435-36513 (HTML), 45287-45420 (JS)

**3. Project Documentation Catalog**
- Created 8 documentation files in \compacted
- INDEX.md, PROJECT_STRUCTURE.md, DATABASE_SCHEMA.md, etc.

**File:** `2025-12-27_SESSION_CATALOG.md`

---

## Recent Work (December 27, 2025 - Morning)

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
- [x] Pete Park handicap display fix (4-layer protection)
- [x] Project documentation catalog created

**Immediate:**
- Deploy ANTHROPIC_API_KEY for Photo Score feature
- Test society handicap fix in live round

**Key Files for Handicap System:**
- `LINE_NUMBERS.md` - Line number reference
- `HANDICAP_SYSTEM.md` - System overview
- `CHANGES_2025-12-26.md` - Handicap overhaul details
- `2025-12-27_SOCIETY_HANDICAP_ROUND_START_FIX.md` - Round start fix

---

## NEW: Project Documentation (2025-12-27)

Comprehensive project catalog files:

| File | Description |
|------|-------------|
| `INDEX.md` | Documentation index |
| `PROJECT_STRUCTURE.md` | Overall project structure and directories |
| `INDEX_HTML_SECTIONS.md` | Main index.html sections with line numbers |
| `DATABASE_SCHEMA.md` | Supabase PostgreSQL tables |
| `SUPABASE_FUNCTIONS.md` | Edge functions catalog |
| `SCRIPTS_CATALOG.md` | Utility scripts reference |
| `COURSE_PROFILES.md` | Golf course data files |
| `QUICK_REFERENCE.md` | Common operations and fixes |

**Pete Park Handicap Fix Locations (index.html):**
- Line 6456-6502: Early DOM watcher + MutationObserver
- Line 8443-8451: After LINE login
- Line 11153-11163: In updateRoleSpecificDisplays()
- Line 19352-19360: In updateDashboardData()
