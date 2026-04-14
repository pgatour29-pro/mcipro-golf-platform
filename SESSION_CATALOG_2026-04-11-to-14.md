# Session Catalog — 2026-04-11 to 2026-04-14

## Overview
Eastern Star scoring fix, handicap system overhaul, admin messages, tournament system build, Performance Lab analytics, SOS alert scoping, spectate live player names, UI improvements.

All changes in `public/index.html`, `public/live.html`, `public/supabase-config.js`, and Supabase SQL deployments.

---

## April 11 — Live Round Fixes + Score Corrections

### 1. Official Scorecard Modal Margin Fix
**Commit:** `c64a43a1`

Modal top was cut off on mobile — top of page wasn't visible, X button unreachable.
- Changed from `items-center` to `items-start`
- Added `env(safe-area-inset-top)` padding for phone notch/status bar
- Moved `overflow-y-auto` to outer container

### 2. Match Status by Nine — Box Spacing
**Commit:** `385b9603`

"All Square" text was wrapping with "e" dropping to next line in the three status boxes.
- Reduced text from `text-lg` to `text-sm`
- Added `white-space: nowrap`
- Reduced padding and gaps

### 3. Score Correction — Pete's Green Valley Round (Apr 10)
Hole 14: Corrected from 5 (par) to 4 (birdie on par 5).
Updated across ALL four tables:
- `scores` table: gross 5→4, stableford 2→4
- `round_holes` table: gross 5→4, stableford 2→4  
- `rounds` table: gross 79→78, net 80→79, stableford 30→32
- `scorecards` table: gross 79→78, net 80→79

### 4. Eastern Star Handicap Correction
Pete's scorecard for Eastern Star had handicap -0.9 but he played off 2.6 manually.
- Updated scorecard handicap to 2.6 (playing 3)
- Recalculated all 18 holes' handicap strokes, net scores, and stableford points
- Updated round totals: gross 91, net 88, stableford 21

---

## April 12 — Admin Messages, Caddy Organizer, Leaderboard, SOS

### 5. Admin Message Name Fix
**Commit:** `17679a2c`

Announcement board and Admin Inbox now show "Admin" instead of "Pete Park" for admin-sent messages. Group messages and DMs still show personal name.
- Announcement list: checks `PLATFORM_ADMIN_LINE_ID`
- Announcement detail: same check before querying user_profiles

### 6. Leaders Ticker 30% Smaller
**Commit:** `71f11e32`

Gold "LEADERS" badge reduced: height 44→34px, font 14→11px, icon 18→14px, padding reduced.

### 7. Featured Caddies Redesign
**Commits:** `bb44fea8`, `4f814ad9`

- Cards: green gradient background, green border glow, rating badge on photo
- Specialty text in green, bolder typography
- Removed golf flag icon from header (looked amateurish)

### 8. Event Day Dots + Return to Scoring Banner
**Commit:** `a0461297`

Event dots in scorecard dropdown:
- 🟢 Green = event today
- 🟡 Yellow = upcoming event
- 🔴 Red = past event

Floating "Return to Live Scoring" banner:
- Green pulsing button at bottom of screen during active round
- Shows when navigating away from scorecard tab
- Hidden when on scorecard tab

### 9. Booked Caddies on My Caddy Organizer
**Commit:** `f545ef54`

"Upcoming Caddy Bookings" section at top of caddies tab:
- Shows all booked caddies with event name, course, date, time
- Edit button (prompt dialog)
- Delete button to remove booking
- Loads from event_registrations

### 10. Handicap Auto-Calculation via Frontend RPC
**Commit:** `20777669`

Database trigger was never deployed. Frontend now calls `calculate_society_handicap_index` RPC directly after each round:
- Society round → updates BOTH society handicap AND universal
- Non-society round → updates ONLY universal
- Uses gross score differentials (not affected by manual adjustments)
- GPR (General Play Reduction) still applies on top

---

## April 13 — Tournament System + Handicap Protection

### 11. Handicap MANUAL Protection
**Commit:** `f1491332`

Handicap auto-calc was overwriting Pete's manual +0.9/+1.1 with WHS calculated 7.3.
- Frontend: checks `calculation_method === 'MANUAL'` before auto-calculating
- Database trigger: same check added via SQL deployment
- MANUAL handicaps are now NEVER overwritten by auto-calculation

### 12. Tournament System — Database
**SQL:** `sql/20260413_tournament_system.sql` (deployed via Supabase CLI)

New tables:
- `tournaments` — parent record (name, days, scoring format, cut config)
- `tournament_days` — links tournament to society_events per day
- `tournament_registrations` — single registration for whole tournament
- `get_tournament_leaderboard()` — PG function for cumulative scoring

### 13. Tournament System — Frontend
**Commits:** `7898d27a`, `e6703cf7`, `e46442e6`

TournamentManager class:
- Create tournament (auto-creates society_events per day)
- Register for tournament (cascades to all day events)
- Cumulative leaderboard (per-day columns + totals)
- Cut line logic (top N and ties)
- Tournament creation modal with full form
- Tournament list view (browse available tournaments)
- Tournament detail modal (schedule, leaderboard, registration, director controls)

Available to ALL users (not just organizers) — gold "Tournament" button in Society Events tab.

### 14. Handicap Trigger SQL Deployed
**Via:** `npx supabase db query --linked`

