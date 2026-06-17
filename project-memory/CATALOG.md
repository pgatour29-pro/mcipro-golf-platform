# MyCaddiPro — Master Platform Catalog

> Auto-generated from a full codebase scan on **2026-06-17**. A complete inventory of every screen,
> feature system, database table, integration, and tool in the platform. Line numbers are
> **approximate** anchors into `public/index.html` (124,956 lines) — search by the named symbol if a
> line has drifted. Regenerate this doc after major changes; for the live dependency graph use
> `python3 arch_map/scan.py`.

---

## 1. What it is

MyCaddiPro (MciPro) is a production golf-society management platform used daily in Thailand. It is a
**single-file vanilla-JavaScript web app** (`public/index.html`, ~125k lines, no framework) backed by
**Supabase** (Postgres + Realtime + ~41 Deno Edge Functions), deployed on **Vercel** (no build step),
with a parallel **Capacitor** iOS/Android wrapper. Auth is multi-provider OAuth (LINE primary, plus
Kakao and Google). Six user roles each get their own dashboard.

---

## 2. Repository structure (root: `/mnt/c/Users/pete/Documents/MciPro`)

```
public/
  index.html                 # the entire app (~125k lines)
  player-scorecard-viewer.js # player profile + hole-by-hole scorecard modal (loaded with ?v= cache-bust)
  supabase-config.js         # Supabase client + CRUD/RPC helpers + realtime subscriptions
  auth-bridge.js             # LINE <-> Supabase session linking
  sw.js, sw-register.js      # service worker (PWA offline/cache)
  manifest.json              # PWA metadata
  vercel.json                # cache-control headers
  assets/                    # CSS, images, hole-layout data
  chat/                      # chat UI templates
supabase/functions/          # ~41 Deno edge functions (+ _shared/ utils)
arch_map/                    # interactive Cytoscape codebase map (scan.py -> graph.json + html); LOCAL ONLY
project-memory/              # human-readable vault: README, STATUS, progress, decisions, THIS catalog
tests/                       # run.js (21 scoring tests) + loadEngine.js
migrations/                  # DB schema migrations
MciProNative/                # Capacitor iOS/Android build
hole_layouts/, scorecard_profiles/  # per-course coordinates + YAML course configs
CLAUDE.md, DEPLOYMENT_RULES.md, RUNBOOK.md, CHANGELOG-*.md  # engineering guidance
package.json                 # scripts: test, dev/build (vite), cap:ios/android
```

Note: `chat/`, `golfgames/`, `codex/`, `completed/`, `maintenance/` are experiment/archive folders.
Some `package.json` deps (Sentry, PostHog, Pusher, Netlify Blobs) are bundled but **not actively wired**
into the vanilla app — treat as legacy unless verified.

---

## 3. Screens & dashboards

Screens are top-level `.screen` elements; `ScreenManager.showScreen(id)` (~12693) hides all and adds
`.active` to the target, then runs `initializeScreen(id)`. Role→dashboard map (~10075):
`golfer→golferDashboard, caddie→caddieDashboard, manager→managerDashboard, proshop→proshopDashboard,
maintenance→maintenanceDashboard, society_organizer→societyOrganizerDashboard`.

| Screen id | Purpose | ~line |
|---|---|---|
| `loginScreen` | LINE/Kakao/Google login | 36401 |
| `otpScreen` | OTP verification | 36805 |
| `createProfileScreen` | First-time profile creation | 36860 |
| `golferDashboard` | Golfer home (Light + Geekout) | 37049 |
| `caddieDashboard` | Caddie assignments/earnings/comms | 45168 |
| `managerDashboard` | Course/facility manager ops | 45989 |
| `proshopDashboard` | Pro-shop POS/inventory/customers | 47367 |
| `maintenanceDashboard` | Course maintenance / work orders | 48696 |
| `adminDashboard` | Super-admin control panel | 49559 |
| `societyOrganizerDashboard` | Society events/registrations/scoring (Light + Geekout) | 50264 |
| `courseAdminDashboard` | Per-course caddy mgmt, PIN-gated | 53228 |
| `eventDayMode` | On-course event ops (check-in, payments) | 52810 |

