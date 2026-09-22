-- Payout formula (Pete 2026-09-22): a society-wide rule for paying event winners by field size,
-- plus the Par-3 birdie payout. Set once on the organizer Scoring page, used for every event after.
-- Shape: { bands: [{ min: 4, places: [500, 300] }, { min: 10, places: [600, 400, 200] }, ...],
--          birdies: { mode: 'pot' | 'fixed', perPlayer: 100, fixed: 200 } }
-- A band runs from its `min` players up to the next band's min - 1; amounts are paid per division.
-- ORGANIZER-ONLY on screen. Winners see only their own amount, in Chips (event_winnings rows written
-- by OrganizerScoringSystem.publishResults).
alter table public.society_payout_templates add column if not exists payout_formula jsonb;
