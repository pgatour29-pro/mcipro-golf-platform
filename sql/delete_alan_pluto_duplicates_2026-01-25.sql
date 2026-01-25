-- Delete duplicate rounds for Alan Thomas and Pluto
-- Date: 2026-01-25
--
-- Alan Thomas: 5 duplicates on 2025-12-14 (keeping BRC gross 76)
-- Pluto: 1 duplicate on 2026-01-13 (keeping Green Valley gross 65)

-- Show rounds BEFORE delete
SELECT 'BEFORE' as status, golfer_id, id, course_name, total_gross, completed_at::date
FROM rounds
WHERE id IN (
  'df939097-b347-4a9e-a3a6-c813ebc7cfd5',
  '07b76190-7f95-44d9-baa2-c5f92789933a',
  '66118e91-2c17-4890-80da-505fda24185c',
  '6f4e47ac-1ea0-4975-9aca-55d24e385449',
  '4f1fab12-d3eb-4b65-a549-3c70ef6f881a',
  '2dadc418-c1d1-4d98-ab8d-6e99d0d5ce49'
);

-- DELETE duplicates
DELETE FROM rounds WHERE id IN (
  'df939097-b347-4a9e-a3a6-c813ebc7cfd5',  -- Alan Thomas 2025-12-14 Mountain Shadow 87
  '07b76190-7f95-44d9-baa2-c5f92789933a',  -- Alan Thomas 2025-12-14 BRC 79
  '66118e91-2c17-4890-80da-505fda24185c',  -- Alan Thomas 2025-12-14 Eastern Star 86
  '6f4e47ac-1ea0-4975-9aca-55d24e385449',  -- Alan Thomas 2025-12-14 Treasure Hill 84
  '4f1fab12-d3eb-4b65-a549-3c70ef6f881a',  -- Alan Thomas 2025-12-14 Greenwood 86
  '2dadc418-c1d1-4d98-ab8d-6e99d0d5ce49'   -- Pluto 2026-01-13 Green Valley 7
);

-- Verify rounds AFTER delete
SELECT 'AFTER - Alan Thomas Dec 14' as status, id, course_name, total_gross
FROM rounds
WHERE golfer_id = 'U214f2fe47e1681fbb26f0aba95930d64'
  AND completed_at::date = '2025-12-14';

SELECT 'AFTER - Pluto Jan 13' as status, id, course_name, total_gross
FROM rounds
WHERE golfer_id = 'MANUAL-1768008205248-jvtubbk'
  AND completed_at::date = '2026-01-13';

-- Count remaining rounds
SELECT 'FINAL COUNT' as status,
  (SELECT COUNT(*) FROM rounds WHERE golfer_id = 'U214f2fe47e1681fbb26f0aba95930d64') as alan_rounds,
  (SELECT COUNT(*) FROM rounds WHERE golfer_id = 'MANUAL-1768008205248-jvtubbk') as pluto_rounds;
