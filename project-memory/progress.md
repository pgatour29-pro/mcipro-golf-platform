# progress — project diary

> Dated log of what happened, what changed, and what should happen next. Newest first.
> (Earlier entries are reconstructed from project memory and may not be exhaustive.)

## 2026-06-20 (later) — Golfer dashboard: live info on the overview cubes (`8f18b85d`)
Pete tried claude.ai/design to mock a new golfer dashboard and hated the output ("looks like shit", "7th grade science project"). Several of my mockups also missed — the real lesson surfaced only when he said **"wrong thing entirely"**: he didn't want a reinvention, he wanted his **real** dashboard improved. I rendered his actual `golferDashboard` from the live code (served `public/` locally + drove it via agent-browser, jumping the login wall with `ScreenManager.showScreen('golferDashboard')`) to see the true target. His precise ask: **leave the Community Leaderboard (it's good); the REST "feels simple"** — make the existing cubes carry their current info and stay clickable, plus group numbers + weather on the tee-time/caddie boxes. **Keep the existing design** (he explicitly rejected my restyle).

**Shipped (deployed + verified live):** new `GolferCubeInfo` module (defined just before `DashboardUpcomingEvents`, ~line 35230) binds each overview cube's pill (`#dashboardCubesGrid`, ~line 37887) to real data — added ids `cubeInfoTeeTime/Caddy/Society/Orders/History/Live` (+ existing `messagesCubeStatus`). Sources: `BookingManager.bookings` (next tee → day/time/course + caddie + group), existing badge counts (society/orders/messages/live), `rounds` table (count + best gross), and Open-Meteo for weather. `TodaysTeeTimeManager` box now shows `{n}-ball` group + live `#todaysTeeWeather`. Wired via the TodaysTeeTime refresh + a `golferDashboard` show hook (~900ms). **Fully defensive** — only overwrites a pill when real data exists, never throws, so missing data = original label (zero regression). Hides the static `<p>` subtitle on cubes that gain live info (matches the approved look). Scoring suite still 21/0.

**What I got wrong (own it):** burned several rounds designing fictional dashboards before I understood "match the existing screen." Lesson: when a user reacts badly to a redesign, confirm whether they want *their real thing improved* vs *a new design* BEFORE iterating on aesthetics. Also: agent-browser served a **cached** index.html on reload — my edits "weren't there" until I cache-busted the URL (`?cb=<ts>`); always cache-bust the local server when verifying fresh edits.
**Open:** `History` cube's best-score uses `rounds.golfer_id = lineUserId` — player-id fragmentation (see [[reference_handicap_resolution]]) could undercount for users whose rounds sit under an alternate id. Fine for now; revisit if counts look low.

## 2026-06-20 — BUG LOG: phantom "active users" from handicap writes (full catalog → `FUCKUPS.md` #1)
Pete spotted that the Admin → **User Activity & Engagement** panel was showing users as "Online / active today" who hadn't done anything — he suspected a **global handicap update** was triggering the activity. Confirmed exactly that against the live DB.

**The bug (FIXED + DEPLOYED, commit `69ef2ddb`):**
- The panel (`AdminSystem.loadUserActivityData`) used `user_profiles.updated_at` as the "last active" signal. `updated_at` is bumped by ANY profile write — including a bulk handicap update — so one batch write lit up everyone as active. **Proof:** 9 users all had `updated_at = 2026-06-20 02:12 UTC` (09:12 Bangkok), the exact same instant = one write = the bogus "9 Today."
- Deeper issue: there was **no real login tracking at all** — `last_login_at` didn't exist on `user_profiles` and was never written. Activity had always been an `updated_at` guess.
- Fix: added `user_profiles.last_login_at` (migration `sql/add_last_login_at.sql`); `recordUserLogin()` stamps it once per session on dashboard entry (hooked into `ScreenManager.showScreen`); "true last active" now = max(login, last round, last event), fallback `created_at` — `updated_at` removed as an activity signal everywhere in that panel. Verified live on mycaddipro.com.

