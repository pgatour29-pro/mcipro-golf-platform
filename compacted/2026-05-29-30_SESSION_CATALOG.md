# SESSION CATALOG — May 29-30, 2026

## Summary
Community rankings for ALL stats, score entry fix, course auto-select fix, proximity UX changes. Then a COMPLETE SECURITY REMEDIATION: RLS on all tables, DELETE blocked, 9 Edge Functions deployed, sealed asymmetric JWT architecture designed, full policy classification for ~120 tables, PIN exposure closed, profile identity foundation built, Phase A key swap executed.

---

## FUCKUPS

### FUCKUP #1: Proximity Ranking Not Showing (3 COMMITS TO FIX)
**Issue:** Avg Proximity showed value but no community ranking badge.
**Root Cause Chain:**
1. Minimum players threshold too high → changed to 1
2. Race condition — addCommunityRankings() ran before loadSeasonStats() finished → chained with .then()
3. Supabase 1000-row limit — 500 rounds × 18 holes = 9000 rows, only 1000 returned → batched in chunks of 50
**Lesson:** Supabase has a 1000-row default limit. Batch round_holes queries.

### FUCKUP #2: Event-Day Ranking Missing Stats
**Issue:** Proximity/Approach/BB/GB not in Event Day Ranking box.
**Root Cause:** Threshold `> 1` instead of `>= 1`.
**Lesson:** Fix ALL ranking thresholds at once, not one at a time.

### FUCKUP #3: Course Not Auto-Selecting
**Issue:** "TRGG - GREEN VALLEY FREE FOOD FRIDAY" didn't match course dropdown.
**Root Cause:** `courseId` missing from `getAllPublicEvents()` mapping + "FREE FOOD FRIDAY" diluted fuzzy match score below 40 threshold.
**Fix:** Added courseId to mapping + added day/event words to strip function.

### FUCKUP #4: Score Entry Failing from Hole 8+
**Issue:** First score on each hole rejected, needed multiple taps.
**Root Cause:** `nextHole()`, `prevHole()`, `goToHole()`, `goToLatestHole()` didn't clear `currentScore` or `_inputLocked` when switching holes.
**Fix:** Added state reset to all four navigation methods.

### FUCKUP #5: Previous Security Audit Said "All Clear" — It Wasn't
**Issue:** Pete was told months ago the system was secured. 29 tables had NO Row Level Security. Admin PINs were world-readable.
**Root Cause:** The security check was shallow/wrong.
**Impact:** Anyone with the public anon key could read, write, or delete anything in the database. Admin PINs (super_admin_pin, staff_pin) were readable by anyone.

### FUCKUP #6: JWT Secret Leaked Through Chat
**Issue:** JWT secret was pasted into conversation and persisted in Claude Code logs.
**Root Cause:** Agent asked for the secret instead of telling Pete to set it from his shell.
**Fix:** Forced migration to asymmetric signing (ES256) — no shared secret in the system at all.
**Lesson:** NEVER route secrets through the agent. Claude Code logs sessions by design.

### FUCKUP #7: Naive Policy Classification Would Have Exposed Sensitive Data
**Issue:** First policy migration had course_admins (containing PINs) classified as "public-browse."
**Root Cause:** Automated classification by table name, not by column contents.
**Fix:** Schema introspection revealed PINs → locked immediately. Full reviewed classification with 9 categories.
**Lesson:** Always introspect columns before classifying tables for RLS policies.

### FUCKUP #8: C1 Policy Batch Assumed All user_id Columns Were Text
**Issue:** 10 of 16 C1 tables have UUID user_id, not text. Applying line_id() policies would silently fail.
**Root Cause:** Blanket assumption that user_id = LINE text ID.
**Fix:** Split C1 into UUID group (auth.uid()) and TEXT group (line_id()).
**Lesson:** Always type-check identity columns before writing RLS policies.

### FUCKUP #9: Backfill SQL Would Have Written Malformed LINE IDs
**Issue:** `'U' || display_name` would produce `Uu044fd...` (34 chars, double-prefixed).
**Root Cause:** display_name is the full LINE ID with lowercase prefix, not "without prefix."
**Fix:** `'U' || substring(display_name from 2)` — uppercase the first char, don't prepend.
**Lesson:** Validate reconstructed IDs against real data before running backfill.

