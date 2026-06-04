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

## On-course setup-UI cleanup (Pete testing live at Travellers Rest, via Telegram)
Pete flagged the live-scoring setup PLAYERS box as "a mess / disorganized" while setting up a 2-man team round; fixed in pieces, each pushed + verified live.

- **d24b5579 — Players list reorganized.** `renderPlayersList` rows are now two-line cards: name on line 1 (edit/delete right-aligned), handicap + society/location selector on line 2 (was a ragged single row where the long society dropdown wrapped under some names). Removed the min/max-height cap; widened the hcp/location select (120→240px).
- **8c82559a — Names normalized everywhere.** New shared `formatPlayerName(name)` ("Last, First" → "First Last", display-only, never mutates `p.name`). Applied at every player-name display site: `getPlayerName` (match board / press / settlement), team-assign dropdown (`populateTeamDropdowns`), anchor + round-robin selects, scramble drive/putt selects, aggregate-team selects, press modal options. Fixes inconsistent "Gilbert, Tristan" vs "Pete Park".
- **afba3755 — Team-setup grey-out (standard).** `refreshTeamDropdownAvailability()` disables + lightens (`#94a3b8`) any player already chosen in another team slot across teamA/teamB player1/2 selects, so the same player can't be picked twice. Runs on every change via `validateTeamSelection`. The "configured correctly/not" validation is unchanged.
- **bb750f2e — Grey-out extended to anchor team (5–6 players).** Generalized `refreshTeamDropdownAvailability(ids)`; `updateAnchorMatchPreview` calls it for `anchor_player1/2`. Round-robin left as-is (opponents model ≠ exclusive team slots) — offered to extend if Pete wants.

Process note: this whole batch was done while Pete was on the course via Telegram — non-blocking, each fix shipped + confirmed back on Telegram per [[no-blocking-questions-on-telegram]].

## Erik Lundman / JGTS — data fixes + ID migration (DB-only, no commits; Pete via Telegram from the course)
Erik Lundman (golfer/LINE id `Ud6ad7cf92502b449c38538cf358b21d6`), JGTS organizer. See memory [[JGTS-society-+-Erik-Lundman]].

- **Handicap → 3.7 for all societies.** His `society_handicaps` universal row was 12.0 (the bad number), TRGG row 3.0; set to 3.7. (Non-MANUAL society rows can get recalculated back — universal/MANUAL is what sticks.)
- **Round recompute.** His Pattaya County Club round (id `0a53d1d4…`) had been wrongly auto-attached to the unrelated "TRGG – Phoenix" event (different course, 0 registrants) → it pulled the universal hcp 12. Recomputed at playing handicap 4 (Net 78, 30 pts) and re-tagged round+scorecard to JGTS (`primary_society_id`=JGTS, cleared the bad `society_event_id`/scorecard `event_id`).
- **Profile header fix (real source).** The dashboard header "<society> · HCP" reads the PROFILE, not society tables: `user_profiles.profile_data.golfInfo.homeClub` + `golfInfo.handicap` (string), via cached `AppState.currentUser` (needs login/refresh). Erik's were "Travellers Rest Golf Group" / "3.0" → set to "JGTS - Jomtien Golf & Transport" / "3.7". Also set his JGTS `society_members` row `is_primary_society=true`.
- **JGTS ID consistency migration.** JGTS had two ids: `societies`=`15f5d76e…` vs `society_profiles`=`eb3294e2…` (TRGG matched in both; JGTS didn't). Made `eb3294e2` canonical (gameplay tables already use it). FKs to `societies` are NO ACTION/non-deferrable and `societies.name` is UNIQUE, so: temp-renamed old row → inserted copy under eb3294e2 → repointed 2 society_events + Erik's society_member → deleted old row, atomically. Verified integrity; only those 3 rows referenced the old id. **Two parallel society tables: `societies` (FK'd by society_events, society_members) vs `society_profiles` (FK'd by rounds/handicaps/round_societies/leaderboards/tournament_series) — must share one id per society.**
- **JGTS quick-switch: already works, no code.** `isUserOrganizer()`/`quickSwitchToOrganizer()` (Jason/JOA feature) are generic ownership checks on `society_profiles.organizer_id` — Erik owns JGTS, so the "Switch to Organizer" button + no-PIN jump into the JGTS dashboard already apply to him.

## OPEN / TODO (carryover)
- **Auto-attribution rule (Pete asked, not built):** a round should only attach to a society event the player is REGISTERED for; otherwise attribute to the player's own society (Erik's non-TRGG rounds → JGTS). Root cause of the Erik mis-attach above. Core attribution logic = high blast radius; build + verify carefully. Awaiting Pete's narrow-vs-general confirm.
- On-course verification of shot tracking (play+save a round → round card + recall popup) and the 2-man team match board with two pairs on separate phones + a spectator.
- Society-event audit logging; make CI a hard deploy gate; payments/PII audit (deferred). 2-phone live test of Phase-3 press/settlement.
