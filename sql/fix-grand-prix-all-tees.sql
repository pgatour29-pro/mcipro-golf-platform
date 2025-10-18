-- Fix Grand Prix Golf Club - Complete Tee Data
-- Extracted from scorecard: GrandPrixGolfClub.jpg
-- Date: 2025-10-18

-- Delete existing data for Grand Prix Golf Club
DELETE FROM course_holes WHERE course_id = 'grand_prix';

-- RED TEE (5534 yards total)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 8, 387, 'red'),
('grand_prix', 2, 4, 13, 321, 'red'),
('grand_prix', 3, 3, 11, 115, 'red'),
('grand_prix', 4, 4, 15, 376, 'red'),
('grand_prix', 5, 5, 16, 405, 'red'),
('grand_prix', 6, 4, 6, 273, 'red'),
('grand_prix', 7, 3, 2, 119, 'red'),
('grand_prix', 8, 4, 18, 321, 'red'),
('grand_prix', 9, 5, 7, 413, 'red'),
('grand_prix', 10, 4, 12, 330, 'red'),
('grand_prix', 11, 5, 9, 454, 'red'),
('grand_prix', 12, 3, 3, 109, 'red'),
('grand_prix', 13, 4, 14, 308, 'red'),
('grand_prix', 14, 3, 10, 105, 'red'),
('grand_prix', 15, 4, 4, 259, 'red'),
('grand_prix', 16, 4, 5, 262, 'red'),
('grand_prix', 17, 4, 17, 327, 'red'),
('grand_prix', 18, 5, 1, 487, 'red');

-- YELLOW TEE (5841 yards total)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 8, 399, 'yellow'),
('grand_prix', 2, 4, 13, 350, 'yellow'),
('grand_prix', 3, 3, 11, 127, 'yellow'),
('grand_prix', 4, 4, 15, 398, 'yellow'),
('grand_prix', 5, 5, 16, 443, 'yellow'),
('grand_prix', 6, 4, 6, 306, 'yellow'),
('grand_prix', 7, 3, 2, 129, 'yellow'),
('grand_prix', 8, 4, 18, 357, 'yellow'),
('grand_prix', 9, 5, 7, 431, 'yellow'),
('grand_prix', 10, 4, 12, 357, 'yellow'),
('grand_prix', 11, 5, 9, 489, 'yellow'),
('grand_prix', 12, 3, 3, 144, 'yellow'),
('grand_prix', 13, 4, 14, 357, 'yellow'),
('grand_prix', 14, 3, 10, 117, 'yellow'),
('grand_prix', 15, 4, 4, 294, 'yellow'),
('grand_prix', 16, 4, 5, 292, 'yellow'),
('grand_prix', 17, 4, 17, 341, 'yellow'),
('grand_prix', 18, 5, 1, 510, 'yellow');

-- WHITE TEE (6258 yards total)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 8, 420, 'white'),
('grand_prix', 2, 4, 13, 390, 'white'),
('grand_prix', 3, 3, 11, 157, 'white'),
('grand_prix', 4, 4, 15, 408, 'white'),
('grand_prix', 5, 5, 16, 464, 'white'),
('grand_prix', 6, 4, 6, 330, 'white'),
('grand_prix', 7, 3, 2, 146, 'white'),
('grand_prix', 8, 4, 18, 386, 'white'),
('grand_prix', 9, 5, 7, 456, 'white'),
('grand_prix', 10, 4, 12, 376, 'white'),
('grand_prix', 11, 5, 9, 513, 'white'),
('grand_prix', 12, 3, 3, 169, 'white'),
('grand_prix', 13, 4, 14, 384, 'white'),
('grand_prix', 14, 3, 10, 125, 'white'),
('grand_prix', 15, 4, 4, 316, 'white'),
('grand_prix', 16, 4, 5, 311, 'white'),
('grand_prix', 17, 4, 17, 372, 'white'),
('grand_prix', 18, 5, 1, 535, 'white');

-- BLUE TEE (6627 yards total)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 8, 437, 'blue'),
('grand_prix', 2, 4, 13, 407, 'blue'),
('grand_prix', 3, 3, 11, 182, 'blue'),
('grand_prix', 4, 4, 15, 432, 'blue'),
('grand_prix', 5, 5, 16, 484, 'blue'),
('grand_prix', 6, 4, 6, 353, 'blue'),
('grand_prix', 7, 3, 2, 152, 'blue'),
('grand_prix', 8, 4, 18, 412, 'blue'),
('grand_prix', 9, 5, 7, 473, 'blue'),
('grand_prix', 10, 4, 12, 398, 'blue'),
('grand_prix', 11, 5, 9, 534, 'blue'),
('grand_prix', 12, 3, 3, 180, 'blue'),
('grand_prix', 13, 4, 14, 406, 'blue'),
('grand_prix', 14, 3, 10, 148, 'blue'),
('grand_prix', 15, 4, 4, 339, 'blue'),
('grand_prix', 16, 4, 5, 330, 'blue'),
('grand_prix', 17, 4, 17, 395, 'blue'),
('grand_prix', 18, 5, 1, 565, 'blue');

-- BLACK TEE (7111 yards total)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 8, 453, 'black'),
('grand_prix', 2, 4, 13, 432, 'black'),
('grand_prix', 3, 3, 11, 216, 'black'),
('grand_prix', 4, 4, 15, 460, 'black'),
('grand_prix', 5, 5, 16, 509, 'black'),
('grand_prix', 6, 4, 6, 378, 'black'),
('grand_prix', 7, 3, 2, 170, 'black'),
('grand_prix', 8, 4, 18, 442, 'black'),
('grand_prix', 9, 5, 7, 501, 'black'),
('grand_prix', 10, 4, 12, 429, 'black'),
('grand_prix', 11, 5, 9, 568, 'black'),
('grand_prix', 12, 3, 3, 205, 'black'),
('grand_prix', 13, 4, 14, 429, 'black'),
('grand_prix', 14, 3, 10, 172, 'black'),
('grand_prix', 15, 4, 4, 365, 'black'),
('grand_prix', 16, 4, 5, 361, 'black'),
('grand_prix', 17, 4, 17, 427, 'black'),
('grand_prix', 18, 5, 1, 594, 'black');

-- Verification queries
SELECT
    tee_marker,
    COUNT(*) as hole_count,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'grand_prix'
GROUP BY tee_marker
ORDER BY total_yardage;

-- Expected results:
-- red:    18 holes, 5534 yards, Par 72
-- yellow: 18 holes, 5841 yards, Par 72
-- white:  18 holes, 6258 yards, Par 72
-- blue:   18 holes, 6627 yards, Par 72
-- black:  18 holes, 7111 yards, Par 72

SELECT 'Grand Prix Golf Club data updated successfully!' as status,
       'All 5 tee markers loaded: red (5534), yellow (5841), white (6258), blue (6627), black (7111)' as tees;
