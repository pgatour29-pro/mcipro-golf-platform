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

## OPEN / TODO
- Auto-attribution: round only attaches to a society event the player is REGISTERED for, else their own society (Erik→JGTS). High blast radius — awaiting Pete's narrow-vs-general confirm.
- Default-collapse the community leaderboard for everyone (offered).
- CSV import/export column alignment in the scheduler (offered).
- On-course verification of shot tracking + 2-man team match board (carryover).
