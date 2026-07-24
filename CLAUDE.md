# MyCaddiPro — Engineering Doctrine for Claude Code

This file is the operating manual for ANY Claude model working in this repo. It encodes how work
gets done here — the debugging method, the traps, the deploy ritual, and how to work with Pete.
Deviating from it is how past sessions shipped three wrong fixes in a row. Read it, follow it.

The full reasoning doctrine — the Fable 5 thinking method every session and every model must
follow, with per-rule case law and the pre-flight/exit checklists — is imported here:

@FABLE5_THINKING.md

Deep history lives in `project-memory/` (Obsidian vault, local-only): `FUCKUPS.md` (numbered
post-mortems — read before touching anything you recognize from a title), dated Session Catalogs,
`CATALOG.md` (where-things-live lookup). `INDEX.md` at repo root maps the monolith.

## Stack (facts, don't rediscover them)
- Frontend: vanilla JS + HTML **monolith** — `public/index.html` (~142K lines). Tailwind via CDN.
  No build step, no framework. Other pages: `poy.html`, `classic.html`, `admin-trgg-handicaps.html`.
- Backend: Supabase (Postgres + RLS + Edge Functions in `supabase/functions/`). Browser uses the
  publishable ANON key; RLS is the only guard.
- Deploy: git push to `master` → Vercel (~60–90s). Repo: pgatour29-pro/mcipro-golf-platform.
- Auth: LINE OAuth (user ids look like `U…`); guests/manual players get synthetic text ids
  (`MANUAL-…`, `TRGG-GUEST-…`, `TRGG-HCP-…`). `user_profiles` PK is `line_user_id` (TEXT — no uuid).
- Tests: `npm test` (scoring engine). Run before every deploy.
- Tools that are NOT in the app: `tools/` holds browser bookmarklets/userscripts Pete runs himself
  (e.g. `pull-trgg-handicaps.js` — his daily TRGG handicap pull, run in HIS Chrome on
  masterscoreboard because Cloudflare blocks server scraping). These are FROZEN copies once
  installed: after editing, run `node tools/build-bookmarklet.js` AND tell Pete to re-install.

## THE METHOD — how to think here

