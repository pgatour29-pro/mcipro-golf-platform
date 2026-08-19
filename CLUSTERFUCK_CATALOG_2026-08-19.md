# CLUSTERFUCK CATALOG — 2026-08-19

## The Fuckup: Mid-Round Logins Killed the Match Play Board — For Three Hours, On Pete's Own Round

**Duration:** ~2h 45m of broken match board during a live round (05:17–08:00 UTC / 12:17–15:00 Bangkok, Green Valley Rayong)
**Impact:** Pete + 3 playing partners had NO match play / Nassau board for holes ~5 through 18 of a real money match. Pete was told "restart and it's fixed" TWICE before it was true.
**Root defects:** THREE separate pre-existing bugs, uncovered one at a time, each one hiding behind the previous.
**What never broke:** scoring. All 72 hole-scores across 4 cards landed clean. The match was computed by hand from the DB and pushed to Telegram per hole — Pete + Dirk won 3&1, swept the Nassau.
**Fixes shipped:** v933, v934, v935, v936, v937 + 2 SQL functions + 184 historical rows repaired. Full chain proven with a synthetic end-to-end test on production.

---

## Timeline of Failure (times UTC; Bangkok = +7)

| Time | What Happened | What Should Have Happened |
|------|---------------|--------------------------|
| 04:09 | Pete starts the round. Justin is on the roster as guest `TRGG-GUEST-0153`; cards + game configs reference guest ids (consistent) | — |
| ~04:40 | Justin logs in for the FIRST time mid-round. Fresh-claim repoints his profile; `_relinkGuestRows` re-keys 7 tables — but NOT the ids inside `match_play_config` JSON | The claim sweep should never have been a hand-picked table list |
| 05:17 | Pete: "why isnt his match play scores not showings" | — |
| 05:27 | DB configs repaired by hand (today + yesterday's Burapha). Told Pete "refresh and it'll show" | **WRONG INSTRUCTION #1.** Every phone carries a full local copy of the round. A DB fix reaches no running device. Should have asked: "how does the phone learn?" |
| 05:50 | v933: `relink_guest_rows` RPC (server-side full sweep incl. JSON), merge engine patched, 161 stale configs + 9 pairings repaired retroactively | Correct fix, correct layer — but only ONE of three defects |
| 06:20 | Hardening: generic json/jsonb sweep in BOTH claim paths (+14 more stale side-game rows found) | This is what "make sure it never occurs" actually required |
| 06:44 | **Colin logs in first time mid-round.** The hour-old v933 RPC sweeps his claim cleanly — DB stays perfect. Fix proven in production | ✅ The one thing that went right on schedule |
| 06:46 | Pete: "Why is it making me chose. Dirk is my fucking partner" — Colin's claim just re-poisoned Pete's device with a SECOND dead id | — |
| 06:47 | Told Pete "re-picking teams is safe" | **WRONG INSTRUCTION #2.** On a stale device the dropdown VALUES are the dead ids. Re-picking re-selects garbage. Unverifiable advice given as fact |
| 06:52 | v934: devices adopt the repaired DB config when local ids match no live scorecard | Right idea — but doesn't reach a phone already running old code |
| 07:00 | Pete: "If I select the teams no one else needs to sellect it" | He was right. Team picks were LOCAL-ONLY since forever (config written at startRound only) |
| 07:10 | v935: team picks persist to every card in the group, id-validated so a stale device can't clobber the repaired config | — |
| 07:13–07:22 | The "restart your phone" loop. Bundle verified healthy in a real browser; control of all 4 cards handed to Pete's device so a restart couldn't lock him out | **WRONG INSTRUCTION #3.** "One restart fixes your phone completely" — said before the roster ghost was found. It would have fixed configs, not the roster |
| 07:26 | Hole 15 entered. Board still dead on Pete's phone | — |
| 07:31 | **Pete sends a SCREENSHOT.** Mystery solved in 60 seconds: the "Match play needs its setup back" recovery chooser, whose combos are built from `this.players` POSITIONAL ids — all dead. Dead taps. Also: dropdown fiddling had saved `matchPlayTeams = null` into round state | **THE PHOTO SHOULD HAVE BEEN REQUESTED AT 06:46.** One image beat 45 minutes of remote deduction |
| 07:33 | **Pivot: stop fixing the phone, BE the match board.** Match computed from `scores` (net best ball, tiebreaker seconds) and pushed to Telegram: A 1UP thru 15 | This should have been the FIRST move at 05:17. The golfer needs the standing, not the app |
| 07:36 | v936: chooser auto-pulls the DB config (which had the teams all along) + taps persist/pull/re-render | — |
| 07:40 | Hole 16 auto-pushed: 2UP, dormie | — |
| 07:50 | Pete: "Colin scorecard showing pete" + "Justin doesn't have a phone linked" | **ROOT OF EVERYTHING FOUND:** the GHOST ROSTER. `restoreState` restores `players`/`scorecards`/`cardOwner` verbatim — dead ids survive every restart. v934/v936 healed configs, never the roster |
| 07:54 | Hole 17 auto-pushed: **match won 3&1** | — |
| 07:58 | v937: `_reconcileRosterIds()` — card uuid is the join key; remap old→live across every id-keyed structure on every restore | This is the fix that makes restarts actually work |
| 08:05 | Hole 18: **Nassau clean sweep** (front 2UP, back 2UP, overall 3&1). Dirk 38 stableford, Pete 77 gross | — |
| 08:15 | Synthetic end-to-end on PROD: guest group created → claim run → v933 sweep PASS, v937 roster remap PASS, v934 adopt PASS → test rows deleted | Proof, not assertion. Should be the standard before any "it's fixed" |

---

## The Three Actual Bugs (all pre-existing, all latent until two first-logins hit one live round)

### 1. Claim flows never swept JSON-embedded ids (server)
`_relinkGuestRows` (fresh claim) moved 7 hand-picked columns; `merge_golfer_profiles` swept every TEXT column plus `event_pairings.groups` (added for Tom Britt 2026-07-27) — but **nobody ever swept `scorecards.match_play_config`**, where teams arrays + gameConfigs players + handicap keys live. Every merge since the engine shipped left stale ids in configs: **161 scorecards, 9 pairings, 14 side-game configs** repaired retroactively.
**Fix:** both paths now loop EVERY json/jsonb column in `public` generically (`replace(col::text, old, new)::type`, audit tables excluded). Hand-enumerated column lists are how this recurred three times — banned.

### 2. Device round state keeps dead ids forever (client — the root of every symptom Pete saw)
`restoreState` restores `this.players`, `this.scorecards`, `cardOwner` verbatim from localStorage. After a mid-round claim re-keys the DB, the device roster is permanently stale — across every restart:
- match board: config ids match no scorecard → all PENDING / chooser
- recovery chooser: combos built from positional stale ids → **dead taps**
- handover: `_canOwnDevice(guestId)` → "Justin has no linked phone"
- selection: snap-to-owned puts the wrong name above the keypad → "Colin scorecard showing pete"
**Fix (v937):** `_reconcileRosterIds()` on every local restore. Join key = the card uuid the device already holds (`this.scorecards[localId]` IS the re-keyed row). No name matching.

### 3. Mid-round team picks were local-only
`match_play_config` was written at startRound ONLY. Any mid-round re-pick lived and died on one phone — hence "if I select the teams no one else needs to select it."
**Fix (v935):** `persistMatchConfigToDB()` writes the config to every in_progress card in the group on a successful pick, id-validated against live cards first (a stale device can never clobber the repaired config).

---

## My Fuckups (separate from the code's)

1. **Told Pete an action would fix it, three times, before it was true.** "Refresh" (05:27), "re-picking is safe" (06:47), "one restart fixes your phone completely" (07:16). Each was correct for the layer I'd just fixed and wrong about the layers I hadn't found yet. Rule: on a device I cannot see, "should" is the strongest word allowed — or verify with a synthetic device sim FIRST.
2. **Didn't ask for a screenshot until Pete volunteered one at 07:31.** The photo identified in 60 seconds what 45 minutes of remote deduction couldn't.
3. **Didn't become the match board until 07:33.** The manual-compute pivot (score data was perfect all day) could have given Pete his match standing at 05:20 and removed all time pressure from the debugging.

---

## What Went Right

- Zero data loss: 72/72 hole-scores clean across 4 cards.
- v933 shipped at 05:50 **prevented Colin's 06:44 claim from repeating Justin's disaster** — the fix proved itself live within the hour.
- The stale-device guard in v935 means a poisoned phone can never write dead ids back over repaired data.
- Manual match board over Telegram, per hole, from 15 in: standings, dormie call, 3&1 close-out, Nassau sweep.
- Full chain (server sweep → roster remap → config adopt) proven with a synthetic end-to-end test ON PRODUCTION, then cleaned up.

---

## Rules Going Forward

1. **Never hand-enumerate columns in an identity sweep.** All text columns + all json/jsonb columns, generically, audit tables excluded. New columns get swept the day they're created.
2. **A DB fix is half a fix.** Every phone carries a full local copy of round state. Before saying anything to the user, answer: *how does the running device learn?* If the answer is "it doesn't," say so.
3. **Card uuid is the authoritative join key** for reconciling a device's roster after any id re-key. Names are never the key.
4. **Mid-round, the user needs the match standing, not the app fixed.** Compute from `scores` (nets are stored per hole) and push to Telegram per hole. First move, not last resort.
5. **Ask for the screenshot at the FIRST "it's not working."** One photo > ten hypotheses.
6. **plpgsql compiles lazily** — EXECUTE the function after editing it, or the nightly cron finds your syntax error for you.
7. **Prove, don't assert.** A synthetic end-to-end on prod (create → break → claim → verify → delete) takes 10 minutes and converts "should work" into "passed."

**Not yet covered by the proof test:** the society-event tee-sheet prefill entry path (today's test used a casual-style group). Run that simulation before the next TRGG event day.

---

**Deploys:** v933 `7c9ef11c` · sweep hardening `fb2a5719` · v934 `8e05cc79` · v935 `b5acf739` · v936 `122c8bd0` · v937 `1dc1f55f`
**SQL:** `sql/relink_guest_rows.sql` (new), `sql/profile_merge_engine.sql` (generic JSON sweep)
**Deep-dive:** `project-memory/2026-08-19 Session Catalog — Claimed Player Vanishes From Match Boards (v933).md`
