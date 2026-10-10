-- =====================================================================================
-- RAIN-OUT ROUNDS COUNT PRO-RATA (2026-10-10, Pete on Telegram)
-- =====================================================================================
-- Pete: "TRGG October 5th at Pattaya CC was a rain out ... scores like mine which shows 55 gross
--        is inaccurate ... show what the full 18 score is and also reflect on the hcp counting
--        scores and make adjustments if needed for all players on October 5th."
--
-- Before: the handicap engine treated holes_played = 9 as gross x 2 and EVERY other short round
-- (10..17 holes) as a full 18 — a 13-hole 55 went into the differential as an 18-hole 55.
-- The WHS society window (calculate_society_handicap_index) never scaled at all, not even 9 holes.
-- Rain-out (v1463) deliberately wrote NO rounds rows for the cards it closed, so five players from
-- Oct 5 have no round in their history and nothing in their counting scores.
--
-- Now:
--   1. public.prorata18(value, holes): value x 18 / holes for 9..17 holes, unchanged at 18.
--   2. auto_update_society_handicaps_on_round: adjusted gross AND stableford use prorata18.
--   3. calculate_society_handicap_index: every round in the 20-round window uses prorata18(gross).
--   4. Backfill: a rounds row (+ round_holes) for every completed SHORT scorecard of the Oct 5
--      event that has no rounds row yet — same shape as the live-scored rows of that day.
--      The engine fires on insert; TRGG rows are locked (TRGG-masterscoreboard), so society and
--      universal handicaps do not move, but the round is now in the record and the ledger.
--   5. Nothing is written to event_rain_outs, scorecards or scores.
--
-- Apply:    npx supabase db query --linked -f sql/rain_out_hcp_prorata_20261010.sql
-- Rollback: the block at the end (previous function bodies in sql/rollback/, inserted ids logged).
-- =====================================================================================

begin;

-- 1. helper ---------------------------------------------------------------------------
create or replace function public.prorata18(p_value numeric, p_holes integer)
returns numeric
language sql
immutable
as $$
  select case
    when p_value is null then null
    when coalesce(p_holes, 18) >= 18 or coalesce(p_holes, 18) < 9 then p_value
    else round(p_value * 18.0 / p_holes, 1)
  end
$$;

-- 2. engine: universal branch scales any 9..17-hole round ------------------------------
do $do$
declare
  v_src text;
  v_old1 text := $t$        v_adj_gross := CASE WHEN COALESCE(NEW.holes_played, 18) = 9
                            THEN NEW.total_gross * 2 ELSE NEW.total_gross END;$t$;
  v_new1 text := $t$        -- 2026-10-10: any short round (9..17 holes) counts pro-rata, not just 9 x 2
        v_adj_gross := round(public.prorata18(NEW.total_gross, NEW.holes_played));$t$;
  v_old2 text := $t$    IF v_stb IS NOT NULL AND COALESCE(NEW.holes_played, 18) = 9 THEN
      v_stb := v_stb * 2;
    END IF;$t$;
  v_new2 text := $t$    IF v_stb IS NOT NULL AND COALESCE(NEW.holes_played, 18) BETWEEN 9 AND 17 THEN
      v_stb := round(public.prorata18(v_stb, NEW.holes_played));   -- 2026-10-10 pro-rata
    END IF;$t$;
begin
  select pg_get_functiondef('public.auto_update_society_handicaps_on_round'::regproc) into v_src;
  if position(v_old1 in v_src) = 0 or position(v_old2 in v_src) = 0 then
    raise exception 'engine text drifted — refusing to patch blind';
  end if;
  v_src := replace(v_src, v_old1, v_new1);
  v_src := replace(v_src, v_old2, v_new2);
  execute v_src;
end $do$;

-- 3. WHS society window: pro-rata gross per round --------------------------------------
do $do$
declare
  v_src text;
  v_old_sel text := $t$      r.total_gross,
      r.course_id,$t$;
  v_new_sel text := $t$      public.prorata18(r.total_gross, r.holes_played)::integer AS total_gross,   -- 2026-10-10 pro-rata
      r.course_id,$t$;
begin
  select pg_get_functiondef('public.calculate_society_handicap_index'::regproc) into v_src;
  if position(v_old_sel in v_src) = 0 then
    raise exception 'WHS function text drifted — refusing to patch blind';
  end if;
  v_src := replace(v_src, v_old_sel, v_new_sel);
  execute v_src;
