# STATUS — current snapshot

_Last updated: 2026-06-21_

## Where the project stands now
Live in production and in daily use. Most recent: a **player-selectable Light/Dark COLOR theme** for the golfer **Start Round + Live Scoring** pages (outdoor-readable; default Dark, opt-in Light, saved to profile) — shipped 2026-06-21 (`fded2d26`→`e8854e95`→`3e4a954b`). This is separate from the Lite/Geekout density mode. No known critical issues open.

## Current focus
- **Light/Dark color theme** — just shipped + polished from live mobile feedback (see progress.md / SESSION-2026-06-21.md). Awaiting Pete's outdoor read; minor cosmetic items remain (below).

## Next actions / open items
(roughly highest-value first — confirm priority with Pete)

- **`loadMySocieties` bug** — the profile page "My Societies" list queries a `society_name` column that doesn't exist on `society_members`, so it silently comes up empty. Fix = join `society_id → society_profiles` for the name. _(Found 2026-06-14, not yet fixed.)_
- **Multi-device games sync** — the Press + per-player points game feature works on one device; syncing live across players' devices is still to do.
- **SOS / emergency** — still pending: role filtering, alert history, and push/LINE notifications to organizers.
- **Preferred-partner notification** — notify a player when someone selects them as a preferred partner.
- **Supabase 1000-row cap audit** — `.in('round_id', ids)` truncates at 1000 rows; Round History was fixed (chunk by 50) but ~5 other call sites are unaudited.
- **Society Events card unresponsive** — a dashboard card at the bottom was reported unresponsive; was awaiting a tap-test from Pete to identify the overlay. _(Verify whether still an issue.)_
- **JGTS** — auto-attribute Erik Lundman's non-TRGG rounds to the JGTS society.
- **Light/Dark theme follow-ups** _(cosmetic, 2026-06-21)_ — live-leaderboard overlay not eyeballed in light; start-page toggle-switch tracks slightly dark; hamburger drawer / games modal untested in light; theme scope is golfer Start Round + Live Scoring only. See SESSION-2026-06-21.md §4.

## Security track (planned, larger)
- **RLS hardening Phase 2** — move from LINE-id-filtered queries to real JWT/row-level auth. Phase 1 (block deletes) is done.
- **Auth architecture v2** — the agreed direction is magic-link OTP + a `profile_id` claim, **not** passwords.

## Bucket list (deferred, not scheduled)
- **Plutaluang hole layouts** — satellite→render pipeline for 36 holes is built and proven; blocked only on getting per-hole coordinates.

## Blockers
- None critical. Items above are prioritization calls, not hard blocks.
