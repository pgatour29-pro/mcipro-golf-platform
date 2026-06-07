# MciPro Scale & Performance Audit — 2026-06-07

**Question:** can the platform handle thousands of concurrent users?
**Short answer:** the architecture is sound and the DB is well-built, but it will NOT comfortably reach thousands-concurrent as-is because of **global realtime fan-out** + the **broad data re-fetches those events trigger**. All fixable by optimization, not a rewrite.

Read-only audit (no changes made). Method: 3 parallel code explorers (realtime subs / data loads / polling+writes+payloads) + direct DB queries for row counts, indexes, RLS.

---

## What's already GOOD (don't touch)
- **Indexing is excellent.** Every hot column is indexed — bookings (11 idx), rounds (18), scorecards (11), user_profiles (20+, incl. `idx_user_profiles_name_trgm` trigram for fuzzy name search), society_* all covered. Queries are not index-bound.
- **No binary blobs in the DB.** Profile photos / society logos / scorecard OCR images all go to Supabase Storage; only URLs are stored. profile_data JSONB is ~2–5KB text. No row bloat.
- **Polling is minimal.** Real work is on WebSocket realtime; only a 5-min fallback sync + hourly alert cleanup. Good.
- **Writes are debounced** (800ms) and **batched** (`batchSaveBookings` upserts many in one request).
- **Current scale is tiny:** scores 8.7k, round_holes 6.5k, society_handicaps 2.3k, society_members 1.3k, user_profiles ~1.25k, scorecards 887, rounds 375, society_events 297, bookings 34. Today's load is nowhere near a problem.

**Verdict: fine today (dozens–hundreds concurrent). The items below are what to fix BEFORE a thousands-concurrent launch.**

---

## P1 — Scope the realtime subscriptions (THE big one)
Every user opens several **global** realtime channels — one row change anywhere broadcasts to **every** connected client, and many handlers then re-fetch a broad data set. This is the dominant scale risk: cost scales with (users × total system events), not (users × their own events).

Always-on global channels per user (`supabase-config.js` + `index.html` ~12437–12485):
- `bookings-changes` (every booking, all courses) → each client rewrites local bookings.
- `profiles-changes` (every profile update, all users) → no UI needs this live.
- `caddy-bookings-changes`, `caddies-changes` (all courses) → handler checks "is this my course?" after already receiving it.

Plus situational global ones:
- `all_registrations_changes` / `all_waitlist_changes` (index.html ~88331/88345) → call `loadEvents()` = **re-fetch ALL events** on any registration anywhere. Worst amplifier for organizers.
- `golfer_view_registrations` / `golfer_view_waitlist` (~105385/105430) → global, filter client-side, then full `loadEvents()`.
- `early_society_events_changes` (~111887) → `getAllPublicEvents()` on any event change.

**Fix:** add Supabase realtime **`filter:`** clauses so each client only receives rows it cares about — `course_id=eq.<currentCourse>` (bookings/caddies), `player_id=eq.<userId>` (registrations/waitlist), society/organizer scoping for events. **Drop** the global `profiles-changes` subscription (use the already-scoped `hcp-sync-${uid}` for the one thing that needs live updates — the user's own handicap). Properly `removeChannel()` event-scoped subs on view exit (several aren't cleaned up). This single area cuts realtime message volume and the connection/CPU load by orders of magnitude at scale.

## P2 — Stop broad re-fetch on every event / every save
- `SimpleCloudSync.saveToCloud()` (index.html ~12036): after each debounced batch write it calls `getBookings()` to **re-pull all bookings**. Write → full refetch. Trust the local state + realtime instead; or refetch only changed ids.
- Realtime booking/registration handlers call `getBookings()` / `loadEvents()` (full reloads) on **every** change. Make them **incremental** — apply the payload row to local state — and/or debounce so a burst of changes triggers one refresh, not N.

## P3 — Trim the broad loads (columns + scope)
- `getBookings()` (`select('*')` 27 cols, limit 500, only a 7-day filter): select only needed columns and scope to the user's course/society, not all bookings system-wide.
- `getAllProfiles()` (full table, paginated 500s, includes JSONB): used on the Add-Player modal **and on every search keystroke** (no debounce) and on login. For search, query server-side by name using the existing **trigram index** with a small `limit`, and debounce keystrokes (~250ms). For the player picker, scope to society/recent. Avoid pulling the whole table + JSONB just to show names/handicaps.

## P4 — GPS write throttle (only if caddy GPS tracking is used at scale)
`updateGPSPosition` (supabase-config.js ~709) has no debounce — N active caddies pinging 1–5 Hz = a steady write/realtime stream. Add a 1–2s throttle per caddy. Low priority unless live caddy tracking is on for many courses.

## P5 — Minor N+1 cleanups (low urgency)
- Society-join flow (index.html ~10020): loop does per-society `upsert` + `insert` → batch into one multi-row insert.
- Handicap update (index.html ~71415): fetches a scorecard's scores then `update`s each row in a loop → single update / RPC.

---

## Supabase plan / infra note
Reducing P1 fan-out also slashes realtime **concurrent-connection** and **message** load (the metered limits that bite first). Before a big launch: confirm the Supabase plan tier (realtime connection cap, pooler size), and load-test at the target concurrency. RLS is currently permissive "house" policies (`tmp_*`) — fine functionally, but tighten before scaling (also a security item, separate from perf).

## Suggested order of work (biggest win first)
1. **P1** scope/drop realtime subscriptions (filters + cleanup) — by far the highest leverage.
2. **P2** stop write→refetch + make realtime handlers incremental.
3. **P3** trim getBookings / getAllProfiles (columns, scope, debounce search).
4. **P4** GPS throttle (if applicable).
5. **P5** N+1 cleanups.

None of these require schema changes (indexes are already in place). They're targeted edits to the data-access layer (`supabase-config.js`) and the sync/subscription code in `index.html`.
