# MyCaddiPro — Project Memory

> Stable overview of the project. Start here. For the live to-do snapshot see **STATUS.md**, for the dated history see **progress.md**, for the "why we did it this way" record see **decisions.md**.

## What it is
**MyCaddiPro (MciPro)** is a golf platform for the Thailand golf-society scene. It runs society events end to end — registration, scheduling, live scoring, handicaps, caddy booking, leaderboards, and messaging — across four user roles: **golfers, golf-society organizers, caddies, and course/pro-shop staff**.

It's live in production at **mycaddipro.com** and in active daily use (real societies, real rounds).

## Who it's for
- **Golfers** — join societies, register for events, score live, track handicap/stats, book caddies. Two dashboard modes: **Light** (simple, default opt-in) and **Geekout/Full** (all tools + stats).
- **Society organizers** — create events, manage rosters, run the schedule, handle the money side.
- **Caddies** — profiles, bookings, waitlists.

## How it's built
- **Front end:** one large single-file web app — `public/index.html` (~124k lines of vanilla JS + HTML, no framework).
- **Back end:** **Supabase** (Postgres + RLS + edge functions + realtime).
- **Auth:** LINE login (Thailand's dominant messenger).
- **Deploy:** push to `master` → **auto-deploys via Vercel**. No CLI step.
- **Tests:** `npm test` runs the scoring engine suite (21 tests) — run before every deploy.
- **Observability:** crashes log to the `client_errors` table.

## Key references
- Live site: https://mycaddipro.com
- Architecture map: `arch_map/mcipro-architecture-map.html` — interactive map of the whole backend (233 nodes / 292 edges: client modules, edge functions, tables, RPCs, external services). **Local-only, never deployed** (it exposes backend structure). Regenerate with `python3 arch_map/scan.py`.
- **Full platform catalog: `project-memory/CATALOG.md`** — master inventory of every screen, feature system, DB table, RPC, edge function, integration, and tool (scanned 2026-06-17). Start here to find where anything lives.
- Daily work catalog example: `CHANGELOG-2026-06-14.md`.

## How AI should help (working agreement)
These are hard rules learned on this project:
1. **Console errors first** — read the actual JS error before guessing. Never blame cache.
2. **Surgical changes** — one fix at a time, verify it works, then move on. No blind bulk edits.
3. **Verify before claiming** — trace the full path (consumers, maps, DB) before saying something is broken/missing/done.
4. **Live-ops** — if the user is mid-round and something's broken, fix the data directly via SQL rather than looping them through reload-and-tap tests.
5. **No purple** — ever. Use green (`#22c55e`) for highlights.
6. **Run `npm test`** before deploying; **notify on Telegram** when a deploy is live.
7. **Don't bulk-edit `society_events`** — UPDATE/INSERT there fires LINE notifications to players.
8. **If context is missing, ask — don't invent it.**
