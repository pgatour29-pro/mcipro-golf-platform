-- 2026-09-21 ops — cancel Paul Robertson's stuck live round.
-- Card ff0cfa15 (Pattaya cc, started 2026-09-21 03:34 UTC = 10:34 Asia/Bangkok) sat in_progress
-- with ZERO scored holes — a false start that never ended, so it held the live/Spectate boards.
-- Nothing to save (the app itself never writes history for an incomplete round), so this is the
-- same write the Discard button makes: status -> 'abandoned'.
-- His device drops its local copy on next open by itself: checkForActiveRound() clears the saved
-- state on a POSITIVE read of a non-in_progress card.
UPDATE scorecards
   SET status = 'abandoned', updated_at = (now() AT TIME ZONE 'UTC')
 WHERE id = 'ff0cfa15-9274-451d-89f4-64faf1aadf84'
   AND status = 'in_progress'
   AND NOT EXISTS (SELECT 1 FROM scores s WHERE s.scorecard_id = scorecards.id)
RETURNING id, player_name, course_name, started_at, status;
