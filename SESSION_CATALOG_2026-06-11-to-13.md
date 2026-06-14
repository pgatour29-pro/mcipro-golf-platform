# Session Catalog — 2026-06-11 to 2026-06-13

## Overview
Handicap "Uni: null" fix, caddy booking grid redesign (3-across photo grid), caddy
filters fix, and a long society-scheduler save overhaul (multiple root causes). Plus
a live-recall "best-scoring club" feature (tee + approach-by-distance), a Scheduler
notification fix (batched LINE summary + in-app updated badge), dev docs
(navigation map + CLAUDE.md correction) and several hard-won lessons.

All code changes in `public/index.html`. Data fixes via Supabase (`npx supabase db query --linked`).

---

## June 11 — Handicap "Uni: null"

### 1. Universal handicap showing "null" in the live-scorecard picker
**Data fix (no commit — `society_events`-free, `society_handicaps` UPDATE).**

The start-round handicap picker showed `Uni: null` and `JGTS … : null (uni)` for Pete (golfer `U2b6d976f19bca4b2f4374ae0e10ed873`).
- Cause: the **universal** `society_handicaps` row (`society_id IS NULL`) had `handicap_index = NULL`. His real handicap (+0.3) was correct in his profile and per-society rows (JOA 1.1, Travellers Rest +0.3) but never mirrored into the universal slot. The picker (`createMobileCaddyCard`… actually `index.html:70507`) only falls back to the profile when the universal **row is absent**, not when it exists-but-NULL → it passed `null` through, and `HandicapManager.formatDisplay` rendered the literal string `"null"`.
- Fix applied: `UPDATE society_handicaps SET handicap_index = -0.3 WHERE golfer_id = 'U2b6d976…' AND society_id IS NULL;` — verified.
- **Systemic findings (snapshot):** `handicap_index` is numeric. Only **4** universal rows are blank (3 backfillable from profile); **165** players have NO universal row at all (those are fine — picker falls back to profile). Pending: backfill the remaining "null" players, and a permanent code fix so the picker falls back to the profile when the universal value is null.

---

## June 11 — Caddy Booking Grid Redesign

Goal: replace the one-caddy-at-a-time browse with a dense 3-across grid (courses can have 150–500 caddies).

### 2. (Mis-target) 3-across grid on the wrong caddy module
**Commit:** `26f46ad3`

Redesigned `renderCaddys` / `#caddieGridMobile` (the booking-tab view) to a 3-across number-forward grid + wired `loadCaddysForCourse` to real `caddy_profiles`. This view is NOT the one golfers actually open — inert. Left in place (harmless).

### 3. 3-across grid on the REAL module (`GolferCaddyBooking`)
**Commit:** `dfb4a1c4`

The screen golfers use is `GolferCaddyBooking.renderCaddyCard` → `#caddiesGrid` (the dark "Elite Professional Caddy Selection" page), which was `grid-cols-1` on mobile (one big card at a time).
- `#caddiesGrid`: `grid-cols-1` → `grid-cols-3 md:grid-cols-5 lg:grid-cols-6`
- `renderCaddyCard` rewritten dense (dark slate card, Available/Booked badge, ★rating, caddy number + name + course; tap → `viewCaddyProfile`)
- Spliced via marker-anchored script to avoid hand-transcription of the 145-line method.

### 4. Photos restored (photo-forward)
**Commit:** `7a251b61`

Pete: "Load the photos." Card now renders `caddy.photo_url` as the image (number tile only as the no-photo/onerror fallback), keeping the badge/rating/number overlay. All current `caddy_profiles.photo_url` are demo placeholders under `/images/caddies/`; a real photo replaces them automatically.

---

## June 12 — Caddy Filters

### 5. Refine Selection filters did nothing
**Commit:** `beb3e151`

Two bugs:
1. The five filter `<select>`s (Rating/Experience/Language/Service Level/Availability) had **no `onchange`** → `applyFilters` was never called.
2. `applyFilters` read `minRating`/`minExperience`/`availability` but only filtered by Language + Service Level — the others were ignored (so "4.7+ Stars" still showed 4.50 caddies).