### Tabs per dashboard
- **Golfer** — `showGolferTab()` (~21017): overview, booking, marketplace, societyevents, scorecard,
  schedule, food, status, rounds, golfanalytics, caddies, conditions, messages.
- **Society Organizer** — `showOrganizerTab()` (~114411): home (Light 5-cube menu), events,
  registrations, calendar, scoring, standings, rounds, players, accounting, profile, admin, scheduler.
- **Caddie** — `showCaddyTab()` (~21253): overview, messaging (sub-tabs: assignments/golfer/oncourse/caddyroom).
- **Manager** — `showManagerTab()` (~23267): overview, traffic, staff, analytics, reports, settings,
  maintenance, weather, messages.
- **Pro Shop** — `showProshopTab()` (~23195): pos, inventory, sales, customers, settings, messages, teesheet.
- **Maintenance** — `showMaintenanceTab()` (~23209): overview, course-updates, tasks, equipment, schedule, messages.
- **Admin** — `showAdminTab()` (~63165): overview, users, subscriptions, societies, courses, analytics,
  moderation, gpsmap, settings, errorlog.
- **Course Admin** — (~53352): overview, caddies, bookings, waitlist, settings.

---

## 4. Navigation & view modes

- **NavHistory** (~20364): stack of `{screen, tab}`; `push/pop/canGoBack/updateBtn`. Drives the mobile
  back button `#dashboardBackBtn` (opacity toggled by `canGoBack`).
- **`dashboardGoBack()`** (~20402): mobile back handler. Closes overlays first; **organizer-aware** —
  on the org Lite dashboard it returns to the cube home (and from the home, exits cleanly to the golfer
  dashboard) instead of unwinding NavHistory to the login screen.
- **Mobile drawer / hamburger** (`#mobileDrawer` ~122179, `openMobileDrawer`/`closeMobileDrawer`):
  per-role link sections + the Light/Full toggle + admin/society quick links.
- **RoleSwitcher** (~113799) + **`quickSwitchToOrganizer()`** (~113934): owners flip between golfer and
  organizer views.
- **DashboardMode** (~114248) — Light vs Geekout dual mode. `KEY='mcipro_dashboardView'`;
  preference order = profile `golfInfo.dashboardView` > localStorage > default `'geekout'`.
  `set()` accepts only `'light'` | `'geekout'` (Full = geekout). `apply()` toggles class `light-mode`
  on `#golferDashboard` and `#societyOrganizerDashboard` + `mcipro-light` on `<body>`. Light golfer =
  4 cubes (`#liteCubesGrid`); Light organizer = 5 cubes (`#orgLiteCubesGrid`) with `.org-full-nav`
  hidden and `#orgLiteBackBtn` shown. All hiding is CSS (~line 3350+). Geekout = full tabs/widgets.

---

## 5. Feature systems (by domain)

> Names/line ranges are the scanner's best identification; verify the symbol before relying on a method list.

### Live scoring & scorecard
- **LiveScorecardSystem** (~66784) — real-time round scoring; players, holes, scores/stats caches,
  game configs, leaderboard. DOM: `#scorecardActiveSection`, `#leaderboardContent`.
- **Scoring engine** (embedded; the part covered by `npm test`) — `parseHandicap`, `allocHandicapShots`,
  stroke-index interleave for 9-hole courses, net score, **Stableford**, **Match Play**, **Nassau**.
