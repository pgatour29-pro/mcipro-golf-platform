-- =====================================================================
-- Chiang Mai Classic 2026 — 4 course scorecards (White tee, men's standard)
-- Par/Stroke-Index sourced from official scorecards + cross-checked directories.
--   Summit Green Valley : par+SI CONFIRMED (3 sources)
--   North Hill          : par+SI CONFIRMED (2 sources)
--   Highlands (A+B)      : par+SI+yardage CONFIRMED (official A/B merged card)
--   Alpine (A+C)         : par+yardage CONFIRMED; merged 1-18 SI DERIVED (odd/even
--                          merge of the two official per-nine 1-9 indexes) — VERIFY.
-- Idempotent: clears these 4 course_ids first, then re-inserts.
-- Courses/course_holes have NO notification triggers (safe to run).
-- =====================================================================

DELETE FROM course_holes WHERE course_id IN
  ('summit_green_valley_cm','north_hill_cm','highlands_cm','alpine_cm');
DELETE FROM courses WHERE id IN
  ('summit_green_valley_cm','north_hill_cm','highlands_cm','alpine_cm');

INSERT INTO courses (id, name, location, country, total_holes, par) VALUES
  ('summit_green_valley_cm','Summit Green Valley Country Club (Chiang Mai)','Chiang Mai','Thailand',18,72),
  ('north_hill_cm','North Hill Golf Club (Chiang Mai)','Chiang Mai','Thailand',18,72),
  ('highlands_cm','Highlands Golf & Spa Resort (Chiang Mai)','Chiang Mai','Thailand',18,72),
  ('alpine_cm','Alpine Golf Club & Resort (Chiang Mai)','Chiang Mai','Thailand',18,72);

-- ---- Summit Green Valley (Mon 29 Jun, R1) — White tee ----
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('summit_green_valley_cm', 1,'white',5, 2,537),
 ('summit_green_valley_cm', 2,'white',4,10,371),
 ('summit_green_valley_cm', 3,'white',3,18,148),
 ('summit_green_valley_cm', 4,'white',4, 6,375),
 ('summit_green_valley_cm', 5,'white',5,12,480),
 ('summit_green_valley_cm', 6,'white',3,16,160),
 ('summit_green_valley_cm', 7,'white',4,14,350),
 ('summit_green_valley_cm', 8,'white',4, 4,406),
 ('summit_green_valley_cm', 9,'white',4, 8,384),
 ('summit_green_valley_cm',10,'white',4,13,366),
 ('summit_green_valley_cm',11,'white',5, 3,485),
 ('summit_green_valley_cm',12,'white',3,17,155),
 ('summit_green_valley_cm',13,'white',4, 1,429),
 ('summit_green_valley_cm',14,'white',4, 5,396),
 ('summit_green_valley_cm',15,'white',4, 9,370),
 ('summit_green_valley_cm',16,'white',3,15,207),
 ('summit_green_valley_cm',17,'white',4, 7,371),
 ('summit_green_valley_cm',18,'white',5,11,500);

-- ---- North Hill (Tue 30 Jun, R2) — White tee ----
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('north_hill_cm', 1,'white',5,17,449),
 ('north_hill_cm', 2,'white',3,15,170),
 ('north_hill_cm', 3,'white',4, 1,370),
 ('north_hill_cm', 4,'white',3, 5,170),
 ('north_hill_cm', 5,'white',5,13,515),
 ('north_hill_cm', 6,'white',4, 7,405),
 ('north_hill_cm', 7,'white',4, 3,300),
 ('north_hill_cm', 8,'white',4, 9,330),
 ('north_hill_cm', 9,'white',4,11,305),
 ('north_hill_cm',10,'white',4, 8,340),
 ('north_hill_cm',11,'white',4, 6,300),
 ('north_hill_cm',12,'white',5, 4,456),
 ('north_hill_cm',13,'white',4,12,310),
 ('north_hill_cm',14,'white',3,18,130),
 ('north_hill_cm',15,'white',4, 2,350),
 ('north_hill_cm',16,'white',4,10,355),
 ('north_hill_cm',17,'white',3,16,150),
 ('north_hill_cm',18,'white',5,14,485);

-- ---- Highlands, Valley(A)+Highlands(B) (Thu 2 Jul, R3) — White tee ----
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('highlands_cm', 1,'white',4,13,343),
 ('highlands_cm', 2,'white',3,11,154),
 ('highlands_cm', 3,'white',5, 9,528),
 ('highlands_cm', 4,'white',4, 5,328),
 ('highlands_cm', 5,'white',4, 1,405),
 ('highlands_cm', 6,'white',5,17,497),
 ('highlands_cm', 7,'white',3,15,127),
 ('highlands_cm', 8,'white',4, 3,360),
 ('highlands_cm', 9,'white',4, 7,366),
 ('highlands_cm',10,'white',4, 6,367),
 ('highlands_cm',11,'white',4,14,315),
 ('highlands_cm',12,'white',4, 2,418),
 ('highlands_cm',13,'white',4,18,364),
 ('highlands_cm',14,'white',3,12,170),
 ('highlands_cm',15,'white',5,10,494),
 ('highlands_cm',16,'white',4, 4,407),
 ('highlands_cm',17,'white',3,16,132),
 ('highlands_cm',18,'white',5, 8,512);

-- ---- Alpine, Course A + Course C (Fri 3 Jul, R4) — White tee ----
-- SI DERIVED (A=odd indexes, C=even indexes, by each nine's own 1-9 difficulty).
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('alpine_cm', 1,'white',4, 9,410),
 ('alpine_cm', 2,'white',4,15,356),
 ('alpine_cm', 3,'white',3, 3,165),
 ('alpine_cm', 4,'white',5, 7,582),
 ('alpine_cm', 5,'white',4, 1,422),
 ('alpine_cm', 6,'white',4,13,376),
 ('alpine_cm', 7,'white',5,17,530),
 ('alpine_cm', 8,'white',3,11,135),
 ('alpine_cm', 9,'white',4, 5,400),
 ('alpine_cm',10,'white',5, 4,578),
 ('alpine_cm',11,'white',4, 8,336),
 ('alpine_cm',12,'white',4, 2,420),
 ('alpine_cm',13,'white',3,16,163),
 ('alpine_cm',14,'white',4, 6,364),
 ('alpine_cm',15,'white',3,10,129),
 ('alpine_cm',16,'white',4,12,400),
 ('alpine_cm',17,'white',4,18,380),
 ('alpine_cm',18,'white',5,14,524);

-- ---- Verify ----
SELECT c.id, c.name, count(h.*) AS holes, sum(h.par) AS total_par,
       min(h.stroke_index) AS si_min, max(h.stroke_index) AS si_max,
       count(DISTINCT h.stroke_index) AS distinct_si
FROM courses c
JOIN course_holes h ON h.course_id = c.id
WHERE c.id IN ('summit_green_valley_cm','north_hill_cm','highlands_cm','alpine_cm')
GROUP BY c.id, c.name
ORDER BY c.id;
