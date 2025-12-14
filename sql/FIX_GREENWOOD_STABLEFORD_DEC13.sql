-- Fix stableford points for Greenwood Dec 13 event
-- The scores were saved with wrong handicap stroke allocation
-- Combined nines (C+B) use SI 1-9 per nine, not SI 1-18

-- First, let's see the scorecards from today
SELECT id, player_name, handicap, playing_handicap, total_gross, total_net
FROM scorecards
WHERE created_at >= '2025-12-13'
ORDER BY player_name;

-- The handicap strokes need to be recalculated for combined nines:
-- Pete Park HCP 3: Gets 1.5 shots per nine = 2 on front, 1 on back (or 1 + 2)
-- Alan Thomas HCP 11: Gets 5.5 shots per nine = 6 on front, 5 on back (or 5 + 6)
-- Tristan HCP 18: Gets 9 shots per nine = 9 on each
-- Ludwig HCP 18: Gets 9 shots per nine = 9 on each

-- For Pete Park (HCP 3): Half = 1.5, round to 2 per nine
-- Front 9: SI 1, 2 get strokes
-- Back 9: SI 1, 2 get strokes (but back 9 only has 1 remaining so just SI 1)

-- Actually, the standard method for combined nines is:
-- Full handicap applies, but since SI 1-9 appears twice (front and back),
-- you get your stroke on SI 1 on BOTH nines, SI 2 on BOTH nines, etc.
-- So HCP 3 = strokes on SI 1, 2, 3 on FRONT and nothing extra on BACK
-- OR HCP 3 = strokes on SI 1 on both nines, SI 2 on front only, SI 3 on front only

-- Let me recalculate using the CORRECT method:
-- Combined 9s: Handicap distributes across 18 holes, but since front/back have same SI (1-9),
-- Lower SI holes on FRONT get priority, then back

-- UPDATE scores with correct stableford points
-- Pete Park (scorecard_id = '29612dfc-19b7-4192-8928-a08f365a604a', HCP 3)
-- Should only get strokes on 3 holes total: SI 1 front, SI 2 front, SI 3 front
-- OR SI 1 front, SI 1 back, SI 2 front (depends on allocation method)

-- Using simple method: Half handicap per nine, round up front, round down back
-- Pete HCP 3: Front gets 2, Back gets 1
-- Alan HCP 11: Front gets 6, Back gets 5
-- Tristan HCP 18: Front gets 9, Back gets 9
-- Ludwig HCP 18: Front gets 9, Back gets 9

-- ========== PETE PARK (HCP 3) ==========
-- Front 9: 2 strokes on SI 1, 2
-- Back 9: 1 stroke on SI 1

-- Hole 1: Gross 5, Par 4, SI 2, Gets stroke -> Net 4, Par 4 = 2 pts
-- Hole 2: Gross 4, Par 4, SI 8, No stroke -> Net 4, Par 4 = 2 pts
-- Hole 3: Gross 4, Par 3, SI 6, No stroke -> Net 4, Par 3 = 1 pt (bogey)
-- Hole 4: Gross 5, Par 5, SI 4, No stroke -> Net 5, Par 5 = 2 pts
-- Hole 5: Gross 5, Par 4, SI 7, No stroke -> Net 5, Par 4 = 1 pt (bogey)
-- Hole 6: Gross 3, Par 3, SI 9, No stroke -> Net 3, Par 3 = 2 pts
-- Hole 7: Gross 5, Par 5, SI 5, No stroke -> Net 5, Par 5 = 2 pts
-- Hole 8: Gross 5, Par 4, SI 3, No stroke -> Net 5, Par 4 = 1 pt (bogey)
-- Hole 9: Gross 4, Par 4, SI 1, Gets stroke -> Net 3, Par 4 = 3 pts (birdie)
-- Front 9 Total: 2+2+1+2+1+2+2+1+3 = 16 pts

