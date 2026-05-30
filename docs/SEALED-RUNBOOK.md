# MyCaddiPro — SEALED migration runbook

Goal: revoke the leaked legacy JWT secret permanently, get off the deprecated
legacy system, and ensure NOTHING depends on a leakable shared secret. End
state: independent API keys + asymmetric signing key (private key held only in
your Edge Function secret) + legacy secret revoked.

Zero-downtime if done in this order. Each signing-key state change is throttled
~5 min by Supabase, so don't rush between B steps.

Rule for the whole runbook: every secret is set by YOU from your own shell via
`supabase secrets set`. Nothing is pasted into Hal, Telegram, or any chat.

--------------------------------------------------------------------------------
## PHASE A — New API keys (decouple from the JWT secret)
--------------------------------------------------------------------------------
Must happen BEFORE revoking, because the legacy anon/service_role keys are
derived from the JWT secret and die on revoke.

- [ ] Settings -> API Keys -> create new keys: publishable (sb_publishable_...)
      and secret (sb_secret_...)
- [ ] Frontend: replace the anon key with the publishable key everywhere
      (all HTML files + Vercel env). Stage all edits, deploy together.
- [ ] Edge Functions / backend: set APP_DB_SECRET = the sb_secret_... key
      (the shared serviceClient() now prefers it):
        supabase secrets set APP_DB_SECRET=sb_secret_xxx
- [ ] Verify: app loads on publishable key; delete functions + handicap sync
      run on the secret key.

--------------------------------------------------------------------------------
## PHASE B — Asymmetric signing key + revoke legacy (kills the leaked secret)
--------------------------------------------------------------------------------
- [ ] Generate your own private signing key with the Supabase CLI (keep the
      private key — it is NOT extractable from Supabase later). Follow:
      https://supabase.com/docs/guides/auth/signing-keys#getting-started
- [ ] Settings -> JWT Keys -> JWT Signing Keys -> create a STANDBY key by
      importing your private key
- [ ] Note the kid of the imported key
- [ ] Rotate keys -> your imported key becomes Active. Existing tokens stay valid.
- [ ] Verify the app + a freshly minted token both work (Phase C must be live)
- [ ] REVOKE the legacy JWT secret  <-- the leaked secret is now dead
- [ ] Confirm nothing still uses legacy anon/service_role (Phase A done) — they
      stop working on revoke.

--------------------------------------------------------------------------------
## PHASE C — Re-architected mint (sealed self-mint)
--------------------------------------------------------------------------------
File: supabase/functions/mint-supabase-jwt/index.ts (already rewritten for this)

- [ ] supabase secrets set APP_JWT_PRIVATE_JWK='<private key JWK string>'
- [ ] supabase secrets set APP_JWT_KID=<kid from Phase B>
- [ ] Confirm ALG in the function matches your key (ES256 for the CLI default
      EC key; RS256 if you imported RSA — see the in-file note)
- [ ] supabase functions deploy mint-supabase-jwt
- [ ] Client wiring (client/client-auth-example.js) unchanged, except apikey is
      now the publishable key. The minted JWT goes in Authorization: Bearer;
      apikey carries the publishable key. (Do NOT put the minted JWT in apikey.)
- [ ] Policies unchanged — they key off auth.jwt() ->> 'line_id'

--------------------------------------------------------------------------------
## PHASE D — Scrub + prove it's sealed
--------------------------------------------------------------------------------
- [ ] Scrub the OLD leaked secret from local state (harmless post-revoke, tidy):
        grep -rl "<old-secret-fragment>" ~/.claude/ ~/ 2>/dev/null
      delete/clear the offending Claude Code sessions + OpenClaw logs
- [ ] Smoke test with ONLY the publishable key (no minted JWT):
        - DELETE on any table        -> blocked / 0 rows
        - read another user's rows   -> empty
        - public-browse tables       -> readable
        - signed-in user (with JWT)  -> sees only own rows
        - handicap sync (secret key) -> still writes

--------------------------------------------------------------------------------
## Why this is sealed
--------------------------------------------------------------------------------
- API keys are independent of the JWT secret -> future rotations are downtime-free
  and never touch your signing key.
- The signing key is asymmetric; the private key exists only in your Edge
  Function secret and cannot be pulled out of Supabase. A dashboard/account
  compromise does not hand over signing power.
- The leaked legacy HS256 secret is revoked -> forged tokens with it are rejected.
- No shared secret anywhere in the request path -> the class of leak that
  happened three times in this project is structurally gone.
EOF
