# Session Catalog — 2026-06-05

All `public/index.html` unless noted (deploy: push master → Netlify → mycaddipro.com; each parse-checked via inline-`<script>` `new Function` harness + verified live by polling a unique marker). DB = Supabase `pyeeplwsnupmhgbguwqs`. Pete iterating live from his phone via Telegram; replies sent through the Telegram reply tool per [[no-blocking-questions-on-telegram]].

## JGTS event for Erik's round (DB-only, continues 06-04 Erik/JGTS thread)
Erik's Jun 4 Pattaya County round was JGTS-attributed (`primary_society_id=eb3294e2`) but had `society_event_id=null`, so it showed ungrouped in "Recent Best Rounds". Pete: "make this a JGTS event."
- Created a `society_events` row **"JGTS - Pattaya County Club"** (society_id=`eb3294e2`, the now-consistent JGTS id), attached `rounds.society_event_id` + `scorecards.event_id` (id `47712287-…`). Verified it resolves to "JGTS - Jomtien Golf & Transport" (the leaderboard groups by `society_events.society_id → societies.name`).
- `society_events` gotchas (see [[scheduler-architecture-rules]]): `event_type` CHECK = tournament/social/practice/championship or NULL; `organizer_id` is UUID (LINE id can't go there — use `organizer_name`); NOT NULL = id, title, event_date. The 06-04 JGTS ID migration is what made this resolve cleanly.
- STILL PENDING (Pete asked): auto-version — Erik's non-TRGG rounds auto-become JGTS events.

## Community leaderboard collapse (dcd03cff)
Pete: most people don't know they can collapse the leaderboard, so they scroll past it to reach Play Golf / Society.
- Replaced the tiny grey chevron on the LEADERS ticker with a clear yellow **"Hide ▲" / "Show ▼" pill** (`leaderboardToggleLabel`).
- Collapsed state now **persists** in `localStorage` (`mcipro_communityLb_collapsed`) and reapplies on load via `applyStoredCommunityLbState()` (DOMContentLoaded) — stays hidden across sessions; tapping the bar still toggles. (Offered default-collapsed-for-everyone; pending Pete.)

## Scheduler Q&A (no code)
Confirmed from code: organizer add = single `society_events` INSERT (`createEvent`), modify = targeted `updateEvent` UPDATE — each one event only, additive. Golfer/society pages subscribe to `society_events` realtime (`postgres_changes`, lines ~35068/64525/111460) → a single event change propagates to the society pages live. Which society page = title-prefix/`society_id` mapping.

## Scheduler week-grid: per-day tee + departure times + layout (f22377c2, 89cb85f5, 785f1915)
The `ScheduleCreator` "Schedule Maker" only had ONE global default tee time (`schedDefaultTee`); every day inherited it. Pete wanted per-day times (they vary), then both tee AND departure, then a tighter layout.
- **Per-day Tee + Departure** `<input type=time>` per day (field ids `_tm`, `_dp`) — desktop = Tee/Dep columns; mobile = a labeled times line. Pre-fill from existing event `start_time`/`departure_time` or the global defaults; `collectEvents` reads each (falls back to default); `copyFromWeek` ("Same as Week") copies both. See [[scheduler-architecture-rules]] for the full field-id map.
- **Layout maximize:** mobile day card rebuilt to 3 lines (Day+Course+Booking / Tee+Dep / Green+Trans+Comp), removed the `ml-12` left indent (killed the empty green strip), made times + fees `flex-1` to fill the full card width — fixed clipped text ("11:00 AM" was "11:00 A"), the orphaned Comp line, and the right-side gap. Widened booking + desktop Tee/Dep columns. Fee select no longer stretches (was the earlier "too wide" gripe).
- Pre-existing CSV import/export column mismatch (import reads fee where export writes tee time) — flagged to Pete, NOT touched.

## Light version — dual-mode (Light vs Geekout) — see memory [[light-version-dual-mode]]
Older players want simple/quick actions; power users keep the full app. Pete's choices: default Geekout (opt into Light) · remember + quick toggle + one-time first-login chooser · synced to profile (across devices).
- **d3d0b55f Phase 1+2 (dashboard).** `window.DashboardMode` controller (get/stored/apply/set/toggle/persist/init/showChooser); a `light-mode` class on `#golferDashboard` drives all hiding via CSS. Light dashboard = 4 tiles (Society Events, Play Golf, Spectate Live [NEW `.light-only` tile], Caddy); `.light-hide` tiles (Tee Time/Food/Orders/History/Messages) + geeky widgets (community ticker, featured caddies, today-tee-time, upcoming caddy bookings, upcoming events, 19th hole) hidden. Header `#dashViewToggle` (Light/Full). Hidden features stay in the hamburger. Choice synced to `user_profiles.profile_data.golfInfo.dashboardView` (persist re-reads + merges, no clobber) + localStorage.
- **d6e0fef6 Phase 3 (live scoring).** Hide `#scSection_games`, `#scSection_stats`/`#statsToggleInRound`/`#statsInputRow`, `#currentPlayerScoreDisplay` (games/PRESS/MATCH/totals); keep hole+SI, names/HCP grid, keypad, live leaderboard.
- **6f483619 trigger + findable toggle.** Chooser only fired on `showGolferTab('overview')` (tab CLICK) — never on login. Now fired from `ScreenManager.showScreen('golferDashboard')`. Added a green "Switch view" item atop the hamburger drawer (`#drawerViewLabel`) since the header button is desktop-only.
- **fe8b7739 hide game-money setup in Light.** Per-game Points (`[id$=PointsSection]` = stableford/strokeplay/matchplay/nassau/master), `#scSection_gamecode`. (Left `#scSection_public` / `#scSection_spectate` — offered.)
- **28a402a4 translations.** `lightview.*` keys added to all 4 dicts (EN/TH/KO/JA); `DashboardMode.tr()` (the app's `t()` + fallback) for chooser/toasts/labels; `data-i18n` on static spans; `updateLanguage()` re-applies dynamic labels.

## Shot tracking + round-details scorecard fixes
- **37d17d06 tee yardage display.** Bug: yardage dropdown only had 5-yd steps, so a tee yardage like 372/388 had no `<option>` and rendered blank (only multiples of 5 like 415 showed) — value WAS stored. Fix: `ydOpts` injects the exact value; `addShot` reads the selected tee marker's yardage (`getSelectedTeeYardage`); removed overlapping "approach" word. (Verified via DB that Pete's Treasure Hill round collected all 18 tee + approach shots tee→green.)
- **d99e78e7 shot tracker for every round.** Round-details Shot Tracking card now renders off shot data alone (par from the shot rows), not requiring round_holes; Approach→GIR% block shows only when round_holes/GIR exist.
- **097f29a4 → 0c5596c3 → 8d2f3116 readability.** Shot list → table. Then the **Hole-by-Hole Breakdown** (Pete: "no stats, too much dead space") — was a `w-full` 22-col table that stretched/overflowed the narrow modal hiding the values (data WAS present in DB). Rebuilt as two compact FIXED-WIDTH tables (Front 9 + Back 9, ~286px, locked 24px cols) in one tbody cell so numbers sit in their cells; Shot Tracking card still inserts after.

## Yardage Book (PGA-style per-hole history) — see memory [[shot-tracking]]
Pete: when replaying a course, show what you hit on every hole + the last score, to beat your last bad score.
- **9788c934 in-play popup → Yardage Book.** Evolved `showShotHistoryHint`: on a hole played before at this course (same tee preferred), shows the FULL tee→green shot chain (every club+yardage, approach highlighted) + the **last score made on that hole** (from that round's `round_holes`: gross+par → Eagle/Birdie/Par/Bogey/Double + strokes, color-coded green/amber/red). Cached per course:hole.
- **0f18d5fa browsable view.** `openYardageBook()` — full-screen card (📖 Book button next to "Live" in the keypad header) listing all 18 holes of the most recent prior round at the course (par · last score chip · full shot chain). Empty-state when none. Pete chose full-chain over a single-round picker. (Also works in Light mode.)
- **37565b52 scroll fix.** Yardage Book body was "sticky at the bottom" — added `min-height:0` + `overscroll-behavior:contain` + `touch-action:pan-y` + safe-area bottom padding (the standard mobile-modal scroll pattern).

## Keypad scoring bug — instrumentation (2d8c9ca2)
Pete: keypad intermittently rejects the score until 4–6 taps, then accepts ("known issue"). Traced the path: `_saving` lock clears SYNCHRONOUSLY in the normal save (DB write is queued/fire-and-forget, no dedup) — so it's an intermittent STUCK state, not a constant code bug. Changes: stuck-lock failsafe **2000ms→700ms** (keypad self-heals fast — that 2s window ≈ the "4–6 ignored taps"); clear `currentScore` on stuck/error paths (no garbage accumulation); **log the real event to `client_errors`** (`kind` = `keypad_locked` / `keypad_saving_stuck` / `keypad_no_scorecard`, with hole+player) so the next occurrence is captured. NEXT: Pete reproduces → I query `client_errors WHERE kind ILIKE 'keypad%'` to pin the root cause. (Offered an on-screen "saving…" flash.)

## OPEN / TODO
- **Keypad bug root cause** — query `client_errors` (kind `keypad%`) after Pete reproduces; the 700ms failsafe is a symptom-mitigation, not the confirmed fix.
- Auto-attribution: round only attaches to a society event the player is REGISTERED for, else their own society (Erik→JGTS). High blast radius — awaiting Pete's narrow-vs-general confirm.
- Light: hide "Make Game Public"/"Live Spectating" in setup (offered); confirm Hole-by-Hole renders for Pete after refresh.
- Default-collapse the community leaderboard for everyone (offered).
- CSV import/export column alignment in the scheduler (offered).
- On-course verification of shot tracking + 2-man team match board (carryover).
