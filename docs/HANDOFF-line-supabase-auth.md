# Handoff spec — LINE → Supabase Auth + Custom Access Token Hook

## For the implementer

You're adding real authentication to MyCaddiPro. Today there is effectively
none: the LINE login calls a `signInWithLineIdToken` method that doesn't exist,
so it silently fails, and identity is just a `line_user_id` string in
`localStorage` that the app trusts. Anyone can paste another user's id into
their own browser and become them. This spec closes that.

You are NOT migrating a working auth system — you're replacing a no-op. There's
no existing session behavior to preserve, which makes this simpler than a
typical cutover.

Do this with the login code AND the Supabase dashboard open at the same time.
It is not hard with full visibility; it thrashes when relayed step-by-step.

## The decision already made

Supabase Auth issues and signs the session tokens (asymmetric key, Supabase
holds the private key). A Custom Access Token Hook injects the `line_id` claim
into every issued token so existing RLS policies work unchanged. The previously
explored self-minting Edge Function (`mint-supabase-jwt`) is DROPPED — it
required holding a private key, which fought the platform.

## What already exists and must NOT change

- All RLS policies — they read `auth.jwt() ->> 'line_id'` and `auth.uid()`.
  The hook must make both resolve correctly; that's its whole job.
- `profiles` is canonical: 7 real users linked, `profiles.id` is the user UUID,
  `profiles.line_user_id` holds the LINE id. `auth.uid()` must equal `profiles.id`.
- PIN tables locked (`course_admins`, `society_organizer_access`,
  `society_organizer_roles`) + `verify-admin-pin` Edge Function for admin auth.
- 9 delete Edge Functions, cascade FKs, publishable/secret API keys (frontend
  already on the publishable key), schedule creator, score-entry + proximity fixes.

## Work item 1 — LINE → Supabase Auth session

Replace the dead `signInWithLineIdToken` call. LINE Login issues an OIDC
`id_token`. Create a real Supabase Auth session from it.

- VERIFY FIRST (the one open question): confirm the current Supabase support for
  signing in with a LINE `id_token`. Check `signInWithIdToken` provider support
  and/or Supabase Third-Party Auth for LINE in today's docs. If LINE isn't a
  directly supported OIDC provider for `signInWithIdToken`, the fallback is a
  small Edge Function that verifies the LINE id_token (reuse `_shared/verifyLine.ts`,
  already written) and creates/links the Auth user via the Admin API
  (`auth.admin`), returning a session. Decide this with the docs open.
- The Auth user's id (`auth.uid()`) MUST map to the existing `profiles.id`.
  Two ways: set the Auth user id = `profiles.id`, or store `profiles.id` and look
  it up in the hook (work item 2). Do not create a parallel id space — that was
  the whole alignment fight.

## Work item 2 — Custom Access Token Hook (adds line_id)

A Postgres function Supabase Auth calls on each token issuance. It receives the
claims, adds `line_id`, returns them. Register it in Dashboard → Authentication
→ Hooks (Custom Access Token).

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable
as $$
declare
  claims jsonb := event -> 'claims';
  v_line_id text;
begin
  -- map the authenticating user to their LINE id via profiles
  select line_user_id into v_line_id
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  if v_line_id is not null then
    claims := jsonb_set(claims, '{line_id}', to_jsonb(v_line_id));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Supabase Auth must be able to run it
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
```

After this, every issued token carries `line_id`, and `auth.uid()` = `profiles.id`.
RLS policies that use `line_id()` and `auth.uid()` work with no change.

## Work item 3 — flip the policies (this is what closes impersonation)

Tokens alone don't fix anything while `tmp_` allow-all policies still trust any
client. Apply the real policies (already written) so RLS enforces the token:
`section3-real-policies.sql`, `c1-split.sql`, `chat-policies.sql`,
`section3-quarantine-*.sql`. Keep the PIN tables locked. No DELETE policies
(deletes stay in Edge Functions). Apply AFTER a test login proves `auth.uid()`
returns the real `profiles.id` and the token carries the right `line_id`.

## Work item 4 — admin tokens

`verify-admin-pin` currently self-signs. Under Auth-owned tokens, fold admin
elevation into the hook instead: on PIN success, record the granted course(s)
for the user (a short-lived `admin_grants` row), and have the hook add an
`admin_courses` claim by reading it. `is_course_admin()` already reads that claim.

## Verify (the gate — do not apply policies before this passes)

1. LINE login creates a Supabase Auth session (not a localStorage string).
2. Decode the token: `auth.uid()` = that user's `profiles.id`; `line_id` present.
3. THEN apply policies.
4. Impersonation test: with only the publishable key and a forged `line_user_id`
   in localStorage (no valid session), confirm you can read NOTHING and act as
   no one. A real logged-in user sees only their own rows.

## Deferred hardening (after verify passes)

Revoke the legacy JWT secret (kills the leaked legacy secret + old anon/
service_role + the 37 anonymous sessions). Confirm the app + sync run on the new
keys first. Note: the legacy secret WAS exposed in a Claude Code session and
CANNOT be rotated in place — revoking via the signing-keys migration is the only
way to invalidate it. Do not keep signing anything with it.

## Sequence

1. Confirm LINE id_token → Supabase Auth approach (docs open) — work item 1
2. Create the Auth session flow; ensure auth user id ↔ profiles.id
3. Register the access token hook — work item 2
4. Test login; verify auth.uid() + line_id (the gate)
5. Flip policies — work item 3
6. Fold admin into the hook — work item 4
7. Impersonation test
8. Revoke legacy secret — deferred hardening
