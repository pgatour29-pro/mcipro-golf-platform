# Session Catalog — 2026-06-01 (Green Valley round day)

All work in `public/index.html` unless noted. Deploys via Netlify on push to `master` → **mycaddipro.com** (every change below was pushed and verified live by polling the served file). DB = Supabase `pyeeplwsnupmhgbguwqs`.

---

## 1. NEW FEATURES — Golf side-game settlement (Press system)

### Phase 1 — Per-player points (all games) — commit `ac912348`
- "Individual games" checkbox in each game's config (shows when ≥2 players). OFF = one shared stake (original); ON = each player gets own Front/Back/Total (or Flat / Skins-per-hole).
- New `gameConfigs[format]` fields: `individualPoints`, `perPlayerPoints`. New methods `toggleIndividualPoints`, `setPerPlayerGamePoints`. Persists via `saveRoundState`.

### Phase 2 — Live Press tracking (single-device) — commit `ac912348`
- Green ⚡PRESS button on the running-totals card (Nassau / Match Play). Modal to call presses: caller, opponent, scope (front9/back9/total), type (newgame from hole / double the side), start hole. Unlimited presses, each with live standing via `GolfScoringEngine.calculateMatchPlay1v1` over the press hole-range. Read-only of scores; additive.

### Net settlement total — commit `24ad6685`
- `computeSettlement` + `renderSettlementSummary`: per-player running net at top of Press modal, live.

### Group-game layer (Master Points) — commit `b0f47d04`
- Pete clarified the model: **Master Points = the GROUP game** (whole group always plays the pot) and **Individual games = per-player side bets** — they run SIMULTANEOUSLY, not either/or.
- Settlement now buckets net into **Group / Indiv / Press** with chips + detail lines. `getGroupScopeStake` (Master Points via `window.getMasterPoints`/`isMasterPointsActive`, else shared points), `getIndividualScopeStake`.

### Phase 3 — Cross-device press + settlement — commit `7c6f8cb1` (BUILT, NEEDS 2-PHONE TEST)
- New DB tables `game_presses` (row per press, soft-delete via `active`) + `side_game_config` (event_id PK, jsonb stakes snapshot). RLS mirrors house `tmp_select/insert/update` for anon+authenticated (no delete); both added to realtime publication.
- Settlement helpers route through `this._shared` cache (loaded by `loadSharedSettlement(eventId)` from scorecards+scores+side_game_config+game_presses); falls back to local when null → **single-device unchanged**.
- Host publishes stakes via `publishSettlementConfig` on startRound / config setters / press-modal open. `addPressFromForm`/`removePress` write to game_presses; joiners can press. `subscribePressRealtime` refreshes the open modal live. Shared key = `event_id`.

---

## 2. UX / LAYOUT FIXES
- **Move Society + Players above Games** — `640e308e`. Round setup reorder: Event → Course → Society(handicap) → Players → Starting Nine → Games (so players/handicaps are set before picking games).
- **Per-player points box contrast** — `a7e77af1`. Dark-theme the Individual-games boxes (were washed-out light bg). White player name, light labels, dark inputs.
- **Live leaderboard scroll sticking** — `14bd06da`. Rebuilt sheet as flex column (`flex:1; min-height:0` body) + `-webkit-overflow-scrolling:touch` + `overscroll-behavior:contain` + safe-area bottom padding. No more stuck-at-bottom / background-drag.

---

## 3. BUG FIXES
- **Handicap selector showing "Uni" for a society member** — `ab7c8558`. In a society round, when a player has a recorded handicap for it, the dropdown now selects that society's option (was letting "Uni" grab the selected flag when the numbers tied). Handicap value used was already correct; only the label was wrong. (Triggered by Tom Britt showing "Uni 9.5" in a TRGG event.)
- **Live leaderboard excluding a player** — `4dc4ad68`. Leaderboard filtered scorecards to `created_at >= today`; Pete's card for the event was created the **prior day** so he was dropped while partners showed. `event_id` already scopes the round → widened to a 48h window.
- **Accidental round finish on last hole** — `8aff4e79` then strengthened `d6226d15`. `nextHole()` on the final hole was silently calling `completeRound()`. Now counts unscored holes and confirms explicitly ("You still have N holes without scores…"), never silently ends, directs to the green Finish Round button on cancel. Verified END = abandon (not saved), Finish Round = official save — unchanged.

---

## 4. DATA FIXES (Supabase, via CLI, transactional)
- **Tom Britt duplicate profiles merged** — kept real profile `TRGG-GUEST-0118` (held all 10 rounds / 14 scorecards / handicap history), set handicap to **8.6** on both universal + TRGG rows, deleted empty duplicate `TRGG-GUEST-1122` (was 9.0). NOTE: Pete first said "delete the 9.5 one" — surfaced that the 9.5 profile was actually the real account before acting; then he said "combine it."
- **Posted missing hole 18** — the Green Valley round was finished early (next-tap bug) with all 4 cards completed on 17 holes, hole 18 blank. Inserted hole-18 scores from Pete's input (par 4, SI 12, no strokes for any: Pete 5→1pt, Billy 6→0, Tom 4→2, Erik 4→2) and bumped each `rounds` row to 18 holes. Final: **Pete 36 (won by 1), Tom 35, Billy 32, Erik 29.**