- **GolfScoreSystem** (~55518) — round-history persistence; localStorage + Supabase sync, WHS differential.
- **PhotoScoreManager** (~59656) + edge `analyze-scorecard` — OCR scorecard photos (Claude Vision).
- **player-scorecard-viewer.js** — `openPlayerProfile()` / `openScorecard()`; player stats, recent
  rounds, front/back-9 tables, multi-handicap badges (Universal / TRGG / society).

### Games, competition & standings
- **LiveGamesSystem** (~93195) — side-game pools (stableford/best-ball/match), fairness cutoff (only
  holes all entrants finished), live leaderboard. Tables `side_game_pools`, `pool_entrants`.
- **Games / Press feature** (in scorecard) — per-player stakes + press tracking + group/indiv/press
  settlement (see memory `project_press_perplayer_points`). Tables `side_game_config`, `game_presses`.
- **TournamentManager** (~96783) — multi-round formats, handicap adjustment, brackets.
- **OrganizerScoringSystem** (~119050) — organizer live multi-player scoreboard + event settlement.

### Society events & registrations
- **GolferEventsManager** (~105304) — golfer-facing event browse/calendar/my-events/standings;
  society subscriptions; realtime updates; multi-language event text.
- **EventNotificationSystem** (~99158) — unseen-event badges, change detection.
- **GolferEventRegManager** (~111986) / **RegistrationsManager** (~114514) — register/unregister,
  rosters, pairings, tee-sheet generation/export.
- **SocietyOrganizerManager** (~87808) — organizer dashboard: create/edit events, player directory,
  revenue/payout tracking, society profile.
- **SocietyCalendar** (~118591) — organizer calendar grid.
- **OrganizerRoundHistory** (~121427) — historical event/round records.

### Caddy
- **CaddySystem** (~31368) — caddy directory/search/filter (ratings, languages, specialty).
- **CaddyTrackingSystem** (~60433) — live GPS + hole tracking during rounds.
- **CaddyEarningsSystem** (~61381) — per-round earnings, tips, payroll.
- **CaddyNotebook** (in scorecard) — golfer's personal caddy notes/ratings → table `caddy_notebook`
  (this is the "My Caddies" directory; the Lite event caddy picker `addManualCaddy()` writes here).
- **BookingManager** (~29147) / **EnhancedBookingManager** (~34658) / **ScheduleSystem** (~27627) /
  **TodaysTeeTimeManager** — tee-time + caddy bookings, waitlist, conflict detection.

### Handicap
- **HandicapManager** (~16232) + window helpers `formatHandicapDisplay`, `getHandicapBadgesHtml`,
  `injectHandicapBadges` — WHS index, plus/minus display, per-society handicaps, badges.
  (Resolution: society_handicaps → profile fallback; see memory `reference_handicap_resolution`.)

### Course setup & pins
- **PinSheetManager** (~104066) + edge `analyze-pinsheet` — green pin positions per hole, keyed by
  `course_name`; CSV/photo upload. Tables `pin_positions`, `pin_locations`.
- **CourseAdminSystem** (~95600) — course/hole editing (par, SI, yardage), capacity, caddy assignments,
  bookings, waitlist.

### Communication & alerts
- **MessagesSystem** (~99301) — DMs + threads + unread badges + realtime.
- Per-role comms objects: **CaddyComms / ManagerComms / ProshopComms / MaintComms** (sub-tab messaging).
- **NotificationManager** (~9311) — toasts. NOTE: `.show()` is currently a **no-op** (console only) —
  "button does nothing/no toast" usually means feedback-less, not failed (memory `feedback_notifications_disabled`).
- **EmergencySystem / PersistentEmergencyAlerts** (~16579) — SOS/medical alerts with location; table
  `emergency_alerts`; edge `dismiss-sos-alert`, `alert-webhook`.
- **LightningSafetySystem** (~17265) — weather/lightning safety alerts.

