-- v1604 SIGN-UP AUTO-SEAT + SIGN-UP LOG (Pete 2026-10-17)
--
-- 1) Every new registration is seated on the event's tee sheet (event_pairings.groups) the moment the
--    row is saved — no organizer step. First-come order, first open seat from the top. A player who
--    asked to play with someone already seated joins that group when it has room. A booking guest
--    ("same group") whose host is seated joins the host's group when it has room; when it is full
--    the client BookingPartyPlacer (v1348) moves the party to a new group, so it is left alone here.
--    Every group full -> a new group at the next tee time. This REVERSES v847 "code seats nobody".
--    Opt-out for a deliberate pool add: special_requests.noSeat = true.
-- 2) event_signup_log: one dated row per sign-up AND per withdrawal (delete, or status -> cancelled).
--    Organizer-facing only (withdrawals never reach the player). signup_no = the receipt number.
-- 3) tee_sheet_seen: the organizer's last acknowledgement per event -> the "new since your last
--    visit" popup on the Tee Sheet.
-- Seating and logging can never block a registration: both run inside exception handlers.

-- ---------------------------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------------------------
create table if not exists public.event_signup_log (
    id           bigserial primary key,
    event_id     uuid not null,
    reg_id       uuid,
    player_id    text,
    player_name  text,
    handicap     real,
    total_fee    numeric,
    want_transport boolean,
    host_id      text,
    kind         text not null check (kind in ('signup', 'withdraw')),
    happened_at  timestamptz not null default clock_timestamp(),
    signup_no    integer,
    seat         text,
    backfill     boolean not null default false,
    walk_on      boolean not null default false,
    actor        text,
    actor_name   text,
    actor_role   text
);
create index if not exists event_signup_log_event_at on public.event_signup_log (event_id, happened_at desc);
create index if not exists event_signup_log_player on public.event_signup_log (event_id, player_id);
alter table public.event_signup_log enable row level security;   -- no policies: RPC access only
revoke all on public.event_signup_log from anon, authenticated;

create table if not exists public.tee_sheet_seen (
    event_id   uuid not null,
    viewer_id  text not null,
    seen_at    timestamptz not null default now(),
    primary key (event_id, viewer_id)
);
alter table public.tee_sheet_seen enable row level security;
revoke all on public.tee_sheet_seen from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------------------------
create or replace function public._ts_players(g jsonb) returns jsonb
language sql immutable as $$
    select case when jsonb_typeof(g) = 'array' then g
                when jsonb_typeof(g -> 'players') = 'array' then g -> 'players'
                else '[]'::jsonb end
$$;

create or replace function public._ts_min(t text) returns integer
language sql immutable as $$
    select case when t ~ '^\d{1,2}:\d{2}' then split_part(t, ':', 1)::int * 60 + substr(split_part(t, ':', 2), 1, 2)::int end
$$;

create or replace function public._ts_fmt(m integer) returns text
language sql immutable as $$
    select lpad((((m % 1440) + 1440) % 1440 / 60)::text, 2, '0') || ':' || lpad((((m % 1440) + 1440) % 1440 % 60)::text, 2, '0')
$$;

-- tee of group i (0-based): its stamped teeTime, else event start + i * 5
create or replace function public._ts_tee_of(groups jsonb, i integer, start_t time) returns text
language sql immutable as $$
    select coalesce(
        case when jsonb_typeof(groups -> i) = 'object' and coalesce(groups -> i ->> 'teeTime', '') ~ '^\d{1,2}:\d{2}'
             then substr(groups -> i ->> 'teeTime', 1, 5) end,
        case when start_t is not null then public._ts_fmt(public._ts_min(to_char(start_t, 'HH24:MI')) + i * 5) end,
        '')
$$;

-- the seat label a player holds right now ("G2 · 09:55"), or null
create or replace function public._ts_seat_label(p_event uuid, p_player text) returns text
language plpgsql stable security definer set search_path = public as $$
declare gs jsonb; st time; i int;
begin
    select ep.groups into gs from event_pairings ep where ep.event_id = p_event::text;
    if gs is null or jsonb_typeof(gs) <> 'array' then return null; end if;
    select start_time into st from society_events where id = p_event;
    for i in 0 .. jsonb_array_length(gs) - 1 loop
        if exists (select 1 from jsonb_array_elements(public._ts_players(gs -> i)) x
                   where coalesce(x ->> 'playerId', x ->> 'id') = p_player) then
            return 'G' || (i + 1) || ' · ' || public._ts_tee_of(gs, i, st);
        end if;
    end loop;
    return null;