end $do$;

-- 4. backfill the Oct 5 rain-out players who have no round on record ------------------
create table if not exists public.rounds_rainout_backfill_20261010 (
  round_id uuid primary key, scorecard_id text, golfer_id text, player_name text, inserted_at timestamptz default now()
);

with ev as (
  select e.id, e.course_name, e.event_date
  from public.society_events e
  where e.id = '78ab0dd5-6da6-4017-8e8c-34cccf53a143'
),
cards as (
  select s.*, ev.id as ev_id, ev.event_date,
         (select count(*) from public.scores x where x.scorecard_id = s.id and x.gross_score is not null) as holes,
         (select sum(x.gross_score) from public.scores x where x.scorecard_id = s.id) as gross,
         (select sum(x.net_score) from public.scores x where x.scorecard_id = s.id) as net,
         (select sum(coalesce(x.stableford_points, x.stableford)) from public.scores x where x.scorecard_id = s.id) as stb
  from public.scorecards s
  join ev on s.event_id = ev.id::text
  where s.status = 'completed'
),
todo as (
  select c.* from cards c
  where c.holes between 9 and 17
    and not exists (select 1 from public.rounds r where r.golfer_id = c.player_id and r.society_event_id = c.ev_id)
),
ins as (
  insert into public.rounds (
    type, status, course_id, golfer_id, played_at, total_net, started_at, tee_marker, course_name,
    player_name, shared_with, total_gross, completed_at, holes_played, slope_rating, course_rating,
    handicap_used, is_tournament, points_awarded, posted_formats, scoring_formats, society_event_id,
    total_stableford, validation_status, primary_society_id, posted_to_organizer, game_config, format_scores
  )
  select
    'society', 'completed', coalesce(t.course_id, 'pattaya_county'), t.player_id,
    (t.event_date::text || 'T00:00:00+00')::timestamptz, t.net,
    coalesce(t.started_at, t.event_date::timestamp)::timestamptz, coalesce(t.tee_marker, 'white'), coalesce(t.course_name, 'Pattaya Country Club'),
    t.player_name, '{}'::text[], t.gross, coalesce(t.completed_at, t.event_date::timestamp)::timestamptz, t.holes, 120, 70.5,
    t.handicap, false, 0, array['stableford']::text[], '["stableford"]'::jsonb, t.ev_id,
    t.stb, 'confirmed', '7c0e4b72-d925-44bc-afda-38259a7ba346', false,
    jsonb_build_object('formats', jsonb_build_array('stableford'), 'rain_out', true, 'source', 'rain_out_backfill_20261010'),
    jsonb_build_object('stableford', t.stb)
  from todo t
  returning id, golfer_id, player_name
)
insert into public.rounds_rainout_backfill_20261010 (round_id, scorecard_id, golfer_id, player_name)
select i.id, t.id, i.golfer_id, i.player_name
from ins i join todo t on t.player_id = i.golfer_id;

-- per-hole detail so the history card and the details modal draw the real holes
insert into public.round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score, stableford_points, handicap_strokes)
select b.round_id, x.hole_number, x.par, x.stroke_index, x.gross_score, x.net_score, coalesce(x.stableford_points, x.stableford), x.handicap_strokes
from public.rounds_rainout_backfill_20261010 b
join public.scores x on x.scorecard_id = b.scorecard_id
where x.gross_score is not null
  and not exists (select 1 from public.round_holes h where h.round_id = b.round_id and h.hole_number = x.hole_number);

-- report
select b.player_name, b.golfer_id, r.holes_played, r.total_gross, r.total_stableford,
       public.prorata18(r.total_gross, r.holes_played) as gross18, public.prorata18(r.total_stableford, r.holes_played) as pts18
from public.rounds_rainout_backfill_20261010 b join public.rounds r on r.id = b.round_id
order by b.player_name;

commit;

-- =====================================================================================
-- ROLLBACK (run by hand if needed)
-- =====================================================================================
-- begin;
-- delete from public.round_holes where round_id in (select round_id from public.rounds_rainout_backfill_20261010);
-- delete from public.rounds where id in (select round_id from public.rounds_rainout_backfill_20261010);
-- drop table public.rounds_rainout_backfill_20261010;
-- \i sql/rollback/auto_update_society_handicaps_on_round_pre_20261010.sql
-- \i sql/rollback/calculate_society_handicap_index_pre_20261010.sql
-- drop function public.prorata18(numeric, integer);
-- commit;