Deployed `fix_universal_handicap_every_3_rounds.sql`:
- Universal handicap updates every 3 private rounds (not every round)
- Society handicaps update on every society round (WHS 8/20)
- `rounds_since_adjustment` counter on society_handicaps

### 15. Supabase Access Token Saved
Token: `sbp_27bf05b9...` (expires ~May 13, 2026)
Method: `npx supabase login --token TOKEN` then `npx supabase db query --linked`

---

## April 14 — Performance Lab, SOS Alerts, Spectate Live, Cache Buster

### 16. Spectate Live — Player Names Fix
**Commit:** `1d5c1a52`

Players showed as "Player" instead of actual names on live.html.
- `nameMap` only resolved LINE user IDs from user_profiles
- Manually added players (player_1234 IDs) had no match
- Fix: Added `player_name` to scorecard queries, use `sc.player_name` as fallback

### 17. SOS Alert Broadcast Scope
**Commit:** `3363a6e1`

Two broadcast levels:
- `broadcast: 'all'` — Medical Emergency, Severe Weather, Lightning, Stop/Resume Play, Cart Path
- `broadcast: 'facility'` — Security Issue, Equipment/Cart, Lost/Assistance

Receiving side: golfers only see 'all' alerts. Facility staff see everything.
Removed 'golfer' from targetRoles for facility-only alerts.

### 18. Performance Lab — Interactive What-If Simulator
**Commits:** `e46442e6` through `a3c66c57` (15+ iterations)

New section in Golf Analytics tab:
- **Course selector** — loads actual hole data from `course_holes` table (22 courses)
- **Three sliders:** Putts per Round (18-45), Fairway Hit % (0-100%), GIR % (0-100%)
- **Simulated Round box:** Gross, Net, Stableford — calculated from par using stats
- **Handicap Trajectory chart** — trading-style green glow line
- **Play Simulation Round** — full 18-hole randomized scorecard based on slider stats
- **Reset button** — returns sliders to player's actual stats
- **Projected Impact** — strokes saved, projected avg, handicap trend

Key implementation details:
- Loads player's actual stats from `rounds` + `round_holes` tables
- Course data from `course_holes` table with tee marker priority (white > white1 > yellow > blue)
- Plus handicap strokes allocated on EASIEST holes (highest SI) — matches live scoring logic
- Score built from par, not from scoring average
- GIR/putting interdependency model (low putts + low GIR = scrambling, not birdies)
- Simulation scorecard syncs with summary box after playing

### 19. Cache Buster — Login Preservation
**Commit:** `a3c66c57`

Every version bump was clearing SW + caches + forcing reload, which wiped LINE session.
- Now preserves `line_user_id` and `display_name` through cache operations
- Only aggressive SW clear on major version jumps (10+ versions)
- Incremental updates: just set version, no reload

---

## Version History

| Version | Commit | Description |
|---------|--------|-------------|
| v335 | `385b9603` | Match Status box text wrapping fix |
| v336 | `17679a2c` | Admin messages show "Admin" not personal name |
| v337 | `c64a43a1` | Official Scorecard modal margin fix |
| v338 | `71f11e32` | Leaders ticker 30% smaller |
| v339 | `f545ef54` | Booked caddies on Caddy Organizer page |
| v340 | `a0461297` | Event day dots + Return to Scoring banner |
| v341 | `bb44fea8` | Featured Caddies redesign |
| v342 | `4f814ad9` | Remove golf flag icon |
| v343 | `20777669` | Handicap auto-calc via frontend RPC |
| v344 | `7898d27a` | Tournament system + creation UI |
| v345 | `e6703cf7` | Tournament available to all users |
| v346 | `f1491332` | Handicap MANUAL protection |
| v347 | `3363a6e1` | SOS alert broadcast scope |
| v348 | `e46442e6` | Tournament views + Performance Lab |
| v349 | `e6469562` | Performance Lab reset button |
| v350 | `a3f6e48f` | Simulated Round (gross/net/stableford) |
| v351 | `3bc67158` | Performance Lab uses actual player stats |
| v352 | `09635f7c` | Impact model rebalanced |
| v353 | `3b67653a` | Putts interdependent with GIR |
| v354 | `19ba4243` | Score from par 72 baseline |
| v355 | `0d76b36e` | Recalibrated model + real handicap |
| v356 | `5e61fa24` | Play Simulation Round (18-hole scorecard) |
| v357 | `09750ba1` | Sim box syncs with scorecard totals |
| v358 | `a35f5804` | Course selector added |
| v359 | `4fb2fd4c` | Course dropdown visibility fix |
| v360 | `089269a8` | Load course data from course_holes table |
| v361 | `9f47c1b6` | Plus handicap on easiest holes (SI 18) |
| v362 | `f3712528` | Course change clears old scorecard |
| v363 | `ee7a2df7` | Exact database course_ids + tee variations |
| v364 | `a3c66c57` | Cache buster preserves login session |

---

## Files Changed
- `public/index.html` — All UI and JS changes
- `public/live.html` — Spectate Live player names fix
- `public/supabase-config.js` — roleSpecific persistence (from Apr 9)
- `sql/20260413_tournament_system.sql` — Tournament database schema
- `sql/fix_universal_handicap_every_3_rounds.sql` — Handicap trigger (deployed)
