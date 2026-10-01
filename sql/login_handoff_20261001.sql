-- v1432 (2026-10-01) Login hand-back to the app that STARTED the login.
--
-- Evidence (client_errors line_login_attempt + login_events, 14 days): iPhone home-screen-app users
-- tap "Continue with LINE" on almost every open — 22 taps / 5 days, 21 / 6 days, 18 / 7 days … —
-- and for the two whose default browser is Chrome, 43 of 43 logins completed in Chrome-iOS, never in
-- the app. LINE returns the approval to the phone's DEFAULT BROWSER, whose storage the installed app
-- does not share, so the app icon stays logged out forever ("I can't log in").
--
-- Fix: the login's OAuth `state` is now a 160-bit one-time ticket held only by the context that
-- started the login. The line-oauth-exchange edge function files (ticket -> the user LINE verified);
-- the starter claims it once and is signed in too.
--
-- The ticket is stored hashed, is single-use and expires after 7 days. What a claim returns is a
-- LINE user id — the same thing every restored session already carries in this app (client-side
-- identity; Auth Phase 2 replaces both). A put for a ticket nobody holds is unreachable noise.

create table if not exists public.login_handoffs (
    ticket_hash  text primary key,
    line_user_id text not null,
    created_at   timestamptz not null default now(),
    claimed_at   timestamptz
);
-- v1434: proof columns. origin = who started the login (app = home-screen app, browser);
-- claimed_kind = handback (another context signed itself in) | burn (started and finished in one place).
alter table public.login_handoffs add column if not exists origin text;
alter table public.login_handoffs add column if not exists claimed_kind text;
alter table public.login_handoffs enable row level security;
revoke all on public.login_handoffs from public, anon, authenticated;

create or replace function public.login_handoff_put(p_ticket text, p_user text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_ticket is null or p_ticket !~ '^h[sb][0-9a-f]{40}$' then return false; end if;
    if p_user is null or not exists (select 1 from public.user_profiles where line_user_id = p_user) then return false; end if;
    delete from public.login_handoffs where created_at < now() - interval '30 days';
    insert into public.login_handoffs (ticket_hash, line_user_id, origin)
    values (encode(sha256(convert_to(p_ticket, 'UTF8')), 'hex'), p_user,
            case substr(p_ticket, 2, 1) when 's' then 'app' else 'browser' end)
    on conflict (ticket_hash) do nothing;   -- first writer wins: a filed ticket can never be re-pointed
    return true;
end
$$;

drop function if exists public.login_handoff_claim(text);
create or replace function public.login_handoff_claim(p_ticket text, p_burn boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_user text;
begin
    if p_ticket is null or p_ticket !~ '^h[sb][0-9a-f]{40}$' then return null; end if;
    update public.login_handoffs
       set claimed_at = now(),
           claimed_kind = case when coalesce(p_burn, false) then 'burn' else 'handback' end
     where ticket_hash = encode(sha256(convert_to(p_ticket, 'UTF8')), 'hex')
       and claimed_at is null
       and created_at > now() - interval '7 days'
    returning line_user_id into v_user;
    return v_user;
end
$$;

-- v1433: filing a ticket is SERVER-ONLY. The line-oauth-exchange edge function calls it after LINE has
-- verified the user, so a claim can only ever return an id that completed a real LINE sign-in. The
-- browser may only claim (it is logged out when it does — the 160-bit ticket is its proof).
revoke all on function public.login_handoff_put(text, text) from public, anon, authenticated;
revoke all on function public.login_handoff_claim(text, boolean) from public;
grant execute on function public.login_handoff_put(text, text) to service_role;
grant execute on function public.login_handoff_claim(text, boolean) to anon, authenticated;
