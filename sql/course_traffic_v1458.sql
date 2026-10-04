-- v1458 COURSE TRAFFIC — Pete 2026-10-04: "build something like Google maps traffic for the golf course to determine
-- where the bottlenecks and slow play is taking place whether its from the caddies or golfers phone". Mockups → "Go".
--
-- NO GPS (location stays off — the scoring engine is the GPS). A group's position = the holes it has finished:
--   * every LIVE score a golfer enters writes a "hole done" mark (trigger on scores, guarded — it can never fail a
--     score save), group = the scorecards' group_id;
--   * the caddy taps "Green done" on her job (traffic_caddy_mark), group = her tee-sheet booking, or her society
--     event pairing group (event_pairings.groups[].players[].playerId), else her own job.
-- Marks from both sources carry the group's player ids; the client merges groups that share a player.
-- One mark per (day, group, hole) — the FIRST one wins (that is when the group walked off).

create table if not exists public.round_hole_marks (
  id          bigserial primary key,
  course_slug text not null,
  play_date   date not null,
  group_key   text not null,
  hole        smallint not null check (hole between 1 and 18),
  marked_at   timestamptz not null default now(),
  source      text not null check (source in ('score', 'caddy')),
  tee_time    text,
  start_nine  text,
  label       text,
  players     jsonb not null default '[]'::jsonb,
  caddy_job   uuid,
  created_by  text,
  unique (play_date, group_key, hole)
);
create index if not exists round_hole_marks_course_day on public.round_hole_marks (course_slug, play_date);
alter table public.round_hole_marks enable row level security;
drop policy if exists round_hole_marks_read on public.round_hole_marks;
create policy round_hole_marks_read on public.round_hole_marks for select to anon, authenticated using (true);
revoke insert, update, delete on public.round_hole_marks from anon, authenticated;
grant select on public.round_hole_marks to anon, authenticated;

create table if not exists public.traffic_nudges (
  id          bigserial primary key,
  course_slug text not null,
  play_date   date not null,
  group_key   text not null,
  kind        text not null check (kind in ('nudge', 'marshal')),
  hole        smallint,
  message     text,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists traffic_nudges_course_day on public.traffic_nudges (course_slug, play_date);
alter table public.traffic_nudges enable row level security;
drop policy if exists traffic_nudges_read on public.traffic_nudges;
create policy traffic_nudges_read on public.traffic_nudges for select to anon, authenticated using (true);
revoke insert, update, delete on public.traffic_nudges from anon, authenticated;
grant select on public.traffic_nudges to anon, authenticated;

do $$ begin
  begin alter publication supabase_realtime add table public.round_hole_marks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.traffic_nudges; exception when duplicate_object then null; end;
end $$;

-- a scorecard / caddy job's course -> the venue slug (course_venues), by courses id first, else by name
create or replace function public.traffic_slug(p_course_id text, p_course_name text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select v.slug from public.course_venues v where p_course_id is not null and (v.slug = p_course_id or v.course_ref = p_course_id) order by v.sort limit 1),
    (select v.slug from public.course_venues v where public.teetime_venue_of(v.slug) = public.teetime_venue_of(public.teetime_slug_for(p_course_name)) order by v.sort limit 1),
    public.teetime_slug_for(p_course_name))
$$;

-- every LIVE score = a hole done for that group. Never raises: scoring must not depend on traffic.
create or replace function public.trg_scores_traffic() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; v_slug text; v_at timestamptz := now();
begin
  begin
    if new.hole_number is null or new.hole_number < 1 or new.hole_number > 18 then return null; end if;
    select id, course_id, course_name, group_id, player_id, player_name, starting_nine, started_at, status
      into c from public.scorecards where id = new.scorecard_id;
    if not found or coalesce(c.status, '') = 'abandoned' then return null; end if;
    v_slug := public.traffic_slug(c.course_id, c.course_name);
    if v_slug is null then return null; end if;
    insert into public.round_hole_marks (course_slug, play_date, group_key, hole, marked_at, source, tee_time, start_nine, label, players)
    values (v_slug, (v_at at time zone 'Asia/Bangkok')::date, 'sc:' || coalesce(nullif(c.group_id, ''), c.id), new.hole_number, v_at, 'score',
            to_char((c.started_at at time zone 'UTC') at time zone 'Asia/Bangkok', 'HH24:MI'), c.starting_nine, c.player_name,
            case when coalesce(c.player_id, '') = '' then '[]'::jsonb else jsonb_build_array(c.player_id) end)
    on conflict (play_date, group_key, hole) do update
      set players = case when public.round_hole_marks.players @> excluded.players then public.round_hole_marks.players
                         else public.round_hole_marks.players || excluded.players end
      where not (public.round_hole_marks.players @> excluded.players);
  exception when others then
    return null;
  end;
  return null;
