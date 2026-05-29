# MyCaddiPro security remediation — master runbook

Run top to bottom. Order matters: each step assumes the previous one is done.
Current status: Part 1 interim RLS (no-DELETE) is already applied. Everything
below from Step 1 onward is pending.

--------------------------------------------------------------------------------
## STEP 0 — Inventory before touching anything (read-only)
--------------------------------------------------------------------------------
Find every place the service_role key and Netlify token live, so the rotation
in Step 1 updates all of them in one pass.

```bash
grep -rni "service_role\|SERVICE_ROLE_KEY\|netlify" \
  --include=*.js --include=*.ts --include=*.toml --include=*.env* . \
  | grep -vi node_modules
```
Also check: Supabase dashboard -> Edge Functions -> Secrets; Vercel -> Settings
-> Environment Variables; Hal's config / .env.

--------------------------------------------------------------------------------
## STEP 1 — Rotate credentials (do FIRST, as a controlled swap)
--------------------------------------------------------------------------------
The leaked service_role key bypasses all RLS and is in git history. This is the
highest-priority item. Browser app is unaffected (it uses the anon key).

- [ ] Supabase dashboard -> rotate the service_role key
- [ ] Update the new key everywhere from Step 0, in one window
- [ ] Revoke the Netlify token at Netlify (deleting wipe_blobs.js did NOT revoke it)
- [ ] Verify the masterscoreboard handicap sync + any existing Edge Functions
      still run on the new key

--------------------------------------------------------------------------------
## STEP 2 — Part 1 interim RLS  ✅ DONE
--------------------------------------------------------------------------------
RLS on all 29 tables; SELECT/INSERT/UPDATE allowed, DELETE denied (no policy).
The wipe scenario is closed. Mass-UPDATE risk remains until Step 5.

--------------------------------------------------------------------------------
## STEP 3 — Delete Edge Functions (restore the 6 broken features)
--------------------------------------------------------------------------------
- [ ] Confirm schema: run the introspection SQL in README.md; fix each
      function's "CONFIRM AGAINST YOUR SCHEMA" block (table/id/owner columns)
- [ ] Set secrets (after Step 1, against the new key):
      supabase secrets set LINE_CHANNEL_ID=...
      supabase secrets set ADMIN_SECRET=$(openssl rand -hex 32)
- [ ] Deploy the 6 functions (see README.md command list)
- [ ] Replace the 6 browser .delete() calls with supabase.functions.invoke(...)
- [ ] Admin functions: invoke ONLY from a trusted context, never public browser JS

--------------------------------------------------------------------------------
## STEP 4 — Round cascade migration
--------------------------------------------------------------------------------
So deleting a round cleanly removes its children instead of failing/orphaning.
File: supabase/migrations/round-cascade-migration.sql

- [ ] Section 1: discover child FKs and loose round_id columns
- [ ] Section 2: orphan check; clean any orphans
- [ ] Section 3: add ON DELETE CASCADE on round-child FKs ONLY (never upward to
      courses/users/mappings)
- [ ] (optional) deploy delete-round if users can delete whole rounds

--------------------------------------------------------------------------------
## STEP 5 — Part 2: identity + real policies
--------------------------------------------------------------------------------
Gives logged-in users a real Supabase JWT so policies can scope per user.

- [ ] VERIFY FIRST: Settings -> JWT Keys. Confirm the legacy HS256 secret is
      still active. If the project is asymmetric-only, self-minted HS256 won't
      validate — resolve before proceeding.
- [ ] Run part2-app-users-and-policies.sql Section 1 (app_users + line_id())
- [ ] supabase secrets set APP_JWT_SECRET=<project JWT secret>
- [ ] supabase functions deploy mint-supabase-jwt
- [ ] Wire client (client/client-auth-example.js); test that auth.jwt() carries
      the correct line_id BEFORE changing any policies
- [ ] Section 3: replace tmp_ policies table-by-table, testing the live app
      after each batch  (waiting on the 29-table classification)

--------------------------------------------------------------------------------
## STEP 6 — Verify the holes are actually closed
--------------------------------------------------------------------------------
With only the anon key (no JWT), confirm:
- [ ] DELETE on any table -> blocked / 0 rows
- [ ] reading another user's owned rows -> empty
- [ ] public-browse tables -> still readable
- [ ] handicap sync (service_role) -> still writes
```

Done in order, Step 1 closes the urgent credential leak, Steps 3–4 restore
functionality safely, and Step 5 turns the placeholder policies into real
per-user security.