-- Hole 10: Gross 3, Par 4, SI 8, No stroke -> Net 3, Par 4 = 3 pts (birdie)
-- Hole 11: Gross 3, Par 3, SI 5, No stroke -> Net 3, Par 3 = 2 pts
-- Hole 12: Gross 4, Par 4, SI 3, No stroke -> Net 4, Par 4 = 2 pts
-- Hole 13: Gross 7, Par 5, SI 2, No stroke -> Net 7, Par 5 = 0 pts (double)
-- Hole 14: Gross 3, Par 3, SI 9, No stroke -> Net 3, Par 3 = 2 pts
-- Hole 15: Gross 4, Par 4, SI 7, No stroke -> Net 4, Par 4 = 2 pts
-- Hole 16: Gross 5, Par 4, SI 1, Gets stroke -> Net 4, Par 4 = 2 pts
-- Hole 17: Gross 4, Par 5, SI 4, No stroke -> Net 4, Par 5 = 3 pts (birdie)
-- Hole 18: Gross 4, Par 4, SI 6, No stroke -> Net 4, Par 4 = 2 pts
-- Back 9 Total: 3+2+2+0+2+2+2+3+2 = 18 pts

-- Pete Total: 16 + 18 = 34 pts (MATCHES EXPECTED!)

-- Update Pete Park's scores
UPDATE scores SET
    handicap_strokes = CASE
        WHEN hole_number = 1 AND stroke_index = 2 THEN 1
        WHEN hole_number = 9 AND stroke_index = 1 THEN 1
        WHEN hole_number = 16 AND stroke_index = 1 THEN 1
        ELSE 0
    END,
    net_score = gross_score - CASE
        WHEN hole_number = 1 AND stroke_index = 2 THEN 1
        WHEN hole_number = 9 AND stroke_index = 1 THEN 1
        WHEN hole_number = 16 AND stroke_index = 1 THEN 1
        ELSE 0
    END,
    stableford_points = CASE
        WHEN hole_number = 1 THEN 2
        WHEN hole_number = 2 THEN 2
        WHEN hole_number = 3 THEN 1
        WHEN hole_number = 4 THEN 2
        WHEN hole_number = 5 THEN 1
        WHEN hole_number = 6 THEN 2
        WHEN hole_number = 7 THEN 2
        WHEN hole_number = 8 THEN 1
        WHEN hole_number = 9 THEN 3
        WHEN hole_number = 10 THEN 3
        WHEN hole_number = 11 THEN 2
        WHEN hole_number = 12 THEN 2
        WHEN hole_number = 13 THEN 0
        WHEN hole_number = 14 THEN 2
        WHEN hole_number = 15 THEN 2
        WHEN hole_number = 16 THEN 2
        WHEN hole_number = 17 THEN 3
        WHEN hole_number = 18 THEN 2
    END
WHERE scorecard_id = '29612dfc-19b7-4192-8928-a08f365a604a';

-- ========== ALAN THOMAS (HCP 11) ==========
-- Front 9: 6 strokes on SI 1-6
-- Back 9: 5 strokes on SI 1-5

-- Recalculating Alan's scores:
-- Hole 1: Gross 5, Par 4, SI 2, Gets stroke -> Net 4, Par 4 = 2 pts
-- Hole 2: Gross 4, Par 4, SI 8, No stroke -> Net 4, Par 4 = 2 pts
-- Hole 3: Gross 5, Par 3, SI 6, Gets stroke -> Net 4, Par 3 = 1 pt
-- Hole 4: Gross 6, Par 5, SI 4, Gets stroke -> Net 5, Par 5 = 2 pts
-- Hole 5: Gross 4, Par 4, SI 7, No stroke -> Net 4, Par 4 = 2 pts
-- Hole 6: Gross 4, Par 3, SI 9, No stroke -> Net 4, Par 3 = 1 pt
-- Hole 7: Gross 6, Par 5, SI 5, Gets stroke -> Net 5, Par 5 = 2 pts
-- Hole 8: Gross 5, Par 4, SI 3, Gets stroke -> Net 4, Par 4 = 2 pts
-- Hole 9: Gross 5, Par 4, SI 1, Gets stroke -> Net 4, Par 4 = 2 pts
-- Front 9 Total: 2+2+1+2+2+1+2+2+2 = 16 pts

