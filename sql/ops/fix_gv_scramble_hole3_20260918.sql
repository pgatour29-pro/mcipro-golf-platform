-- 2026-09-18 TRGG Green Valley Two Man Scramble (event 6dc61071-33c8-4c34-be54-88bfcc0f83fa)
-- 1) Pete Park & Justin Carroll: hole 3 (par 4, SI 17) never saved — the scorer's phone opened hole 3 on
--    Team B (pre-v1254 bug), only Facey/Gourdin's 3 was written, then Finish posted a 17-hole team card
--    (65 gross, front-nine par 32). Pete confirmed the team made 4 → 69.
-- 2) Bruce Grant's round had hole 10 = 2; his card, his partner Newman's card + round all say 5 → 76.
-- 3) Rounds posted from phones still on pre-v1253 code carry individual strokes/points; re-shape every
--    round of this event to the team record (ScrambleTeamRecord: team strokes by SI, net = gross − team
--    strokes, stableford null, handicap_used = team hcp).
-- Triggers on rounds only act on a transition TO completed → these UPDATEs don't touch handicaps/buddies.
-- Runs as ONE transaction; the final DO block raises (→ full rollback) if the result isn't exact.

create table if not exists public.ops_backup_20260918_gv_scramble (src text, row jsonb, backed_up_at timestamptz default now());
insert into public.ops_backup_20260918_gv_scramble (src, row)
select 'rounds', to_jsonb(r) from public.rounds r where r.society_event_id::text = '6dc61071-33c8-4c34-be54-88bfcc0f83fa'
union all
select 'round_holes', to_jsonb(h) from public.round_holes h join public.rounds r on r.id = h.round_id where r.society_event_id::text = '6dc61071-33c8-4c34-be54-88bfcc0f83fa'
union all
select 'scorecards', to_jsonb(s) from public.scorecards s where s.id in ('cb20720c-8923-479e-9bca-75856d4d5e55','dbf2ebbf-dc94-4671-9ad2-2b4e2d482abf');

-- 1a) hole 3 on both live cards (Pete −1 / Justin 8: SI 17 gets no stroke either way), played at 03:42 UTC
insert into public.scores (scorecard_id, hole_number, par, stroke_index, gross_score, net_score, handicap_strokes, stableford_points, created_at, updated_at)
select v.sid, 3, 4, 17, 4, 4, 0, 2, '2026-09-18 03:42:13', '2026-09-18 03:42:13'
from (values ('cb20720c-8923-479e-9bca-75856d4d5e55'), ('dbf2ebbf-dc94-4671-9ad2-2b4e2d482abf')) v(sid)
where not exists (select 1 from public.scores x where x.scorecard_id = v.sid and x.hole_number = 3);

update public.scorecards s
   set total_gross = t.g, total_net = t.n, updated_at = now()
  from (select scorecard_id, sum(gross_score) g, sum(net_score) n from public.scores
         where scorecard_id in ('cb20720c-8923-479e-9bca-75856d4d5e55','dbf2ebbf-dc94-4671-9ad2-2b4e2d482abf') group by 1) t
 where s.id = t.scorecard_id;

-- 1b) hole 3 on both posted rounds (net/strokes set by the re-shape below)
insert into public.round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score, handicap_strokes, stableford_points, created_at)
select v.rid, 3, 4, 17, 4, 4, 0, null, (select created_at from public.round_holes where round_id = v.rid and hole_number = 2)
from (values ('327379ab-acc3-482c-99fe-5760d1d1065a'::uuid), ('98d5f4e9-8a70-479b-a0d9-f707eac39c4e'::uuid)) v(rid)
where not exists (select 1 from public.round_holes h where h.round_id = v.rid and h.hole_number = 3);

-- 2) Grant hole 10 → 5 (matches his card + Newman's card/round)
update public.round_holes set gross_score = 5
 where round_id = '0f473f25-7ed4-4543-81ba-9b7e27ba2e85' and hole_number = 10 and gross_score = 2;

-- 3) team re-shape for this event only (same formula as scramble_team_only_backfill_20260918.sql)
with t as (
  select rh.id, rh.gross_score, (r.scramble_config->>'teamHcp')::int as thcp,
         count(*) over (partition by rh.round_id) as n,
         row_number() over (partition by rh.round_id
           order by case when (r.scramble_config->>'teamHcp')::int < 0 then -coalesce(rh.stroke_index, rh.hole_number) else coalesce(rh.stroke_index, rh.hole_number) end, rh.hole_number) as rn
  from public.round_holes rh join public.rounds r on r.id = rh.round_id
  where r.society_event_id::text = '6dc61071-33c8-4c34-be54-88bfcc0f83fa'
    and r.team_size = 2 and r.scramble_config->>'teamHcp' is not null and rh.gross_score is not null
), s as (
  select id, sign(thcp) * ((abs(thcp) / n) + case when rn <= (abs(thcp) % n) then 1 else 0 end) as strokes from t
)
update public.round_holes rh
   set handicap_strokes = s.strokes, net_score = rh.gross_score - s.strokes, stableford_points = null
  from s where s.id = rh.id;

update public.rounds r
   set total_gross = h.g, total_net = h.n, holes_played = h.c, total_stableford = null,
       handicap_used = (r.scramble_config->>'teamHcp')::numeric
  from (select round_id, sum(gross_score) g, sum(net_score) n, count(*) c from public.round_holes group by 1) h
 where h.round_id = r.id
   and r.society_event_id::text = '6dc61071-33c8-4c34-be54-88bfcc0f83fa'
   and r.team_size = 2 and r.scramble_config->>'teamHcp' is not null;

-- self-check: every team = 18 holes, teammates identical, exact expected totals
do $$
declare bad int;
begin
  select count(*) into bad from (values
    ('Pete Park', 69, 67), ('Carroll, Justin', 69, 67),
    ('Facey, Alex', 69, 62), ('Willy Gourdin', 69, 62),
    ('Newman, Bob', 76, 70), ('Grant, Bruce', 76, 70),
    ('Tony Cliff', 76, 68), ('McDonald, Leon', 76, 68)) e(nm, g, n)
  left join public.rounds r on r.player_name = e.nm and r.society_event_id::text = '6dc61071-33c8-4c34-be54-88bfcc0f83fa'
  where r.id is null or r.total_gross <> e.g or r.total_net <> e.n or r.holes_played <> 18 or r.total_stableford is not null;
  if bad > 0 then raise exception 'GV scramble fix: % rounds off expected — rolled back', bad; end if;
  select count(*) into bad from public.scorecards
   where id in ('cb20720c-8923-479e-9bca-75856d4d5e55','dbf2ebbf-dc94-4671-9ad2-2b4e2d482abf') and total_gross <> 69;
  if bad > 0 then raise exception 'GV scramble fix: scorecard totals off — rolled back'; end if;
end $$;

select r.player_name, r.total_gross, r.total_net, r.handicap_used, r.holes_played, r.scramble_config->>'teamName' team
  from public.rounds r where r.society_event_id::text = '6dc61071-33c8-4c34-be54-88bfcc0f83fa' order by r.total_net, team;
