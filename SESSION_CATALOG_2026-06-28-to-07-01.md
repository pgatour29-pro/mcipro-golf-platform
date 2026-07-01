# Session Catalog — 2026-06-28 to 2026-07-01

## Overview
A long TRGG-focused run: the Chiang Mai Classic multi-round Order-of-Merit feature,
a full **divisions** overhaul (auto-balanced D1/D2/D3), the organizer **Registered
Players Preview** with real-time cross-device sync, a **global membership-status
icon** system, the **TRGG Directory Join/Renew** flow, a complete **handicap-system
rebuild** (upload tool that stopped dropping names + handicaps current at *both*
registration and tee-sheet generation), the **LINE login-loop** fix, a live-scorecard
**pause/resume** timer, an events **Instructions** field with **auto competition fee**,
membership **renewal-date** correctness, **member-aware guest labelling**, and a
ground-up **revamp of the golfer event-details modal**.

All code changes are in `public/index.html`. Data/DDL via Supabase
(`npx supabase db query --linked`, dashboard token). Deploy = push `master` → Vercel
(propagates ~30–90s; poll `mycaddipro.com`, non-www).

**Companion deep-dive docs (read these for the gory detail):**
- [`LINE_LOGIN_LOOP_2026-06-29.md`](LINE_LOGIN_LOOP_2026-06-29.md) — login-loop incident + diagnosis runbook
- [`TRGG_JOIN_RENEW_2026-06-29.md`](TRGG_JOIN_RENEW_2026-06-29.md) — Join/Renew UI, data model, verification
- [`HANDICAP_FUCKUPS_2026-06-30.md`](HANDICAP_FUCKUPS_2026-06-30.md) — the handicap system bugs (system + mine) + fixes

---

## June 28 — Chiang Mai Classic / Special Events

| Commit | What |
|---|---|
| `6c8271c5` | Chiang Mai Classic multi-round **Order of Merit** special-event feature (`event_series` + `SpecialEvents`/`SpecialEventCreator`, `classic.html`) |
| `66356942` | Load **all nine-combinations** for the 27-hole resorts |
| `6d2564f4` | Proper **front/back nine selector** for 27-hole resorts |
| `be86ce13` | Fix Special Events modal **mobile** layout |

Multi-round series with aggregate standings. 4 Chiang Mai courses; Alpine SI derived.
Notification-safe event inserts (society_events writes fire LINE — see cross-cutting note below).

---

## June 28 — Divisions & Scoring

| Commit | What |
|---|---|
| `a1db3902` | **Shared D1/D2/D3 helper** — one division builder feeding both tee sheet and golfer pairings |
| `31604454` | Divisions default **2**, selector 2–8, collapse to a single division under 10 players |
| `d56e7cd5` | Pairings modal: only **ungrouped** players in the pool, fix **Avg NaN**, add division badges |

Divisions auto-balance by handicap. The single-source helper stopped the tee sheet and
the golfer view from disagreeing about who's in which flight.

---

## June 28 — Tee Sheet board readability

| Commit | What |
|---|---|
| `e2a36370` | Move division/membership badges **out of the truncating name span** (they were being clipped) |
| `ffcc1e25` | Compact membership icon, smaller van chip, divisions on the preview |
| `5057065b` | Widen group cubes **256→300px** so full names show |

---

## June 28 — Membership pricing & directory matching

| Commit | What |
|---|---|
| `b13b3fba` | Cash register: **"Join TRGG ฿1,000"** for never-members vs **"Renew"** for lapsed |
| `ed8705bc` | Correct pricing: new-member **Join = ฿2,000**, renew stays **฿1,000** |
| `ed2fe116` | Tolerant name matcher + fixed roster mismatches |
| `233a5105` | Event Fee Structure: default Transport/Competition to **300/250** when unset |

---

## June 28 — Golfer self-switch

`16bd60d9` — golfers can swap themselves into full groups and pick **"Play with"** a
specific person, without organizer approval.

---

## June 28–29 — Registered Players Preview + real-time sync

| Commit | What |
|---|---|
| `fe1b0b1a` | Sharpen the golfer Registered Players modal on desktop |
| `6472f51c` | Make the organizer Registered Players table taller |
| `bf46c11c` | **Pop-up-blocker-proof printing** — print in-page via a hidden iframe |
| `ed0f33de` | Full-page **Registered Players Preview** (`openPlayersPreview`) with real-time sync |
| `1e4221f5` | Preview: Add Player button + membership status badges |
| `0d88a2a6` | Fix membership-renewal fee **compounding + dropping** (event-day total) |