---

## SECURITY REMEDIATION (Major)

### Phase 1 — Interim Shield (DONE)
- RLS enabled on ALL tables (was 0 of 29)
- tmp_ policies: SELECT/INSERT/UPDATE allowed, DELETE DENIED (no policy)
- Service role key removed from all code files
- wipe_blobs.js deleted (contained Netlify token)

### Edge Functions (DONE — 9 deployed)
| Function | Table | Gate |
|---|---|---|
| unregister-event | event_registrations | LINE id_token + ownership (player_id) |
| clear-round-holes | round_holes | LINE id_token + parent rounds.golfer_id |
| dismiss-sos-alert | emergency_alerts | LINE id_token + ownership (user_id) |
| delete-caddy-note | caddy_notebook | LINE id_token + ownership (golfer_id) |
| delete-round | rounds | LINE id_token + ownership (golfer_id) + CASCADE |
| admin-delete-trgg-round | trgg_rounds | admin secret |
| admin-unlink-trgg-player | trgg_user_map | admin secret |
| sync-trgg-rounds | trgg_rounds | admin secret (delete+insert) |
| verify-admin-pin | course_admins | server-side PIN check → admin JWT |

### Cascade Migration (DONE)
- round_holes → rounds: FK + ON DELETE CASCADE added (681 orphans cleaned)
- event_results → rounds: FK + ON DELETE CASCADE added (9 orphans cleaned)
- round_scores, round_societies: already CASCADE
- handicap_history: SET NULL (correct)

### PIN Tables Locked (DONE — URGENT)
- course_admins: locked (contained super_admin_pin, staff_pin)
- society_organizer_access: locked (contained access_pin, super_admin_pin, staff_pin)
- society_organizer_roles: locked (sensitive role mappings)
- All three removed from C2 public-browse array

### Profile Identity Foundation (DONE)
- Canonical table confirmed: `profiles` (all 30 room_members UUIDs match profiles.id)
- 2 duplicate profiles merged (Pete + Donald — zero references, safe delete)
- 5 profiles backfilled via LINE ID reconstruction from display_name
- 7 total linked profiles, zero duplicate LINE IDs
- 37 anonymous profiles confirmed disposable (14 rooms, ZERO messages)
- Mint function aligned to use profiles.id as sub (not app_users.id)

### Sealed Architecture (DESIGNED — awaiting execution)
- Asymmetric ES256 signing (private key in Edge Function secret only)
- Independent API keys (publishable + secret, decoupled from JWT secret)
- Legacy JWT secret revoke permanently kills leaked key
- No shared secret anywhere in the request path

### Policy Classification (DESIGNED — 9 categories)
- C1 TEXT: 5 tables (line_id()) — condition_likes, notification_preferences, saved_groups, user_caddy_preferences, webauthn_credentials
- C1 UUID: 9 tables (auth.uid()) — chat_devices, chat_room_members, message_receipts, notifications, push_tokens, read_cursors, support_tickets, typing_events, user_preferences
- C2: Public-browse read-only (~35 tables)
- C3: Service-locked, no client access (debug_log, performance_logs, trgg_user_map, etc.)
- C4: Service-written, client-readable (scores, round_holes, scorecards, etc.)
- C5: Authenticated-read, owner-write (profiles, user_profiles)
- C6: Public-read, owner-write (caddy_reviews)
- C7: Service-write, user-read-own (activity_logs, user_sanctions)
- C8: Two-party relationships (friendships auth.uid(), golf_buddies line_id())
- C9: Chat membership-scoped (UUID system + LINE system)
- Quarantine: event_payments, booking_access_keys, gps_positions, caddy_tracking, attachments, society_budgets, content_reports
- Society/event: member + organizer visibility via is_organizer() helper
- Bookings: golfer-only (caddy_id is UUID FK, not LINE; admin via claim)

### Phase A — Key Swap (DONE)
- 13 files swapped from legacy anon key to sb_publishable_...
- Verified: zero files with old key
- teesheet-fullscreen.html excluded (different Supabase project)

