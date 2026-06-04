# 2026-05-13: society_handicaps Duplicate Key Trigger Bug

## The Bug
The `auto_update_society_handicaps_on_round()` database trigger used `ON CONFLICT (golfer_id, society_id)` but the unique index `society_handicaps_golfer_society_idx` is an **expression index** using `COALESCE(society_id::text, 'UNIVERSAL')`. PostgreSQL cannot match expression-based indexes with plain column references in ON CONFLICT, so when `society_id IS NULL` (universal handicap), the conflict detection failed and the INSERT threw a duplicate key error.

**Error:** `Code: 23505, duplicate key value violates unique constraint "society_handicaps_golfer_society_idx"`

This caused **ROUND SAVE FAILED** for every player whose universal handicap record already existed in `society_handicaps`.

## Impact — Rounds Lost to This Bug
7 rounds failed to save to the `rounds` table. Hole-by-hole data existed in `scores` table (written during play) but never made it to `round_holes`. FW/GIR/Putts stats were lost (only held in browser memory `statsCache`, never persisted before save).

### Recovered rounds:
| Date | Player | Course | Gross | Stableford |
|------|--------|--------|-------|------------|
| 2026-05-13 | Pete Park | Eastern Star | 74 | 36 |
| 2026-05-13 | Jason Kang | Eastern Star | 82 | 37 |
| 2026-04-23 | Pete Park | Phoenix Gold (Mountain+Ocean) | 68 | 33 |
| 2026-04-23 | See-Hoe, Perry | Phoenix Gold (Mountain+Lake) | 74 | 29 |
| 2026-04-23 | Barklund, Carl | Phoenix Gold (Mountain+Lake) | 81 | 31 |
| 2026-04-23 | Chris | Phoenix Gold (Mountain+Lake) | 82 | 31 |
| 2026-04-27 | Willy Gourdin | Pattaya County Club | 80 | 35 |

**Kim's round (102, Eastern Star, May 13) saved successfully** — was a new player with no existing `society_handicaps` record, so no conflict.

## What Was Fixed

### Database (live immediately):
1. **`auto_update_society_handicaps_on_round()`** — replaced `INSERT ... ON CONFLICT (golfer_id, society_id)` with `DELETE WHERE ... IS NULL` + `INSERT` pattern for universal handicap (society_id IS NULL)
2. **`update_society_handicap_whs()`** — same fix, DELETE+INSERT instead of broken ON CONFLICT
3. **`update_society_handicap()`** — was already using DELETE+INSERT (fixed in a previous session via `FIX_HANDICAP_TRIGGER_NULL_CONFLICT.sql`)

### Client-side JS (deployed via git push):
4. **`adjustHandicapAfterRound()`** in `index.html` — two `.upsert({...}, { onConflict: 'golfer_id,society_id' })` calls replaced with `.delete().eq(...).is('society_id', null)` + `.insert(...)` pattern

## Recovery Method
1. Queried `scorecards` table for all completed scorecards
2. Cross-referenced against `rounds` table to find scorecards with no matching round
3. Inserted missing rounds into `rounds` table using scorecard data (golfer_id, course, gross, net, handicap, event, society)
4. Queried `scores` table for hole-by-hole data (written during live play)
5. Inserted into `round_holes` table
6. Updated `total_stableford` on each round

## What Could NOT Be Recovered
- **FW/GIR/Putts stats** for all 7 rounds — stored only in browser `statsCache` (memory), never written to any DB table before the round save. Lost permanently.

## Root Cause Timeline
- The expression index `society_handicaps_golfer_society_idx` was created to handle NULL society_id (since PostgreSQL unique constraints treat NULL != NULL)
- Multiple trigger rewrites over time (scramble fix, WHS 8-of-20, every-3-rounds universal) kept using `ON CONFLICT (golfer_id, society_id)` which doesn't match the expression index
- Bug only manifests when a player already has a universal handicap record — new players save fine

## Files Changed
- `public/index.html` — client-side upsert → delete+insert (lines ~72842, ~72862)
- DB functions: `auto_update_society_handicaps_on_round()`, `update_society_handicap_whs()` — via `supabase db query --linked`
