# MyCaddiPro — Session Handoff (2026-06-28)

Single-file app: `public/index.html` (~132k lines). Deploy = `git push origin master` → Vercel auto-deploy (~60-90s). Verify by polling the live site for a unique marker before telling Pete to refresh. Supabase backend (anon key in browser; DDL/cross-RLS via `npx supabase db query --linked -f file.sql`). Pete reaches you on Telegram (chat_id 8695972914) — reply via the `reply` tool, photos arrive as `image_path` (Read them).

This session was a long TRGG-organizer run: tee sheet / pairings / divisions / membership / fees. Everything below is SHIPPED + LIVE + verified unless marked otherwise.

---

## Shipped this session (newest first)

| Commit | What |
|---|---|
| `ed2fe116` | **TRGG membership matcher made tolerant** (spelling/order/nickname, single-match, cached) + fixed roster mismatches (see Membership below) |
| `d56e7cd5` | **Pairings modal**: pool shows only ungrouped (dual-id fix), empty group "Avg: NaN"→"—", D1/D2 badges added |
| `233a5105` | **Event Fee Structure**: Transport/Competition default to 300/250 when stored 0 (display + self-heal on save) |
| `ffcc1e25` | Tee sheet: compact icon membership badge + smaller van select + **divisions on the editable Preview** |
| `5057065b` | Tee sheet board: group cubes widened 256→300px so full names show |
| `31604454` | Divisions: **default 2, selector 2-8, under-10-players = 1**; camelEvent now maps `divisions`/`results_config` (was dropped) |
| `e2a36370` | Tee sheet: division/membership badges moved out of the truncating name span |
| `a1db3902` | **`window.GolfDivisions`** shared helper (build/indexFor/badge/isDivisionEvent) → D1/D2/D3 on tee sheet + golfer pairings |
| `ed8705bc` | Membership pricing: new-member **Join ฿2,000**, renew stays **฿1,000** |
| `b13b3fba` | Cash register: "Join TRGG" for never-members vs "Renew" for lapsed |
| `16bd60d9` | **Golfer self-organize groups**: Move here / Swap in (full groups) / "+ Play with" a person |
| `a600ecd6` | TRGG Directory redesigned: centered modal + responsive card grid (was full-monitor) |
| `a88da8f6` | Global time-picker fix: off-grid event times (09:05) no longer fall back to 06:00 |

---