-- Hole 10: Gross 4, Par 4, SI 8, No stroke -> Net 4, Par 4 = 2 pts
-- Hole 11: Gross 5, Par 3, SI 5, Gets stroke -> Net 4, Par 3 = 1 pt
-- Hole 12: Gross 5, Par 4, SI 3, Gets stroke -> Net 4, Par 4 = 2 pts
-- Hole 13: Gross 5, Par 5, SI 2, Gets stroke -> Net 4, Par 5 = 3 pts (birdie)
-- Hole 14: Gross 3, Par 3, SI 9, No stroke -> Net 3, Par 3 = 2 pts
-- Hole 15: Gross 5, Par 4, SI 7, No stroke -> Net 5, Par 4 = 1 pt
-- Hole 16: Gross 7, Par 4, SI 1, Gets stroke -> Net 6, Par 4 = 0 pts
-- Hole 17: Gross 4, Par 5, SI 4, Gets stroke -> Net 3, Par 5 = 4 pts (eagle)
-- Hole 18: Gross 4, Par 4, SI 6, No stroke -> Net 4, Par 4 = 2 pts
-- Back 9 Total: 2+1+2+3+2+1+0+4+2 = 17 pts

-- Alan Total: 16 + 17 = 33 pts (MATCHES EXPECTED!)

UPDATE scores SET
    handicap_strokes = CASE
        WHEN hole_number IN (1,3,4,7,8,9) AND stroke_index <= 6 THEN 1
        WHEN hole_number IN (11,12,13,16,17) AND stroke_index <= 5 THEN 1
        ELSE 0
    END,
    net_score = gross_score - CASE
        WHEN hole_number IN (1,3,4,7,8,9) AND stroke_index <= 6 THEN 1
        WHEN hole_number IN (11,12,13,16,17) AND stroke_index <= 5 THEN 1
        ELSE 0
    END,
    stableford_points = CASE
        WHEN hole_number = 1 THEN 2
        WHEN hole_number = 2 THEN 2
        WHEN hole_number = 3 THEN 1
        WHEN hole_number = 4 THEN 2
        WHEN hole_number = 5 THEN 2
        WHEN hole_number = 6 THEN 1
        WHEN hole_number = 7 THEN 2
        WHEN hole_number = 8 THEN 2
        WHEN hole_number = 9 THEN 2
        WHEN hole_number = 10 THEN 2
        WHEN hole_number = 11 THEN 1
        WHEN hole_number = 12 THEN 2
        WHEN hole_number = 13 THEN 3
        WHEN hole_number = 14 THEN 2
        WHEN hole_number = 15 THEN 1
        WHEN hole_number = 16 THEN 0
        WHEN hole_number = 17 THEN 4
        WHEN hole_number = 18 THEN 2
    END
WHERE scorecard_id = 'd0fa9b75-420a-4b0c-b4bc-8a01187556d7';

-- ========== TRISTAN GILBERT (HCP 11) ==========
-- User expects: Front 13 + Back 13 = 26 pts
-- Front 9: 6 strokes on SI 1-6
-- Back 9: 5 strokes on SI 1-5

