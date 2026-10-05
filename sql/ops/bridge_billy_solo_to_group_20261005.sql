-- LIVE-OPS 2026-10-05 (Pattaya County, event 78ab0dd5): Billy's phone is still on a solo round
-- (card bf097f3f…, abandoned) after he tapped Discard on his group's round. Until his phone rejoins,
-- copy every hole it writes there into his card in the group (f0c6b91f…) so the group sees it live.
-- Scoped to ONE source card. REMOVE after the round:
--   drop trigger if exists tmp_bridge_billy_20261005 on scores; drop function if exists tmp_bridge_billy_20261005();
create or replace function public.tmp_bridge_billy_20261005() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  insert into scores (scorecard_id, hole_number, par, stroke_index, gross_score, net_score, handicap_strokes, stableford, stableford_points)
  values ('f0c6b91f-cd9b-4b68-a6c4-36fa3e76c830', new.hole_number, new.par, new.stroke_index, new.gross_score,
          new.net_score, new.handicap_strokes, new.stableford, new.stableford_points)
  on conflict (scorecard_id, hole_number) do update set
    par = excluded.par, stroke_index = excluded.stroke_index, gross_score = excluded.gross_score,
    net_score = excluded.net_score, handicap_strokes = excluded.handicap_strokes,
    stableford = excluded.stableford, stableford_points = excluded.stableford_points,
    updated_at = (now() at time zone 'UTC');
  update scorecards set
    total_gross = (select sum(gross_score) from scores where scorecard_id = 'f0c6b91f-cd9b-4b68-a6c4-36fa3e76c830'),
    total_net   = (select sum(net_score)   from scores where scorecard_id = 'f0c6b91f-cd9b-4b68-a6c4-36fa3e76c830'),
    updated_at  = (now() at time zone 'UTC')
  where id = 'f0c6b91f-cd9b-4b68-a6c4-36fa3e76c830';
  return new;
end $$;
revoke all on function public.tmp_bridge_billy_20261005() from public, anon, authenticated;
drop trigger if exists tmp_bridge_billy_20261005 on scores;
create trigger tmp_bridge_billy_20261005 after insert or update on scores
  for each row when (new.scorecard_id = 'bf097f3f-9b6f-4299-807f-cd2dc5d1c3e0')
  execute function public.tmp_bridge_billy_20261005();