**Other fuck-ups surfaced by the audit (see `FUCKUPS.md`):**
- **#1a (latent):** course-admin Settings "Last Login" field (`#courseInfoLastLogin`, reads `course_admins.last_login_at`) is permanently "Never" — column exists but nothing writes it. A dead read.
- **#1b (latent, minor):** main Admin `#admin-active-today` tile counts `scorecards` ROWS today, not distinct players → over-counts (real activity though, not the `updated_at` bug).
- **#1c:** two "Active Today" numbers in the same admin UI with different math (scorecards-today vs true-last-active) — will disagree.
- Verified clean: `gm-analytics-engine.js` / `reports-system.js` retention use repeat-customer ratios, not `updated_at`.

**Lesson:** `updated_at` is a row-mutation timestamp, never a user-activity timestamp; and a UI value read with no writer behind it is a lie — grep for the writer before trusting it.

## 2026-06-19 (later, cont.) — BUG LOG: scramble + leaderboard fuck-ups (candid retrospective)
Pete hit a string of scramble/leaderboard defects during live testing of a 2-man (two-team) scramble at St Andrews — JOA/TRGG community leaderboard. All were **pre-existing** defects surfaced by real play, but several took more than one pass to land, and I misdiagnosed one. Logged frankly so they're not repeated.