---

## NEW FEATURES

### Community Rankings on ALL Stats
- Round History: Avg Score, Best Score, FW%, GIR%, Putts/Rnd, 3-Putts/Rnd, Avg Proximity, Bounce Back%, Give Back%
- Event-Day: Gross, FW, GIR, Putts, 3-Putts, Proximity, Approach, Bounce Back, Give Back
- Shows #1/1 when only one player has data
- Batched round_holes query (50 rounds/batch) to avoid Supabase 1000-row limit

### Putt Distance Tracking (Both Rows Always Visible)
- "1st Putt Distance" (blue) — always visible
- "2nd Putt Distance" (green) — always visible
- Previously approach row only showed on GIR holes

---

## COMMITS (21 total)

1. `f773136b` — Fix course auto-select: add courseId + strip event words
2. `c4cff6dc` — Clarify proximity labels: 1st/2nd Putt Distance
3. `647cd4f3` — Show both putt distance rows on every hole
4. `4b3a1780` — Fix score entry: clear state on hole navigation
5. `98409807` — Security: enable RLS, remove service role key, delete wipe_blobs.js
6. `77ed7c70` — Add 6 Edge Functions for server-side deletes
7. `7b2c9b0e` — Add delete-round Edge Function + cascade migration
8. `abf4ec01` — Wire browser delete calls to Edge Functions
9. `67142be0` — Wire admin deletes, set secrets, deploy
10. `4f58ef1b` — Part 2: mint-supabase-jwt, app_users, policy templates
11. `2ba6871f` — Security remediation runbook
12. `0dcf0b8f` — Full policy migration SQL (later replaced)
13. `5663c540` — Sealed architecture: asymmetric mint + independent API keys
14. `a42ece60` — Reviewed policy classification (9 categories)
15. `560d7e5e` — Quarantine part 1: lock sensitive, scope location/handicaps
16. `38841793` — Quarantine final: PIN lock + helpers + chat/admin templates
17. `8923ef51` — Remove PIN tables from C2 array
18. `525aef07` — Corrected quarantine: fix owner columns from data
19. `1fb1d6ea` — verify-admin-pin + shared JWT signer + chat policies
20. `4dd68860` — Aligned mint (canonical profiles) + C1 split
21. `80bbfb43` — Profile merge/backfill (2 merged, 5 backfilled)
22. `4bb860ab` — Phase A: swap anon key to publishable key (13 files)

---

## REMAINING EXECUTION ORDER

1. ✅ Phase A — publishable key swap (done)
2. ⏳ Pete: `supabase secrets set APP_DB_SECRET=sb_secret_xxx`
3. ⏳ Pete: Verify live site loads on publishable key
4. ⏳ Phase B — Generate asymmetric signing key (CLI), import as standby, rotate
5. ⏳ Phase C — Set APP_JWT_PRIVATE_JWK + APP_JWT_KID, deploy aligned mint
6. ⏳ Test login → verify auth.uid() = profiles.id
7. ⏳ Apply ALL policies together (text + UUID groups)
8. ⏳ Phase B completion — Revoke legacy JWT secret (kills leaked key)
9. ⏳ Wire verify-admin-pin into admin login flow
10. ⏳ Phase D — Smoke test
11. Optional: clean up 37 anonymous profiles

---

## KEY RULES REINFORCED

1. **NEVER route secrets through the agent** — dashboard → terminal → secret store. Three leaks happened through chat.
2. **Supabase 1000-row limit** — batch queries in chunks of 50 rounds
3. **Type-check identity columns** — user_id can be uuid OR text. Don't assume.
4. **Introspect columns before classifying tables** — table names don't reveal PINs
5. **Don't apply authenticated policies while app runs as anon** — features break instantly
6. **Validate reconstructed IDs against real data** — prevent malformed backfills
7. **Merge before backfill** — prevent duplicate LINE IDs
8. **Don't blindly insert new profiles** — creates duplicates for existing users
9. **Hole navigation = reset input state** — currentScore + _inputLocked must clear
10. **Fix ALL instances at once** — thresholds, key swaps, etc. Don't do half