Fix: wired `onchange="GolferCaddyBooking.applyFilters()"` on all five, and applied rating/experience/availability. Verified logic (4.7+ keeps 4.80/4.70, drops 4.50).

---

## June 11–12 — Society Scheduler Save Overhaul (the long one)

Reported: JOA changed an event's course in the Monthly Schedule Creator, tapped save, and it didn't change. Multiple distinct root causes, fixed in sequence:

### 6. Reliable Save: per-week + entire-month buttons + robust write
**Commit:** `9118d3de`

- The old `generate()` matched existing events with `.maybeSingle()`, whose error was **unchecked** — on any date with DUPLICATE society events (JOA has some, e.g. May 24) it returned `null` and silently fell through to INSERT → those dates never updated. Now `saveEventList` fetches matches ordered by `created_at`, updates the **oldest/canonical** row, and **checks every error** (real created/updated/failed counts).
- Reported a fake "X updated" from the code path, not DB success → now reports the truth.
- `buildWeeks()` rebuilds the grid from the DB and re-ran in the background after the user edited, **wiping the edit** → now guarded by `_userTouched`.
- New UI: **"Save Week"** per week + **"Save Entire Month"** always visible (was hidden behind Preview → "Generate All Weeks"). `collectEvents(weekIndex)` added.

### 7. Read the layout being edited (mobile)
**Commit:** `1922fd73` (then `e3a65d59`)

`collectEvents` read desktop (`jw…`) cells before mobile (`mw…`); both layouts are always in the DOM, so on a phone it read the hidden, unedited desktop value. First fix used `matchMedia`, but the live trace proved that still read the stale layout on JOA's device. **`e3a65d59`** switched to reading whichever cell is **actually visible** (`offsetParent !== null`) — this is the fix that made saves capture edits (trace: matchMedia read `Bangpra` = stale; offsetParent read `Plutaluang` = JOA's real edit → saved).

### 8. Visible feedback
**Commit:** `00642706`

`NotificationManager.show()` is **globally a no-op** (console only) — every Save toast was invisible, so "Save Week does nothing" was actually a feedback gap. Added `ScheduleCreator._notify()` (fixed green/red banner + `schedStatus`) and routed saveWeek/saveMonth/_doSave through it.

### 9. Instant tap feedback + diagnostic tracer
**Commits:** `97ead807`, `f599a52c`

Save buttons show a banner the instant they're tapped, wrapped in try/catch, and log a per-day **collected-course-vs-DB-course** trace to `client_errors`. This trace is what pinpointed the capture bug (and proved the save eventually worked).

### 10. Diff normalization (stop over-writing + over-notifying)
**Commit:** `14a57f3a`

The save diff compared raw values, so DB `'10:10:00'` vs form `'10:10'` (and fee `2000` vs `'2000.00'`) ALWAYS looked changed → every Save rewrote all ~7 events in the week and re-notified members. Now times normalize to HH:MM and fees to Number, so only genuinely-changed events write.

**Outcome:** save works end-to-end — JOA's Jun 12 event verified as `JOA - Plutaluang Royal Thai Navy Golf Course` in the DB. (Open: strip the verbose per-save `client_errors` trace now that it's confirmed; "still showing old event" was a stale display — DB was correct.)

---

## June 12 — Live Recall: Best-Scoring Club Guidance

**Commit:** `8651149a` — DEPLOYED & verified live (polled mycaddipro.com; marker "Into the green" present on served `index.html`).

Extends the in-play Yardage Book hint (`showShotHistoryHint`, ~`index.html:74380`), which previously only recalled the most-recent prior round's tee→green chain, with **two club recommendations**. Driver of the work: Pete asked "playing the same course again, does new shot data override the old?" → **No** — every round writes its own rows (`shots` upsert keyed on `scorecard_id,hole_number,shot_number`, and each round has a unique scorecard), and the recall only ever surfaced the single most-recent prior round. Pete wanted the *best-scoring* club surfaced too, then to extend it to every shot into the green.

