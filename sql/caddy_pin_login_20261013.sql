-- Sample CADDY account behind a staff PIN (Pete 2026-10-13: "build a sample caddy registered sample model from one of
-- the mockup caddies and get me a PIN ... with a fully working dashboard and controls, we will do a full test").
-- A caddy PIN opens a REAL account (user_profiles + its caddy_profiles row), not the in-memory 000000 demo:
-- caddy_pin_login(pin) -> { user_id, name }, the client stores it as the session id and boots like any sign-in.
-- The PIN -> account map lives ONLY in this table (RLS on, no policy); the values are inserted outside the repo
-- (vault), never in this file — the repo is public.
create table if not exists public.caddy_pin_logins (
  pin        text primary key check (pin ~ '^\d{6}$' and pin <> '000000'),
  user_id    text not null,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.caddy_pin_logins enable row level security;
revoke all on public.caddy_pin_logins from anon, authenticated;

create or replace function public.caddy_pin_login(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_uid text; v_name text; v_num text; v_course text;
begin
  if p_pin is null or p_pin !~ '^\d{6}$' then return null; end if;
  select user_id into v_uid from caddy_pin_logins where pin = p_pin;
  if v_uid is null then perform pg_sleep(0.4); return null; end if;   -- a miss costs time: no fast PIN sweep
  select coalesce(cp.name, up.name), cp.caddy_number::text, cp.course_name into v_name, v_num, v_course
    from user_profiles up left join caddy_profiles cp on cp.user_id = up.line_user_id and cp.is_active
   where up.line_user_id = v_uid limit 1;
  return jsonb_build_object('user_id', v_uid, 'name', v_name, 'caddy_number', v_num, 'course_name', v_course);
end $$;
revoke all on function public.caddy_pin_login(text) from public;
grant execute on function public.caddy_pin_login(text) to anon, authenticated;