end $$;
drop trigger if exists scores_traffic on public.scores;
create trigger scores_traffic after insert on public.scores for each row execute function public.trg_scores_traffic();

-- the group a caddy job belongs to: its tee-sheet booking, its society pairing group, else the job itself
create or replace function public.traffic_group_for_job(p_job uuid)
returns table (group_key text, slug text, players jsonb, tee_time text, label text)
language plpgsql stable security definer set search_path = public as $$
declare j record; b record; v_slug text; g record;
begin
  select * into j from public.caddy_bookings where id = p_job;
  if not found then return; end if;
  v_slug := public.traffic_slug(j.course_id, j.course_name);
  if j.teesheet_booking_id is not null then
    select * into b from public.bookings where id = j.teesheet_booking_id;
    if found then
      return query select 'bk:' || b.id, coalesce(v_slug, public.traffic_slug(b.course_id, b.course_name)),
        coalesce((select jsonb_agg(x->>'odoo_id') from jsonb_array_elements(coalesce(b.booking_data->'golfers', '[]'::jsonb)) x where coalesce(x->>'odoo_id', '') <> ''), '[]'::jsonb)
          || case when coalesce(j.golfer_id, '') <> '' then jsonb_build_array(j.golfer_id) else '[]'::jsonb end,
        left(coalesce(b.time, to_char(coalesce(j.tee_time, j.start_time), 'HH24:MI')), 5),
        coalesce(nullif(b.golfer_name, ''), j.golfer_name);
      return;
    end if;
  end if;
  if coalesce(j.golfer_id, '') <> '' then
    select e.id as eid, x.idx, x.grp into g
      from public.society_events e
      join public.event_pairings ep on ep.event_id = e.id::text
      cross join lateral jsonb_array_elements(coalesce(ep.groups, '[]'::jsonb)) with ordinality as x(grp, idx)
     where e.event_date = j.booking_date and coalesce(e.status, '') <> 'cancelled'
       and public.teetime_venue_of(public.teetime_slug_for(e.course_name)) = public.teetime_venue_of(v_slug)
       and exists (select 1 from jsonb_array_elements(coalesce(x.grp->'players', '[]'::jsonb)) p where coalesce(p->>'playerId', p->>'id') = j.golfer_id)
     limit 1;
    if found then
      return query select 'ev:' || g.eid::text || ':' || g.idx::text, v_slug,
        coalesce((select jsonb_agg(coalesce(p->>'playerId', p->>'id')) from jsonb_array_elements(g.grp->'players') p where coalesce(p->>'playerId', p->>'id', '') <> ''), '[]'::jsonb),
        coalesce(nullif(g.grp->>'teeTime', ''), to_char(coalesce(j.tee_time, j.start_time), 'HH24:MI')),
        coalesce((select p->>'playerName' from jsonb_array_elements(g.grp->'players') p limit 1), j.golfer_name);
      return;
    end if;
  end if;
  return query select 'cj:' || j.id::text, v_slug,
    case when coalesce(j.golfer_id, '') <> '' then jsonb_build_array(j.golfer_id) else '[]'::jsonb end,
    to_char(coalesce(j.tee_time, j.start_time), 'HH24:MI'), j.golfer_name;
end $$;

