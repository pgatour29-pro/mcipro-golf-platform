# Session Catalog — 2026-06-07 (Scale + Booking/Waitlist arc)

Continues the same day's earlier UI/scoring work ([2026-06-07_SESSION_CATALOG.md]). Deploy: push master → **Vercel** → mycaddipro.com (parse-checked via inline-`<script>` `new Function`; verified live by polling a unique marker). DB = Supabase `pyeeplwsnupmhgbguwqs` via `npx supabase db query --linked -f file.sql`. Companion deep-dives in repo: **2026-06-07_SCALE_AUDIT.md**, **2026-06-07_BOOKING_WAITLIST_DEEPDIVE.md**. Memory: [[booking-waitlist-server-triggers]].

## Scale audit (read-only) — `2026-06-07_SCALE_AUDIT.md`
Pete asked if the platform handles thousands concurrent. Method: 3 parallel Explore agents (realtime subs / data loads / polling+writes+payloads) + DB row-counts/indexes/RLS. Verdict: **fine today** (DB excellently indexed — bookings 11 idx, rounds 18, user_profiles 20+ incl. name trigram; no binary blobs; tiny data ~1.25k users). The one real bottleneck at scale = **global realtime fan-out** (every user subscribes to system-wide channels) + the broad re-fetches those trigger. Not a rewrite; targeted fixes.

## Booking/waitlist deep-dive (read-only) — `2026-06-07_BOOKING_WAITLIST_DEEPDIVE.md`
Mapped tee-sheet ↔ caddy ↔ waitlist ↔ event-registration. Headline: the DB already had a correct **`auto_promote_waitlist()`** function but it was unplugged (no trigger) AND broken (referenced renamed column `max_players`→`max_participants`). Found: no overbooking guard; manual two-step promotion; caddy waitlist has a legacy in-memory demo path + the real `caddy_waitlist` table; tee slots have no uniqueness.

## #1 Event waitlist AUTO-PROMOTION (DB trigger) — TESTED, LIVE
Fixed `auto_promote_waitlist()` (max_participants; gate on `auto_waitlist`; count non-cancelled; let id/status default; SECURITY DEFINER) + `trg_auto_promote_on_reg_change AFTER DELETE OR UPDATE ON event_registrations` (NOT INSERT — recursion). Tested: cancel on a full 1-seat auto-waitlist event promotes exactly #1, leaves #2. event_waitlist was 0 rows (greenfield).

## #2 Capacity guard — BUILT then REMOVED (Pete's call)
Installed `enforce_event_capacity()` (BEFORE INSERT, `pg_advisory_xact_lock`, reject when full). Tested green. Then Pete: **"adding players to an event needs to be at the discretion of the organizers"** (the 2 over-cap events — BRC 6/5, Bangpakong 5/4 — were real organizer rosters). DROPPED the trigger+function. Capacity is now SOFT: UI routes a self-registering player to the waitlist when full; organizers add freely. (If hard player-side protection ever wanted, use a guard with an organizer-bypass flag — not a blanket block.)

## #3 Realtime scale — partial, LIVE (the safe wins)
- **Profiles fan-out scoped** (1e… `subscribeToProfiles(callback, userId)` adds `filter: line_user_id=eq.<self>`; caller passes `AppState.currentUser.lineUserId`). Other profiles still load on demand.
- **Event-dashboard reloads debounced** (organizer `SocietyOrganizer.subscribeToChanges` → `_scheduleLoadEvents` 600ms; golfer `GolferEventsSystem` reg/waitlist handlers → shared `_eventsRefreshTimer` 600ms). Same visibility, fewer reloads.
- **Organizer user-search debounced + indexed** (`searchUserProfiles`→`_runUserProfileSearch`: 250ms debounce + `.or(name.ilike,email.ilike).limit(25)` using existing indexes, instead of pulling the whole `user_profiles` table per keystroke).
- **HELD per Pete (option B):** caddy/bookings realtime course-scoping — the bookings feed maintains the shared `mcipro_bookings` cache read in 42 places (tee sheet, availability, my-bookings, proshop); scoping it starves that cache. Needs a re-architecture (per-course on-demand + re-subscribe on nav) + multi-device testing. Tiny/low-frequency table → low reward now.

## N+1 write loops → batches — LIVE
- `fixPlayerHandicap` (live scoring): up to 18 sequential score UPDATEs → one batch upsert of recomputed rows.
- Society join: 2 writes/society in a loop → one batched `society_members` upsert + one `society_handicaps` upsert (`ignoreDuplicates`).

## Caddy AUTO-PROMOTION (Pete chose option B) — TESTED, LIVE
`auto_promote_caddy_waitlist()` + `trg_auto_promote_caddy AFTER UPDATE ON caddy_bookings`: when a caddy booking goes `status='cancelled'` and carries a `caddy_id`, clone the freed slot into a new confirmed booking for the next `caddy_waitlist` (caddy_id + preferred_date, status='active', oldest first; `booking_source='waitlist_auto_promote'`, golfer name from user_profiles) + mark waitlist row `promoted`. Tested green (used a real `caddy_profiles` id). Wiring: join path `confirmWaitlist` already inserts status `active` ✓; real cancel paths set `status='cancelled'` ✓; added in-app notification to `handleRealtimeCaddyBookingChange` (INSERT where golfer_id===me && source===waitlist_auto_promote).
- **Caddy data-model caveats:** TWO caddy tables — `caddies` (8) and `caddy_profiles` (128, main; both caddy_id FKs point here). 16/55 caddy_bookings have `caddy_id=NULL` (text label only) → those can't auto-promote (data fix needed).
- **Featured Caddies widget** (hardcoded names + local-only waitlist, `BookingManager.waitlists`): Pete confirmed **INTENTIONAL demo — leave it, do not "clean up."**
- **Follow-ups (not started):** LINE push when app closed (in-app already notifies); caddy-ID data fix.

## DB objects added this arc (all additive)
- `auto_promote_waitlist()` + `trg_auto_promote_on_reg_change` (event_registrations)
- `auto_promote_caddy_waitlist()` + `trg_auto_promote_caddy` (caddy_bookings)
- (`enforce_event_capacity` + its trigger were created then dropped)

## OPEN / carryover
- #3 booking/caddy realtime course-scoping (held — needs re-architecture + testing).
- Caddy: LINE push; caddy-ID data fix; (Featured Caddies = leave as demo).
- Scale audit P2/P3 leftovers: getBookings column/scope trim + saveToCloud write→refetch (touch core booking sync — careful/tested).
- Keypad bug root cause; Erik→JGTS auto-attribution (older carryovers).