**Zero-lag multi-view sync pattern:** `updateRowUI(regId)` uses `querySelectorAll`
(not `querySelector`) and updates **every** rendered copy of a row (main table +
preview + roster) in place. Fee input scoped as `td[data-label="Fee"] input[type=number]`
(the preview's HCP cell is also a number input).

**Root cause of cross-device sync failures (server-side fix, no deploy):**
`event_registrations` was **not** in the `supabase_realtime` publication — changes saved
but never broadcast. `ALTER PUBLICATION supabase_realtime ADD TABLE event_registrations`
(+ `society_events`) and `REPLICA IDENTITY FULL` so DELETEs carry `event_id`.

Renewal-fee bug: the slip toggle used **delta math** and compounded (Danny Ford hit
฿5,200), and `recalculateFees` recomputed **without** the renewal so it kept wiping it
off. Fix: `calculatePlayerFee(...renewMembership, renewFee)` adds the stored `renewFee`;
the toggle is idempotent and persists `renewFee`.

See [`reference_registrations_preview_sync`] (memory) for the full pattern.

---

## June 29 — Global membership-status icons

`2e5b0c5c` — one icon set used **everywhere** a player is listed (`window.MembershipService`):

| Icon | Meaning |
|---|---|
| Blue circled check `check_circle` #2563eb | member, good standing |
| Amber check #f59e0b | member ≤30 days to renewal |
| Amber `!` `error` #f59e0b | expired |
| Red circled X `cancel` #dc2626 | non-member |

`ensure/ensureTRGG/ensureSociety` cache the roster; `status(id,name,ctx)` +
`iconHtml(...)`. TRGG → `trgg_members`; other societies → `society_members` (active only).

---

## June 29 — Tee Sheet ↔ Registrations live sync

`9a113509` — `window.TeeSheet` loaded once and went stale. It now subscribes to
`event_registrations` + `event_pairings` on its **own** channel `teesheet_live_<eventId>`
(NOT the shared fixed-name channels, which would collide — Supabase channels are keyed by
name; a 2nd subscribe to the same name crashes). `_liveReload` re-pulls + re-renders;
echo guard (`_lastLocalSave`, 2s) skips its own saves; unsubscribes on event switch.

---

## June 29–30 — LINE login loop  →  `LINE_LOGIN_LOOP_2026-06-29.md`

| Commit | What |
|---|---|
| `99d0e807` | Force **www → non-www** (canonical) via `vercel.json` 308 |
| `f01ce308` | **Surface** login failures on screen (`alert`) — they were silent |
| `47478bc5` | **Actual fix:** tolerate stale/mismatched OAuth state for the LINE provider |

The www-vs-non-www split made login complete on the *wrong* origin → loop. But the real
killer was an **OAuth state mismatch** (stale `state`), and `NotificationManager.show()`
is a **no-op** so the error was invisible — it just looked like a loop. Fix: when
`code && state && provider==='line'` and the stored state is missing/different, accept the
returned state instead of bailing. (Pre-auth OAuth-exchange functions also need
`--no-verify-jwt` or they reject and loop.)

---

## June 29 — TRGG Directory Join / Renew  →  `TRGG_JOIN_RENEW_2026-06-29.md`

| Commit | What |
|---|---|
| `7b0ec7b2` | Search-driven **Join / Renew** membership modal in the TRGG Directory |
| `ebb6a228` | Optional handicap on join → **auto-add to the players directory** |

`TRGGDirectory.openJoinRenew()` — search by name/number → Join (฿2,000, next sequential
member number) or Renew (฿1,000, keeps number). `_syncToDirectory` creates/finds the
player + `society_members` row + `society_handicaps`. New expiry = **renewal date + 1yr**
(see July 1 fix).

---

## June 29–July 1 — Handicap system rebuild  →  `HANDICAP_FUCKUPS_2026-06-30.md`

The big one. Multiple root causes; the recurring theme is **player-identity fragmentation**
(one person under several IDs with names in different orders) and **stale snapshots**.

| Commit | What |
|---|---|
| `60038e4f` | Tee sheet: resolve handicaps from the directory — **stop the hard-coded 24 default** |
| `e92c1e61` | **Rewrite the TRGG handicap upload** — load every name (no drops), 1:1 name match |
| `7909b024` | Upload also syncs **upcoming registrations** (snapshot → live) |
| `467a67cf` | Upload strips **"(handicap)"** annotations when matching names |
| `28ad00f1` | Upload **alias map** so nickname/spelling variants hit the real account |
| `cbaf9ac4` | Registration captures the player's **CURRENT GLOBAL** handicap **live at sign-up** |
| `3fc5151d` | Tee sheet + registrations **refresh handicaps to the current system value on generation** |

**"Everyone HCP 24 / one division":** typing a name into the Tee Sheet Add box created a
throwaway `manual_*` id with `handicap:null`, and `_syncRegistrations` defaulted nulls to
**24** → no spread → divisions collapse to 1. The real handicaps were in `user_profiles`
all along. Fix: `addManual` resolves the typed name against the directory (order-independent
token match) and uses the member's real id+handicap; `_resolveHcp` before any 24 fallback;
display via `_hcpOf` (prefers the registration).

**Upload was dropping names:** the old edge-fn path silently dropped names with no existing
profile and mishandled reversed names. Rewritten fully client-side: parse every distinct
name, match `user_profiles` by order-independent token key with a **per-key 1:1 rank**
(so "Komatsu, Takashi" 36.0 and "Takashi, Komatsu" 24.3 stay separate), update
`handicap_index` + `trgg_handicap` + `profile_data.handicap` + upsert `society_handicaps`,
and **create** missing as `TRGG-HCP-<ts>-<n>`. Plus-handicaps → negative. Loaded the full
**1,182-player** file (1,142 matched + ~40 created).

> **Key-normalization gotcha:** lowercase **before** stripping. `replace(/[^a-z0-9]/…)` on
> a mixed-case string deletes the uppercase letters (matched 0). My first pass got this
> wrong and created **1,177 duplicate profiles** — rolled back and reloaded correctly.

**Handicap must be current at BOTH registration AND tee-sheet generation** (Pete's rule —
a player's HCP changes between registering and playing):
- Sign-up (`cbaf9ac4`): fetch `user_profiles.handicap_index` **live** by golferId at
  registration time (not the cached `AppState`, which goes stale after an upload).
- Generation (`3fc5151d`): RPC `sync_event_reg_handicaps(p_event_id text)` (SECURITY
  DEFINER, name-based, dual-id safe) refreshes one event's registration handicaps to
  current; called in `TeeSheet.selectEvent` and `RegistrationsManager.loadEventData`
  (guarded once/event). ⚠️ This overwrites per-event manual HCP edits with the master on
  every open — intended (the master upload is the source of truth).

RPCs added: `sync_upcoming_trgg_reg_handicaps()`, `sync_event_reg_handicaps(text)`.
Table added: `trgg_handicap_alias(alias_key, golfer_id)` (8 seeded aliases).

---

## June 30 — Registration-page pairings module sync

`581514ac` — the organizer Registrations page has the table **and** a pairings module.
Editing a handicap updated the table + Tee Sheet but **not** the pairings module, because
`renderPairings` read a load-time `society_handicaps` snapshot. Fix: **both** `renderPairings`
UIs (there are two) resolve `reg.handicap` (live) first, then the snapshot, then stored;
`updateHandicap` also writes `currentHandicaps` so divisions/sheets stay in step.

---

## June 30 — Live scorecard pause/resume

`80156abe` — a **pause/resume** button on the round timer (front/back/total) for lunch
breaks and rain delays. `toggleRoundPause`/`pauseRoundTimer`/`resumeRoundTimer` on
`LiveScorecardSystem`; `timerPaused`/`timerPausedAt` persisted in save/loadRoundState;
`updateRoundTimer` freezes `now` at `timerPausedAt` while paused. Button `#roundTimerPauseBtn`
replaced the ⏱️ in `#roundTimerBar`; `onclick="LiveScorecardManager.toggleRoundPause()"`.

> `LiveScorecardSystem` is a **class**; the instance is `window.LiveScorecardManager`.
> onclick must use the instance, not the class (the class has no static methods).

---

## June 30 — Events Instructions field + auto competition fee

`ddc90ab6`:
- **Instructions** field (preferred lies / play ball down / local rules) on the event —
  organizer form `#eventInstructions`, stored on `society_events.instructions` (column
  added), read on create/update/load/edit, shown to golfers in an amber Instructions tile.
- **Auto competition fee** on TRGG registrations: `#regWantCompetition` defaults **checked**
  for TRGG events. Players can opt out later, or the organizer can remove it at payment.

---

## July 1 — Membership renewal-date & status correctness

| Commit | What |
|---|---|
| `4293ca7d` | Renewal: new expiry = **renewal date + 1 year** (was old-expiry + 1yr) |
| `ea30ddb6` | Membership status: compute **live from `expire_date`** (was trusting stale `days_remaining`) |

**Billy Shepley:** showed a yellow (renewal-due) check even after renewing because
`MembershipService` trusted the **stored** `days_remaining` snapshot (−177). Now days are
computed live from `expire_date` (`<0` expired, `≤30` renewal-due, else member), and
`days_remaining` was refreshed globally. Also his renewal had been added to the **old**
expiry (Dec 2026) instead of renewal-date + 1yr — fixed in code and data, and the same
renewal-date rule was applied to everyone else who had renewed.

> `trgg_members.days_remaining` is a **stale snapshot** — never trust it for status;
> always compute from `expire_date`.

---

## July 1 — Member-aware "(Guest)" labelling

`bd5ed110` — golfer registration used to append **"(Guest)"** to any added player without a
real LINE account, so members added by name got wrongly tagged. Now
`GolferEventsManager._guestDisplayName(name, lineUserId)` returns the plain name for a real
account **or** a member (via `MembershipService` for the event's society) and only appends
"(Guest)" for true non-members. Used in all 3 guest add/edit paths. The tag lives in
`event_registrations.player_name` so it shows everywhere; existing member-"(Guest)" names on
upcoming events were stripped via SQL.

> `GolferEventsManager` is the **active class** (`window.GolferEventsSystem = new
> GolferEventsManager()`); the object literal further down is a catch-block failure stub —
> edit the class, not the stub.

---

## July 1 — Golfer event-details modal revamp

`3ef7f912` — Pete: *"looks like shit … not aligned … looks like it's from the fucking 1980."*
Redesigned `#eventDetailModal` (the golfer's event-details / registration view):

- **Info tiles** (Date, Course, Format, Instructions, Spots) — uniform white cards with
  colored icon chips, aligned labels/values, reflow when a tile is hidden (was a rainbow of
  mismatched full-color boxes with uneven heights)
- **Fees** — right-aligned tabular amounts, highlighted All-Inclusive total, clean
  "Optional Add-ons" section
- **Registered players** — numbered avatars, HCP + caddy pills, fee breakdown,
  transport/competition badges
- Localization moved to a `data-ed` (EN/KO) scheme replacing the brittle color-class text
  swap; removed conflicting `data-i18n` keys that mislabelled the Course tile as "Select Event"

All element IDs preserved so the render JS (dates/course/format/fees/notes/players)
populates unchanged. Scoped CSS added under `#eventDetailModal` (`.ed-tile/.ed-ico/.ed-label/
.ed-val/.ed-card/.ed-fee-*/.ed-prow/.ed-hcp/.ed-pfee`). **Verified on the live page** via a
headless render at both desktop (~672px centered) and mobile (390px, 2-col tiles intact) —
no SyntaxError, app booted, modal forced open with mock data and screenshotted.

---

## July 1 — Instructions: always-visible cube + society default (set once, applies to every event)

| Commit | What |
|---|---|
| `a30c4a6a` | Instructions cube in the golfer modal now **always renders** (was hidden when empty) |
| `af098517` | **Society-default instructions** — set once, auto-fills new events, back-fills upcoming events |
| `9a0e3178` | Same Instructions control added to the **Registrations page** (no page-jumping) |
| `aa97adce` | Apply-to-all **visible feedback** (button flash) + explicit **"Remove from all"** |

**Always-visible cube:** `#eventDetailInstructionsContainer` no longer hides when empty — it
shows a muted `No special instructions — standard rules apply.` (KO variant too). Precedence:
per-event instructions → (society default, baked in per event) → generic placeholder.

**Society default:** new column `society_profiles.default_instructions` (added via mgmt token),
read/written with the **same anon-UPDATE path as `default_transport_fee`/`default_competition_fee`**
(so no new RLS/RPC). Functions `loadSocietyDefaultInstructions()` + `applyInstructionsToAllEvents(text, btnEl)`
+ `removeInstructionsFromAllEvents(btnEl, fieldId)`. New-event form auto-fills the Instructions field
from the society default (mirrors `loadSocietyDefaultFees`).

**"Set for all my events"** button: persists the default AND bulk-updates the society's UPCOMING
events (`SocietyOrganizerSystem.events` filtered by `date >= today`, chunked `.in('id', …)`). This is
where the July-1 trigger finding paid off — an **instructions-only `UPDATE society_events`** does NOT
fire the LINE notification trigger (it only fires on `event_date` / `start_time` / `course_name` change
or cancellation, verified via `pg_trigger`), so applying to all events does **not** spam players.
The old blanket "never write society_events" rule is therefore too broad — instructions-only writes
are safe. (TRGG can't inherit via `organizer_id` — all 30 upcoming TRGG events have `organizer_id = NULL`;
they're title-prefix matched — so the value is baked into each event rather than joined at read time.)

**Registrations page parity:** added `#regEventInstructions` into the existing editable "Event
Details" card; saved via `saveEventDetails` → `updateEvent` (maps `instructions`), populated on event
select. Same "Set for all my events" + "Remove from all" buttons. So the organizer manages
instructions from either the event form or the registrations page; both stay in sync.

**Feedback fix (important):** `NotificationManager.show()` is a no-op, so the apply/remove buttons
gave zero feedback — a 2nd click "did nothing" and there was no obvious undo. Now the clicked button
flashes solid-green `✓ Set for N events` / `✓ Cleared from N events` (red `Failed` on error) for
~2.6s via `_flashInstrBtn(btnEl,…)`, and "Remove from all" clears the field + strips instructions from
every upcoming event in one click. Verified the flash visually via headless render.

---

## July 1 — Match Play setup: light-theme colors

`f214a698` — the live-scorecard Match Play setup (**Match Play Format** / **Assign Teams** /
**Team Game Mode**, all inside `#matchPlayConfig`) uses hard-coded **dark inline backgrounds**
(`rgba(30,41,59)`, built for the Geekout/dark theme) plus mixed text colors, so in the **lite
theme** it rendered as dark cards with dark-on-dark format labels and light labels vanishing on
white — unreadable. Added `body.theme-light` overrides (with `!important` to beat the inline dark
backgrounds AND the pre-existing unconditional dark-card text-lightening rules) that make the cards
**white with dark readable text**, keeping the blue/red/amber team accent borders
(`[style*="rgba(30,41,59"]` → white; `#matchPlayConfig *` → `#1e293b`; re-assert `#3b82f6`/`#ef4444`/
`#f59e0b` borders). Dark/Geekout theme untouched (rules scoped to `body.theme-light`). Verified both
themes via headless render. NB: inline `style="…"` can only be beaten by a stylesheet rule marked
`!important` (see [[feedback_inline_styles_override]]).

---

## July 1 — Supabase Security Advisor remediation (DB-only, no commit)

Pete forwarded the Supabase Security Advisor email (2 CRITICALs). Fixed both at the database via
`npx supabase db query --linked`:

1. **"Table publicly accessible" (`rls_disabled_in_public`)** — only two tables had RLS off, both
   created earlier this session: `trgg_members` (973 rows) and `trgg_handicap_alias`. Enabled RLS +
   added the app's **standard 3-policy pattern** (`tmp_select`/`tmp_insert`/`tmp_update` for
   `anon, authenticated`, `USING/CHECK true`, **no DELETE**) — matching ~60 other tables. This clears
   the flag and blocks anonymous DELETE without breaking reads/writes (the browser uses the anon key).
2. **"User data exposed through a view" (`auth_users_exposed`)** — the `chat_users` view
   (`SELECT … u.email FROM auth.users u LEFT JOIN profiles p`) was readable by `anon`/`authenticated`,
   leaking emails via the API. The app doesn't query the view directly (it uses `chat_messages`); only
   two **SECURITY DEFINER** functions (`list_chat_contacts`, `search_chat_contacts`, owned by postgres)
   read it. Fix: `REVOKE ALL ON public.chat_users FROM anon, authenticated, PUBLIC` — the view is no
   longer API-exposed, the DEFINER functions still work. Verified only `postgres`/`service_role` retain
   grants.

⚠️ These are the app's **current** security posture (anon key can still read/write via the permissive
`tmp_*` policies) — true per-user security still needs the auth cutover (see
[[project_auth_architecture_v2]] / [[project_security_rls]]). This was reactive advisor triage, not
the full Phase-2 remediation.

---

## Cross-cutting rules reinforced this session

- **`society_events` writes fire LINE notifications** — but ONLY via a trigger that fires on
  `event_date` / `start_time` / `course_name` change or cancellation. Other columns
  (`instructions`, `notes`, `departure_time`, fees, title…) are notification-safe. So an
  instructions-only bulk update is fine; a date/time/course fix still needs the disable-trigger
  txn dance. (Handicap/registration tables don't fire at all.)
- **Never blame cache.** Read the JS console errors first; find the real bug.
- **`NotificationManager.show()` is a no-op** — "no toast" can mean feedback-less success or
  a swallowed error, not a failure.
- **Prefer the live value over the snapshot** — the recurring shape of the handicap and
  membership bugs (registration/tee-sheet/pairings all read a stale cached copy).
- **Verify UI visually before claiming done** — headless render + screenshot (this modal is
  behind login; force it open with mock data).
- Deploy is push-to-`master` → Vercel; **poll the live site for a unique marker** before
  telling Pete to refresh.