### Other
- **ProfileSystem** (~25177) — golfer/caddy/organizer profiles, photos, privacy, preferences.
- **AccountingManager** (~116649) — entry fees, prize funds, rake, caddy payroll, settlement.
- **MarketplaceSystem** (~102501) — listings, cart, checkout. Tables `marketplace_listings`, `marketplace_offers`.
- **GPSNavigationSystem** (~33475) + **AdminGPSMap** (~63302) — distance-to-pin, course map, admin caddy monitor.
- **AdminSystem** (~61812) — users, courses, error logs, metrics.
- **Multi-language / i18n** — `t(key)` lookup + `_lvT(key, fallback)` for the Light views; per-society
  native language (Korean is the test bed). See memory `project_multilang_system`.
- **Data sync** — **SimpleCloudSync/CrossDeviceSync** (~11492), **GlobalCacheManager** (~25037, TTL cache).
- **SocietyGolfSupabase** (~63797) — Supabase wrapper for society features.

---

## 6. Data model (Supabase / Postgres)

Client config (`supabase-config.js`): project `pyeeplwsnupmhgbguwqs`; **Supabase Auth NOT used**
(`detectSessionInUrl:false, autoRefreshToken:false, persistSession:false`) — app manages its own
session via `localStorage.line_user_id`. Global handle `window.SupabaseDB` (`.client`, `.waitForReady()`).
RLS is permissive on most tables (app-level auth); hardening is phased (Phase 1 = block deletes done;
Phase 2 = real JWT/RLS planned). **~92 distinct tables** referenced; the important ones:

### Core / profile
`user_profiles` (PK `line_user_id`; `role`, `handicap_index`, `trgg_handicap`, `universal_handicap`,
`society_id/name`, `profile_data` JSONB, `oauth_provider`, `google_user_id`, `kakao_user_id`) ·
`profiles` · `caddy_profiles` · `user_caddy_preferences`.

### Rounds & scoring
`rounds` (`golfer_id/user_id`, `total_gross`, `played_at`) · `round_holes` (`hole_number`, `gross_score`,
`gir`, `putts`, `fairway_hit`, `proximity`=2nd-putt dist, `approach_proximity`=1st-putt/approach-to-pin) ·
`scorecards` (event/player headers) · `scores` (hole-by-hole `stableford_points`) ·
`shots` (per-shot `club`, `yardage`, `notes`) · `golfcourse_scorecards` · `round_partners`.

### Course & layout
`courses` · `course_holes` (`par`, `stroke_index`, `yardage`) · `course_nine`/`nine_hole` ·
`course_conditions`(+`_photos`) · `course_gps_data` · `course_dashboard_stats` · `course_admins` ·
`course_requests` · `pin_positions` · `pin_locations`.

### Society & events
`societies` · `society_profiles` (`organizer_id`, `society_logo`, `use_slope_rating`) ·
`society_members` (`golfer_id`, `status`, `is_primary_society`) · `society_handicaps` ·
`society_organizer_roles` · `society_budgets` ·
`society_events` (`title`, `course_name`, `event_date`, `start_time`, `departure_time` — **writes fire
LINE notifications via DB triggers**, see §8) · `event_registrations` (`caddy_numbers`, `status`) ·
`event_waitlist` · `event_join_requests` · `event_invites` · `event_pairings` · `event_results` ·
`event_group_messages` · `event_message_reads`.

### Tournaments / series
`tournaments` · `tournament_registrations` · `tournament_series` · `tournament_days` ·
`season_points` · `playoff_brackets` · `leaderboard_snapshots` · `series_standings` · `series_events`.

### TRGG integration
`trgg_rounds` · `trgg_players` · `trgg_user_map` (LINE↔TRGG name) · `trgg_pending_matches` ·
`trgg_sync_runs` (sync audit) · `trgg_poy_cache` (Player-of-Year).

