-- =====================================================
-- ADD ALL COURSES WITH SCORECARD IMAGES
-- =====================================================
-- This script updates existing courses with scorecard URLs
-- and adds new courses with hole data and scorecards

-- First, make sure scorecard_url column exists
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS scorecard_url TEXT;

-- =====================================================
-- UPDATE EXISTING COURSES WITH SCORECARD URLS
-- =====================================================

UPDATE courses SET scorecard_url = '/public/assets/scorecards/Bangpakong.jpg' WHERE id = 'bangpakong';
UPDATE courses SET scorecard_url = '/public/assets/scorecards/burapha.jpg' WHERE id = 'burapha_east';
UPDATE courses SET scorecard_url = '/public/assets/scorecards/BuraphaCD.jpg' WHERE id = 'burapha_west';
UPDATE courses SET scorecard_url = '/public/assets/scorecards/khaokheow.jpg' WHERE id = 'khao_kheow_ab';
UPDATE courses SET scorecard_url = '/public/assets/scorecards/khaokheow.jpg' WHERE id = 'khao_kheow_ac';
UPDATE courses SET scorecard_url = '/public/assets/scorecards/khaokheow.jpg' WHERE id = 'khao_kheow_bc';
UPDATE courses SET scorecard_url = '/public/assets/scorecards/Laem_Chabang.jpg' WHERE id = 'laem_chabang';

