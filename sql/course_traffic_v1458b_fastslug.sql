-- v1458b: the score trigger must be cheap (it runs on every live score). traffic_slug was ~40 ms because the
-- name matcher ran once per venue row; now: courses id hit first, else the matcher ONCE, and every answer is
-- remembered in traffic_slug_cache (a scorecard's course is one of a few dozen strings).
create table if not exists public.traffic_slug_cache (course_key text primary key, slug text, at timestamptz not null default now());
alter table public.traffic_slug_cache enable row level security;
revoke all on public.traffic_slug_cache from anon, authenticated;

create or replace function public.traffic_slug(p_course_id text, p_course_name text) returns text
language plpgsql security definer set search_path = public as $$
declare k text := coalesce(p_course_id, '') || '|' || lower(coalesce(p_course_name, '')); v text; s text; hit boolean;
begin
  select true, c.slug into hit, v from public.traffic_slug_cache c where c.course_key = k;
  if hit then return v; end if;
  select x.slug into v from public.course_venues x where p_course_id is not null and (x.slug = p_course_id or x.course_ref = p_course_id) order by x.sort limit 1;
  if v is null then
    s := public.teetime_slug_for(p_course_name);
    if s is not null then
      select x.slug into v from public.course_venues x where public.teetime_venue_of(x.slug) = public.teetime_venue_of(s) order by x.sort limit 1;
      v := coalesce(v, s);
    end if;
  end if;
  insert into public.traffic_slug_cache (course_key, slug) values (k, v) on conflict (course_key) do nothing;
  return v;
end $$;
