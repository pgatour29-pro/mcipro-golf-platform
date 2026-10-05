-- Rain Out (v1463, 2026-10-05). Pete, TRGG Pattaya Country Club, thunderstorm on hole 14: "We can't just
-- throw away the round" / "we need a rain out function and button option".
--
-- An organizer declares an event's round stopped. Every board then ranks the event on an 18-hole figure
-- built from the holes each player DID play (method chosen at declaration):
--   prorata  points / holes played x 18
--   common   points on the holes every scored player completed (Committee rule)
--   netpar   points + 2 per unplayed hole
-- The maths lives in the client helper window.RainOut (public/rain-out.js); the DB only records the call
-- and protects the cards.
--
-- Why the cards must be closed here: sweep_stale_scorecards (every 5 min) abandons any in_progress card
-- idle for 2 hours, and every board filters abandoned cards — a long storm would wipe the event's results.
-- declare_rain_out() completes every scored card of the event (in_progress, or already idle-closed by the
-- sweep = abandoned + auto_closed_at; a card a player ENDED himself stays out) and remembers which ones,
-- so lift_rain_out() can reopen exactly those if play resumes. A guard trigger keeps those cards completed
-- when a phone still on an old build taps END afterwards (its abandon write would otherwise drop them).
-- No rounds rows are written: a short round must not reach history or handicaps.

create table if not exists public.event_rain_outs (
    event_id         uuid primary key references public.society_events(id) on delete cascade,
    method           text not null check (method in ('prorata', 'common', 'netpar')),
    declared_by      text,
    declared_by_name text,
    declared_at      timestamptz not null default now(),
    closed_cards     text[] not null default '{}'      -- scorecards.id is TEXT
);
-- (first apply had uuid[]; scorecards.id is text)
alter table public.event_rain_outs alter column closed_cards drop default;
alter table public.event_rain_outs alter column closed_cards type text[] using closed_cards::text[];
alter table public.event_rain_outs alter column closed_cards set default '{}';
alter table public.event_rain_outs enable row level security;
drop policy if exists rain_out_select on public.event_rain_outs;
create policy rain_out_select on public.event_rain_outs for select to anon, authenticated using (true);
-- No insert/update/delete policies: writes go through the two functions below only.

create or replace function public.declare_rain_out(p_event_id uuid, p_method text, p_by text, p_by_name text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
    v_ids text[];
begin
    if p_method not in ('prorata', 'common', 'netpar') then
        raise exception 'unknown rain-out method %', p_method;
    end if;
    -- Organizer auth is client-side (PIN) in this app, so the database cannot tell who is calling.
    -- Limit the reach instead: only an event dated yesterday..tomorrow (Bangkok), never past results.
    if not exists (select 1 from society_events
                    where id = p_event_id
                      and event_date between (now() at time zone 'Asia/Bangkok')::date - 1
                                         and (now() at time zone 'Asia/Bangkok')::date + 1) then
        raise exception 'rain out is only for an event dated today (or the day either side)';
    end if;
    with closed as (
        update scorecards sc
           set status       = 'completed',
               completed_at = coalesce((select max(s.created_at) from scores s where s.scorecard_id = sc.id::text), sc.updated_at),
               updated_at   = (now() at time zone 'UTC')
         where sc.event_id = p_event_id::text
           and (sc.status = 'in_progress' or (sc.status = 'abandoned' and sc.auto_closed_at is not null))
           -- short rounds only: a full 18 still in progress is a round that never got its FINISH tap —
           -- leave it for sweep_stale_scorecards to post to history exactly as FINISH would
           and (select count(*) from scores s where s.scorecard_id = sc.id::text and s.gross_score is not null) between 1 and 17
        returning sc.id::text
    )
    select coalesce(array_agg(id), '{}') into v_ids from closed;

    insert into event_rain_outs (event_id, method, declared_by, declared_by_name, closed_cards)
    values (p_event_id, p_method, p_by, p_by_name, v_ids)
    on conflict (event_id) do update
       set method           = excluded.method,
           declared_by      = excluded.declared_by,
           declared_by_name = excluded.declared_by_name,
           declared_at      = now(),
           closed_cards     = array(select distinct unnest(event_rain_outs.closed_cards || excluded.closed_cards));

    return jsonb_build_object('closed', coalesce(array_length(v_ids, 1), 0), 'method', p_method);
end $$;

create or replace function public.lift_rain_out(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
    v_ids text[];
    v_n   int := 0;
begin
    if not exists (select 1 from society_events
                    where id = p_event_id
                      and event_date between (now() at time zone 'Asia/Bangkok')::date - 1
                                         and (now() at time zone 'Asia/Bangkok')::date + 1) then
        raise exception 'rain out is only for an event dated today (or the day either side)';
    end if;
    delete from event_rain_outs where event_id = p_event_id returning closed_cards into v_ids;
    if v_ids is null then
        return jsonb_build_object('reopened', 0);
    end if;
    -- The row is gone first, so the guard trigger no longer holds these cards.
    update scorecards
       set status = 'in_progress', completed_at = null, auto_closed_at = null,
           updated_at = (now() at time zone 'UTC')
     where id::text = any(v_ids) and status = 'completed';
    get diagnostics v_n = row_count;
    return jsonb_build_object('reopened', v_n);
end $$;

revoke all on function public.declare_rain_out(uuid, text, text, text) from public;
revoke all on function public.lift_rain_out(uuid) from public;
grant execute on function public.declare_rain_out(uuid, text, text, text) to anon, authenticated;
grant execute on function public.lift_rain_out(uuid) to anon, authenticated;

create or replace function public.trg_scorecards_keep_rain_out()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
    if exists (select 1 from event_rain_outs r where old.id::text = any(r.closed_cards)) then
        new.status       := old.status;
        new.completed_at := old.completed_at;
    end if;
    return new;
end $$;

drop trigger if exists scorecards_keep_rain_out on public.scorecards;
create trigger scorecards_keep_rain_out
    before update of status on public.scorecards
    for each row when (old.status = 'completed' and new.status is distinct from old.status)
    execute function public.trg_scorecards_keep_rain_out();
