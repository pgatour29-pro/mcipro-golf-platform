# public/index.html — Navigation Map

**Purpose:** `public/index.html` is ~124,800 lines / 6.9 MB. It is far too large to read whole
(reading it would cost ~1.7M tokens and doesn't fit in context). This map lets you — or Claude —
jump straight to the right line range instead of grepping blind.

## How to use
- Find the feature below → note the line range → open *only* that slice.
- When asking Claude for help, paste the relevant line number(s) from here. A direct read is far
  cheaper and more accurate than a blind search.
- **Line numbers drift** as the file is edited. Treat them as *approximate anchors* — the section
  *labels* are stable, the numbers are not. If a number looks off by a few hundred lines, grep for
  the label or symbol name (e.g. `class LiveScorecardSystem`, `// GOLF SCORING ENGINE`).

## The big picture
~69% of the file is JavaScript living in **three giant inline `<script>` blocks** plus a set of
top-level classes. The rest is HTML markup (dashboards + ~50 modals) and ~4,000 lines of CSS.
Roughly 60 feature modules are *already* external `.js` files loaded via `<script src defer>`.

| Zone | Lines (approx) | What's there |
|---|---|---|
| Head / boot | 1–330 | meta, www→apex redirect, CDN + external script loads (Supabase, LINE LIFF, Tailwind, Leaflet, Firebase, Tesseract, Chart.js) |
| CSS | ~90–4,060 | 15 `<style>` blocks: theme vars, mobile perf, login-page mobile (1327), premium UI (2712), light-version dashboard (3350) |
| **Inline JS #1 — Core app** | **4,065–35,932** | AppState, i18n, auth, screen/tab managers, booking, schedule, POS, maintenance, emergency |
| HTML — dashboards + modals | 35,948–54,800 | the 11 role screens + ~50 modals (markup, with small inline scripts interleaved) |
| **Inline JS #2 — Analytics/photo** | **55,181–61,136** | shot tracking, GIR rollups, analytics drill-downs, PhotoScoreManager |
| Dev/admin + external loads | 61,138–63,440 | dev role switcher, AdminSystem, `<script src defer>` cluster (analytics, reports, staff, weather…) |
| Society backend | 63,448–66,428 | `SocietyGolfSupabase` — realtime, profiles, payments, membership, scoring DB layer |
| **Inline JS #3 — Live scoring** | **66,435–85,682** | `LiveScorecardSystem` — scoring engine, games, match play, scramble, yardage book, LINE export |
| Misc scoring + OCR | 85,684–87,146 | master points, scramble handicap calc, OCR course modal, round post-score modal |
| **Inline JS #4 — Organizer suite** | **87,156–121,736** | organizer manager, notifications/chat, marketplace, golfer events, calendar, scoring, history |
| Tail | 121,927–124,829 | module script, society-selector modals, final inline scripts |

---

## Detailed index

### Head, CSS, boot (1–4,060)
- 8 — www→apex redirect
- 26–64 — early boot inline script
- 75–327 — external CDN / library loads
- 310–319 — module script
- ~90–4,060 — CSS (`<style>` ×15): premium theme vars (330), screen/tab mgmt (436), login mobile (1327), premium UI for live scorecard (2712), light-version dashboard (3350)

### Inline JS #1 — Core application (4,065–35,932)
- 4,067 — **AppState** / global state management
- 4,069 — PWA back-button protection
- 4,211 — scorecard profile loader
- 4,362 — global data cleanup
- 4,433 — **i18n / internationalization** (multi-language)
- 9,220 — time picker utility
- 9,480 — core system functions
- 11,318 — `SimpleCloudSync`
- 12,519 — `ScreenManager`
- 13,033 — `TabManager`
- 13,333 — `LineAuthentication` (LINE LIFF auth)
- 14,910 — course request system
- 15,053 — multi-provider OAuth
- 15,797 — `OTPAuthentication`
- 15,955 — `FallbackAuthentication`
- 16,035 — `NotificationManager`
- 16,047 — `HandicapManager`
- 16,253 — `LoadingManager`
- 16,312 — `UserInterface`
- 16,394 — `EmergencySystem` / 16,932 `PersistentEmergencyAlerts` / 17,080 `LightningSafetySystem` / 17,317 `EmergencyDebugger`
- 17,391 — client error logger (observability → `client_errors`)
- 18,487 — global helpers
- 18,816 — profile creation system
- 20,246 — course conditions system
- 23,017 — golfer dashboard functions
- 24,511 — order status tab
- 24,833 — global performance cache manager / 24,940 mobile perf
- 27,424 — **schedule management system**
- 29,309 — TRGG tee sheet sync
- 29,552 — **booking system** / 29,931 tee-sheet availability / 30,344 booking cart / 30,714 caddy 22:00 cutoff
- 32,134–32,520 — leaderboard + ticker (handicap leaderboard, top-10)
- 33,694 — pro shop POS
- 33,924 — maintenance system
- 34,259 — waitlist & booking management

### HTML — role dashboards (class="screen") and modals (35,948–54,800)
Screens:
- 36,066 — `loginScreen`
- 36,470 — `otpScreen`
- 36,525 — `createProfileScreen`
- 36,714 — `golferDashboard` (largest; inline scripts at 37,158 / 38,968 / 40,460 / 41,799 / 42,433)
- 44,845 — `caddieDashboard`
- ~53,220 — `managerDashboard` (REBUILT v538: 119-line shell; all content rendered by external `manager-dashboard.js` — ManagerDashboard, real Supabase data for all 9 tabs)
- 47,044 — `proshopDashboard`
- 48,373 — `maintenanceDashboard`
- 49,236 — `adminDashboard`
- 49,941 — `societyOrganizerDashboard`
- 52,893 — `courseAdminDashboard`

Key modals (~43,000–54,800): caddyNote/caddyBook (42,930), pinSheet (42,987), scorecardScanner (43,580),
scorecardImage (43,966), holePreview (43,983), courseRequest (44,167), joinGames (44,264),
finalizedScorecard (44,314), lineExport (44,372), createListing/listingDetail/makeOffer (44,657–44,787),
payment modals (54,328–54,548), addScore (54,803), photoScore (54,946). Society-selector modal at 54,795.

### Inline JS #2 — Analytics & photo (55,181–61,136)
- 56,224 — shot tracking (per-shot club + yardage)
- 56,328 — course-level GIR % rollup
- 58,475 — analytics drill-downs / comparisons / filters
- 59,307 — `PhotoScoreManager`
- 61,335 — dev mode role switcher
- 61,462 — `AdminSystem`

### External defer-script loads (63,240–63,412)
gm-analytics-engine, society-golf-analytics, admin-pricing-control, payment-tracking ×3,
analytics-drilldown/export, reports-system, staff-security/management, maintenance-management,
weather-integration, manager-dashboard (v538 manager revamp — all manager tabs), course-data-manager, unified-player-service, global-player-directory,
player-scorecard-viewer, time-windowed-leaderboards, tournament-series-manager, society-dashboard-enhanced.

### Society backend (63,448–66,428)
- 63,448 — **`SocietyGolfSupabase`** (DB layer)
  - 64,587 realtime subscriptions · 64,645 organizer stats · 64,950 society profiles · 65,067 payment tracking · 65,328 membership · 65,750 scorecard/scoring · 65,929 handicap stroke allocation · 66,316 utilities

### Inline JS #3 — Live scoring engine (66,435–85,682)
- 66,435 — **`LiveScorecardSystem`**
  - 66,491 auto-save to round history · 66,609 round state persistence · 67,041 multi-society handicap
  - 67,510 — **GOLF SCORING ENGINE**
  - 70,618 per-game config · 72,295 match play teams · 72,676 round-robin match play
  - 74,494 round timer · 74,614 end-stats tracking
  - 75,333 optimistic UI / 75,343 auto-advance / 75,479 DB save queue
  - 75,659 scramble tracking / 75,750 scramble UI
  - 77,235 handicap sync · 77,723 public games / multi-group competition · 78,075 join-games modal
  - 74,380 in-play recall hint `showShotHistoryHint` — last-round chain + 🏆 tee best-play (best-avg club, ±15y) + 🎯 approach-by-distance (GIR) · 74,569 browsable `openYardageBook`
  - 78,092 scorecard image viewer · 78,121 hole preview · 78,381 yardage book
  - 80,785 **LINE export feature**
  - 83,647 cross-group competition leaderboards
- 85,017 scoring-format checkbox handlers · 85,302 master points value system · 85,453 scramble handicap calculator
- 86,281 OCR course modal · 86,729 round post-score modal

### Inline JS #4 — Society organizer suite (87,156–121,736)
- 87,156 — **`SocietyOrganizerManager`**
  - 87,301 player directory · 88,293 payments · 88,522 event form · 88,650 divisions · 89,347 events list · 89,741 roster · 90,004 manual player add · 90,432 registration · 91,709 society profile · 91,886 PIN mgmt · 92,077 RBAC · 92,566 pools · 92,830 leaderboard calcs
- 94,367 emergency alert inbox · 94,577 TRGG POY update modal
- 95,670 — golf-course caddy management system (95,684 PIN login · 95,767 dashboard · 95,824 tabs · 95,958 tables · 96,178 filter)
- 99,332 — **`EventNotificationSystem`** (chat + marketplace)
  - 99,630 announcements · 99,963 direct messages · 100,463 event groups · 100,590 compose · 100,851 LINE push · 101,085 group chats · 101,254 create group
  - 102,743 marketplace (sponsored ads, listings, offers, favorites) → 103,720 make-offer
- 105,478 — **`GolferEventsManager`** (class — no commas between methods)
- 118,494 — **`SocietyCalendar`**
- 118,953 — **`OrganizerScoringSystem`**
- 121,330 — **`OrganizerRoundHistory`**

### Tail (121,927–124,829)
- 121,927 module script · 122,039+ society-selector modals (dupes at 122,493 / 124,247) · 122,348 / 122,661 / 124,199 / 124,583 / 124,627 inline scripts

---

## Quick lookup — top-level classes (symbol → line)
```
SimpleCloudSync 11318 · ScreenManager 12519 · TabManager 13033 · LineAuthentication 13333
OTPAuthentication 15797 · FallbackAuthentication 15955 · NotificationManager 16035
HandicapManager 16047 · LoadingManager 16253 · UserInterface 16312 · EmergencySystem 16394
PersistentEmergencyAlerts 16932 · LightningSafetySystem 17080 · EmergencyDebugger 17317
PhotoScoreManager 59307 · SocietyGolfSupabase 63448 · LiveScorecardSystem 66435
SocietyOrganizerManager 87156 · EventNotificationSystem 99332 · GolferEventsManager 105478
SocietyCalendar 118494 · OrganizerScoringSystem 118953 · OrganizerRoundHistory 121330
```

## Cleanest extraction candidates (for eventual file-splitting)
Self-contained classes near the tail that attach to `window` and have few inbound globals make the
lowest-risk first extractions into external `.js` files:
`OrganizerRoundHistory` (121,330), `OrganizerScoringSystem` (118,953), `SocietyCalendar` (118,494).
Before moving any block: grep whether its top-level names are referenced by inline `onclick=` handlers
or other blocks — anything referenced must stay global. Extract ONE at a time, test, deploy, verify.

## Regenerating this map
Landmarks were extracted with (no full-file read needed):
```
grep -nE '^\s*(//|/\*)\s*[=#*-]{3,}' public/index.html        # JS/CSS banners
grep -nE '^\s{0,8}class [A-Z][A-Za-z0-9_]+' public/index.html # classes
grep -nE 'id="[A-Za-z]*([Dd]ashboard|[Ss]creen)"' public/index.html  # screens
```
