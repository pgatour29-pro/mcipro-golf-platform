-- v1525 FINGERPRINT LOGIN THE SERVER CAN TRUST (Pete 2026-10-11: "I'm already signed in, that should already register that its me").
-- A fingerprint / passkey login only opened the app on the phone: the browser checked the fingerprint and the app trusted the
-- account id it had stored. The server never learned who it was (34 golfers), so everything that needs the verified login
-- (Your deals, follows, offer consent) refused them.
-- Now the edge function passkey-session hands out a one-time challenge, checks the phone's signature against the public key
-- stored for that credential, and only then mints the account's real Supabase session (magic-link token_hash, as LINE login does).
--
-- The trust chain: a credential may mint a session only once it is BOUND, and binding needs a session already verified for that
-- same account (LINE / Kakao / Google, or a bound fingerprint). The table was wide open to the browser key (any row could be
-- read, rewritten or deleted, so anyone could have swapped in their own public key): it now only takes NEW rows, never bound.
-- Re-runnable as a whole.

alter table public.webauthn_credentials
  add column if not exists bound_at timestamptz,          -- set by webauthn_bind() / passkey-session only
  add column if not exists sign_count bigint not null default 0;

-- the browser key: insert a new credential (registration), nothing else
drop policy if exists tmp_update on public.webauthn_credentials;
drop policy if exists tmp_select on public.webauthn_credentials;
drop policy if exists tmp_insert on public.webauthn_credentials;
drop policy if exists wa_insert_new on public.webauthn_credentials;
create policy wa_insert_new on public.webauthn_credentials for insert to anon, authenticated with check (bound_at is null and sign_count = 0);
revoke all on public.webauthn_credentials from anon, authenticated;
grant insert (user_id, credential_id, public_key, user_name, device_name, created_at) on public.webauthn_credentials to anon, authenticated;
alter table public.webauthn_credentials enable row level security;

-- one-time challenges (edge function only)
create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null,
  created_at timestamptz not null default now()
);
alter table public.webauthn_challenges enable row level security;   -- no policies
revoke all on public.webauthn_challenges from anon, authenticated;

-- bind THIS phone's credential to the account, from a session already verified for that account
create or replace function public.webauthn_bind(p_credential_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me text := public.line_id(); n int;
begin
  if me is null or me = '' then return jsonb_build_object('ok', false, 'reason', 'signin'); end if;
  if coalesce(p_credential_id, '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad'); end if;
  update public.webauthn_credentials set bound_at = coalesce(bound_at, now())
   where credential_id = p_credential_id and user_id = me;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1, 'reason', case when n = 1 then null else 'not_found' end);
end $$;
revoke execute on function public.webauthn_bind(text) from public;
grant execute on function public.webauthn_bind(text) to anon, authenticated;

notify pgrst, 'reload schema';