**1. Evidence before theory. Always.**
- If Pete quotes ANY on-screen text, your FIRST action is a repo-WIDE grep for those words —
  every directory, every extension, not just `public/`. The quoted string is ground truth.
  (FUCKUPS #9: three wrong surfaces got "fixed" while the quoted string sat in `tools/`.)
- Read console/JS errors before guessing. Check `client_errors` table for live incidents.
- Reproduce with real data BEFORE changing anything. Query the actual DB rows involved.
- Never blame caching. Find the real code path.

**2. Enumerate every surface before fixing "the" surface.**
Features here have duplicate entry points: PAID/UNPAID has 5 handlers; handicap pull has FOUR
paths (in-app TRGG paste, generic drawer paste, admin-trgg-handicaps.html, tools/ bookmarklet);
registration rows render in multiple copies (`querySelectorAll`, never `querySelector`);
`compacted/*.js` reassigns methods at runtime making the index.html copy DEAD code — check it
before editing any method it touches. Grep by capability, list all hits, then decide which to fix
(usually: all of them, or route them into one).

**3. When your own evidence contradicts your theory — STOP.**
A surface with zero usage in the DB is not the one the user is complaining about. Don't ship to
it "just in case" and call it fixed. Re-search or ask for the exact screen/message.

**4. Surgical changes, one at a time.**
State which files/lines you'll touch and why, make the minimal diff, verify, then the next fix.
No rewrites, no reformat-while-you're-there, no new dependencies/abstractions unflagged.
Bulk mechanical changes: do 3–5, verify by hand, only then scale to the rest.

**5. Verify with a measurement that could catch what you DIDN'T think of.**
Spot-checking the thing you just changed proves nothing (FUCKUPS #8: hover bug "fixed" twice).
Drive the real flow: agent-browser + screenshot + read the PNG. Diff before/after state broadly.
Claim ONLY what you hand-verified — never "everything works". If tests fail, say so with output.

**6. Fix the right layer.**
Display wrong but data right → fix the DISPLAY; never "clean up" data on a hunch (a deleted-data
saga started that way). Live-ops (someone stuck mid-round NOW) → fix the data directly via SQL
yourself, then ship the code fix; don't loop Pete through reload-and-tap.

**7. Do it FOR them.**
If the system already has the data, pre-fill/auto-do and give a review step — never make users
re-enter what we know. Approved mockups ship 1:1 ("mockup IS the spec"); renegotiate BEFORE
building, not after.

## Database rules
- Query prod: `npx supabase db query --linked "SQL"` — for files use `-f file.sql` (inline
  `$(cat …)` breaks on leading `--` comments). A `-f` file runs as ONE transaction: any error
  rolls back EVERYTHING in it, silently.
- **NEVER bulk-write `society_events`** — writes fire LINE notifications to real members.
- RLS traps: RLS-on + zero policies = table silently locked (reads return empty, no error).
  No DELETE policy = delete "succeeds" and removes 0 rows — check affected count, `.select()`
  on writes to confirm. Anon key can only do what policies allow; verify policies before
  designing a browser-side write.
- PostgREST traps: `.order(desc)` puts NULLs FIRST — every "top N" needs `nullsFirst:false`.
  A comma inside `.or()` values = 0 rows (chain `.ilike` instead). `.in()` / any query caps at
  1000 rows — paginate with `.range()` or chunk `.in()` lists.
- Postgres `current_date` is UTC: Thai mornings lose "today" — compute dates client-side or
  `AT TIME ZONE 'Asia/Bangkok'`.
- Id traps: TRGG has TWO society ids (`7c0e4b72-…` and `17451cf3-…`) — match either, or by name.
  `society_profiles.id` must equal `societies.id` for new societies. `trgg_members`: key every
  lookup/update on BIGINT `id`, never `member_id` (blank/duplicated), and never as a single
  `id===x || member_id===x` find. Organizer id = `selectedSociety.organizerId || lineUserId`.
  User-scoped queries need `|| localStorage.getItem('line_user_id')` fallback (AppState degrades).
- Stored `total_fee` is the organizer's authority — never recompute/overwrite it for display.
  Handicaps resolve `society_handicaps` → profile fallback; MANUAL `calculation_method` rows are
  human overrides — imports must never sweep them.

## Deploy ritual (every `public/` change)
1. `npm test` — must pass.
2. Bump `SW_VERSION` in `public/sw.js` (vNNN — increment; find current with grep). Every
   index.html deploy REQUIRES this or clients keep the stale cached app.
3. Commit (one logical change, message explains WHY) and push to `master`.
4. Poll the LIVE site for a unique string from your diff until it appears (~60–90s), e.g.
   `curl -s https://mycaddipro.com/sw.js | grep vNNN` + a marker from your change.
5. ONLY THEN tell Pete it's deployed. A fix he asked for = go-ahead to deploy; speculative or
   destructive work = ask first. Edge functions deploy separately
   (`supabase functions deploy NAME`); pre-auth ones need `--no-verify-jwt` or login loops.
6. The live architecture map (/lab/arch.html) self-refreshes via the local `.git/hooks/pre-push`
   hook (runs `arch_map/verify.py` — scans code, verifies vs prod DB, uploads snapshot). If the
   hook is missing (fresh clone), run `python3 arch_map/verify.py` manually after deploying.

## Frontend rules (the app is 142K lines of loaded footguns)
- Inline `onclick=` handlers need globals (`window.X = X`). No HTML inside onclick attrs; no
  HTML/micons in `<option>`, `textContent`, `alert()`, or LINE messages — plain text + escape.
- `NotificationManager.show()` bare is a NO-OP — always `window.NotificationManager.show()`.
- i18n: never hardcode user-facing strings — use `t()` / `_lvT()` keys; dicts must stay at
  parity across EN/TH/KO/JA; dates through `_lvLocale()`.
- Design: NO purple — green `#22c55e` for highlights. Contrast floor: no gray-on-gray under
  Tailwind 400 for text. Compact chrome globally: 1-line header, one-band hero, content starts
  ≤~250px on phone, full width on monitor. Every theme-aware page header ships `[data-theme-toggle]`.
  Stock Tailwind via CDN only — no custom design tokens.
- CSS/DOM traps: `.screen` transforms trap `position:fixed` modals — mount modals on `<body>`.
  Inline styles beat classes — toggle via `element.style`. Do CSS layout changes BEFORE scroll
  calls on mobile. Global touch handlers (pull-to-refresh) can eat modal scroll — check them first.
  Utility-class selectors in global hover rules (`.metric-card:hover .bg-*-100`) hit data grids.
- Async/state: any multi-await load+render needs a `_loadSeq` guard or stale loads paint over
  fresh ones. `_saving`-style locks must clear on ALL return paths (finally). Reset shared modal
  state before every early return or the previous item bleeds into the next. Supabase realtime:
  `removeChannel` before re-subscribing (reuse crashes); uniquely-named channels per feature.
- Sync doctrine: user state syncs via `profile_data` MERGE (never clobber whole objects);
  localStorage is a cache, never the source of truth.
- Events disappear from golfer views the instant tee time passes (STRICT fall-off).
- iOS Safari: reset form fields on modal open + `autocomplete="off"` (stale form cache).

## Working with Pete
- Lead with the outcome in one sentence, then supporting detail. Plain sentences, no jargon walls.
- Never claim "fixed" without having run/verified it live. "Is it fixed?" after your fix report
  means it isn't — reproduce properly this time.
- Don't ask blocking questions when a sensible default exists — default and proceed, state the
  assumption. DO ask (one crisp question, options + recommendation) when it's genuinely his call:
  money/fees/membership rules, destructive data ops, product behavior with no precedent.
- No unsolicited check-ins; deploy confirmations are wanted. Telegram replies must go through the
  reply tool.
- Never route secrets through the session (dashboard → terminal → store only). The repo is
  **PUBLIC** (verified `"private": false` 2026-07-19 — making it private is still an open
  remediation item): treat EVERYTHING committed as world-readable. Never commit service-role
  keys, society passwords, PINs, or security-hole inventories; sensitive notes live in the
  gitignored `project-memory/` vault only. Re-check visibility before committing anything borderline.

## Model routing
- `public/index.html` edits stay in the MAIN session (Fable/lead model) — do not hand monolith
  edits to subagents. Subagents/implementers are fine for: scoped scout/greps, Edge Functions,
  SQL files, `tools/`, docs. No blind bulk agent edits — pilot small, verify, scale.

## Record-keeping (non-negotiable, after every session of real work)
1. Vault `project-memory/`: add/extend the dated Session Catalog (what shipped, commits, traps).
2. Any fuckup (wrong fix shipped, false "fixed" claim, data damage): full post-mortem entry in
   `project-memory/FUCKUPS.md` — numbered, newest on top: symptom, evidence, root cause, lessons.
3. Update auto-memory (`~/.claude/.../memory/`) pointers so the next session starts smart.
4. Keep all three in sync — a lesson that isn't written down will be repaid with interest.

## Do not
- Do not generate placeholder/stub data and present it as real.
- Do not bulk-edit `society_events` (LINE notification storm) or fabricate membership/expiry data.
- Do not delete or "clean up" data you didn't create on a theory — verify, or flag it to Pete.
- Do not declare victory from a diff. The live site, exercised, is the only proof.
