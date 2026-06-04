# Session Catalog — 2026-06-03

All in `public/index.html` unless noted (deploy: push to master → Netlify → mycaddipro.com; every change verified live by polling the served file). DB = Supabase `pyeeplwsnupmhgbguwqs`.

## "Vibe-coder pitfalls" hardening (#1 test suite, #2 observability; #3 payments/PII deferred)
- **371b8d7a** — **Scoring test suite.** `tests/loadEngine.js` extracts the REAL `GolfScoringEngine` (+ `window.toPlayingHandicap`) out of index.html by string markers and evals in a vm sandbox — tests the exact shipped code, no copy/build. `tests/run.js` asserts known-correct scenarios (Stableford pts, handicap allocation incl. plus handicaps, Nassau, Stableford totals, Match Play 1v1 clinch + AS, 2-man team best-ball, Skins). `npm test` (zero deps). CI `.github/workflows/test.yml` runs on every push to master (red ✗ flags a broken calc; does NOT hard-block Netlify deploy yet). **Run `npm test` before scoring changes.** Later grew to 21 tests (added team tie→halve vs tiebreaker).
- **5b8b94d7** — **Observability.** New `client_errors` table (RLS anon+auth select/insert, no delete). `window.logClientError(kind,{message,stack,source,extra})` records crashes with user/role/screen/UA, dedup (30s) + 30/session cap + localStorage offline buffer, fully guarded. Wired into the global `error`+`unhandledrejection` handlers (~line 17311, previously console-only). Sentry/posthog are package.json deps but NOT wired in.
- **f0582a85** — **In-app Error Log viewer**: Admin → "More" → Error Log (`ErrorLogViewer`). 24h/7d/showing counts, kind filters, "most frequent" grouping, list with relative time + user/role/screen + expandable stack.
- See memory [[testing-and-observability]].

## Organizer quick-switch
- **462306f5** — One-tap organizer switch from the golfer dashboard. The "Organizer" button now calls `quickSwitchToOrganizer()` (no Society tab, no society picker, NO PIN — owner is verified by owning the `society_profiles` row; sets verified flag). `isUserOrganizer()` now detects organizers by society ownership (not PIN). e.g. Jason Kang (JOA, `Udb12b92d028efee5a017a03a6c4c1ad4`) taps Organizer → JOA dashboard instantly; "My Golfer Profile" goes back. PIN path untouched as fallback.

## 2-man team match play
- **3e84ad17** — Default team mode → **Best Ball Halves** (tied holes push/halve, the standard rule), not the 2nd-ball tiebreaker. Radio default + all `teamGameMode` fallbacks switched. Added regression tests. (Diagnosed Pete's "1 down should be all square" via the test harness — it was tiebreaker mode losing hole 1.)
- **2460e934** — **Reliable mid-round handicap fix.** Old inline editor's `recalculatePlayerScores` was broken (bailed on `!this.roundId`, queried scorecards by `round_id` — never matches live scorecards keyed via `this.scorecards[playerId]`), so handicap edits never persisted. New `fixPlayerHandicap` updates the player obj + EVERY gameConfig handicap map, recomputes DB scores via the right scorecard id, resets `_shared`, saves, refreshes. "Handicaps — tap to fix" chip row added to the Match board (teams + singles) → `promptFixHandicap`. **Recurring trap: the live match board reads the LOCAL cached handicap — a DB-only fix won't change it; must tap-to-fix on-device.**

## Pin indicator
- **8e9c93fc** — Removed the pin position TEXT (only green + red dot now; text was blocked by the Hole Layout button and clipping the hole info). Fixed the red dot not showing: the no-pin branch set `display:none` and the pin branch never reset it, so once a no-pin hole hid the dot it stayed hidden. Now always reset visible + derive x/y from the position label (`parsePosition`) when coords are missing.

## Data fixes (SQL)
- **Tom Britt handicap 8.6 → 8.4** (both universal + TRGG `society_handicaps` rows). Then recomputed his live Bangpakong/match round scorecard at playing handicap 8 (loses the SI-9 stroke on hole 6; net/strokes/Stableford recomputed). NOTE: live match board on Pete's phone still reads cached 8.6 until tap-to-fix or round reload.

## Diagnostics / answers (no code)
- TRGG Ryder Cup 2026 "who updated it": event was CREATED 2026-06-03 ~08:46 Thailand; `updated_by` null + no activity_logs entry → app doesn't stamp who; organizer_name = "Derek". Offered to add society-event change-logging (audit gap — pending Pete).
- Verified the team match via the engine: with Tom 8.4 + halves, Pete & Jason won 5 UP.

## OPEN / TODO
- Society-event audit logging (who created/edited/deleted) — offered, pending.
- Make CI a hard deploy gate (currently flags only).
- Payments/PII audit (#3) — deferred per Pete.
