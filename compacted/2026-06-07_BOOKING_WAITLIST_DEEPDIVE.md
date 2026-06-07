# Tee-Sheet ↔ Caddy ↔ Waitlist ↔ Event-Registration Deep-Dive — 2026-06-07

Read-only analysis (no changes made). 3 parallel code explorers + DB schema/trigger/function inspection. Goal: how the booking + waitlist ecosystem works end-to-end and where it's unreliable at scale, with a prioritized fix plan. Pairs with `2026-06-07_SCALE_AUDIT.md`.

Current volume (tiny): bookings 34, caddy_bookings 55, caddies 8, event_registrations 187, **event_waitlist 0 (never used yet)**, society_events 297.

---

## THE HEADLINE FINDING
The database already contains a **complete, correct, atomic waitlist-promotion engine** — `auto_promote_waitlist()` (plpgsql trigger function: reads the event max, counts registrations, pulls the next waitlist row by `position ASC, created_at ASC`, INSERTs the registration + DELETEs the waitlist row in a loop until full). **But it is broken + unplugged:**
1. **Not wired to any trigger** — the only triggers on these tables are `update_bookings_updated_at` (bookings) and the two society_events notification triggers. Nothing fires `auto_promote_waitlist`, so it never runs. That's why promotion today is **manual** (organizer clicks "Promote").
2. **Stale column** — it does `SELECT max_players FROM society_events`, but the current schema column is **`max_participants`** (renamed since the function was written). So if wired as-is, it would error.
3. It ignores the `auto_waitlist` flag — would promote for every event regardless of setting.

So event-waitlist promotion is ~90% built server-side; it needs a one-column fix + flag check + a trigger. This is the cheapest high-value win and the explorers (JS-only) couldn't see it.

`count_event_registrations(uuid[])` exists and IS used by the client (index.html:63757) for capacity counts. No caddy-side promotion function exists.

---

## FLOW 1 — TEE SHEET / BOOKINGS
- Source of truth: `bookings` table (text id, kind tee/caddie/service, date/time/tee_time, tee_sheet_course, group_id, status, golfer_id, caddie_id…), mirrored to localStorage `mcipro_bookings`, synced via `SimpleCloudSync` (800ms debounce, batch upsert onConflict=id), merged **last-write-wins on a client-set `updatedAt`**.
- Display: proshop tee sheet grid merges 4 sources (local, BookingManager, caddy_bookings cache, society events); capacity is a hardcoded ~50/day assumption, not enforced.
- **Gaps:** no DB uniqueness on a slot → two players can book the same tee time/course/slot; no server capacity check; conflict resolution uses client-controlled timestamps (clock skew/manipulation breaks it); a server `update_bookings_updated_at` trigger exists but the merge uses the client value. Realtime `bookings-changes` is **global** (all courses/dates).

## FLOW 2 — CADDY BOOKING + WAITLIST (worst shape)
- Booking: inserts into `caddy_bookings` (55 rows; caddy_id uuid, booking_date, tee_time, status). "Taken" is **implied by a booking existing** — no explicit availability flag on `caddies`, and **no uniqueness on (caddy_id, date, time)** → a caddy can be double-booked.
- **Dual waitlist systems:** (a) legacy in-memory `BookingManager.waitlists` with **hardcoded demo caddy names** (pat001 "Ning Prasert", c002…) — local to one device, lost on refresh; (b) the real `caddy_waitlist` table. They're never reconciled.
- Promotion: `notifyNextOnWaitlist()` operates on the **local demo** waitlist (shift array + `alert()` on the canceller's own device) — it does NOT touch `caddy_waitlist`, doesn't notify the promoted player, isn't atomic, and doesn't run if the canceller's app is closed. So real cross-user caddy promotion effectively doesn't happen. No server-side caddy promotion exists.
- Realtime `caddy-bookings-changes` / `caddies-changes` are **global** (all courses).

## FLOW 3 — EVENT REGISTRATION + WAITLIST
- Register: client inserts into `event_registrations` (187 rows; player_id text). **No server capacity enforcement** — capacity is only checked in the UI to pick which button to show, so two near-simultaneous registrations can overbook.
- Waitlist: client inserts into `event_waitlist` with FIFO `position`. Fine. (0 rows so far — not exercised in prod.)
- Promotion: **manual** — organizer clicks "Promote" → client does a two-step `INSERT into event_registrations` then `DELETE from event_waitlist` (not a transaction; can half-fail; capacity checked against a possibly-stale client cache; double-promote possible). The proper server engine (`auto_promote_waitlist`) is the dormant/broken one above.
- Realtime: event-scoped channels exist (`event_${eventId}_registrations/waitlist`) — good — but the dashboards also open **global** `all_registrations_changes` / `all_waitlist_changes` / `golfer_view_*` that reload ALL events on any change anywhere.

---

## PRIORITIZED PLAN
**1. Make event-waitlist promotion automatic + atomic (highest value, smallest change).** Fix `auto_promote_waitlist` (`max_players`→`max_participants`; honor the event's `auto_waitlist` flag; `SECURITY DEFINER`), then wire an `AFTER DELETE OR UPDATE` trigger on `event_registrations` (a cancellation frees a spot → auto-promote the next person server-side, atomically). Replaces the manual race-prone two-step. Test on a throwaway event first (event_waitlist is empty, so zero risk to real data).

**2. Capacity guard on registration (stop overbooking).** `BEFORE INSERT` trigger / RPC on `event_registrations` that rejects when count ≥ `max_participants` (except the promotion path). Closes the "both register when full" race at the DB, not the UI.

**3. Scope the realtime subscriptions (scale + correct shared visibility).** Event-scoped (event_id) for registrations/waitlist; course(+date)-scoped for bookings/caddies; drop the global `all_*` / `bookings-changes` / `caddy-*` / global `profiles-changes`. Everyone watching a given event/caddy/tee-sheet still gets live updates and promotions — only cross-event/cross-course fan-out is removed. (= P1 of the scale audit, now confirmed against the flows.)

**4. Caddy integrity + waitlist consolidation.** Build a server-side caddy promotion (mirror #1) on `caddy_waitlist`; delete the legacy in-memory `BookingManager.waitlists` + hardcoded demo caddy code; add a partial-unique index so a caddy can't be double-booked for the same date/time; notify the promoted player.

**5. Tee-slot integrity.** Partial unique index (or a capacity RPC) so the same course/date/tee_time slot can't be double-booked; use the server `updated_at` for conflict resolution instead of the client-set value.

**6. Promotion notifications.** When promoted (event or caddy), notify the player via LINE/push — today the promoted player is never actually told. Hook into the promotion trigger/function.

**Order:** 1 → 2 → 3 → 4 → 5 → 6. Items 1–2 make the event waitlist genuinely reliable (and #1 reuses an engine that's already 90% there). #3 is the scale unlock. #4–5 harden caddy + tee-slot integrity. #6 closes the UX loop.

All DB-side changes are additive (fix one function, add triggers/indexes) — no destructive schema work. The client changes are scoped to the subscription setup + removing the legacy caddy-waitlist demo path.
