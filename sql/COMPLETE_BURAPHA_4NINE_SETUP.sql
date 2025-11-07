-- =====================================================
-- COMPLETE BURAPHA GOLF CLUB - 4-NINE SETUP
-- =====================================================
-- Run this in Supabase Studio SQL Editor
-- Safe to run multiple times (uses ON CONFLICT)
--
-- This script creates Burapha with 4 selectable nines:
-- - Nine A: East Front 9 (holes 1-9)
-- - Nine B: East Back 9 (holes 10-18, stored as 1-9)
-- - Nine C: West Front 9 (holes 1-9)
-- - Nine D: West Back 9 (holes 10-18, stored as 1-9)
--
-- Players can select any combination: A+B, A+C, A+D, B+C, B+D, C+D
--
-- Tee Color Mapping:
-- - Blue   = Championship/Black tees (longest)
-- - White  = Blue/Men's tees (medium-long)
-- - Yellow = White tees (medium-short)
-- - Red    = Red/Ladies/Women tees (shortest)
--
-- Created: 2025-11-07
-- =====================================================

-- =====================================================
-- PART 1: INSERT COURSE NINES
-- =====================================================

INSERT INTO course_nine (course_name, nine_name) VALUES ('Burapha Golf Club','A') ON CONFLICT DO NOTHING;
INSERT INTO course_nine (course_name, nine_name) VALUES ('Burapha Golf Club','B') ON CONFLICT DO NOTHING;
INSERT INTO course_nine (course_name, nine_name) VALUES ('Burapha Golf Club','C') ON CONFLICT DO NOTHING;
INSERT INTO course_nine (course_name, nine_name) VALUES ('Burapha Golf Club','D') ON CONFLICT DO NOTHING;

-- =====================================================
-- PART 2: INSERT ALL 36 HOLES
-- =====================================================

-- =====================================================
-- NINE A - EAST FRONT 9 (Holes 1-9)
-- =====================================================

INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='A'), 1, 358, 363, 297, 273, 4, 14) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='A'), 2, 414, 389, 363, 334, 4, 6) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='A'), 3, 170, 132, 132, 95, 3, 18) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='A'), 4, 416, 385, 356, 333, 4, 8) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='A'), 5, 581, 548, 513, 481, 5, 12) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='A'), 6, 196, 179, 172, 136, 3, 16) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='A'), 7, 554, 526, 501, 430, 5, 10) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='A'), 8, 452, 442, 399, 365, 4, 4) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='A'), 9, 468, 454, 439, 385, 4, 2) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;

-- =====================================================
-- NINE B - EAST BACK 9 (Holes 10-18, stored as 1-9)
-- =====================================================

INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='B'), 1, 480, 448, 423, 353, 4, 3) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='B'), 2, 346, 318, 282, 253, 4, 13) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='B'), 3, 193, 160, 133, 107, 3, 17) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='B'), 4, 407, 374, 347, 304, 4, 9) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='B'), 5, 420, 404, 419, 368, 4, 5) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='B'), 6, 572, 540, 504, 442, 5, 11) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='B'), 7, 446, 419, 398, 353, 4, 1) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='B'), 8, 196, 176, 158, 143, 3, 15) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='B'), 9, 512, 512, 490, 421, 5, 7) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;

-- =====================================================
-- NINE C - WEST FRONT 9 (Holes 1-9)
-- =====================================================

INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='C'), 1, 462, 431, 406, 355, 4, 4) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='C'), 2, 545, 516, 497, 447, 5, 8) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='C'), 3, 484, 438, 410, 365, 4, 2) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='C'), 4, 370, 328, 295, 234, 4, 14) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='C'), 5, 162, 132, 129, 100, 3, 18) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='C'), 6, 373, 360, 335, 275, 4, 12) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='C'), 7, 526, 499, 478, 457, 5, 10) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='C'), 8, 177, 177, 153, 116, 3, 16) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='C'), 9, 606, 373, 357, 307, 4, 6) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;

-- =====================================================
-- NINE D - WEST BACK 9 (Holes 10-18, stored as 1-9)
-- =====================================================

INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='D'), 1, 524, 495, 472, 438, 5, 13) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='D'), 2, 202, 169, 136, 114, 3, 11) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='D'), 3, 445, 418, 377, 346, 4, 7) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='D'), 4, 456, 423, 391, 358, 4, 3) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='D'), 5, 542, 513, 495, 449, 5, 9) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='D'), 6, 432, 403, 375, 317, 4, 5) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='D'), 7, 285, 275, 252, 210, 4, 17) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='D'), 8, 232, 204, 181, 158, 3, 15) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='D'), 9, 510, 490, 470, 445, 4, 1) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;

-- =====================================================
-- PART 3: VERIFICATION QUERIES (optional - run to test)
-- =====================================================

-- Verify course nines created (should return 4 rows)
-- SELECT * FROM course_nine WHERE course_name = 'Burapha Golf Club';

-- Verify holes created (should return 36 rows)
-- SELECT cn.nine_name, COUNT(*) as hole_count
-- FROM nine_hole nh
-- JOIN course_nine cn ON nh.course_nine_id = cn.id
-- WHERE cn.course_name = 'Burapha Golf Club'
-- GROUP BY cn.nine_name
-- ORDER BY cn.nine_name;

-- Verify yardages for each nine
-- SELECT
--     cn.nine_name,
--     SUM(nh.blue) as blue_total,
--     SUM(nh.white) as white_total,
--     SUM(nh.yellow) as yellow_total,
--     SUM(nh.red) as red_total,
--     SUM(nh.par) as par_total
-- FROM nine_hole nh
-- JOIN course_nine cn ON nh.course_nine_id = cn.id
-- WHERE cn.course_name = 'Burapha Golf Club'
-- GROUP BY cn.nine_name
-- ORDER BY cn.nine_name;

-- =====================================================
-- EXPECTED YARDAGES (approximate):
-- =====================================================
-- Nine A (East Front 9):
--   Blue: 3609, White: 3418, Yellow: 3172, Red: 2832, Par: 36
--
-- Nine B (East Back 9):
--   Blue: 3572, White: 3351, Yellow: 3154, Red: 2744, Par: 36
--
-- Nine C (West Front 9):
--   Blue: 3705, White: 3254, Yellow: 3060, Red: 2656, Par: 36
--
-- Nine D (West Back 9):
--   Blue: 3628, White: 3390, Yellow: 3149, Red: 2835, Par: 36
-- =====================================================

-- =====================================================
-- POSSIBLE 18-HOLE COMBINATIONS:
-- =====================================================
-- A + B = Full East Course
-- C + D = Full West Course
-- A + C = East Front + West Front
-- A + D = East Front + West Back
-- B + C = East Back + West Front
-- B + D = East Back + West Back
-- =====================================================

-- =====================================================
-- COMPLETE! Burapha Golf Club 4-Nine Setup Done
-- =====================================================