### Caddy / booking
`caddy_bookings` · `caddy_waitlist` · `caddy_notebook` (golfer's caddy directory/notes) ·
`caddy_tracking` (live GPS) · `caddy_completed_rounds` · `bookings` · `booking_access_keys`.

### Chat / social / misc
`chat_messages` · `group_chats`(+`_messages`/`_members`/`_reads`) · `messages` · `conversations` ·
`conversation_participants` · `read_cursors` · `typing_events` · `push_tokens`/`chat_devices` ·
`golf_buddies`/`golf_buddy_groups` · `golfer_society_subscriptions` · `announcements`(+`_reads`) ·
`emergency_alerts` · `marketplace_listings/offers/favorites` · `sponsored_ads` · `content_reports` ·
`gps_positions` · `client_errors` (browser crash log) · `scorecard_photos`.

### RPCs (~39)
PIN/admin: `verify_course_admin_pin`, `verify_society_organizer_pin`, `set_*_pin`, `organizer_has_pin`.
Handicap/scoring: `calculate_course_handicap`, `calculate_society_handicap_index`,
`calculate_score_differential_v2`, `get_course_rating_slope`, `get_course_tees`, `get_scorecard_detail`,
`update_live_progress`. Standings: `calculate_period_standings`, `calculate_series_standings`,
`get_tournament_leaderboard`, `get_top_players`, `get_movers_and_shakers`,
`get_qualification_projections`, `qualify_players_for_playoff`, `create_leaderboard_snapshot`.
Profiles/social: `create_user_profile`, `update_player_profile`, `sync_player_profiles`,
`get_player_profile`, `get_full_player_profile`, `search_players_global`, `search_unified_profiles`,
`get_buddy_suggestions`, `get_recent_partners`, `find_similar_players`, `get_directory_analytics`,
`get_profile_stats_summary`. TRGG/cleanup: `trgg_find_best_match`, `refresh_trgg_poy_cache`,
`cleanup_expired_alerts`, `count_event_registrations`, `eliminate_players`, `ensure_direct_conversation`.
Ads: `increment_ad_clicks/impressions`, `increment_listing_views`.

### Edge functions (~41, `supabase/functions/`)
Auth/OAuth: `line-oauth-exchange`, `google-oauth-exchange`, `kakao-oauth-exchange`, `line-auth-session`,
`mint-supabase-jwt`. Messaging: `line-webhook`, `line-push-notification`, `push-on-message`,
`chat-notify`, `notify-caddy-booking`, `alert-webhook`, `send-line-scorecard`, `chat-media`.
Vision/OCR: `analyze-scorecard`, `analyze-pinsheet`. AI: `ai-caddie`, `ai-coach`. Round/event
(LINE-id gated): `clear-round-holes`, `delete-round`, `unregister-event`, `delete-caddy-note`,
`dismiss-sos-alert`, `event-register`. TRGG/data: `sync-trgg-rounds`, `sync-trgg-handicaps`,
`admin-delete-trgg-round`, `admin-unlink-trgg-player`, `parse-joa-schedule`, `fetch-masterscoreboard`,
`fix-course-data`, `create-tracking-tables`, `create-tournament-tables`. Admin: `verify-admin-pin`,
`secure-dm`. Shared: `_shared/{cors,supabase,signJwt,verifyLine,withLatencyTracking,admin}.ts`.

### Realtime + triggers
Realtime channel subscriptions (supabase-config.js): `gps_positions`, `chat_messages`,
`emergency_alerts`, `caddy_bookings`. (Channels are keyed by name — a 2nd subscribe to the same name
crashes, see memory `feedback_realtime_channel_reuse`.)
DB triggers: **`society_events`** has `trigger_new_event_notification` (INSERT) and
`trigger_event_update_notification` (UPDATE when event_date/start_time/course_name change or
status→cancelled) → both fire LINE notifications. Also handicap-sync and scorecard-total triggers.

### localStorage (~54 keys, notable)
`line_user_id`/`lineUserId` (effective user id) · `mcipro_current_user` · `mcipro_dashboardView`
(Light/Geekout) · `mcipro_language`/`mci-pro-language` · `mcipro_active_round` ·
`selectedSocietyId`/`mcipro_selected_society` · `mcipro_bookings(_cloud)` · `mcipro_all_profiles_cache`
(+`_time`) · `mcipro_pins_today` · `mcipro_error_buffer` (→ `client_errors`) · biometric WebAuthn keys.

---

## 7. Auth & external integrations

- **Auth (multi-provider OAuth):** LINE (primary, LIFF), Kakao, Google. Edge `*-oauth-exchange`
  functions swap the code for a token + profile, then `mint-supabase-jwt`. Effective user id =
  `line_user_id` column, which also stores non-LINE ids prefixed `KAKAO-`/`GOOGLE-`; `oauth_provider`
  records the source. No Supabase GoTrue session — app manages its own via localStorage. Target v2 =
  magic-link OTP + `profile_id` JWT claim (no passwords). Pre-auth OAuth functions need `--no-verify-jwt`.
- **External services:** LINE Messaging (scorecards, notifications, webhook) · OpenWeather (course
  weather) · Esri/ArcGIS satellite imagery + RainViewer radar (course maps) · Supabase Realtime
  (websocket) · Anthropic Claude Vision (scorecard/pin OCR via edge functions).

---

## 8. Deployment, testing, observability, tooling

- **Deploy:** push to `master` → **Vercel** auto-deploy, **no build step** (single HTML). Edge functions
  deployed separately via Supabase CLI. `vercel.json`: `index.html` + `sw.js` = no-store; `assets/**` =
  immutable 1yr. **Cache-bust rule:** any `public/*.js` loaded with `?v=YYYYMMDDx` (e.g.
  player-scorecard-viewer.js) requires bumping the `?v=` in index.html in the **same commit**, or
  browsers serve a stale copy.
- **Testing:** `npm test` → `tests/run.js`, **21 scoring-engine tests** (Stableford, handicap
  allocation, Nassau, Match Play); run before every deploy. Engine extracted via `tests/loadEngine.js`.
- **Observability:** `client_errors` table aggregates browser JS exceptions (the primary debugging
  signal — read it before guessing). Sentry/PostHog are bundled deps but not wired into the vanilla app.
- **Dev tooling:** `arch_map/scan.py` → interactive Cytoscape dependency map (`graph.json` +
  `status.json` health overlay; ~233 nodes); **local-only, never deployed**. `project-memory/` vault
  (README/STATUS/progress/decisions + this catalog). agent-browser drives Chrome for visual
  verification (mycaddipro data is behind LINE login). Local preview: `python3 -m http.server 8889`
  from `public/`. Native build via Capacitor (`cap:ios`/`cap:android`).
- **Operating rules of record (see CLAUDE.md / DEPLOYMENT_RULES.md / memory):** never blame cache;
  never bulk-write `society_events` (LINE-notification triggers); fix live data directly mid-round;
  no purple (use green `#22c55e`); surgical changes + verify; secrets go dashboard→terminal, never chat.

---

## 9. Quick "where do I look?" index

| Want to change… | Start at |
|---|---|
| A dashboard's tabs | `show<Role>Tab()` + `#<screen>Tab-<name>` panels |
| Light/Geekout behavior | `DashboardMode` (~114248) + CSS ~3350 |
| Mobile back button | `dashboardGoBack()` (~20402) + `NavHistory` (~20364) |
| Live scoring math | scoring engine (covered by `tests/run.js`) |
| Society events list/notifs | `GolferEventsManager` (~105304) / `SocietyOrganizerManager` (~87808) |
| A DB query | `window.SupabaseDB` / `supabase-config.js`; chunk `.in()` by ≤50 (1000-row cap) |
| Server-side secure action | a `supabase/functions/*` edge function |
| Whole-system dependency view | `python3 arch_map/scan.py` → open the generated HTML |