end $$;

-- ---------------------------------------------------------------------------------------------
-- the seater
-- ---------------------------------------------------------------------------------------------
create or replace function public._ts_seat_registration(r public.event_registrations) returns text
language plpgsql security definer set search_path = public as $$
declare
    ev        record;
    pr        record;
    gs    jsonb;
    cap       int;
    n         int;
    i         int;
    gi        int := -1;
    sr        jsonb := coalesce(r.special_requests, '{}'::jsonb);
    host      text := nullif(coalesce(sr ->> 'hostId', sr ->> 'host_id'), '');
    hg        int := -1;
    mates     text[] := '{}';
    mate_names text[] := '{}';
    entry     jsonb;
    tee       text := '';
    lastm     int;
    prevm     int;
    m         int;
    iv        int := 5;
begin
    if r.player_id is null or coalesce(r.status, 'registered') = 'cancelled' then return null; end if;
    if coalesce(sr ->> 'noSeat', '') = 'true' then return null; end if;
    -- walk-ons added at scoring time (live scoring / quick score entry / paper card) are not sign-ups
    if coalesce(sr ->> 'walkOn', '') = 'true' then return null; end if;

    perform pg_advisory_xact_lock(hashtext('ts_seat:' || r.event_id::text));
    select id, title, format, start_time into ev from society_events where id = r.event_id;
    select * into pr from event_pairings where event_id = r.event_id::text for update;
    gs := case when pr.groups is not null and jsonb_typeof(pr.groups) = 'array' then pr.groups else '[]'::jsonb end;
    cap := coalesce(nullif(pr.group_size, 0), 4);
    if lower(coalesce(ev.title, '') || ' ' || coalesce(ev.format, '')) ~ '(waltz|(^|[^a-z0-9])(3|three)[ -]?man)' then cap := 3; end if;
    n := jsonb_array_length(gs);

    -- already on the sheet (the organizer placed them before registering them, or a re-insert)
    for i in 0 .. n - 1 loop
        if exists (select 1 from jsonb_array_elements(public._ts_players(gs -> i)) x
                   where coalesce(x ->> 'playerId', x ->> 'id') = r.player_id) then
            return null;
        end if;
    end loop;

    -- booking guest who wants the host's group
    if host is not null and host <> r.player_id and coalesce(sr ->> 'sameGroup', '') <> 'false' then
        for i in 0 .. n - 1 loop
            if exists (select 1 from jsonb_array_elements(public._ts_players(gs -> i)) x
                       where coalesce(x ->> 'playerId', x ->> 'id') = host) then hg := i; exit; end if;
        end loop;
        if hg >= 0 then
            if jsonb_array_length(public._ts_players(gs -> hg)) < cap then gi := hg;
            else return null;   -- host's group is full: BookingPartyPlacer moves the party together
            end if;
        elsif exists (select 1 from event_registrations x where x.event_id = r.event_id and x.player_id = host) then
            return null;        -- host registered but sitting in the pool: the unit stays together there
        end if;
    end if;

    -- requested-together partners (both directions)
    if gi < 0 then
        select coalesce(array_agg(distinct pid) filter (where pid is not null), '{}'),
               coalesce(array_agg(distinct lower(nm)) filter (where nm is not null and nm <> ''), '{}')
          into mates, mate_names
          from (
            -- my prefs -> player ids (pref ids can be a registration id or a player id)
            select coalesce(x.player_id, nullif(case when jsonb_typeof(try_jsonb(p.j)) = 'object' then try_jsonb(p.j) ->> 'playerId' else btrim(p.j) end, '')) as pid,
                   case when jsonb_typeof(try_jsonb(p.j)) = 'object' then try_jsonb(p.j) ->> 'playerName' end as nm
              from unnest(coalesce(r.partner_prefs, '{}'::text[])) as p(j)
              left join event_registrations x on x.event_id = r.event_id
                   and x.id::text = case when jsonb_typeof(try_jsonb(p.j)) = 'object' then try_jsonb(p.j) ->> 'playerId' else btrim(p.j) end
            union all
            -- anyone already registered who asked for me
            select o.player_id, null
              from event_registrations o, unnest(coalesce(o.partner_prefs, '{}'::text[])) as q(j)
             where o.event_id = r.event_id and o.id <> r.id
               and (case when jsonb_typeof(try_jsonb(q.j)) = 'object'
                         then coalesce(try_jsonb(q.j) ->> 'playerId', '') in (r.id::text, r.player_id)
                              or lower(coalesce(try_jsonb(q.j) ->> 'playerName', '~')) = lower(coalesce(r.player_name, '~~'))
                         else btrim(q.j) in (r.id::text, r.player_id, coalesce(r.player_name, '~~')) end)
          ) s;
        if array_length(mates, 1) > 0 or array_length(mate_names, 1) > 0 then
            for i in 0 .. n - 1 loop
                if jsonb_array_length(public._ts_players(gs -> i)) < cap
                   and exists (select 1 from jsonb_array_elements(public._ts_players(gs -> i)) x
                               where coalesce(x ->> 'playerId', x ->> 'id') = any (mates)
                                  or lower(coalesce(x ->> 'playerName', x ->> 'name', '')) = any (mate_names)) then
                    gi := i; exit;
                end if;
            end loop;
        end if;
    end if;

    -- first open seat from the top
    if gi < 0 then
        for i in 0 .. n - 1 loop
            if jsonb_array_length(public._ts_players(gs -> i)) < cap then gi := i; exit; end if;
        end loop;
    end if;

    entry := jsonb_build_object('playerId', r.player_id, 'playerName', coalesce(r.player_name, ''),
                                'handicap', r.handicap, 'autoAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));

    if gi >= 0 then
        if jsonb_typeof(gs -> gi) = 'array' then
            gs := jsonb_set(gs, array[gi::text], (gs -> gi) || jsonb_build_array(entry));
        else
            gs := jsonb_set(gs, array[gi::text, 'players'], public._ts_players(gs -> gi) || jsonb_build_array(entry));
        end if;
        tee := public._ts_tee_of(gs, gi, ev.start_time);
    else
        -- every group is full: a new group at the next tee time
        for i in 0 .. n - 1 loop
            m := public._ts_min(public._ts_tee_of(gs, i, ev.start_time));
            if m is not null then prevm := lastm; lastm := m; end if;
        end loop;
        if lastm is not null and prevm is not null and lastm - prevm between 1 and 30 then iv := lastm - prevm; end if;
        if lastm is not null then tee := public._ts_fmt(lastm + iv);
        elsif ev.start_time is not null then tee := to_char(ev.start_time, 'HH24:MI');
        end if;
        gs := gs || jsonb_build_array(jsonb_build_object('players', jsonb_build_array(entry), 'teeTime', tee,
                                                                 'teeFixed', tee <> '', 'startNine', null, 'secondNine', null));
        gi := n;
    end if;

    if pr.event_id is not null then
        update event_pairings set groups = gs where event_id = r.event_id::text;
    else
        insert into event_pairings (event_id, group_size, groups) values (r.event_id::text, cap, gs)
        on conflict (event_id) do update set groups = excluded.groups;
    end if;
    return 'G' || (gi + 1) || case when tee <> '' then ' · ' || tee else '' end;
end $$;
revoke all on function public._ts_seat_registration(public.event_registrations) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- triggers
-- ---------------------------------------------------------------------------------------------
-- BEFORE INSERT: NEW badge tag (special_requests.lateReg) when the sheet already had players and this
-- player is not one the organizer just placed (same rule as v824, now server-side for every path).
create or replace function public.trg_event_reg_late_tag() returns trigger
language plpgsql security definer set search_path = public as $$
declare gs jsonb;
begin
    begin
        if NEW.player_id is not null and coalesce(NEW.special_requests ->> 'lateReg', '') = '' then
            select ep.groups into gs from event_pairings ep where ep.event_id = NEW.event_id::text;
            if gs is not null and jsonb_typeof(gs) = 'array'
               and exists (select 1 from jsonb_array_elements(gs) g where jsonb_array_length(public._ts_players(g)) > 0)
               and not exists (select 1 from jsonb_array_elements(gs) g, jsonb_array_elements(public._ts_players(g)) x
                               where coalesce(x ->> 'playerId', x ->> 'id') = NEW.player_id) then
                NEW.special_requests := coalesce(NEW.special_requests, '{}'::jsonb)
                    || jsonb_build_object('lateReg', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
            end if;
        end if;
    exception when others then null;
    end;
    return NEW;
end $$;

create or replace function public._signup_log_write(r public.event_registrations, p_kind text, p_seat text) returns void
language plpgsql security definer set search_path = public as $$
declare h jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb; sno int;
begin
    if p_kind = 'signup' then
        perform pg_advisory_xact_lock(hashtext('signup_no:' || r.event_id::text));
        select coalesce(max(signup_no), 0) + 1 into sno from event_signup_log where event_id = r.event_id and kind = 'signup';
    end if;
    insert into event_signup_log (event_id, reg_id, player_id, player_name, handicap, total_fee, want_transport, host_id,
                                  kind, signup_no, seat, walk_on, actor, actor_name, actor_role)
    values (r.event_id, r.id, r.player_id, r.player_name, r.handicap, r.total_fee, r.want_transport,
            nullif(coalesce(r.special_requests ->> 'hostId', r.special_requests ->> 'host_id'), ''),
            p_kind, sno, p_seat, coalesce(r.special_requests ->> 'walkOn', '') = 'true',
            coalesce(nullif(h ->> 'x-mcp-actor', ''), case when h = '{}'::jsonb then 'system' else 'anon' end),
            left(h ->> 'x-mcp-actor-name', 120), left(h ->> 'x-mcp-role', 24));
end $$;
revoke all on function public._signup_log_write(public.event_registrations, text, text) from public, anon, authenticated;

create or replace function public.trg_event_reg_signup_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare seat text;
begin
    if TG_OP = 'INSERT' then
        if coalesce(NEW.status, 'registered') = 'cancelled' then return null; end if;
        begin seat := public._ts_seat_registration(NEW);
        exception when others then raise warning 'auto-seat failed for % %: %', NEW.event_id, NEW.player_id, sqlerrm; seat := null; end;
        begin perform public._signup_log_write(NEW, 'signup', coalesce(seat, public._ts_seat_label(NEW.event_id, NEW.player_id)));
        exception when others then raise warning 'signup log failed: %', sqlerrm; end;
    elsif TG_OP = 'DELETE' then
        if coalesce(OLD.status, 'registered') = 'cancelled' then return null; end if;   -- already logged as withdrawn
        begin perform public._signup_log_write(OLD, 'withdraw', public._ts_seat_label(OLD.event_id, OLD.player_id));
        exception when others then raise warning 'withdraw log failed: %', sqlerrm; end;
    elsif TG_OP = 'UPDATE' then
        if OLD.event_id is distinct from NEW.event_id then
            -- only the TRGG schedule sync does this (it repoints a duplicate event's rows onto the canonical
            -- event, pairings included): the history follows the registration, no fake withdraw/sign-up
            begin update event_signup_log set event_id = NEW.event_id where reg_id = NEW.id; exception when others then null; end;
        elsif NEW.status = 'cancelled' and OLD.status is distinct from 'cancelled' then
            begin perform public._signup_log_write(NEW, 'withdraw', public._ts_seat_label(NEW.event_id, NEW.player_id));
            exception when others then null; end;
        elsif OLD.status = 'cancelled' and coalesce(NEW.status, 'registered') <> 'cancelled' then
            begin seat := public._ts_seat_registration(NEW); exception when others then seat := null; end;
            begin perform public._signup_log_write(NEW, 'signup', coalesce(seat, public._ts_seat_label(NEW.event_id, NEW.player_id)));
            exception when others then null; end;
        end if;
    end if;
    return null;
end $$;

drop trigger if exists trg_event_reg_late_tag on public.event_registrations;
create trigger trg_event_reg_late_tag before insert on public.event_registrations
    for each row execute function public.trg_event_reg_late_tag();

drop trigger if exists trg_event_reg_signup_log on public.event_registrations;
create trigger trg_event_reg_signup_log after insert or delete or update of status, event_id on public.event_registrations
    for each row execute function public.trg_event_reg_signup_log();

-- ---------------------------------------------------------------------------------------------
-- backfill: every existing registration of events from 14 days ago forward gets its dated sign-up row
-- (backfill = true: never counted as "new" in the popup; numbered in created_at order)
-- ---------------------------------------------------------------------------------------------
insert into public.event_signup_log (event_id, reg_id, player_id, player_name, handicap, total_fee, want_transport, host_id,
                                     kind, happened_at, signup_no, seat, backfill, walk_on, actor)
select er.event_id, er.id, er.player_id, er.player_name, er.handicap, er.total_fee, er.want_transport,
       nullif(coalesce(er.special_requests ->> 'hostId', er.special_requests ->> 'host_id'), ''),
       'signup', coalesce(er.created_at, now()),
       row_number() over (partition by er.event_id order by er.created_at, er.id),
       null, true, coalesce(er.special_requests ->> 'walkOn', '') = 'true', 'backfill'
  from public.event_registrations er
  join public.society_events se on se.id = er.event_id
 where se.event_date >= (now() at time zone 'Asia/Bangkok')::date - 14
   and coalesce(er.status, 'registered') <> 'cancelled'
   and not exists (select 1 from public.event_signup_log l where l.reg_id = er.id and l.kind = 'signup');

-- ---------------------------------------------------------------------------------------------
-- RPCs (anon — the app's auth is client-asserted, same exposure as event_registrations itself)
-- ---------------------------------------------------------------------------------------------
-- Organizer: the full dated log for one event (sign-ups + withdrawals), newest first, plus last seen.
create or replace function public.signup_log_for_event(p_event uuid, p_viewer text default null)
returns jsonb language sql stable security definer set search_path = public as $$
    select jsonb_build_object(
        'seen_at', (select seen_at from tee_sheet_seen where event_id = p_event and viewer_id = coalesce(p_viewer, '')),
        'rows', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', l.id, 'reg_id', l.reg_id, 'player_id', l.player_id, 'player_name', l.player_name,
                    'handicap', l.handicap, 'total_fee', l.total_fee, 'want_transport', l.want_transport,
                    'host_id', l.host_id, 'kind', l.kind, 'at', l.happened_at, 'signup_no', l.signup_no, 'seat', l.seat,
                    'backfill', l.backfill, 'walk_on', l.walk_on,
                    'by_player', case when l.kind = 'withdraw' and l.actor_role is not null then l.actor = l.player_id end) order by l.happened_at desc, l.id desc)
                  from event_signup_log l where l.event_id = p_event), '[]'::jsonb))
