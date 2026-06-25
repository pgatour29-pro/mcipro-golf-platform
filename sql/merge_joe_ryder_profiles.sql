-- Merge duplicate "Joe Ryder" Google profiles into the active one.
-- Survivor (A): GOOGLE-106057425792037413929 (active today, older account)
-- Loser    (B): GOOGLE-116253459020427526641 (dormant since Jun 1)
begin;
-- 1) Repoint golf data B -> A (no (event_id,player_id) conflicts; A has none of these rows)
update event_registrations set player_id='GOOGLE-106057425792037413929' where player_id='GOOGLE-116253459020427526641';
update scorecards          set player_id='GOOGLE-106057425792037413929' where player_id='GOOGLE-116253459020427526641';
update rounds              set golfer_id='GOOGLE-106057425792037413929' where golfer_id='GOOGLE-116253459020427526641';
update live_progress       set player_id='GOOGLE-106057425792037413929' where player_id='GOOGLE-116253459020427526641';
update pool_entrants       set player_id='GOOGLE-106057425792037413929' where player_id='GOOGLE-116253459020427526641';
update handicap_history    set golfer_id='GOOGLE-106057425792037413929' where golfer_id='GOOGLE-116253459020427526641';
-- 2) society_handicaps: keep A's universal 15.0 (most recent), drop B's stale universal 18.0, bring B's per-society rows (JOA 17.4, TRGG 22.0)
delete from society_handicaps where golfer_id='GOOGLE-116253459020427526641' and society_id is null;
update society_handicaps   set golfer_id='GOOGLE-106057425792037413929' where golfer_id='GOOGLE-116253459020427526641';
-- 3) Delete B's duplicate base-table profile rows (views global_players / unified_player_profiles update automatically)
delete from profiles       where line_user_id='GOOGLE-116253459020427526641';
delete from user_profiles  where line_user_id='GOOGLE-116253459020427526641';
commit;