---

## 5. DB SCHEMA ADDED
- `game_presses`, `side_game_config` (see Phase 3). RLS + realtime configured.

---

## 6. INVESTIGATIONS / ANSWERS (no code)
- **Multi-device scoring model**: scorecards unique per (event_id, player_id) — `createScorecard` reuses existing; scores upsert on (scorecard_id, hole_number) = silent last-write-wins; no live cross-device UI sync; best practice = each player's card written by one device. (See `reference_round_data_model` memory.)
- **"Join the games"**: public Side-Game Pools (`side_game_pools` + `pool_entrants`, "Make Game Public" + "Join Side Games"). Joining is metadata only; each player scores themselves; pool leaderboard merges across groups. Corrected an earlier wrong claim of "no join mechanism."

---

## 7. COMMITS (chronological)
| Time (ICT) | Hash | Summary |
|---|---|---|
| 07:49 | ac912348 | Per-player game points + live Press tracking |
| 08:08 | 24ad6685 | Live net settlement total |
| 08:17 | 640e308e | Move Society + Players below Course |
| 08:26 | ab7c8558 | Handicap selector 'Uni' vs society fix |
| 09:21 | a7e77af1 | Per-player points box contrast |
| 09:49 | b0f47d04 | Group-game (Master Points) settlement layer |
| 11:36 | 4dc4ad68 | Leaderboard prior-day exclusion fix |
| 13:54 | 8aff4e79 | Last-hole finish confirmation |
| 17:15 | 7c6f8cb1 | Phase 3 cross-device press + settlement |
| 17:30 | 14bd06da | Leaderboard scroll fix |
| 17:39 | d6226d15 | Strengthen last-hole finish guard |

---

## 8. PART 2 (afternoon) — cross-device generalization + leaderboard model + FAQ
| Time (ICT) | Hash | Summary |
|---|---|---|
| 19:03 | 64593e3a | Casual (non-event) cross-device sync by course+local-date (`getSettlementKey`) |
| 19:11 | 426e490b | Non-event live leaderboard = open course+date tournament (all non-event players) |
| 19:17 | f30c0831 | Optional 4-digit Game Code separates casual betting groups (`scorecards.game_code`) |
| 19:22 | 1b528092 | "How it works" FAQ panel on the New Round screen (openGolfHelp/closeGolfHelp) |
| 19:37 | 1261ec77 | FAQ translated into all 4 languages (en/th/ko/ja) with in-panel language switcher; defaults to mci-pro-language |
| 21:49 | 4f2248cd | Hole-by-hole Match Progress board (popup) for match play + 2-man teams |
| 22:09 | 6018359a | Leaderboard scroll fix (85vh + touch-action) + 🏁 Match tab inside Live Leaderboard |
| 22:3x | 20725989 | Match board shows Front 9 / Back 9 / Overall as independent Nassau-style results (margin freezes at clinch; back-9 resets) |
| 22:4x | c3af2769 | Open course+date leaderboard dedup → keep MOST RECENT scorecard per player (was most-holes, so an earlier same-day run overrode the current round). Also abandoned 2 stale test rounds at pattaya_county. |

**Match board access + leaderboard scroll (6018359a):** Live Leaderboard sheet → 85vh (was 50vh) + `touch-action:pan-y` on vertical body and `pan-x` on inner hole tables (fixes vertical-swipe hijack). Added 🏆 Leaderboard / 🏁 Match toggle inside the Live Leaderboard popup (Match tab only when matchplay active) since the standalone button was easy to miss — `setLeaderboardView`/`renderLbToggle`, reuses `buildMatchProgressBody()`.

**Match Progress board (4f2248cd):** blue "MATCH PROGRESS" button on live totals card (when `matchplay` active) → popup `matchProgressOverlay`. 2-man teams use `GolfScoringEngine.calculateTeamMatchPlay(t1,t2,holes,useNet,useStableford,gameMode).holeResults` (W/L/AS per hole, overall/closedOn); team mode read live from `input[name=teamGameMode]:checked`. Singles/round-robin = one grid per pair via net per-hole compare. Shows per-hole net A/B, hole winner (A/B/½), running status (X UP thru N / DORMIE / X & Y / All Square). Refreshes live via updateCurrentRoundDisplay. Methods: renderMatchProgressBody, _renderMatchGrid, renderMatchEntryButton, open/closeMatchProgress.

Model now: **society event** = isolated leaderboard + settlement (event_id); **non-event** = open course+date leaderboard for everyone, with optional 4-digit game code to keep betting pools separate. Press/settlement key = event_id OR `course:<slug>:<date>[:<code>]`. DB: added `scorecards.game_code`.

## 9. OPEN / TODO
- **2-phone live test of cross-device** (event OR casual — couldn't simulate from dev env).
- Optional: multi-device press accept/decline flow (currently one-tap registers; no accept step).
- Known casual caveat (mitigated by game code): without a code, all non-event players at a course/date share one betting pool.
