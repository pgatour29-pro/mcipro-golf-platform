-- =====================================================================
-- INSERT PATTAYA COUNTRY CLUB COURSE DATA
-- =====================================================================
-- This populates the course_holes table with the correct par and stroke index
-- for Pattaya Country Club
-- Run this in Supabase SQL Editor
-- =====================================================================

-- First, ensure the course exists in courses table
INSERT INTO courses (id, name, scorecard_url, location, country)
VALUES (
  'pattaya_country_club',
  'Pattaya Country Club',
  'https://example.com/scorecards/pattaya.jpg',
  'Pattaya, Chonburi',
  'Thailand'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = now();

-- Insert hole data for Pattaya Country Club
-- Par: 4,4,5,3,4,4,3,4,5 (Front 9 = 36)
--      4,3,5,4,4,3,4,5,4 (Back 9 = 36)
-- Total Par: 72

DELETE FROM course_holes WHERE course_id = 'pattaya_country_club';

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('pattaya_country_club', 1, 4, 11, 380, 'WHITE'),
('pattaya_country_club', 2, 4, 7, 410, 'WHITE'),
('pattaya_country_club', 3, 5, 3, 520, 'WHITE'),
('pattaya_country_club', 4, 3, 17, 175, 'WHITE'),
('pattaya_country_club', 5, 4, 1, 425, 'WHITE'),
('pattaya_country_club', 6, 4, 13, 395, 'WHITE'),
('pattaya_country_club', 7, 3, 15, 165, 'WHITE'),
('pattaya_country_club', 8, 4, 9, 400, 'WHITE'),
('pattaya_country_club', 9, 5, 5, 510, 'WHITE'),
-- Back 9
('pattaya_country_club', 10, 4, 6, 415, 'WHITE'),
('pattaya_country_club', 11, 3, 18, 180, 'WHITE'),
('pattaya_country_club', 12, 5, 2, 540, 'WHITE'),
('pattaya_country_club', 13, 4, 10, 390, 'WHITE'),
('pattaya_country_club', 14, 4, 4, 420, 'WHITE'),
('pattaya_country_club', 15, 3, 16, 170, 'WHITE'),
('pattaya_country_club', 16, 4, 12, 385, 'WHITE'),
('pattaya_country_club', 17, 5, 8, 530, 'WHITE'),
('pattaya_country_club', 18, 4, 14, 405, 'WHITE');

-- Verification
SELECT 
    hole_number,
    par,
    stroke_index,
    yardage
FROM course_holes
WHERE course_id = 'pattaya_country_club'
ORDER BY hole_number;

-- Summary
SELECT 
    'Front 9' as nine,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as par
FROM course_holes
WHERE course_id = 'pattaya_country_club'
UNION ALL
SELECT 
    'Back 9',
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END)
FROM course_holes
WHERE course_id = 'pattaya_country_club'
UNION ALL
SELECT 
    'Total',
    SUM(par)
FROM course_holes
WHERE course_id = 'pattaya_country_club';
