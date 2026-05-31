# FIX IMPERSONATION NOW — focused critical path

The hole: identity is a client-supplied line_user_id string the app trusts.
The fix: signed tokens (mint) + policies that enforce them. BOTH, in order.
Defer only the irreversible legacy-secret revoke until after verification.

Steps marked (YOU) = your shell/dashboard. (HAL) = the agent. (GATE) = do not skip.

--------------------------------------------------------------------------------
1. Phase A — new API keys (quick, gets serviceClient off the leaked legacy key)
--------------------------------------------------------------------------------
- (YOU) Dashboard -> API Keys -> create publishable + secret keys
        (name them lowercase_with_underscores, e.g. mycaddipro_publishable)
- (HAL) swap frontend anon key -> publishable across the 18 files; deploy
- (YOU) supabase secrets set APP_DB_SECRET=sb_secret_...
- (YOU) verify the live site loads on the publishable key

--------------------------------------------------------------------------------
2. Phase B — signing key (import + rotate ONLY; do NOT revoke legacy yet)
--------------------------------------------------------------------------------
- (YOU) generate an asymmetric signing key via Supabase CLI (keep the private key)
- (YOU) Dashboard -> JWT Keys -> import it as a STANDBY key; note the kid
- (YOU) Rotate keys -> your key becomes Active (existing tokens still valid)
- (YOU) supabase secrets set APP_JWT_PRIVATE_JWK='...'  APP_JWT_KID=...
- DO NOT revoke the legacy secret in this step (that's the deferred hardening, step 7)

--------------------------------------------------------------------------------
3. Phase C — deploy mint + wire client (tokens start flowing)
--------------------------------------------------------------------------------
- (YOU/HAL) supabase functions deploy mint-supabase-jwt
- (HAL) wire client-auth-example.js: login calls the mint, supabase client uses
        accessToken; apikey = publishable key, minted JWT = Authorization: Bearer
- Confirm CANONICAL_USERS = "profiles" in the mint (already set)

--------------------------------------------------------------------------------
4. (GATE) Verify identity is real — DO NOT proceed to step 5 until this passes
--------------------------------------------------------------------------------
- Log in as a known LINE user (e.g. Pete). Confirm the minted token's auth.uid()
  equals that user's real profiles.id (check via a `select auth.uid()` RPC or
  decode the token). It must NOT be a fresh/duplicate uuid.
- If it returns the wrong id: STOP. The mint's profile resolution is off; fix
  before applying policies, or step 5 locks users out.

--------------------------------------------------------------------------------
5. Apply the enforcing policies (THIS is what stops trusting client strings)
--------------------------------------------------------------------------------
- Apply together, after the GATE passes:
    section3-real-policies.sql      (C2 public, C3 lock, C4 service-read, C5-C7)
    c1-split.sql                    (text-group + UUID-group)
    chat-policies.sql               (UUID + LINE chat systems)
    section3-quarantine-*.sql       (the resolved quarantine tables)
- Remember: course_admins / society_organizer_access / society_organizer_roles
  are LOCKED (PINs) and removed from C2 — confirm they're not re-opened.

--------------------------------------------------------------------------------
6. Prove it's closed
--------------------------------------------------------------------------------
- In a second browser, set a victim's line_user_id in localStorage with only the
  publishable key (no valid token). Confirm you can NO LONGER read their rows or
  act as them. Logged-in (real token) user still sees only their own data.

--------------------------------------------------------------------------------
7. DEFERRED hardening (right after, once 6 passes — not skipped)
--------------------------------------------------------------------------------
- Revoke the legacy JWT secret -> kills the leaked legacy secret AND the old
  anon/service_role keys (you're already off them after step 1) AND the 37
  anonymous sessions. Verify the app + sync still run on the new keys first.

--------------------------------------------------------------------------------
Why the order: tokens (1-3) make identity provable; the GATE (4) ensures tokens
map to real users; policies (5) make RLS enforce the token instead of the client
string — that pair is the actual fix. 6 proves it. 7 seals the keys.
