-- v1458c: round_hole_marks is readable with the browser key (realtime needs it), so it never stores a raw
-- player id (LINE ids): players are md5 hashes — group merging only needs equality. Existing rows hashed in place.

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
            case when coalesce(c.player_id, '') = '' then '[]'::jsonb else jsonb_build_array(md5(c.player_id)) end)
    on conflict (play_date, group_key, hole) do update
      set players = case when public.round_hole_marks.players @> excluded.players then public.round_hole_marks.players
                         else public.round_hole_marks.players || excluded.players end
      where not (public.round_hole_marks.players @> excluded.players);
  exception when others then
    return null;
  end;
  return null;
end $$;

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
        coalesce((select jsonb_agg(md5(x->>'odoo_id')) from jsonb_array_elements(coalesce(b.booking_data->'golfers', '[]'::jsonb)) x where coalesce(x->>'odoo_id', '') <> ''), '[]'::jsonb)
          || case when coalesce(j.golfer_id, '') <> '' then jsonb_build_array(md5(j.golfer_id)) else '[]'::jsonb end,
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
        coalesce((select jsonb_agg(md5(coalesce(p->>'playerId', p->>'id'))) from jsonb_array_elements(g.grp->'players') p where coalesce(p->>'playerId', p->>'id', '') <> ''), '[]'::jsonb),
        coalesce(nullif(g.grp->>'teeTime', ''), to_char(coalesce(j.tee_time, j.start_time), 'HH24:MI')),
        coalesce((select p->>'playerName' from jsonb_array_elements(g.grp->'players') p limit 1), j.golfer_name);
      return;
    end if;
  end if;
  return query select 'cj:' || j.id::text, v_slug,
    case when coalesce(j.golfer_id, '') <> '' then jsonb_build_array(md5(j.golfer_id)) else '[]'::jsonb end,
    to_char(coalesce(j.tee_time, j.start_time), 'HH24:MI'), j.golfer_name;
end $$;


update public.round_hole_marks m
   set players = coalesce((select jsonb_agg(case when x ~ '^[0-9a-f]{32}$' then x else md5(x) end) from jsonb_array_elements_text(m.players) x), '[]'::jsonb)
 where exists (select 1 from jsonb_array_elements_text(m.players) x where x !~ '^[0-9a-f]{32}$');
revoke execute on function public.traffic_group_for_job(uuid), public.trg_scores_traffic() from public, anon, authenticated;
