-- SCALE (2026-09-26): Great Shot toast moves off the UNFILTERED scores feed.
-- Before: every phone on the live scoring page subscribed to ALL scores INSERT/UPDATE and
-- classified client-side — realtime cost = (score writes x live phones), the #1 scale blocker.
-- After: a trigger on scores classifies server-side and writes ONE row per great shot into
-- great_shots, stamped with scope_key; phones subscribe to great_shots filtered by their key.
--   event round  -> scope_key = 'ev_' || event_id
--   casual round -> scope_key = 'c_' || left(sha256(course_name),16) || '_' || Bangkok date
-- Client mirror: GreatShotToast._scopeKey() in public/index.html (must stay identical).
-- Trigger matrix = GreatShotToast.classify(): gross 1 = ace, par3 gross 2 = two,
-- par-2 = eagle, par-3 or better = albatross.

create table if not exists public.great_shots (
    scorecard_id text not null,
    hole_number  integer not null,
    kind         text not null,
    par          integer,
    gross_score  integer,
    scope_key    text not null,
    event_id     text,
    course_name  text,
    player_name  text,
    created_at   timestamptz not null default now(),
    primary key (scorecard_id, hole_number)
);
create index if not exists great_shots_scope_idx on public.great_shots (scope_key, created_at desc);

alter table public.great_shots enable row level security;
drop policy if exists great_shots_read on public.great_shots;
create policy great_shots_read on public.great_shots for select using (true);
-- no insert/update/delete policies: only the SECURITY DEFINER trigger writes

create or replace function public.great_shot_classify(p_par integer, p_gross integer)
returns text language sql immutable as $$
    select case
        when p_par is null or p_gross is null or p_par < 1 or p_gross < 1 then null
        when p_gross = 1 then 'ace'
        when p_par = 3 and p_gross = 2 then 'two'
        when p_gross - p_par = -2 then 'eagle'
        when p_gross - p_par <= -3 then 'albatross'
        else null end
$$;

create or replace function public.trg_scores_great_shot()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    v_kind text;
    v_card record;
    v_key text;
begin
    v_kind := public.great_shot_classify(new.par, new.gross_score);
    if v_kind is null then return new; end if;
    if tg_op = 'UPDATE' and old.gross_score is not distinct from new.gross_score then return new; end if;

    select id, event_id, course_name, player_name into v_card
      from public.scorecards where id = new.scorecard_id;
    if not found then return new; end if;

    if coalesce(v_card.event_id, '') <> '' then
        v_key := 'ev_' || v_card.event_id;
    else
        if coalesce(v_card.course_name, '') = '' then return new; end if;
        v_key := 'c_' || left(encode(sha256(convert_to(v_card.course_name, 'UTF8')), 'hex'), 16)
                 || '_' || to_char((now() at time zone 'Asia/Bangkok')::date, 'YYYY-MM-DD');
    end if;

    insert into public.great_shots (scorecard_id, hole_number, kind, par, gross_score, scope_key,
                                    event_id, course_name, player_name)
    values (new.scorecard_id, new.hole_number, v_kind, new.par, new.gross_score, v_key,
            nullif(v_card.event_id, ''), v_card.course_name, v_card.player_name)
    on conflict (scorecard_id, hole_number) do nothing;
    return new;
exception when others then
    -- a toast must never block a score save
    return new;
end $$;

drop trigger if exists scores_great_shot on public.scores;
create trigger scores_great_shot after insert or update of gross_score on public.scores
    for each row execute function public.trg_scores_great_shot();

do $$ begin
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'great_shots') then
        alter publication supabase_realtime add table public.great_shots;
    end if;
end $$;

-- Backfill the last 2 days so rounds in progress at deploy keep their catch-up history.
insert into public.great_shots (scorecard_id, hole_number, kind, par, gross_score, scope_key,
                                event_id, course_name, player_name, created_at)
select s.scorecard_id, s.hole_number, public.great_shot_classify(s.par, s.gross_score), s.par, s.gross_score,
       case when coalesce(c.event_id, '') <> '' then 'ev_' || c.event_id
            else 'c_' || left(encode(sha256(convert_to(c.course_name, 'UTF8')), 'hex'), 16) || '_'
                 || to_char((coalesce(s.updated_at, s.created_at) at time zone 'UTC' at time zone 'Asia/Bangkok')::date, 'YYYY-MM-DD') end,
       nullif(c.event_id, ''), c.course_name, c.player_name,
       coalesce(s.updated_at, s.created_at) at time zone 'UTC'
  from public.scores s join public.scorecards c on c.id = s.scorecard_id
 where coalesce(s.updated_at, s.created_at) > now() - interval '2 days'
   and public.great_shot_classify(s.par, s.gross_score) is not null
   and (coalesce(c.event_id, '') <> '' or coalesce(c.course_name, '') <> '')
on conflict (scorecard_id, hole_number) do nothing;