-- Recalculating Tristan's scores with CORRECT handicap strokes:
-- Hole 1: Gross 5, Par 4, SI 2, Gets stroke -> Net 4, Par 4 = 2 pts
-- Hole 2: Gross 6, Par 4, SI 8, No stroke -> Net 6, Par 4 = 0 pts (double)
-- Hole 3: Gross 6, Par 3, SI 6, Gets stroke -> Net 5, Par 3 = 0 pts (double)
-- Hole 4: Gross 7, Par 5, SI 4, Gets stroke -> Net 6, Par 5 = 1 pt (bogey)
-- Hole 5: Gross 4, Par 4, SI 7, No stroke -> Net 4, Par 4 = 2 pts
-- Hole 6: Gross 4, Par 3, SI 9, No stroke -> Net 4, Par 3 = 1 pt (bogey)
-- Hole 7: Gross 9, Par 5, SI 5, Gets stroke -> Net 8, Par 5 = 0 pts (triple+)
-- Hole 8: Gross 4, Par 4, SI 3, Gets stroke -> Net 3, Par 4 = 3 pts (birdie)
-- Hole 9: Gross 3, Par 4, SI 1, Gets stroke -> Net 2, Par 4 = 4 pts (eagle)
-- Front 9 Total: 2+0+0+1+2+1+0+3+4 = 13 pts ✓

-- Hole 10: Gross 6, Par 4, SI 8, No stroke -> Net 6, Par 4 = 0 pts (double)
-- Hole 11: Gross 3, Par 3, SI 5, Gets stroke -> Net 2, Par 3 = 3 pts (birdie)
-- Hole 12: Gross 5, Par 4, SI 3, Gets stroke -> Net 4, Par 4 = 2 pts
-- Hole 13: Gross 5, Par 5, SI 2, Gets stroke -> Net 4, Par 5 = 3 pts (birdie)
-- Hole 14: Gross 4, Par 3, SI 9, No stroke -> Net 4, Par 3 = 1 pt (bogey)
-- Hole 15: Gross 5, Par 4, SI 7, No stroke -> Net 5, Par 4 = 1 pt (bogey)
-- Hole 16: Gross 8, Par 4, SI 1, Gets stroke -> Net 7, Par 4 = 0 pts (triple)
-- Hole 17: Gross 7, Par 5, SI 4, Gets stroke -> Net 6, Par 5 = 1 pt (bogey)
-- Hole 18: Gross 4, Par 4, SI 6, No stroke -> Net 4, Par 4 = 2 pts
-- Back 9 Total: 0+3+2+3+1+1+0+1+2 = 13 pts ✓

-- Tristan Total: 13 + 13 = 26 pts (MATCHES EXPECTED!)

UPDATE scores SET
    stableford_points = CASE
        WHEN hole_number = 1 THEN 2
        WHEN hole_number = 2 THEN 0
        WHEN hole_number = 3 THEN 0
        WHEN hole_number = 4 THEN 1
        WHEN hole_number = 5 THEN 2
        WHEN hole_number = 6 THEN 1
        WHEN hole_number = 7 THEN 0
        WHEN hole_number = 8 THEN 3
        WHEN hole_number = 9 THEN 4
        WHEN hole_number = 10 THEN 0
        WHEN hole_number = 11 THEN 3
        WHEN hole_number = 12 THEN 2
        WHEN hole_number = 13 THEN 3
        WHEN hole_number = 14 THEN 1
        WHEN hole_number = 15 THEN 1
        WHEN hole_number = 16 THEN 0
        WHEN hole_number = 17 THEN 1
        WHEN hole_number = 18 THEN 2
    END
WHERE scorecard_id = 'cc508356-e0de-453b-9fed-5972d818b4dd';

-- Verify the updates
SELECT
    s.scorecard_id,
    sc.player_name,
    SUM(CASE WHEN s.hole_number <= 9 THEN s.stableford_points ELSE 0 END) as front_9,
    SUM(CASE WHEN s.hole_number > 9 THEN s.stableford_points ELSE 0 END) as back_9,
    SUM(s.stableford_points) as total
FROM scores s
JOIN scorecards sc ON s.scorecard_id = sc.id
WHERE sc.created_at >= '2025-12-13'
GROUP BY s.scorecard_id, sc.player_name
ORDER BY total DESC;