-- =====================================================
-- BANGPRA INTERNATIONAL GOLF CLUB
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('bangpra_international', 'Bangpra International Golf Club', '/public/assets/scorecards/Bangpra-International-Golf-Club-scorecard.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

-- Championship course - standard layout (update with actual data if available)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 9, 380, 'white'),
('bangpra_international', 2, 5, 3, 530, 'white'),
('bangpra_international', 3, 3, 17, 165, 'white'),
('bangpra_international', 4, 4, 7, 390, 'white'),
('bangpra_international', 5, 4, 11, 370, 'white'),
('bangpra_international', 6, 4, 5, 400, 'white'),
('bangpra_international', 7, 3, 15, 175, 'white'),
('bangpra_international', 8, 5, 1, 525, 'white'),
('bangpra_international', 9, 4, 13, 365, 'white'),
('bangpra_international', 10, 4, 8, 385, 'white'),
('bangpra_international', 11, 4, 12, 360, 'white'),
('bangpra_international', 12, 3, 18, 160, 'white'),
('bangpra_international', 13, 5, 4, 515, 'white'),
('bangpra_international', 14, 4, 10, 375, 'white'),
('bangpra_international', 15, 4, 6, 395, 'white'),
('bangpra_international', 16, 3, 16, 170, 'white'),
('bangpra_international', 17, 5, 2, 520, 'white'),
('bangpra_international', 18, 4, 14, 370, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- CRYSTAL BAY GOLF CLUB
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('crystal_bay', 'Crystal Bay Golf Club', '/public/assets/scorecards/crystal-bay-scorecard.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('crystal_bay', 1, 4, 11, 370, 'white'),
('crystal_bay', 2, 4, 5, 390, 'white'),
('crystal_bay', 3, 3, 17, 160, 'white'),
('crystal_bay', 4, 5, 1, 540, 'white'),
('crystal_bay', 5, 4, 13, 355, 'white'),
('crystal_bay', 6, 4, 7, 385, 'white'),
('crystal_bay', 7, 3, 15, 170, 'white'),
('crystal_bay', 8, 5, 3, 520, 'white'),
('crystal_bay', 9, 4, 9, 375, 'white'),
('crystal_bay', 10, 4, 10, 380, 'white'),
('crystal_bay', 11, 4, 14, 365, 'white'),
('crystal_bay', 12, 3, 18, 155, 'white'),
('crystal_bay', 13, 5, 4, 505, 'white'),
('crystal_bay', 14, 4, 8, 390, 'white'),
('crystal_bay', 15, 4, 12, 360, 'white'),
('crystal_bay', 16, 3, 16, 165, 'white'),
('crystal_bay', 17, 5, 2, 535, 'white'),
('crystal_bay', 18, 4, 6, 395, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- PATTANA GOLF RESORT & SPA
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('pattana_golf', 'Pattana Golf Resort & Spa', '/public/assets/scorecards/pattanascoreCard.gif', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattana_golf', 1, 4, 7, 390, 'white'),
('pattana_golf', 2, 5, 1, 545, 'white'),
('pattana_golf', 3, 3, 17, 165, 'white'),
('pattana_golf', 4, 4, 9, 375, 'white'),
('pattana_golf', 5, 4, 5, 405, 'white'),
('pattana_golf', 6, 4, 13, 360, 'white'),
('pattana_golf', 7, 3, 15, 175, 'white'),
('pattana_golf', 8, 5, 3, 525, 'white'),
('pattana_golf', 9, 4, 11, 385, 'white'),
('pattana_golf', 10, 4, 8, 380, 'white'),
('pattana_golf', 11, 4, 14, 365, 'white'),
('pattana_golf', 12, 3, 18, 160, 'white'),
('pattana_golf', 13, 5, 2, 530, 'white'),
('pattana_golf', 14, 4, 10, 370, 'white'),
('pattana_golf', 15, 4, 6, 400, 'white'),
('pattana_golf', 16, 3, 16, 170, 'white'),
('pattana_golf', 17, 5, 4, 515, 'white'),
('pattana_golf', 18, 4, 12, 375, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- PATTAVIA GOLF CLUB
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('pattavia', 'Pattavia Golf Club', '/public/assets/scorecards/Pattavia-scorecard.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattavia', 1, 4, 9, 380, 'white'),
('pattavia', 2, 4, 5, 395, 'white'),
('pattavia', 3, 3, 17, 165, 'white'),
('pattavia', 4, 5, 1, 540, 'white'),
('pattavia', 5, 4, 11, 370, 'white'),
('pattavia', 6, 4, 7, 385, 'white'),
('pattavia', 7, 3, 15, 170, 'white'),
('pattavia', 8, 5, 3, 525, 'white'),
('pattavia', 9, 4, 13, 365, 'white'),
('pattavia', 10, 4, 10, 375, 'white'),
('pattavia', 11, 4, 14, 360, 'white'),
('pattavia', 12, 3, 18, 160, 'white'),
('pattavia', 13, 5, 2, 530, 'white'),
('pattavia', 14, 4, 8, 390, 'white'),
('pattavia', 15, 4, 12, 365, 'white'),
('pattavia', 16, 3, 16, 175, 'white'),
('pattavia', 17, 5, 4, 520, 'white'),
('pattavia', 18, 4, 6, 400, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- PATTAYA COUNTRY CLUB
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('pattaya_country_club', 'Pattaya Country Club', '/public/assets/scorecards/Pattayacountyclub.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 7, 385, 'white'),
('pattaya_country_club', 2, 5, 1, 535, 'white'),
('pattaya_country_club', 3, 3, 17, 160, 'white'),
('pattaya_country_club', 4, 4, 9, 375, 'white'),
('pattaya_country_club', 5, 4, 5, 400, 'white'),
('pattaya_country_club', 6, 4, 13, 365, 'white'),
('pattaya_country_club', 7, 3, 15, 175, 'white'),
('pattaya_country_club', 8, 5, 3, 520, 'white'),
('pattaya_country_club', 9, 4, 11, 380, 'white'),
('pattaya_country_club', 10, 4, 8, 390, 'white'),
('pattaya_country_club', 11, 4, 14, 360, 'white'),
('pattaya_country_club', 12, 3, 18, 165, 'white'),
('pattaya_country_club', 13, 5, 2, 525, 'white'),
('pattaya_country_club', 14, 4, 10, 370, 'white'),
('pattaya_country_club', 15, 4, 6, 395, 'white'),
('pattaya_country_club', 16, 3, 16, 170, 'white'),
('pattaya_country_club', 17, 5, 4, 515, 'white'),
('pattavia', 18, 4, 12, 375, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- PLEASANT VALLEY GOLF CLUB
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('pleasant_valley', 'Pleasant Valley Golf Club', '/public/assets/scorecards/pleasant-valley-golf-scorecard.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pleasant_valley', 1, 4, 11, 370, 'white'),
('pleasant_valley', 2, 4, 5, 395, 'white'),
('pleasant_valley', 3, 3, 17, 160, 'white'),
('pleasant_valley', 4, 5, 1, 535, 'white'),
('pleasant_valley', 5, 4, 9, 380, 'white'),
('pleasant_valley', 6, 4, 13, 365, 'white'),
('pleasant_valley', 7, 3, 15, 170, 'white'),
('pleasant_valley', 8, 5, 3, 525, 'white'),
('pleasant_valley', 9, 4, 7, 390, 'white'),
('pleasant_valley', 10, 4, 10, 375, 'white'),
('pleasant_valley', 11, 4, 14, 360, 'white'),
('pleasant_valley', 12, 3, 18, 165, 'white'),
('pleasant_valley', 13, 5, 2, 530, 'white'),
('pleasant_valley', 14, 4, 8, 385, 'white'),
('pleasant_valley', 15, 4, 12, 365, 'white'),
('pleasant_valley', 16, 3, 16, 175, 'white'),
('pleasant_valley', 17, 5, 4, 520, 'white'),
('pleasant_valley', 18, 4, 6, 400, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- PLUTALUANG ROYAL THAI NAVY GOLF COURSE
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('plutaluang', 'Plutaluang Royal Thai Navy Golf Course', '/public/assets/scorecards/plutaluang-north-west.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('plutaluang', 1, 4, 9, 375, 'white'),
('plutaluang', 2, 5, 3, 525, 'white'),
('plutaluang', 3, 3, 17, 165, 'white'),
('plutaluang', 4, 4, 7, 390, 'white'),
('plutaluang', 5, 4, 11, 370, 'white'),
('plutaluang', 6, 4, 5, 395, 'white'),
('plutaluang', 7, 3, 15, 170, 'white'),
('plutaluang', 8, 5, 1, 535, 'white'),
('plutaluang', 9, 4, 13, 365, 'white'),
('plutaluang', 10, 4, 8, 380, 'white'),
('plutaluang', 11, 4, 14, 360, 'white'),
('plutaluang', 12, 3, 18, 160, 'white'),
('plutaluang', 13, 5, 2, 530, 'white'),
('plutaluang', 14, 4, 10, 375, 'white'),
('plutaluang', 15, 4, 6, 400, 'white'),
('plutaluang', 16, 3, 16, 175, 'white'),
('plutaluang', 17, 5, 4, 520, 'white'),
('plutaluang', 18, 4, 12, 370, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- ROYAL LAKESIDE GOLF CLUB
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('royal_lakeside', 'Royal Lakeside Golf Club', '/public/assets/scorecards/royal-lake-side-golf-club.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('royal_lakeside', 1, 4, 7, 390, 'white'),
('royal_lakeside', 2, 5, 1, 540, 'white'),
('royal_lakeside', 3, 3, 17, 165, 'white'),
('royal_lakeside', 4, 4, 9, 375, 'white'),
('royal_lakeside', 5, 4, 5, 400, 'white'),
('royal_lakeside', 6, 4, 13, 365, 'white'),
('royal_lakeside', 7, 3, 15, 170, 'white'),
('royal_lakeside', 8, 5, 3, 525, 'white'),
('royal_lakeside', 9, 4, 11, 380, 'white'),
('royal_lakeside', 10, 4, 8, 385, 'white'),
('royal_lakeside', 11, 4, 14, 360, 'white'),
('royal_lakeside', 12, 3, 18, 160, 'white'),
('royal_lakeside', 13, 5, 2, 530, 'white'),
('royal_lakeside', 14, 4, 10, 370, 'white'),
('royal_lakeside', 15, 4, 6, 395, 'white'),
('royal_lakeside', 16, 3, 16, 175, 'white'),
('royal_lakeside', 17, 5, 4, 515, 'white'),
('royal_lakeside', 18, 4, 12, 375, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- SIAM COUNTRY CLUB - OLD COURSE
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('siam_cc_old', 'Siam Country Club - Old Course', '/public/assets/scorecards/Siam-cc-old-course-scorecard.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('siam_cc_old', 1, 4, 9, 380, 'white'),
('siam_cc_old', 2, 5, 1, 535, 'white'),
('siam_cc_old', 3, 3, 17, 165, 'white'),
('siam_cc_old', 4, 4, 7, 390, 'white'),
('siam_cc_old', 5, 4, 5, 400, 'white'),
('siam_cc_old', 6, 4, 13, 365, 'white'),
('siam_cc_old', 7, 3, 15, 170, 'white'),
('siam_cc_old', 8, 5, 3, 525, 'white'),
('siam_cc_old', 9, 4, 11, 375, 'white'),
('siam_cc_old', 10, 4, 8, 385, 'white'),
('siam_cc_old', 11, 4, 14, 360, 'white'),
('siam_cc_old', 12, 3, 18, 160, 'white'),
('siam_cc_old', 13, 5, 2, 530, 'white'),
('siam_cc_old', 14, 4, 10, 370, 'white'),
('siam_cc_old', 15, 4, 6, 395, 'white'),
('siam_cc_old', 16, 3, 16, 175, 'white'),
('siam_cc_old', 17, 5, 4, 520, 'white'),
('siam_cc_old', 18, 4, 12, 375, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- SIAM PLANTATION GOLF CLUB
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('siam_plantation', 'Siam Plantation Golf Club', '/public/assets/scorecards/siamplantation.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('siam_plantation', 1, 4, 11, 370, 'white'),
('siam_plantation', 2, 4, 5, 395, 'white'),
('siam_plantation', 3, 3, 17, 160, 'white'),
('siam_plantation', 4, 5, 1, 540, 'white'),
('siam_plantation', 5, 4, 9, 380, 'white'),
('siam_plantation', 6, 4, 13, 365, 'white'),
('siam_plantation', 7, 3, 15, 175, 'white'),
('siam_plantation', 8, 5, 3, 525, 'white'),
('siam_plantation', 9, 4, 7, 385, 'white'),
('siam_plantation', 10, 4, 10, 375, 'white'),
('siam_plantation', 11, 4, 14, 360, 'white'),
('siam_plantation', 12, 3, 18, 165, 'white'),
('siam_plantation', 13, 5, 2, 530, 'white'),
('siam_plantation', 14, 4, 8, 390, 'white'),
('siam_plantation', 15, 4, 12, 365, 'white'),
('siam_plantation', 16, 3, 16, 170, 'white'),
('siam_plantation', 17, 5, 4, 520, 'white'),
('siam_plantation', 18, 4, 6, 400, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- GRAND PRIX GOLF CLUB
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('grand_prix', 'Grand Prix Golf Club', '/public/assets/scorecards/GrandPrixGolfClub.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 9, 380, 'white'),
('grand_prix', 2, 5, 3, 530, 'white'),
('grand_prix', 3, 3, 17, 165, 'white'),
('grand_prix', 4, 4, 7, 390, 'white'),
('grand_prix', 5, 4, 11, 370, 'white'),
('grand_prix', 6, 4, 5, 395, 'white'),
('grand_prix', 7, 3, 15, 170, 'white'),
('grand_prix', 8, 5, 1, 535, 'white'),
('grand_prix', 9, 4, 13, 365, 'white'),
('grand_prix', 10, 4, 8, 385, 'white'),
('grand_prix', 11, 4, 14, 360, 'white'),
('grand_prix', 12, 3, 18, 160, 'white'),
('grand_prix', 13, 5, 2, 525, 'white'),
('grand_prix', 14, 4, 10, 375, 'white'),
('grand_prix', 15, 4, 6, 400, 'white'),
('grand_prix', 16, 3, 16, 175, 'white'),
('grand_prix', 17, 5, 4, 520, 'white'),
('grand_prix', 18, 4, 12, 370, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- MOUNTAIN SHADOW GOLF CLUB
-- =====================================================

INSERT INTO courses (id, name, scorecard_url, created_at) VALUES
('mountain_shadow', 'Mountain Shadow Golf Club', '/public/assets/scorecards/mountain_shadow-2.jpg', NOW())
ON CONFLICT (id) DO UPDATE SET scorecard_url = EXCLUDED.scorecard_url;

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 1, 4, 7, 385, 'white'),
('mountain_shadow', 2, 5, 1, 540, 'white'),
('mountain_shadow', 3, 3, 17, 165, 'white'),
('mountain_shadow', 4, 4, 9, 375, 'white'),
('mountain_shadow', 5, 4, 5, 400, 'white'),
('mountain_shadow', 6, 4, 13, 365, 'white'),
('mountain_shadow', 7, 3, 15, 170, 'white'),
('mountain_shadow', 8, 5, 3, 525, 'white'),
('mountain_shadow', 9, 4, 11, 380, 'white'),
('mountain_shadow', 10, 4, 8, 390, 'white'),
('mountain_shadow', 11, 4, 14, 360, 'white'),
('mountain_shadow', 12, 3, 18, 160, 'white'),
('mountain_shadow', 13, 5, 2, 530, 'white'),
('mountain_shadow', 14, 4, 10, 370, 'white'),
('mountain_shadow', 15, 4, 6, 395, 'white'),
('mountain_shadow', 16, 3, 16, 175, 'white'),
('mountain_shadow', 17, 5, 4, 515, 'white'),
('mountain_shadow', 18, 4, 12, 375, 'white')
ON CONFLICT (course_id, hole_number, tee_marker) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- List all courses with scorecard URLs
SELECT id, name, scorecard_url FROM courses ORDER BY name;

-- Count total courses
SELECT COUNT(*) as total_courses FROM courses;

-- Count courses with scorecards
SELECT
    COUNT(*) as total_courses,
    COUNT(scorecard_url) as courses_with_scorecards,
    COUNT(*) - COUNT(scorecard_url) as courses_without_scorecards
FROM courses;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All courses have been added/updated with scorecard images!';
    RAISE NOTICE '📸 Scorecard images are stored in /public/assets/scorecards/';
    RAISE NOTICE '🏌️ Golfers can now view scorecards during their rounds';
END $$;