$$;

-- Organizer: unseen activity (non-backfill sign-ups + withdrawals after this viewer's last ack) per event.
create or replace function public.signup_news(p_events uuid[], p_viewer text)
returns jsonb language sql stable security definer set search_path = public as $$
    select coalesce(jsonb_agg(jsonb_build_object('event_id', e.eid, 'seen_at', s.seen_at, 'rows', x.rows)), '[]'::jsonb)
      from unnest(p_events) as e(eid)
      left join tee_sheet_seen s on s.event_id = e.eid and s.viewer_id = p_viewer
      cross join lateral (
          select jsonb_agg(jsonb_build_object(
                    'id', l.id, 'reg_id', l.reg_id, 'player_id', l.player_id, 'player_name', l.player_name,
                    'handicap', l.handicap, 'total_fee', l.total_fee, 'want_transport', l.want_transport,
                    'host_id', l.host_id, 'kind', l.kind, 'at', l.happened_at, 'signup_no', l.signup_no, 'seat', l.seat,
                    'by_player', case when l.kind = 'withdraw' and l.actor_role is not null then l.actor = l.player_id end,
                    'seat_now', case when l.kind = 'signup' then public._ts_seat_label(l.event_id, l.player_id) end) order by l.happened_at desc, l.id desc) as rows
            from event_signup_log l
           where l.event_id = e.eid and not l.backfill and not l.walk_on
             and l.happened_at > coalesce(s.seen_at, '-infinity'::timestamptz)
      ) x
     where x.rows is not null
$$;

-- Organizer: GOT IT
create or replace function public.tee_sheet_mark_seen(p_events uuid[], p_viewer text)
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
    if coalesce(p_viewer, '') = '' then return 0; end if;
    insert into tee_sheet_seen (event_id, viewer_id, seen_at)
    select e, p_viewer, clock_timestamp() from unnest(p_events) e
    on conflict (event_id, viewer_id) do update set seen_at = excluded.seen_at;
    get diagnostics n = row_count;
    return n;
end $$;

-- Player: my receipt for one event (sign-ups only — a player never sees a withdrawal record).
create or replace function public.signup_receipt(p_event uuid, p_player text)
returns jsonb language sql stable security definer set search_path = public as $$
    select jsonb_build_object('reg_id', er.id, 'player_name', er.player_name, 'handicap', er.handicap,
                              'total_fee', er.total_fee, 'want_transport', er.want_transport,
                              'payment_status', er.payment_status,
                              'signed_up_at', coalesce(l.happened_at, er.created_at), 'signup_no', l.signup_no,
                              'seat', public._ts_seat_label(er.event_id, er.player_id))
      from event_registrations er
      left join lateral (select happened_at, signup_no from event_signup_log
                          where event_id = er.event_id and player_id = er.player_id and kind = 'signup'
                          order by happened_at desc limit 1) l on true
     where er.event_id = p_event and er.player_id = p_player and coalesce(er.status, 'registered') <> 'cancelled'
     limit 1
$$;

grant execute on function public.signup_log_for_event(uuid, text) to anon, authenticated;
grant execute on function public.signup_news(uuid[], text) to anon, authenticated;
grant execute on function public.tee_sheet_mark_seen(uuid[], text) to anon, authenticated;
grant execute on function public.signup_receipt(uuid, text) to anon, authenticated;
