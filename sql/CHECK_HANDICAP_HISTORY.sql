-- Check recent handicap changes
SELECT
  golfer_id,
  old_handicap,
  new_handicap,
  change,
  calculated_at
FROM handicap_history
ORDER BY calculated_at DESC
LIMIT 10;