-- the caddy's tap: "Green done" on a hole (or undo). Only her own job, only today.
create or replace function public.traffic_caddy_mark(p_job uuid, p_hole integer, p_actor text, p_undo boolean default false, p_start text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare j record; g record; v_today date := (now() at time zone 'Asia/Bangkok')::date; mine boolean; prefix text;
begin
  if p_hole is null or p_hole < 1 or p_hole > 18 then return jsonb_build_object('ok', false, 'reason', 'hole'); end if;
  select * into j from public.caddy_bookings where id = p_job;
  if not found or coalesce(j.status, '') = 'cancelled' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if j.booking_date <> v_today then return jsonb_build_object('ok', false, 'reason', 'not_today'); end if;
  prefix := lower(split_part(coalesce(j.course_name, ''), ' ', 1));
  select exists (select 1 from public.caddy_profiles cp
                  where coalesce(cp.user_id, '') <> '' and cp.user_id = p_actor
                    and (cp.id = j.caddy_id
                         or (j.caddy_id is null and j.caddie_name = 'Caddy #' || trim(cp.caddy_number)
                             and (prefix = '' or lower(coalesce(cp.course_name, '')) like prefix || '%')))) into mine;
  if not coalesce(mine, false) then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;
  select * into g from public.traffic_group_for_job(p_job);
  if g.group_key is null or g.slug is null then return jsonb_build_object('ok', false, 'reason', 'no_course'); end if;
  if p_undo then
    delete from public.round_hole_marks where play_date = v_today and group_key = g.group_key and hole = p_hole and source = 'caddy';
  else
    insert into public.round_hole_marks (course_slug, play_date, group_key, hole, marked_at, source, tee_time, start_nine, label, players, caddy_job, created_by)
    values (g.slug, v_today, g.group_key, p_hole, now(), 'caddy', g.tee_time, case when p_start in ('front', 'back') then p_start end, g.label, g.players, p_job, p_actor)
    on conflict (play_date, group_key, hole) do nothing;
  end if;
  return jsonb_build_object('ok', true, 'group_key', g.group_key,
    'marks', (select coalesce(jsonb_agg(jsonb_build_object('hole', m.hole, 'at', m.marked_at, 'source', m.source) order by m.marked_at), '[]'::jsonb)
                from public.round_hole_marks m where m.play_date = v_today and m.group_key = g.group_key));
end $$;

-- what the caddy's card needs: her group's marks + any pro shop nudge for it today
create or replace function public.traffic_caddy_state(p_job uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g record; v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  select * into g from public.traffic_group_for_job(p_job);
  if g.group_key is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'group_key', g.group_key, 'slug', g.slug, 'tee_time', g.tee_time,
    'pars', public.traffic_pars(g.slug),
    'marks', (select coalesce(jsonb_agg(jsonb_build_object('hole', m.hole, 'at', m.marked_at, 'source', m.source, 'start', m.start_nine) order by m.marked_at), '[]'::jsonb)
                from public.round_hole_marks m where m.play_date = v_today and (m.group_key = g.group_key or m.players ?| array(select jsonb_array_elements_text(g.players)))),
    'nudges', (select coalesce(jsonb_agg(jsonb_build_object('kind', n.kind, 'hole', n.hole, 'message', n.message, 'at', n.created_at) order by n.created_at desc), '[]'::jsonb)
                 from public.traffic_nudges n where n.play_date = v_today and n.group_key = any(array(select k from (
                   select g.group_key as k union select distinct m.group_key from public.round_hole_marks m
                    where m.play_date = v_today and m.players ?| array(select jsonb_array_elements_text(g.players))) q))));
end $$;

-- the course's pars, hole by hole (its scorecard), par 4 where unknown
create or replace function public.traffic_pars(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  with ref as (select coalesce(v.course_ref, v.slug) as cid, v.name from public.course_venues v where v.slug = p_slug),
       tee as (select ch.tee_marker from public.course_holes ch, ref where ch.course_id = ref.cid group by 1 order by count(*) desc limit 1),
       h as (select ch.hole_number, max(ch.par) par from public.course_holes ch, ref, tee where ch.course_id = ref.cid and ch.tee_marker = tee.tee_marker group by 1)
  select coalesce(jsonb_agg(coalesce((select h.par from h where h.hole_number = n), 4) order by n), '[]'::jsonb) from generate_series(1, 18) n
$$;

-- one venue, a range of days: every mark + the pars + today's nudges (the traffic map and the 30-day grid)
create or replace function public.traffic_marks(p_slug text, p_from date, p_to date)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pars', public.traffic_pars(p_slug),
    'marks', coalesce((select jsonb_agg(jsonb_build_object('d', m.play_date, 'k', m.group_key, 'h', m.hole, 'at', m.marked_at, 's', m.source,
                         't', m.tee_time, 'n', m.start_nine, 'l', m.label, 'p', m.players) order by m.marked_at)
                         from public.round_hole_marks m
                        where m.play_date between p_from and least(p_to, p_from + 62)
                          and public.teetime_venue_of(m.course_slug) = public.teetime_venue_of(p_slug)), '[]'::jsonb),
    'nudges', coalesce((select jsonb_agg(jsonb_build_object('k', n.group_key, 'kind', n.kind, 'h', n.hole, 'at', n.created_at) order by n.created_at)
                          from public.traffic_nudges n where n.play_date between p_from and p_to
                           and public.teetime_venue_of(n.course_slug) = public.teetime_venue_of(p_slug)), '[]'::jsonb))
$$;

-- pro shop: nudge a group's caddies / send the marshal (an in-app banner on the caddy's job card)
create or replace function public.traffic_nudge(p_slug text, p_group_key text, p_kind text, p_hole integer, p_message text, p_by text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Asia/Bangkok')::date; n int;
begin
  if p_kind not in ('nudge', 'marshal') then return jsonb_build_object('ok', false, 'reason', 'kind'); end if;
  if not exists (select 1 from public.round_hole_marks m where m.play_date = v_today and m.group_key = p_group_key) then
    return jsonb_build_object('ok', false, 'reason', 'group');
  end if;
  select count(*) into n from public.traffic_nudges where play_date = v_today and group_key = p_group_key and created_at > now() - interval '3 minutes';
  if n > 0 then return jsonb_build_object('ok', false, 'reason', 'just_sent'); end if;
  insert into public.traffic_nudges (course_slug, play_date, group_key, kind, hole, message, created_by)
  values (p_slug, v_today, p_group_key, p_kind, p_hole, left(regexp_replace(coalesce(p_message, ''), '[<>"`]', '', 'g'), 200), left(coalesce(p_by, ''), 80));
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.traffic_caddy_mark(uuid, integer, text, boolean, text), public.traffic_caddy_state(uuid),
  public.traffic_marks(text, date, date), public.traffic_pars(text), public.traffic_nudge(text, text, text, integer, text, text)
  to anon, authenticated;
revoke execute on function public.traffic_group_for_job(uuid), public.trg_scores_traffic() from public, anon, authenticated;

-- backfill the last 45 days of LIVE scores (first entry per group per hole) so history works from day one
insert into public.round_hole_marks (course_slug, play_date, group_key, hole, marked_at, source, tee_time, start_nine, label, players)
select slug, ((at at time zone 'Asia/Bangkok')::date), gkey, hole_number, at, 'score', tee, sn, lbl, pl
  from (
    select public.traffic_slug(c.course_id, c.course_name) slug, 'sc:' || coalesce(nullif(c.group_id, ''), c.id) gkey, s.hole_number,
           min(s.created_at at time zone 'UTC') at,
           min(to_char((c.started_at at time zone 'UTC') at time zone 'Asia/Bangkok', 'HH24:MI')) tee,
           min(c.starting_nine) sn, min(c.player_name) lbl,
           coalesce(jsonb_agg(distinct c.player_id) filter (where coalesce(c.player_id, '') <> ''), '[]'::jsonb) pl
      from public.scores s join public.scorecards c on c.id = s.scorecard_id
     where s.created_at > now() - interval '45 days' and coalesce(c.status, '') <> 'abandoned'
       and s.hole_number between 1 and 18
     group by 1, 2, 3
  ) q
 where slug is not null
on conflict (play_date, group_key, hole) do nothing;
