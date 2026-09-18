-- v1253 backfill (2026-09-18): the 34 existing 2-man scramble rounds carried each teammate's OWN
-- strokes/net/points on a TEAM score. Re-shape them to the team record (backups first; one txn).
-- Not fired: trigger_auto_update_society_handicaps (only status/total_gross/tee_marker/primary_society_id).
create table if not exists public.rounds_scramble_indiv_backup_20260918 (
  round_id uuid primary key, total_net integer, total_stableford integer, handicap_used numeric, backed_up_at timestamptz default now());
insert into public.rounds_scramble_indiv_backup_20260918 (round_id, total_net, total_stableford, handicap_used)
select r.id, r.total_net, r.total_stableford, r.handicap_used
from public.rounds r
where r.team_size = 2 and r.scramble_config->>'teamHcp' is not null
on conflict (round_id) do nothing;

create table if not exists public.round_holes_scramble_indiv_backup_20260918 (
  round_hole_id uuid primary key, round_id uuid, net_score integer, stableford_points integer, handicap_strokes integer, backed_up_at timestamptz default now());
insert into public.round_holes_scramble_indiv_backup_20260918 (round_hole_id, round_id, net_score, stableford_points, handicap_strokes)
select rh.id, rh.round_id, rh.net_score, rh.stableford_points, rh.handicap_strokes
from public.round_holes rh join public.rounds r on r.id = rh.round_id
where r.team_size = 2 and r.scramble_config->>'teamHcp' is not null
on conflict (round_hole_id) do nothing;

-- team strokes per hole: |teamHcp| spread by stroke index (lowest SI first; a plus handicap gives
-- strokes back on the highest SI) — the same rule as the app's ScrambleTeamRecord.strokes()
with t as (
  select rh.id, rh.round_id, rh.gross_score, (r.scramble_config->>'teamHcp')::int as thcp,
         count(*) over (partition by rh.round_id) as n,
         row_number() over (partition by rh.round_id
           order by case when (r.scramble_config->>'teamHcp')::int < 0 then -coalesce(rh.stroke_index, rh.hole_number) else coalesce(rh.stroke_index, rh.hole_number) end, rh.hole_number) as rn
  from public.round_holes rh join public.rounds r on r.id = rh.round_id
  where r.team_size = 2 and r.scramble_config->>'teamHcp' is not null and rh.gross_score is not null
), s as (
  select id, gross_score, sign(thcp) * ((abs(thcp) / n) + case when rn <= (abs(thcp) % n) then 1 else 0 end) as strokes from t
)
update public.round_holes rh
   set handicap_strokes = s.strokes, net_score = rh.gross_score - s.strokes, stableford_points = null
  from s where s.id = rh.id;

update public.rounds r
   set total_stableford = null,
       handicap_used = (r.scramble_config->>'teamHcp')::numeric,
       total_net = coalesce((select sum(net_score) from public.round_holes where round_id = r.id), r.total_gross - (r.scramble_config->>'teamHcp')::int)
 where r.team_size = 2 and r.scramble_config->>'teamHcp' is not null;

select count(*) as rounds_reshaped,
       count(*) filter (where total_stableford is null) as pts_null,
       count(*) filter (where handicap_used = (scramble_config->>'teamHcp')::numeric) as hcp_is_team,
       count(*) filter (where total_net = total_gross - (scramble_config->>'teamHcp')::int) as net_is_team
from public.rounds where team_size = 2 and scramble_config->>'teamHcp' is not null;
