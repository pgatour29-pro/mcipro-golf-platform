# Session Catalog — 2026-06-10 (into 06-11)

`public/index.html` unless noted. Deploy: push master → **Vercel** → mycaddipro.com (parse-check via inline-`<script>` `new Function`; verify live by polling a unique marker). DB = Supabase `pyeeplwsnupmhgbguwqs` via `npx supabase db query --linked -f file.sql`. Pete iterating live via Telegram (chat_id 8695972914), often angry; reply via the Telegram reply tool. Pete = "Pete Park" = LINE id `U2b6d976f19bca4b2f4374ae0e10ed873`.

## ⏳ OPEN / RESUME HERE — "Society Events" button dead at bottom of dashboard
Pete: on the main golfer dashboard, the **Society Events** card doesn't respond to taps **when scrolled to the bottom**; scrolling up ~halfway makes it work. Only Society Events affected.
- **Established:** Pete on **Android** (screenshot 1781086963185-AQADiRBrG-JVSVV-.jpg), **FULL dashboard** (Coming-Soon cards visible). Card grid = `#dashboardCubesGrid` (`grid grid-cols-2 lg:grid-cols-4`, ~line 37280s). Society Events card = `showGolferTab('societyevents', event)` at **line 37323** (row 1, col 4 / right). Row 2 (Play Golf, History, Messages) **WORKS**. So the blocker sits at **row-1's screen position (right side)**, NOT the bottom edge. The other 3 row-1 cards (Tee Time/Caddy/Food) are all "Coming Soon" → Pete never taps them → looks like "only Society Events."
- **Ruled out:** LEADERS ticker `#communityStatsTicker` (~37006) + `#communityLeaderboard` (~37026) collapse via clean `display:none` (`toggleCommunityLeaderboard` ~37251). `returnToScoringBanner` (fixed bottom:70px center, ~36716) only shows when `#golferDashboard.round-active` — Pete has NO active round (Hermes round completed). `globalScrollToTopBtn` (fixed bottom:16px right:16px, 40×40, z-9999, pointer-events:auto, ALWAYS on, ~124756) + `dashboardBackBtn` (fixed bottom:16px, pointer-events:none, ~124797) are at the very bottom (over row 2 Messages), not row 1.
- **Leading theory:** a transparent element eating the tap over row-1-right (Pete said "does not respond" = no visible reaction, which argues against the leaderboard-toggle or scroll-top button since those give feedback).
- **WAITING ON PETE (asked, msg 4036):** when stuck, tap Society Events — does NOTHING happen / LEADERS bar toggles / page jumps to top? That answer identifies the exact blocker (transparent overlay vs ticker vs scroll-top FAB). **Resume by reading his answer, then fixing that one element.** Likely fixes: add bottom clearance / fix the offending fixed element's pointer-events or z-index.

## JOA dashboard — organizer access + full data audit (DONE)
See [[joa-society-setup]] for the deep detail. Summary:
- **Organizer tab missing (Jason Kang):** tab visibility = `society_profiles.organizer_id === logged-in lineUserId` (role irrelevant; `quickSwitchToOrganizer` grants on the fly). I FIRST wrongly repointed JOA to account "Jason" (`U421d507…`) — that's actually **강 동주**, a different person. Jason Kang's real account = **`Udb12b92d028efee5a017a03a6c4c1ad4`** (username "Pattaya JOA golf", player_name "Jason Kang"). REVERTED. **Match identity by player_name, NOT username.**
- **Root data bug (the big one):** JOA's `society_profiles.id` (`72d8444a`) ≠ its `societies.id` (`0f5472a5`). INVARIANT: those must match (TRGG/JGTS both do; JOA was the only break). All real data (19 members, 93 events) lived under `0f5472a5`; the profile + 7 handicaps under `72d8444a` → every society_id-keyed tab (Players Directory, Scoring) read empty. **FIX:** migrated the profile to `0f5472a5` (clone w/ temp organizer_id → move 7 handicaps → delete old → set organizer_id=Udb12b92). Verified ids_match=true, 1 profile, 19 members/7 hcp/93 events aligned. **No `society_events` writes → no LINE notifications.**
- **Scoring tab code fix (deployed):** `OrganizerScoringSystem.loadEvents` (~118975) was filtering events by `society_id`; now by TITLE PREFIX ('JOA Golf'/'TRGG -'/'JGTS') like Events/Rounds tabs.
- **Standings tab** genuinely empty (no season/leaderboard configured for JOA — not a bug; offered to set up).
- Also: purple "My Society" drawer button (~122094) → green ([[no-purple]]).
- **TYPE GOTCHA (bit me 3×, caused false "0/none"):** `scorecards.event_id` TEXT vs `society_events.id`/`rounds.society_event_id` UUID — empty Supabase result may be a silent 400 type error; always grep for ERROR. `society_members.society_id` FKs to `societies` (not society_profiles).

## Earlier 06-09 work (context, all DONE/deployed)
- Caddy notebook: stop saving under stale course + default My Caddies to notebook view. [[ios-safari-stale-form-values]]
- Public 2-man team matchplay: hide Team B + warning when public & <4 players; with 4 players enter BOTH teams into the pool; auto-tick Team Match Play pool. [[press-and-per-player-points]]
- Press "false ALL SQUARE": back-nine press saved as scope=front9 + start_hole=17 → empty segment → 0 holes → ALL SQUARE. Fixed: auto-snap scope to hole's nine, clamp `getPressBounds`, default modal scope, clearer Remove button. Handicap/SI verified correct (net vs gross). [[press-and-per-player-points]]
- Team match LIVE scoring-mode switcher (tiebreaker/halves/combined) on the match board (`setTeamGameModeLive`); Pete's groups play `bestball_tiebreaker` (default is halves). [[press-and-per-player-points]]
- Shot tracking blank-club guard: red club box + inline warning + Finish checkpoint (`goToHole`). [[shot-tracking]]
- Hermes: Pete's pre-feature Hermes rounds (last June 3, tracker launched June 4) had no shot data; his **June 10 Hermes round logged 41 shots / 18 holes / 41 clubs / 40 notes** — confirmed guard works in prod.

## Pending / carryover
- Society Events button bug (above) — TOP priority on resume.
- JOA season standings — offered to configure if Pete wants.
- Duplicate player records (Manuel, Jason Kang has a MANUAL dup) — merge cleanup someday.
- Per older catalogs: booking/caddy realtime scoping, LINE push on promotion, Erik→JGTS auto-attribution.
