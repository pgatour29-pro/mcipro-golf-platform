-- v1544 A GOLFER CAN'T BE IN TWO TEE TIMES WITHIN 4 h 30 ON THE SAME DAY — the same protocol as the caddy block
-- (v1466: round 4:15 + 15 turnaround = 270 min). Pete 2026-10-13: "it also needs the block from booking another
-- tee time on the same day within the 4hr 30 min window, the same protocol as the caddy assignments".
--
-- Who: every known golfer on a tee booking — bookings.golfer_id, booking_data.golfers[].odoo_id and their guests'
-- ids (a guest found by Call PIN is a real golfer playing). Name-only players can't be checked.
-- Against: their other tee bookings that day (any course, any source) and — for a regular / VIP / app / deal booking —
-- the society days they are registered for (the event's tee-off). A society group's own slot never clashes with
-- its own event. Enforced by a trigger (no page can get round it); golfer_busy() lets every page say it first.

begin;

create or replace function public._booking_golfer_ids(b public.bookings)
returns text[] language sql immutable as $fn$
  select coalesce(array_agg(distinct x), '{}') from (
    select b.golfer_id as x
    union all select g->>'odoo_id' from jsonb_array_elements(case when jsonb_typeof(b.booking_data->'golfers') = 'array' then b.booking_data->'golfers' else '[]'::jsonb end) g
    union all select gg->>'odoo_id' from jsonb_array_elements(case when jsonb_typeof(b.booking_data->'golfers') = 'array' then b.booking_data->'golfers' else '[]'::jsonb end) g,
      jsonb_array_elements(case when jsonb_typeof(g->'guests') = 'array' then g->'guests' else '[]'::jsonb end) gg
  ) q where coalesce(x, '') <> '' and x !~ '^(GUEST|MANUAL|TRGG-GUEST|player_)';
$fn$;

create or replace function public._hm_min(t text)
returns int language sql immutable as $fn$
  select case when t ~ '^\d{1,2}:\d{2}' then split_part(t, ':', 1)::int * 60 + left(split_part(t, ':', 2), 2)::int end;
$fn$;

-- conflicts for these golfers at (date, time): [{id, name, time, what}]
create or replace function public.golfer_busy(p_ids text[], p_date date, p_time text, p_ignore text default null, p_events boolean default true)
returns jsonb language sql stable security definer set search_path to 'public' as $fn$
  with me as (select public._hm_min(p_time) m),
  ids as (select distinct x from unnest(coalesce(p_ids, '{}')) x where coalesce(x, '') <> '' and x !~ '^(GUEST|MANUAL|TRGG-GUEST|player_)'),
  tee as (
    select i.x as id, left(b.time, 5) as at, coalesce(nullif(b.course_name, ''), b.course_id, '') as what
    from public.bookings b, ids i, me
    where b.date = p_date and b.kind = 'tee' and not coalesce(b.deleted, false) and b.time is not null
      and b.id is distinct from p_ignore
      and i.x = any (public._booking_golfer_ids(b))
      and abs(public._hm_min(b.time) - me.m) < 270
  ),
  evt as (
    select i.x as id, left(e.start_time::text, 5) as at, coalesce(e.title, '') as what
    from public.event_registrations r
    join public.society_events e on e.id = r.event_id
    join ids i on i.x = r.player_id
    cross join me
    where p_events and e.event_date = p_date and e.start_time is not null
      and coalesce(lower(r.status), '') !~ 'cancel|withdraw' and coalesce(lower(e.status), '') !~ 'cancel'
      and abs(public._hm_min(e.start_time::text) - me.m) < 270
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', coalesce((select p.name from public.user_profiles p where p.line_user_id = c.id), ''),
                                                'time', c.at, 'what', c.what) order by c.at), '[]'::jsonb)
  from (select * from tee union all select * from evt) c;
$fn$;
grant execute on function public.golfer_busy(text[], date, text, text, boolean) to anon, authenticated;

create or replace function public.bookings_golfer_busy()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  ids  text[];
  c    jsonb;
  ev   boolean;
begin
  if new.kind is distinct from 'tee' or coalesce(new.deleted, false) or new.date is null or new.time is null then return null; end if;
  ids := public._booking_golfer_ids(new);
  if coalesce(array_length(ids, 1), 0) = 0 then return null; end if;
  -- an edit that changes nobody, no day and no time never trips over an older clash
  if tg_op = 'UPDATE' and not coalesce(old.deleted, false) and old.date = new.date and left(coalesce(old.time, ''), 5) = left(new.time, 5)
     and public._booking_golfer_ids(old) @> ids then return null; end if;
  ev := coalesce(new.booking_type, 'regular') not in ('society', 'tournament');
  c := public.golfer_busy(ids, new.date, new.time, new.id, ev);
  if jsonb_array_length(c) > 0 then
    raise exception 'GOLFER_BUSY: % already plays at % (%) — tee times need 4 h 30 between them',
      coalesce(nullif(c->0->>'name', ''), 'This golfer'), c->0->>'time', c->0->>'what'
      using errcode = '23P01';
  end if;
  return null;
end $fn$;

drop trigger if exists trg_bookings_golfer_busy on public.bookings;
create trigger trg_bookings_golfer_busy after insert or update on public.bookings
  for each row execute function public.bookings_golfer_busy();

commit;
