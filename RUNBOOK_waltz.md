# RUNBOOK — 3-Man Waltz (1-2-3) Stableford scoring

**For:** Hal · **Owner:** Park · **Scope:** add a new scoring format. Additive only.

## What the format is
Teams of three, Stableford points. The number of scores that count rotates every three
holes: hole 1 counts the best **1** score, hole 2 the best **2**, hole 3 **all 3**, then
the cycle repeats (4→1, 5→2, 6→3, …). Team total = sum of counted points over 18 holes.
Stableford is deliberate: on the "all 3 count" holes a blow-up scores 0 rather than a big
number, which is why the format uses points, not strokes.

## Hard constraints (do not drift from these)
1. **Surgical edits only.** No refactors, no reformatting, no "while I'm here" changes.
   Touch only what this RUNBOOK names.
2. **The monolith stays in the main session.** Any edit to `public/index.html` (~99K lines)
   is done in the main session, never delegated to a subagent.
3. **New files are low-risk and preferred.** `waltz.ts` and the SQL are standalone; add them
   as files rather than pasting logic inline where avoidable.
4. **RLS is mandatory** on anything persisted. `waltz_schema.sql` ships with policies — do not
   create those tables without them.
5. **No hardcoded UI strings.** Use the i18n keys (EN/TH/KO/JA) in `waltz.i18n.json`.
6. **Do not invent schema.** `waltz_schema.sql` is a template; reconcile the `WIRE` FKs against
   the real events/rounds/profiles tables and confirm with Park before running it.

## Package contents
| File | Purpose | Risk |
|---|---|---|
| `waltz.ts` | Client scoring engine (pure functions). The source of truth. | low (new file) |
| `waltz.test.ts` | 22 assertions incl. plus-handicaps + worked example. | none |
| `waltz.sql` | Server-side parity (immutable helpers + `waltz.score_round` RPC). | low (new schema) |
| `waltz_schema.sql` | Teams/members/results tables + RLS. **Template — reconcile FKs.** | medium |
| `waltz.i18n.json` | Format name + column/label strings in en/th/ko/ja. | low |

Client and server are proven equivalent: the SQL arithmetic was cross-checked against the TS
across all 1,098 handicap×SI combinations, and strokes dealt over 18 holes always sum back to
the course handicap (plus-handicaps included).

## Placement — where this lives in the app
Wire the format into **two** existing places. Locate both by grepping `public/index.html`
(e.g. search for the existing format names / the games-format registry / the Start Round
setup handler) — **do not fabricate line numbers**, find the real anchors first. All edits
here are to the monolith, so they happen **in the main session**.

### 1. Games / format section (the format registry)
- Register Waltz alongside the existing formats so it appears wherever formats are listed
  and selectable. Follow the exact shape of the existing entries — same object/enum/config
  pattern, no new structure invented.
- Mark it as a **team format, team size = 3**, using whatever flag the existing team formats
  (e.g. scramble/best-ball) already use. If no such flag exists yet, add the minimal field the
  other team formats would need — confirm with Park before introducing it.
- Label + description come from the i18n keys (`format.waltz.name`, `format.waltz.short`,
  `format.waltz.description`), not hardcoded text.

### 2. Start Round section (round setup)
- Add Waltz as a selectable option in the format picker of the Start Round flow, reading from
  the registry entry above (don't duplicate the definition).
- Because it's a team-of-3 format, Start Round must let the organiser **group players into
  teams of three** when Waltz is selected — reuse the existing team-assignment UI if the app
  already has one for other team formats; do not build a parallel one. Validate that each team
  has exactly 3 players before the round can start.
- Persist the chosen format + team groupings using whatever Start Round already does to save a
  round. If teams need to survive server-side, that's what `waltz_schema.sql` is for (optional,
  see step C) — otherwise in-round client state is fine.
- Surface the per-hole count rule to players (hole 1 → 1 counts, etc.) using `waltz.count.1/2/3`
  so the format is legible once the round begins.

> If the current Start Round flow has **no** concept of teams at all (all existing formats are
> individual), stop and check with Park before adding team grouping — that's a bigger surface
> than a single format and shouldn't be freelanced.

## Integration steps

### A. Client (recommended default — compute in the browser, matches current architecture)
1. Add `waltz.ts` to the codebase as a module. If the build can't import an external module
   into the monolith, port the five functions verbatim into the existing scoring section of
   `public/index.html` **in the main session** — do not alter their logic.
2. Feed it `courseHandicap` **already allowance-adjusted and rounded to an int** (e.g. 90%
   applied upstream). The engine must not see raw handicap; allowance is a competition-config
   concern, kept out of the math on purpose.
3. Render from the `scoreWaltz()` output: per-hole `count` badge, per-player points, the
   `contributing` player list, `teamPoints`, and `total`. Pull all labels from the i18n keys.

### B. Server (optional — only if you want authoritative/tamper-proof totals)
1. Run `waltz.sql` in the Supabase SQL editor (creates schema `waltz`).
2. Call as RPC, e.g. `supabase.rpc('score_round', { p_holes, p_players })` (expose via the
   `waltz` schema or wrap in a `public` function per your RPC conventions). Inputs mirror the
   TS shapes exactly; output JSON mirrors `scoreWaltz()`.

### C. Persistence (optional — only if teams/results must be saved)
1. Open `waltz_schema.sql`, replace every `WIRE` FK with the real table references, confirm
   with Park.
2. Run it. Verify RLS is ON for all three tables and that a non-member cannot select a team.
3. Writes to `waltz_results` should come from a service-role context (Edge Function), which
   bypasses RLS by design; reads are gated to members/creator.

## Acceptance tests (must pass before calling this done)
1. `npx tsx waltz.test.ts` → **22 passed, 0 failed**.
2. Reproduce the worked example by hand in the UI: players A(CH10)/B(CH18)/C(CH24), pars 4,
   SI 1/2/3, gross A[5,6,4] B[6,5,7] C[7,8,6] → hole points **2, 3, 5**, 3-hole total **10**.
3. If server deployed: `select waltz.score_round(<same inputs>)` returns the same total (10).
4. Switch UI language TH/KO/JA → no English leaks in the Waltz screens.

## Decisions locked (don't re-litigate without Park)
- Allowance is applied **upstream**, engine takes the adjusted int.
- Pattern is a clean **1-2-3 reset every 3 holes** (not tied to par/SI).
- Counts the **best** N scores (not worst-ball).
- `null`/picked-up gross → **0 points** for that player on that hole.
- Ties for the last contributing slot don't affect the total (points are equal); only affects
  which name is shown as "counted" — pick a deterministic tiebreak (lower gross) if display matters.

## Rollback
All additive. Client: remove the module/functions and the format option. Server: `drop schema
waltz cascade;` and `drop table public.waltz_results, public.waltz_team_members,
public.waltz_teams cascade;`. No existing objects are modified.

## Out of scope (do NOT do)
- No changes to existing scoring formats, tables, or components.
- No new dependencies.
- The only sanctioned `public/index.html` edits are: (a) the scoring insertion in step A2,
  (b) the format-registry entry, and (c) the Start Round picker + team-of-3 grouping — all in
  the main session. Nothing else in the monolith gets touched.
