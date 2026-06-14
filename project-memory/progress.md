# progress — project diary

> Dated log of what happened, what changed, and what should happen next. Newest first.
> (Earlier entries are reconstructed from project memory and may not be exhaustive.)

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
