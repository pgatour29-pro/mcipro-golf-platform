-- ROLLBACK / break-glass for caddy_profiles_lockdown_v1397.sql
--
-- This does NOT restore the pre-v1397 state. That state was tmp_insert / tmp_update
-- `to anon, authenticated ... (true)`, which let anyone holding the public key (even logged
-- out) create caddies or rewrite any caddy's name, phone, photo, course or duty status.
-- Never put those back.
--
-- If caddy writes break after v1397, the fault is in caddy_profile_write(): fix it in place
-- (`create or replace function public.caddy_profile_write ...` from the v1397 file) and
-- sessionless clients recover straight away, because they can only write through that RPC.
--
-- What this file adds is a narrow direct-write door for VERIFIED Supabase sessions only
-- (role authenticated + a jwt line_id claim), with the same rules the RPC enforces:
--   * staff (admin/caddymaster/manager/golf_course_manager/proshop, or a managed course):
--     insert + update caddies
--   * a caddy: update ONLY her own row (user_id = her LINE id)
--   * anon: nothing. DELETE: still no policy.
-- Undo this file with the two DROP lines at the bottom.

create or replace function public.caddy_rb_is_staff()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
    select exists (
        select 1 from user_profiles
         where line_user_id = nullif(auth.jwt() ->> 'line_id', '')
           and (role in ('admin','caddymaster','manager','golf_course_manager','proshop')
                or managed_course_id is not null)
    );
$$;
revoke all on function public.caddy_rb_is_staff() from public;
grant execute on function public.caddy_rb_is_staff() to authenticated;

drop policy if exists v1397rb_insert on public.caddy_profiles;
drop policy if exists v1397rb_update on public.caddy_profiles;

create policy v1397rb_insert on public.caddy_profiles
    for insert to authenticated
    with check (public.caddy_rb_is_staff());

create policy v1397rb_update on public.caddy_profiles
    for update to authenticated
    using (public.caddy_rb_is_staff()
           or (user_id is not null and user_id = nullif(auth.jwt() ->> 'line_id', '')))
    with check (public.caddy_rb_is_staff()
           or (user_id is not null and user_id = nullif(auth.jwt() ->> 'line_id', '')));

-- To undo:
--   drop policy if exists v1397rb_insert on public.caddy_profiles;
--   drop policy if exists v1397rb_update on public.caddy_profiles;
