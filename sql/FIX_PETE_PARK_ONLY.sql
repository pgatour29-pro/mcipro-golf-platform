-- FIX PETE PARK ROUNDS ONLY
-- This script ONLY affects Pete Park (U2b6d976f19bca4b2f4374ae0e10ed873)
-- NO OTHER PLAYERS ARE TOUCHED

-- Step 1: See current state
SELECT COUNT(*) as total_rounds FROM rounds WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Step 2: Delete ALL Pete Park's rounds (we'll rebuild from scorecards)
DELETE FROM rounds WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Step 3: Insert ONLY verified legitimate rounds from scorecards table
-- VERIFIED via scores table stableford_points sum on 2025-12-14
INSERT INTO rounds (golfer_id, course_name, total_gross, total_stableford, type, played_at)
VALUES
  -- DECEMBER 2025 (verified stableford from scores table)
  -- Dec 13: Greenwood C+B - Gross 77, Stableford 34 (VERIFIED)
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Greenwood Golf and Resort (C+B)', 77, 34, 'society', '2025-12-13T01:26:41.477+00:00'),
  -- Dec 12: Mountain Shadow - Gross 81, Stableford 30 (VERIFIED)
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Mountain Shadow Golf Club', 81, 30, 'society', '2025-12-12T02:34:35.623+00:00'),
  -- Dec 9: Bangpakong - Gross 74, Stableford 38 (VERIFIED)
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Bangpakong Riverside Country Club', 74, 38, 'society', '2025-12-09T02:56:37.124+00:00'),
  -- Dec 8: Eastern Star - Gross 75, Stableford 38 (VERIFIED)
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Eastern Star Golf Course', 75, 38, 'society', '2025-12-08T02:49:26.129+00:00'),
  -- Dec 6: Plutaluang - Gross 83, Stableford 29 (VERIFIED)
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Plutaluang Navy Golf Course', 83, 29, 'society', '2025-12-06T03:30:23.379+00:00'),
  -- Dec 5: Treasure Hill - Gross 73, Stableford 33 (VERIFIED)
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Treasure Hill Golf & Country Club', 73, 33, 'society', '2025-12-05T05:14:45.068+00:00'),

  -- NOVEMBER 2025 (verified from society_events with UUID event_id)
  -- Nov 13: Gross 75, Stableford 36
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Society Event', 75, 36, 'society', '2025-11-13T02:34:22.592+00:00'),
  -- Nov 11: Gross 80, Stableford 30
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Society Event', 80, 30, 'society', '2025-11-11T02:17:30.684+00:00'),
  -- Nov 8: Gross 77, Stableford 33
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Society Event', 77, 33, 'society', '2025-11-08T03:28:33.609+00:00'),
  -- Nov 7: Gross 71, Stableford 39
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Society Event', 71, 39, 'society', '2025-11-07T03:02:44.725+00:00'),
  -- Nov 5: Gross 84, Stableford 27
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'Society Event', 84, 27, 'society', '2025-11-05T04:24:18.495+00:00');

-- Step 4: Verify Pete Park's rounds are correct
SELECT
  course_name,
  total_gross,
  total_stableford,
  played_at::date as date
FROM rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY played_at DESC;

-- Step 5: Verify stats
SELECT
  COUNT(*) as total_rounds,
  ROUND(AVG(total_gross)::numeric, 1) as avg_gross,
  MIN(total_gross) as best_gross,
  ROUND(AVG(total_stableford)::numeric, 1) as avg_stableford,
  MAX(total_stableford) as best_stableford
FROM rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