### 11. Tee best-play (best-average club at comparable distance)
The tee club with the best **average** gross score on the hole — Pete chose *average* over single-best-round (one lucky birdie shouldn't outweigh consistent pars). Restricted to **comparable distance**: same tee marker preferred, else rounds within **±15y** of today's tee yardage (`getSelectedTeeYardage`). Shows the runner-up club for contrast; only renders when ≥2 distinct tee clubs were used. UI: `🏆 Tee: 3W avg 4.0 (2 rounds) / vs Dr avg 5.0 (3)`.

### 12. Approach-by-distance ("Into the green", GIR-based)
Best club per **25-yard band** by green-hit (**GIR**) rate, keyed on the **regulation approach shot** (`shot_number = max(1, par−2)`) yardage — which varies each round, so it's binned by *distance*, not shot number. Per band shows best club + made/total; needs ≥2 tracked approaches (with GIR) at the hole. UI: `🎯 Into the green / 150–174y  8i  3/6`.

**Why approach ≠ tee method:** tee distance is fixed by the tee marker and the club choice flows straight to the hole score, so score-by-club is fair. Approach distance changes every round and hole score is too noisy for one approach — the honest signal is **GIR (did it find the green)**, keyed by distance. Per-hole, so it sharpens with more rounds. **Limitation:** only the regulation approach shot has a green-hit signal (hole GIR) — recovery/layup shots aren't scored; true every-shot green-finding would need a new per-shot "on green?" capture during scoring.

**Perf:** consolidated the per-round score lookup into a single `round_holes` query (now also selects `gir`) that drives the existing "last score" line **and** both new features — one fewer round-trip than before. History fetch raised `50 → 120` so the averages have enough rounds.

**Verify:** `npm test` (21/21) + inline-script parse check, both green before push.

Also this session: connected Pete's **Telegram chat** (`8695972914`) for deploy pings + 7am/9pm check-ins; saved the chat_id to Claude memory so future sessions can notify proactively.

---

## June 13 — Scheduler: Notify on Save (the missing notifications)

**Commit:** `46645fd4` — DEPLOYED & verified live (`_broadcastSummary` present on served `index.html`).

**Reported:** adding/editing events in the Monthly **Schedule Creator** (even a single event) fires **no LINE notification and no society-page badge** — notifications only appear when events are created via the **individual event creator** or edited on the **event cards**.

### 13. Root cause — Scheduler writes raw, bypassing the notifying wrappers
The Scheduler's `ScheduleCreator.saveEventList` (`index.html:94197`) writes events with **raw** `sb.from('society_events').update(ev)` / `.insert(ev)` — skipping the two methods that are the *only* places notifications are generated:
- **`SocietyGolfDB.createEvent`** (`63756`) — the sole place a new-event **LINE push** fires (client-side POST to the `line-push-notification` edge function). Confirmed there is **no DB trigger/webhook** on `society_events` (checked every `.sql`; the function is called with a custom `{type:'new_event', record}` body, i.e. from app code).
- **`SocietyGolfDB.updateEvent`** (`63818`) — manually stamps `updated_at`/`updated_by`; the in-app "updated" badge (`EventNotificationSystem.getEventStatus`, `99616`) keys off `updated_at > lastSeen`, and the table has **no auto-bump trigger**. Raw updates left `updated_at` stale → no badge. (New events still badge "new" via the `created_at` column default — same path the individual creator relies on.)

### 14. Fix — batched LINE summary + stamp updated_at (client-side, in `ScheduleCreator`)
Pete's choice: **one summary per save**, not one push per event (a full-month save must not spam members).
- `saveEventList` now stamps `updated_at`/`updated_by` on edits (in-app "updated" badge works) and collects `createdList`/`updatedList`.
- `_doSave` fires **one** `_broadcastSummary(...)` per save — a single LINE message (`🆕 N new / ✏️ M updated`, each line built from the event's **real `event_date`**) sent to all platform LINE users via the existing **`type:'system_alert'`** path (mirrors `SocietyOrganizer` `89480`). No edge-function change needed.
- Unchanged events are still filtered out by the existing diff/normalization, so they neither write nor notify.

**Reach caveat:** broadcasts to **all platform LINE users** (mirrors the individual-creator behavior). Scoping to society members/subscribers is a clean follow-up.

**Verify:** `npm test` (21/21) + inline-script parse check, both green before push.

---

## Dev docs (local only, not deployed)
- **`INDEX.md`** — navigation map for the 124,800-line `public/index.html` (feature → line ranges, 23-class lookup, regeneration greps). Built from grep landmarks, no full-file read.
- **`CLAUDE.md`** — corrected the stale "React + TypeScript" stack line + TS-based "done" criteria to reflect the actual vanilla-JS/HTML, no-build app.

---

## Lessons learned (the expensive ones)
1. **`NotificationManager.show()` is a no-op everywhere** — a "button does nothing / no toast" report may be a missing-feedback gap, not a failed action. Verify the DB outcome before iterating.
2. **Scheduler saves do NOT bump `society_events.updated_at`** — verifying a write by `updated_at > now()` gives FALSE NEGATIVES (cost ~30 min of wrong conclusions). Read `course_name`/`title` directly.
3. **`offsetParent` (actual visibility) beats `matchMedia`** for "which of two always-present layouts did the user edit."
4. **This codebase has ~5 overlapping caddy modules** — confirm the exact render path against a real screenshot before editing (mis-targeted once this session, `26f46ad3`).
5. **When the user is live/blocked (mid-round), fix the data directly and instrument server-side — don't loop them through reload-and-tap tests.**
6. **Event notifications are CLIENT-SIDE in the `createEvent`/`updateEvent` wrappers** (LINE push + the `updated_at` badge stamp), NOT a DB trigger. Any code that writes `society_events` directly (`.from('society_events').insert/update`) silently skips both — that's exactly why the Scheduler was mute. Route through the wrappers, or replicate their side-effects.

---

## Commits (in order)
| Commit | Area | Description |
|--------|------|-------------|
| `26f46ad3` | Caddy | 3-across grid on wrong module (inert) |
| `dfb4a1c4` | Caddy | 3-across grid on real `GolferCaddyBooking` |
| `7a251b61` | Caddy | photo-forward cards |
| `9118d3de` | Scheduler | Save Week/Month buttons + robust error-checked save + edit-wipe guard |
| `1922fd73` | Scheduler | read mobile layout (matchMedia) |
| `00642706` | Scheduler | visible `_notify` banner (NotificationManager disabled) |
| `97ead807` | Scheduler | instant tap feedback + tracer |
| `f599a52c` | Scheduler | per-day collected-vs-DB trace |
| `e3a65d59` | Scheduler | read actually-visible layout (`offsetParent`) — the capture fix |
| `14a57f3a` | Scheduler | normalize time/fee in diff (only write changed) |
| `beb3e151` | Caddy | filters: wire onchange + apply rating/experience/availability |
| `8651149a` | Yardage Book | live-recall best-scoring club: tee best-average + approach-by-distance (GIR); consolidated round_holes query |
| `46645fd4` | Scheduler | notify on save: batched LINE summary (system_alert) + stamp updated_at for in-app updated badge |

(Data fix: Pete's universal `society_handicaps` set to -0.3 — via SQL, no commit.)

---

## Files changed
- `public/index.html` — all caddy + scheduler + handicap-picker code
- `society_handicaps` (Supabase) — Pete's universal handicap data fix
- `INDEX.md`, `CLAUDE.md` — dev docs (local, not deployed)

## Open / TODO
- Backfill the other "null" universal handicaps + permanent picker fallback fix.
- Strip the verbose scheduler `client_errors` trace now that the save is confirmed.
- "Still showing old event" after save = stale display in some view (DB is correct) — force refresh if it recurs.
- Yardage Book: optional "live per-shot caddy" (recommend club as you type each shot's yardage) — needs a per-shot "on green?" capture to extend GIR scoring beyond the regulation approach. Also could add best-play to the browsable 📖 Book (all 18 holes); currently in-play hint only.
- Scheduler notifications currently broadcast to ALL platform LINE users — optionally scope to that society's members/subscribers only.