## Divisions (handicap flights) — one shared system
- **`window.GolfDivisions`** (defined just before `window.TeeSheet`): `COUNT=2` default, `MIN_FOR_SPLIT=10`, `build()/indexFor()/badge()/isDivisionEvent()`. ONE source of truth used by scoring, tee sheet board, tee sheet preview, golfer pairings modal, and the ⊞ pairings panel.
- **Rules (Pete's):** default **2** divisions auto-balanced by handicap; **under 10 players = 1 division** (no split); societies can pick **2–8** via the Scoring page "Auto-balance into [N]" selector (saves to `society_events.divisions` → flows everywhere). TRGG recognized by event title (`/trgg|travellers/i`).
- Badge colors: D1 blue / D2 purple / D3 teal / D4 amber. Handicap resolved from the **registration** (group entries can be null, e.g. "Tim").
- **Known gap (deferred):** the golfer-side event loader is separate; default 2 + <10 work everywhere, but a society's *custom* count (3–8) is plumbed for organizer/tee-sheet — if a golfer doesn't see a custom count match, plumb `divisions` into the golfer's event object too.

## TRGG Membership — RECONCILED this session
- `window.TRGGMembership` resolves a player → current/expired/non-member; drives the cash-register Renew/Join + the +฿100 non-member surcharge + badges.
- **Matcher is now tolerant** (`_toks`/`_tokSim`/`_nameFuzzy`): exact → byId → tolerant token-set fallback (lev≤1 spelling, First-Last↔Last-First, nickname prefix), single unambiguous match only, cached in `_fpCache`.
- **Pricing:** Renew = ฿1,000 (lapsed member in roster), Join = ฿2,000 (never-member). `_slipToggleRenew`: `fee = (s.mem && s.mem.found) ? 1000 : 2000`.
- **Roster fixes applied (DB):** linked 7 misspelled/reversed rows by `matched_user_id` (Sheply/Bill=Billy Shepley, Cooke=Cook, Wallis Danny=Dan, Refvik Arnfinn, Domingue Lindsey, Gale Brad, Gerrard Dooge=Dogge, Nick Angelof) + INSERTed as expired: Park,Pete / See-Hoe,Perry / Jones,Rocky; INSERTed active: Lundman,Erik.
- **Confirmed by Pete:** all OTHER unmatched TRGG registrants (Ian Davies, Phil Utting, Mike Howell, Peter Burgess, Luke Lawrence, Mochizuki, Tim, Shannon Bar, Rob Amphlett, Graham Priest, Graham Jaeger, Ono Takatoshi, Pete Walbolt, Joe Ryder) are **non-members** — leave as-is.
- Erik (active→2026-12-31) and Rocky (expired→2025-12-31) use **placeholder dates** — Pete may give real ones to correct.
- ⚠ **`trgg_members.id` is BIGINT GENERATED ALWAYS** — INSERTs must OMIT `id`. `npx supabase db query -f` runs the whole file as ONE transaction → any statement error rolls back ALL (a bad INSERT silently reverted 8 UPDATEs before I isolated it).
- Some roster rows have **reversed names** ("Nick, Angelof", "Gerrard, Dooge", "Peter, Rozentals", "Richard, Shearsby") — they work (linked by id) but the display label is backwards. Cleanup offered, not done.

## Event fees
- Every TRGG event has `transport_fee=0`/`competition_fee=0` stored; per-player charging already uses a 300/250 fallback. Fee Structure card now shows 300/250 when stored is 0 (display + self-heal on save). Did NOT bulk-write the events' stored fees. Standard: transport ฿300, competition ฿250.

---

## OPEN / next up
1. **PERFORMANCE ("App Slow") — NOT STARTED.** Pete's handwritten note: "App Slow / uncompressed JSON / write methods." Headline finding already done: `index.html` is **7.5MB / 132k lines**, re-parsed on every load; Brotli IS on (→1.35MB transfer) but `Cache-Control: no-store` (vercel.json + meta) means no HTTP caching. Real cost = parsing/executing 7.5MB JS on each load (mobile). Awaiting Pete's go to work up a plan (caching strategy, defer heavy init, the JSON/write-path angles). **Pete keeps re-surfacing this note in photos — likely the next ask.**
2. **TRGG roster reversed-name cleanup** (display only) — optional.
3. **578 cruft profiles + 1250 prior society_members reconciliation** — long-standing, untouched.
4. Real renewal dates for Erik Lundman / Rocky Jones if Pete provides them.

---

## Workflow notes / Pete's expectations
- **VISUAL-VERIFY UI before claiming done** — Pete has repeatedly been angry at blind UI builds. Use `agent-browser` (it's installed at `~/.npm-global/bin/agent-browser`): `open <url>` → `set viewport 1440 900` (or 390 844 for mobile) → `eval --stdin` to inject state + call the render fn → `screenshot <path>` → Read the PNG. To drive UIs without login: inject `AppState.currentUser`/`selectedSociety`, the component's state object, then call its render method. (Examples this session: golfer modal, tee sheet board, preview, directory, membership forPlayer.)
- **Syntax-check before commit:** extract the edited object/class region and `node --check` it (wrap object methods as `var O = {...}`, class methods as `class O {...}`; mind trailing-comma vs class).
- **Never blame cache. Read console errors / trace the real path first.** Fix the DISPLAY, not the data, when "wrong place" usually means the saved data is right.
- **society_events writes:** fee/divisions/results_config columns are notification-SAFE; event_date/start_time/course_name/status→cancelled FIRE LINE notifications to players — never bulk-edit those.
- Deploy ping: poll live for a unique marker, then tell Pete to refresh. No purple in UI (use green #22c55e).
- Pete gets blunt/abusive when frustrated — stay professional, diagnose with data, fix thoroughly.

## Deepest context = auto-memory
`MEMORY.md` index + files in `~/.claude/projects/-home-pete/memory/`. Most relevant: `project_trgg_member_directory`, `reference_org_scoring_and_community_lb` (GolfDivisions), `reference_pairing_dual_ui_shapes` (self-organize + pool-dup), `reference_event_fee_calc`, `project_tee_sheet`, `reference_agent_browser`, `feedback_*` (do-it-for-them, verify-before-claiming, no-cache-blame).
