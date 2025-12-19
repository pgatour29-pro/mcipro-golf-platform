# Bangpakong Hole 1 Fix - December 19, 2025

## Problem
Spectate Live did not record hole 1 scores for the Bangpakong event. The leaderboard calculations were off because all 3 players were missing their first hole scores.

## Root Cause
Network glitch during the first score save. The Spectate Live scoring system saves scores as fire-and-forget operations, so if a save fails silently, the score is lost.

## Investigation
1. Queried scorecards for event `bdf4c783-73f9-477d-958a-5b2aba80b041`
2. Found 3 players: Pete Park, Alan Thomas, Gilbert Tristan
3. Each scorecard had only 17 holes (2-18), missing hole 1

## Data Fixed
| Player | Hole 1 Gross | Par | SI | Net | Stableford Pts |
|--------|-------------|-----|-----|-----|----------------|
| Pete Park | 4 | 4 | 13 | 4 | 2 |
| Alan Thomas | 5 | 4 | 13 | 5 | 1 |
| Gilbert Tristan | 5 | 4 | 13 | 5 | 1 |

## Files Changed
- `sql/FIX_BANGPAKONG_HOLE1.sql` - SQL script to insert missing hole 1 scores

## SQL Applied
```sql
-- Insert missing hole 1 scores
INSERT INTO scores (scorecard_id, hole_number, gross_score, net_score, par, stroke_index, stableford_points)
VALUES
  ('3cb1ff65-23a0-4c33-a357-4b844e1ddc34', 1, 4, 4, 4, 13, 2),  -- Pete Park
  ('39a7645c-b73e-4ca8-a12a-ab2ecf0a987f', 1, 5, 5, 4, 13, 1),  -- Alan Thomas
  ('2e015645-b046-403a-9a33-4592c8ebbaee', 1, 5, 5, 4, 13, 1);  -- Tristan Gilbert

-- Update scorecard totals
UPDATE scorecards SET total_gross = 74 WHERE id = '3cb1ff65-23a0-4c33-a357-4b844e1ddc34';
UPDATE scorecards SET total_gross = 80 WHERE id = '39a7645c-b73e-4ca8-a12a-ab2ecf0a987f';
UPDATE scorecards SET total_gross = 94 WHERE id = '2e015645-b046-403a-9a33-4592c8ebbaee';
```

## Verification
After fix, all 3 players show 18 holes with correct totals:
- Pete Park: 74 gross, 18 holes
- Alan Thomas: 80 gross, 18 holes
- Gilbert Tristan: 94 gross, 18 holes

## Future Prevention
Consider adding retry logic to score saves in Spectate Live to handle network glitches more gracefully.
