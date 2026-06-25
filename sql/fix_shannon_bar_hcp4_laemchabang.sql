-- Pete (2026-06-24): Shannon Bar plays off 4, not 5. Re-do his completed Laem Chabang round at
-- handicap 4 → he loses the handicap stroke on the SI-5 hole (H11, par5, gross7): net 6→7, stbl 1→0.
-- Casual guest (player_1782269716630) — handicap lives only on the scorecard/round.
begin;
update scorecards set handicap = 4.0
  where id = '6efd5687-5896-4c8f-8981-59d8efcd4587';
update scores set handicap_strokes = 0, net_score = 7, stableford_points = 0
  where scorecard_id = '6efd5687-5896-4c8f-8981-59d8efcd4587' and hole_number = 11;
update rounds set handicap_used = '4.0', total_net = 79, total_stableford = 29
  where id = '4ad16a3f-8d44-4660-b618-c63da1a19b0c';
commit;
-- round_holes (saved history) + scorecards.total_net were the remaining off-5 copies (net header read 78)
update round_holes set handicap_strokes=0, net_score=7, stableford_points=0
  where round_id='4ad16a3f-8d44-4660-b618-c63da1a19b0c' and hole_number=11;
