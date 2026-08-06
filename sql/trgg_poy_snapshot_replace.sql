-- TRGG POY: snapshot-replace write path + one-time repair of duplicated paste batches.
--
-- Problem (found 2026-08-06): each masterscoreboard paste is a SNAPSHOT of a player's
-- current counting scores (top 20), but the update modal only ever APPENDED rounds.
-- Six pastes since May stacked the same scores 6x, and the best-20 recompute then
-- double-counted a player's best rounds (Hulen showed 854 pts vs true 773; standings
-- order wrong). Verified: 0 of 933 players ever had a smaller batch than a prior one,
-- so keeping only the LATEST batch per player restores the exact current snapshot.
--
-- This file: (1) official rounds-played column, (2) view exposes it, (3) RPC that
-- REPLACES rounds per pasted player (RLS gives anon no DELETE, so replace must happen
-- here as SECURITY DEFINER), (4) repair delete, (5) cache rebuild.

-- 1) Official "rounds played" from the masterscoreboard paste (pasted but discarded before)
alter table trgg_players add column if not exists rounds_played integer;

-- 2) View: total_rounds = official rounds played when known, else counting rounds
create or replace view trgg_player_of_year_view as
 with ranked_rounds as (
   select r.player_id, r.stableford,
          row_number() over (partition by r.player_id order by r.stableford desc) as rn,
          count(*) over (partition by r.player_id) as total_rounds
   from trgg_rounds r
 ), top20 as (
   select player_id,
          sum(stableford) as pts,
          count(*) as counted_rounds,
          max(total_rounds) as total_rounds,
          max(stableford) as best_score,
          min(stableford) as worst_score,
          round(avg(stableford), 1) as avg_score,
          array_agg(stableford order by stableford desc) as scores
   from ranked_rounds
   where rn <= 20
   group by player_id
 ), with_rank as (
   select p.id, p.display_name, p.user_id, t.pts,
          t.counted_rounds as rounds,
          greatest(coalesce(p.rounds_played, 0), t.total_rounds) as total_rounds,
          t.best_score, t.worst_score, t.avg_score, t.scores,
          rank() over (order by t.pts desc, t.best_score desc) as pos
   from top20 t
   join trgg_players p on p.id = t.player_id
   where p.active = true
 )
 select id, display_name, user_id, pts, rounds, total_rounds, best_score, worst_score,
        avg_score, scores, pos
 from with_rank
 order by pos, display_name;

-- 3) RPC: apply one masterscoreboard snapshot. Replaces each pasted player's rounds
--    (paste = full current counting set), records official rounds played, refreshes cache.
create or replace function trgg_poy_apply_snapshot(snapshot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  e jsonb;
  pid uuid;
  nm text;
  n_scores int;
  matched int := 0;
  created int := 0;
  rounds_ins int := 0;
begin
  if snapshot is null or jsonb_typeof(snapshot) <> 'array' then
    raise exception 'snapshot must be a jsonb array';
  end if;

  for e in select * from jsonb_array_elements(snapshot) loop
    nm := trim(e->>'name');
    continue when nm is null or nm = '';

    select id into pid from trgg_players where display_name = nm limit 1;
    if pid is null then
      insert into trgg_players (display_name, last_name, first_name, active)
      values (nm, trim(split_part(nm, ',', 1)), nullif(trim(split_part(nm, ',', 2)), ''), true)
      returning id into pid;
      created := created + 1;
    else
      matched := matched + 1;
    end if;

    update trgg_players
       set active = true,
           rounds_played = coalesce(
             case when (e->>'rounds') ~ '^[0-9]+$' and (e->>'rounds')::int > 0
                  then (e->>'rounds')::int end,
             rounds_played)
     where id = pid;

    n_scores := jsonb_array_length(coalesce(e->'scores', '[]'::jsonb));
    if n_scores > 0 then
      delete from trgg_rounds where player_id = pid;
      insert into trgg_rounds (player_id, round_date, stableford)
      select pid, current_date, s::int
      from jsonb_array_elements_text(e->'scores') as s
      where s ~ '^[0-9]+$' and s::int between 0 and 60;
      rounds_ins := rounds_ins + n_scores;
    end if;
  end loop;

  perform refresh_trgg_poy_cache();

  return jsonb_build_object('matched', matched, 'created', created, 'rounds', rounds_ins);
end;
$fn$;

grant execute on function trgg_poy_apply_snapshot(jsonb) to anon, authenticated;

-- 4) REPAIR: drop every batch except each player's latest paste-day batch
delete from trgg_rounds r
using (select player_id, max(date(created_at)) as mx from trgg_rounds group by player_id) l
where r.player_id = l.player_id
  and date(r.created_at) < l.mx;

-- 5) Rebuild the cache from clean data
select refresh_trgg_poy_cache();
