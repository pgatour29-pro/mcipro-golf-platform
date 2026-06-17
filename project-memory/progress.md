# progress — project diary

> Dated log of what happened, what changed, and what should happen next. Newest first.
> (Earlier entries are reconstructed from project memory and may not be exhaustive.)

## 2026-06-17
Bug fixes + documentation.
- **Event registration "roster bleed" fixed** (`dcad63b7`). Symptom: open an event that has registered players (e.g. you + a partner), then move through other events — your names carried over and appeared in every following event, including ones with no registrations, until a refresh. It was a **display bug only** — the database was correct (verified: 112 genuine registrations, mostly TRGG/JOA events actually played). Cause: `loadRegisteredPlayers()` stored the roster + "View All Players" button in memory but bailed out early on events with zero players *before* clearing them, so the previous event's data persisted. Fix: reset the stored roster + hide the button at the start of every event open, plus a guard so a slow-loading roster can't render into the wrong event during fast tap-through. Verified end-to-end (St Andrews → Phoenix → Greenwood all clean).
- **Organizer Lite back button fixed** (`422849d6`). Tapping a cube then the bottom-left back button dumped organizers to the login screen (two overlapping back buttons; the golfer one unwound the nav history out of the dashboard). Now back returns to the 5-cube home; only the home itself exits, cleanly, to the golfer dashboard.
- **Lite caddy picker** (`883e706f`): moved the "Add a caddy (new/not listed)" box to the top of the caddy popup so it's visible without scrolling past the full list; saves to your caddy directory + assigns.
- **Master platform catalog added** (`1b171b5c`): `CATALOG.md` — full inventory of every screen, feature system, DB table/RPC/edge function, integration, and tool. Linked from the README.

_Next:_ decide repo-privacy question (project-memory lives in a public repo — no secrets, but documents architecture); then `loadMySocieties` (missing `society_name` column).

## 2026-06-14
A full day on the golfer **Light version** plus tooling. 17 commits shipped (full detail in `../CHANGELOG-2026-06-14.md`). Highlights:
- **Course scoring:** mid-round back-9 change for Plutaluang, then generalized to all multi-nine courses with a dropdown picker.
- **Ryder Cup module retired** (event finished) and archived as a reusable template.
- **Light overview redesign:** 2×2 cubes (Handicap / Society Events / Schedule / Play Golf); weather moved to the hamburger menu. Light-only — Full dashboard unchanged.
- **Schedule cube + "My Schedule" popup:** shows the next event (course, big departure time, tee), using the phone's local clock; past tee-times drop off.
- **Caddy assignment from the schedule:** course-aware caddy list (full roster + manual entry), prominent Remove/reassign, society shown, scroll-trap fixed.
- **Header society:** now shows the golfer's society (from membership) instead of the home course.
- **Light version fully translated** to EN/TH/KO/JA.
- **Architecture map** made fully self-contained so it opens on mobile Chrome.
- **Data fixes:** restored Pete's Pattaya CC (Jun 15) caddy to 26; set his society affiliation (Travellers Rest Golf Group) as primary.
- **Set up this project-memory vault** (README/STATUS/progress/decisions).

_Next:_ fix `loadMySocieties` (missing `society_name` column), then pick the next item from STATUS.md.

## Earlier milestones (from memory — approximate)
- **2026-06-08** — Ryder Cup page un-hidden (TRGG-id detection bug fixed); TRGG schedule corrections.
- **2026-06-05** — Light/Geekout dual-mode launched for the golfer dashboard + live scoring; per-society multi-language system (Korean as the test bed).
- **2026-06-04** — Shot tracking went live (per-shot club + yardage, approach→GIR%, recall popup).
- **Ongoing before that** — Press + per-player points game; pin-sheet system; course-selection dropdown (strict venue model); booking/waitlist auto-promotion via DB triggers; RLS Phase 1 (deletes blocked).