**The defects (all now fixed + deployed):**
1. **Raw HTML leaking onto the leaderboard** (`40c59b6c`). Scramble team rows passed the team *display name* (HTML with an inner `<span style="…">` 🤝 icon) into `onclick="openPlayerProfile('id','<name>')"`, escaping only single-quotes. The inner double-quotes closed the attribute and dumped `…style="…">🤝 Pete Park…` as visible text. Fix: pass the PLAIN name, escaped for attribute + JS string. (4 call sites.) → [[feedback_html_in_onclick]]
2. **Leaderboard ignored the team handicap** (`52137198`). Scramble teams were shown & ranked by gross, not net. Now NET = gross − combined team handicap (Pete's teams: 70−1=69, 91−10=81). → [[reference_scramble_leaderboard_net]]
3. **Scorecard "Playing off 3"** (`91872dda`). The detail scorecard netted off the individual's stored playing handicap (3) → NET 67, even though Team HCP was 1. Per-hole row already recalced (69) but the headline NET + "Playing" used stored values. Now uses team HCP → Playing 1, NET 69. (Cache-bust `?v=` bumped.)
4. **Whose-drive/putt never persisted for two-team scrambles** (`163a79ac`). The big one. Live "whose drive" stored under team key `${hole}_A/_B`; the round_holes SAVE read the PLAIN hole number → wrote null. Track Drive Usage was ON (min 4/player) yet only a stray hole saved. Fix: save resolves the player's team key. **Past rounds unrecoverable** (never written). Also added the drive/putt-used stats display on the scorecard (`85fb0d40`).

**What I got wrong (own it):**
- On "fix the score," I first fixed the visible HTML leak (#1) before realizing Pete also/mainly meant the NET scoring (#2) — cost a round-trip.
- On the missing drives, I first concluded "the round only captured 1 drive during play" and said it was "good to go" — a **misdiagnosis**. The real cause was the two-team save-key bug (#4) silently dropping the data. Only after Pete pushed ("it's in the fucking system") did I trace the save path and find it. Lesson: when a tracked feature shows almost-no data, suspect the SAVE/persistence path before blaming user capture.
- Several fixes were display-layer only; the underlying STORED `total_net`/`playing_handicap`/drive nulls remain wrong in those rows (recompute-at-display covers it, but the data is dirty).

**Still open:** other `scrambleDriveData[` read sites use differing key schemes (81139 ok; 81609 `[i]||[i+'_A']||[i+'_B']`) — audit for consistency if drives go missing again. Profile round-LIST still shows un-netted `total_net` for scramble rounds (viewer ~line 307). Anthropic API key out of credits (translation moved to Gemini; scorecard-OCR/pinsheet/ai-caddie/JOA-import likely down until topped up or moved to Gemini).

## 2026-06-19 (later) — Organizer Lite: Registrations module + Live Round course fixes
Mobile-first organizer tooling, driven by Pete testing live on his phone (JOA dashboard). Each change verified via agent-browser before deploy.
- **6th "Registrations" cube + mobile drill-down** (`d9a141a9`). Global for all organizers. The organizer Lite home is now a clean 3×2 grid (Events, Scheduler / Scores, Players / Registrations, Admin). The cube shows the next event's live registered count. Tapping it opens a self-contained overlay: a **week list** (upcoming events in the next 7 days, each with a count) → tap an event → a **roster** showing each player's Transport/Competition selections + who they want to be paired with, a one-tap **PAID/UNPAID** toggle, and a "X/Y paid · ฿Z collected" summary. The paid toggle writes `payment_status` to the same `event_registrations` row the Full version reads — so a helper collecting cash on Lite syncs live to the organizer watching the Full version (the Full Registrations tab is already subscribed). Reuses the existing data layer; writes by row-id; uses a uniquely-named realtime channel to avoid the channel-reuse crash.
- **Fully translated EN/TH/KO/JA** (`0e7fc384`). Added `orgreg.*` keys to all 4 dicts; every string in the cube/list/roster routes through `_lvT()`, dates via `_lvLocale()`; a live language switch re-renders the cube + open overlay. Verified Korean + Japanese screenshots.
- **Live Round: course not auto-detecting from the event** (`db6d6793`). Pete's Jun 19 event had `course_name` = "ST ANDREWS TWO MAN SCRAMBLE" (the game format baked into the course field), which scored below the matcher's threshold and left the course blank. The auto-detect now matches on the event **title** too and adds a distinctive-word boost (a shared 6+ char course word like "andrews" matches) — so as long as the course name is anywhere in the event, it's detected. Tested 14 courses incl. no Green-Valley→Greenwood false match. Fixed in code, not data (bulk-editing `society_events` fires LINE notifications).
- **Live Round: empty course shown as optional** (same commit). The 3-colour readiness border painted an unselected Course YELLOW ("optional") and left Start Round green — but a course is required (Start already hard-blocks without one). Empty course is now RED, which turns Start Round red and blocks it until a course is picked.
- **Course name on the Registrations cube** (`1a400480`). The cube showed just the count; now shows the event course name above it (e.g. "Bangpra International / 1 / REGISTERED"), per-society like the Events cube.
- **Organizer hamburger menu: 3 additions** (`7d6b61c4`). The organizer drawer was missing tools the golfer side had. Added **Switch view (Light/Full)** toggle (top), **Registrations** (opens the same overlay), and **Messages** (opens the messaging module so organizers can reach players or anyone on the system).

_Next:_ multi-device test of the Registrations paid-sync (helper on Lite ↔ organizer on Full); partner-notification + SOS items still pending.

## 2026-06-19
Security hardening + Auth v2 + deploy-pipeline recovery (long overnight session). Security detail in `../docs/SECURITY_RUNBOOK.md`.
- **Login/auth security review.** Audited the login + data-access model and confirmed the hardening priorities. Acted on the top items below; the staged database (RLS) lockdown is queued — its groundwork (per-user sessions) is now in place.
- **Auth v2 — per-user login sessions (LIVE).** Every login method (LINE web + in-app, Kakao, Google) now establishes a real Supabase session that carries the user's identity, and the session persists across page reloads. This is the prerequisite for the database to enforce per-user access. Rebuilt the Kakao + Google exchange functions to mint the session (they previously only fetched the profile) and fixed the client to establish the session before the account-linking step. (`ac81b725`, `d9b6c68f`, `31485b37`, `4bbdce6e`)
- **Language LOCKED to login method (final).** Kakao users → always Korean; LINE & Google → always English. Replaces the earlier "default + remembered choice" approach (a saved English pick was overriding Kakao). Now derived fresh from the login each load. (`7b6e9c0b`) Verified on the live site: Kakao→Korean, LINE/Google→English, login page→English.
- **Deploy-pipeline lesson (cost hours).** Making the GitHub repo private silently broke Vercel's auto-deploy (the build lost access to the repo) — which masked all of the above for hours (it kept testing live but seeing the old build). Resolved by deploying via the Vercel CLI with the repo public. Going forward: deploy with `npx vercel deploy --prod --scope mcipros-projects`; NEVER kill a running deploy (it cancels the Vercel build); to re-private the repo, grant the Vercel GitHub app repo access FIRST, then flip private.

_Next:_ re-private the repo properly (Vercel app access first); rotate the leaked service_role key; then the staged RLS lockdown (per-table, off-peak, rollback) now that the JWT layer is live; passkey/phone session establishment.

## 2026-06-18
Live scoring + leaderboard + login polish (much of it while Pete tested live around a Hermes/Pattaya event he won, 76).
- **Two-team 2-man scramble** (`629d4df2`): you can now track BOTH 2-man teams in a group, with per-team driving + putts. It was ~80% built but unreachable — the Team A/B assignment only appeared with 4 players and nothing prompted adding the other team. Added: a setup hint to add the other team (by name or pick — both already worked), live refresh of the Team A/B block as players are added, per-team putt buttons (drives were already per-team), and persistence of each team's name + handicap so both show as teams on the leaderboard. Single-team scramble + normal rounds untouched.
- **Scramble Start button stuck red** (`4224da93`): the validator checked a team config that only builds at round-start, so assigning teams never turned it green. Now reads the live Team A/B dropdowns — green once all 4 are assigned, red if a slot is empty, green for single-team.
- **Community Leaderboard grouping** (`a8d294dd`): the day "Full Leaderboard" popup ranked everyone in one flat list across different courses (a 76 at Hermes above an 85 at Pattaya). Now groups by event/course, each ranked separately (the collapsed dashboard widget already did this).
- **Kakao login icon** (`e1178930`, `522f85a3`): it showed garbled "FLZE" — the old icon drew the word "KAKAO" as tiny letters. Replaced with the real KakaoTalk brown speech-bubble + "TALK" wordmark, on the login + account-linking screens.
- **Language by login provider** (`055ea06e`, `c9f003a8`): Kakao logins default to Korean (Kakao is Korea-dominant); every other login (LINE/Google/phone/passkey) defaults to English. The login page itself is always English; an explicit user language choice persists. (First built as everyone-Korean — wrong — reverted; also fixed a stale-saved-pref bug that kept the login page Korean.) Filled 4 untranslated `common.*` keys across all 4 dictionaries.
- **Security:** completed a login/auth security review; the staged remediation plan lives in `docs/SECURITY_RUNBOOK.md` and is scheduled to run after the day's event (~5 PM Bangkok).

_Next:_ run the scheduled security remediation (off-peak); then `loadMySocieties` (missing `society_name` column).

## 2026-06-17
Bug fixes + documentation.
- **Event registration "roster bleed" fixed** (`dcad63b7`). Symptom: open an event that has registered players (e.g. you + a partner), then move through other events — your names carried over and appeared in every following event, including ones with no registrations, until a refresh. It was a **display bug only** — the database was correct (verified: 112 genuine registrations, mostly TRGG/JOA events actually played). Cause: `loadRegisteredPlayers()` stored the roster + "View All Players" button in memory but bailed out early on events with zero players *before* clearing them, so the previous event's data persisted. Fix: reset the stored roster + hide the button at the start of every event open, plus a guard so a slow-loading roster can't render into the wrong event during fast tap-through. Verified end-to-end (St Andrews → Phoenix → Greenwood all clean).
- **Organizer Lite back button fixed** (`422849d6`). Tapping a cube then the bottom-left back button dumped organizers to the login screen (two overlapping back buttons; the golfer one unwound the nav history out of the dashboard). Now back returns to the 5-cube home; only the home itself exits, cleanly, to the golfer dashboard.
- **Lite caddy picker** (`883e706f`): moved the "Add a caddy (new/not listed)" box to the top of the caddy popup so it's visible without scrolling past the full list; saves to your caddy directory + assigns.
- **Master platform catalog added** (`1b171b5c`): `CATALOG.md` — full inventory of every screen, feature system, DB table/RPC/edge function, integration, and tool. Linked from the README.
- **My Caddy Organizer course filter fixed** (`a1106da9`): the course dropdown did nothing — its change only refreshed a hidden list, the default Notebook view ignored it, and it auto-picked the first course. Now defaults to "All Courses" and actually filters your saved caddies by course (with name-variant normalization).

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
