-- Fix Pleasant Valley white tees with CORRECT stroke indices from scorecard image
DELETE FROM course_holes WHERE course_id = 'pleasant_valley' AND tee_marker = 'white';

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('pleasant_valley', 1, 4, 9, 363, 'white'),
('pleasant_valley', 2, 4, 3, 368, 'white'),
('pleasant_valley', 3, 5, 1, 508, 'white'),
('pleasant_valley', 4, 4, 14, 281, 'white'),
('pleasant_valley', 5, 3, 16, 160, 'white'),
('pleasant_valley', 6, 5, 6, 457, 'white'),
('pleasant_valley', 7, 4, 18, 297, 'white'),
('pleasant_valley', 8, 3, 12, 153, 'white'),
('pleasant_valley', 9, 4, 4, 365, 'white'),
-- Back 9
('pleasant_valley', 10, 4, 2, 398, 'white'),
('pleasant_valley', 11, 4, 8, 359, 'white'),
('pleasant_valley', 12, 4, 10, 289, 'white'),
('pleasant_valley', 13, 3, 15, 133, 'white'),
('pleasant_valley', 14, 4, 7, 331, 'white'),
('pleasant_valley', 15, 5, 11, 439, 'white'),
('pleasant_valley', 16, 4, 5, 380, 'white'),
('pleasant_valley', 17, 3, 17, 103, 'white'),
('pleasant_valley', 18, 5, 13, 448, 'white');
