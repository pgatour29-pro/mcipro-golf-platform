# Session Catalog — 2026-06-02

All in `public/index.html` (deploy: push to master → Netlify → mycaddipro.com; every change verified live). DB = Supabase `pyeeplwsnupmhgbguwqs`.

## Round timing (front/back/total pace) — analytics
- **c7ccf285** — Capture front-9/back-9/total round times at completion (`getRoundTimings`, mirrors live timer, handles back-9-first shotgun) → new `rounds.front9_seconds/back9_seconds/total_seconds` columns (added via SQL). Shown as a pace row (⏱ Front/Back/Total) on the golfer Round History card. Saved on both update + insert paths.
- **74cf0f72** — Pace row on each round in the ORGANIZER round-history (per event).
- **707b759c** — Event-level **average pace** summary card at top of organizer rounds (loads `society_events` title/event_date → groups rounds by `society_event_id`, avg F/B/Tot + round count).
- **827a49da** — Course-level average pace rollup (across all events at each course; round + event counts). Both summaries respect the page filters.

## 6 ft proximity (better putting stats)
- **23add226** — Added a **6 ft** button between 3 and 10 on BOTH 1st Putt and 2nd Putt distance rows (`3 · 6 · 10 · 20 · 30+`). Round-details 1st/2nd Putt Make % breakdowns gained a 6 ft bucket (grid 4→5 cols).
- **00b0dae5** — "Make % 6ft" community leaderboard category (prox6 bucket + getTopN).

## Stats capture fixes
- **5e50933c** — **Track Stats (FW/GIR/Putts) toggle now defaults ON.** Was OFF; and stats save is GATED by the toggle — when off, every stat field (FW/GIR/putts/proximity) saved as NULL even if entered. Default-on (`mcipro_trackStats !== 'false'`, respects explicit off) so stats are captured. All 3 reads updated.
- **3143224d** — **Putts saving null bug.** The putts stepper showed "2" by default but only stored a value when tapped → untouched (2-putt) holes saved null and weren't counted (a full round showed only ~10 putts). Now defaults to 2 (the displayed value) for played stats-tracked holes; tap +/- for 1- or 3-putts. (Also backfilled Pete's Bangpakong round: 12 blank holes → 2 putts = 34 total.)
- **7ae53e1b** — Show round duration (Total + F/B) as a "Round Time" field in the round DETAILS view (was only on the history list card).

## Data fixes (SQL)
- Bangpakong round (Pete) putts backfilled to 34 (F15/B19).

## Other
- Diagnosed the missing-from-leaderboard issue continued from 06-01; explained Track Stats gating; answered multi-device + "join the games" model questions.
