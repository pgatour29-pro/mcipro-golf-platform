# Session Catalog — 2026-06-04

All in `public/index.html` unless noted (deploy: push to master → Netlify → mycaddipro.com; every change parse-checked + `npm test` 21/21 + verified live by polling a unique marker). DB = Supabase `pyeeplwsnupmhgbguwqs`.

## Shot tracking (new feature, full chain) — see memory [[shot-tracking]]
Pete's spec: capture every shot to the green (club + yardage), view per hole on the round/event card, approach-yardage→GIR% stats in 25-yd buckets, and a recall popup next time at the same course/yardage. Choices: **standard club set · 5-yd yardage steps · every shot to the green**.

- **New `shots` table** (SQL): `id, scorecard_id, round_id, player_id, course_id, hole_number, par, shot_number (1=tee), club, yardage, tee_marker, created_at` + house RLS (anon+auth select/insert/update/delete) + UNIQUE(scorecard_id,hole_number,shot_number) for upsert.
- **525f1ca0 — Phase 1 (entry).** Collapsible "🏌 Shots to green (n)" section in the live stats panel (`renderShotsHtml`): per shot a club `<select>` (`getClubList`: Dr,3W,5W,7W,Hyb,2i–9i,PW,GW,SW,LW) + yardage `<select>` (5→600 step 5). Tee shot yardage auto-fills from the hole yardage; the regulation/approach shot (par−2) is highlighted green. Stored in `statsCache[hole].shots`. Methods add/set/remove/toggle. `saveRoundToHistory` upserts each shot (logged-in user, gated by Track Stats).
- **3a672453 — Phase 2/3 (round card).** `viewRoundDetails` loads the round's shots → "Shot Tracking" card under the scorecard: per-hole `club yardage › …` line (approach green) + **"Approach → GIR %"** buckets `<50,50,75…225,250+` (25-yd), each pct + made/total.
- **169d934b — course rollup.** Second block on that card: the golfer's approach→GIR% across ALL their rounds at that course (joins GIR from round_holes per round+hole), labelled with round count.
- **53f7c499 — Phase 4 (recall popup).** `renderHole` shows a dismissible "📋 Last time here: Tee Dr · Approach 7i (155y)" banner from prior rounds at the same hole (prefers same tee marker); cached per hole, dismissal persists per hole.

## Match board — 2-man team hole-by-hole + cross-device — see memory [[press-and-per-player-points]]
Pete: the Live Leaderboard → Match view shows 1v1 hole-by-hole but 2-man teams only showed Front/Back/Overall. Verified via the test harness that the engine returns full team `holeResults`; root cause was data, not rendering.

- **28af0478 — cross-device scores.** `buildMatchProgressBody` read scores only from local `scoresCache` (device user's group, not opponents on other phones) → every hole "missing a player" → PENDING → filtered → empty grid. Fix: `loadMatchScoresFromDB()` pulls every match player's scores from the DB (same event/course/group scope as the leaderboard) into `_matchScoreOverride`; `getMatchScoreSource()` prefers it. Awaited in the leaderboard Match branch + `openMatchProgress`. Team grid now shows each hole's team best-ball + who won, like 1v1.
- **f6da9f18 — config sync for non-host viewers.** `loadMatchConfigFromDB()` fills `matchPlayTeams`, `teamGameMode` (→ `matchPlayTeamGameMode` fallback), `roundRobinMatches`, per-game handicaps from `scorecards.match_play_config` — ONLY what's missing locally (early-returns if host already configured; fills only null handicaps) so host tap-to-fix edits aren't clobbered. Score load also captures `player_name` → `_matchNameOverride`; `getPlayerName` falls back to it. Net: any device (host or spectator) sees correct teams/names/handicaps/mode + full hole grid.

## Workflow / process (no code) — see memory [[no-blocking-questions-on-telegram]]
Pete flagged that `AskUserQuestion` is a terminal-only blocking widget — if used while he's away (incl. tasks he starts at the terminal then leaves for the course), the whole session freezes until he's back at the laptop. New standing rule: front-load questions before unattended execution; once executing never block — make reversible labeled assumptions, skip+flag irreversible bits, finish to a safe state; only use the widget when he's actively at the terminal.

## OPEN / TODO (carryover)
- On-course verification of shot tracking (play+save a round → round card + recall popup) and the 2-man team match board with two pairs on separate phones + a spectator.
- Society-event audit logging; make CI a hard deploy gate; payments/PII audit (deferred). 2-phone live test of Phase-3 press/settlement.
