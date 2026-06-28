-- =====================================================================
-- Chiang Mai Classic — additional nine-combinations for the 27-hole resorts
-- so organizers/players can pick the nines being played manually.
-- Existing: highlands_cm = Valley(A)+Highlands(B); alpine_cm = Course A+C.
-- Adds (white tee, par 72 each):
--   highlands_bc = Highlands(B)+Mountain(C)   — REAL official merged SI
--   highlands_ca = Mountain(C)+Valley(A)      — REAL official merged SI
--   alpine_ab    = Course A + Course B        — DERIVED merged SI (verify)
--   alpine_bc    = Course B + Course C        — DERIVED merged SI (verify)
-- Together each resort now offers all three nines in natural pairings.
-- Idempotent.
-- =====================================================================

DELETE FROM course_holes WHERE course_id IN ('highlands_bc','highlands_ca','alpine_ab','alpine_bc');
DELETE FROM courses WHERE id IN ('highlands_bc','highlands_ca','alpine_ab','alpine_bc');

INSERT INTO courses (id, name, location, country, total_holes, par) VALUES
  ('highlands_bc','Highlands — Highlands + Mountain (B+C) (Chiang Mai)','Chiang Mai','Thailand',18,72),
  ('highlands_ca','Highlands — Mountain + Valley (C+A) (Chiang Mai)','Chiang Mai','Thailand',18,72),
  ('alpine_ab','Alpine — Course A + B (Chiang Mai)','Chiang Mai','Thailand',18,72),
  ('alpine_bc','Alpine — Course B + C (Chiang Mai)','Chiang Mai','Thailand',18,72);

-- ---- highlands_bc = Highlands(B) front + Mountain(C) back ----
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('highlands_bc', 1,'white',4, 5,367),('highlands_bc', 2,'white',4,13,315),('highlands_bc', 3,'white',4, 1,418),
 ('highlands_bc', 4,'white',4,17,364),('highlands_bc', 5,'white',3,11,170),('highlands_bc', 6,'white',5, 9,494),
 ('highlands_bc', 7,'white',4, 3,407),('highlands_bc', 8,'white',3,15,132),('highlands_bc', 9,'white',5, 7,512),
 ('highlands_bc',10,'white',5, 6,485),('highlands_bc',11,'white',3,18,106),('highlands_bc',12,'white',4,10,361),
 ('highlands_bc',13,'white',4,12,337),('highlands_bc',14,'white',4, 4,407),('highlands_bc',15,'white',4, 8,308),
 ('highlands_bc',16,'white',4, 2,299),('highlands_bc',17,'white',3,16,166),('highlands_bc',18,'white',5,14,494);

-- ---- highlands_ca = Mountain(C) front + Valley(A) back ----
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('highlands_ca', 1,'white',5, 5,485),('highlands_ca', 2,'white',3,17,106),('highlands_ca', 3,'white',4, 9,361),
 ('highlands_ca', 4,'white',4,11,337),('highlands_ca', 5,'white',4, 3,407),('highlands_ca', 6,'white',4, 7,308),
 ('highlands_ca', 7,'white',4, 1,299),('highlands_ca', 8,'white',3,15,166),('highlands_ca', 9,'white',5,13,494),
 ('highlands_ca',10,'white',4,14,343),('highlands_ca',11,'white',3,12,154),('highlands_ca',12,'white',5,10,528),
 ('highlands_ca',13,'white',4, 6,328),('highlands_ca',14,'white',4, 2,405),('highlands_ca',15,'white',5,18,497),
 ('highlands_ca',16,'white',3,16,127),('highlands_ca',17,'white',4, 4,360),('highlands_ca',18,'white',4, 8,366);

-- ---- alpine_ab = Course A front + Course B back (SI DERIVED) ----
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('alpine_ab', 1,'white',4, 9,410),('alpine_ab', 2,'white',4,15,356),('alpine_ab', 3,'white',3, 3,165),
 ('alpine_ab', 4,'white',5, 7,582),('alpine_ab', 5,'white',4, 1,422),('alpine_ab', 6,'white',4,13,376),
 ('alpine_ab', 7,'white',5,17,530),('alpine_ab', 8,'white',3,11,135),('alpine_ab', 9,'white',4, 5,400),
 ('alpine_ab',10,'white',4,14,326),('alpine_ab',11,'white',4, 2,405),('alpine_ab',12,'white',3,10,160),
 ('alpine_ab',13,'white',4,12,360),('alpine_ab',14,'white',5,18,508),('alpine_ab',15,'white',4, 6,369),
 ('alpine_ab',16,'white',3,16,132),('alpine_ab',17,'white',4, 8,354),('alpine_ab',18,'white',5, 4,496);

-- ---- alpine_bc = Course B front + Course C back (SI DERIVED) ----
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 ('alpine_bc', 1,'white',4,13,326),('alpine_bc', 2,'white',4, 1,405),('alpine_bc', 3,'white',3, 9,160),
 ('alpine_bc', 4,'white',4,11,360),('alpine_bc', 5,'white',5,17,508),('alpine_bc', 6,'white',4, 5,369),
 ('alpine_bc', 7,'white',3,15,132),('alpine_bc', 8,'white',4, 7,354),('alpine_bc', 9,'white',5, 3,496),
 ('alpine_bc',10,'white',5, 4,578),('alpine_bc',11,'white',4, 8,336),('alpine_bc',12,'white',4, 2,420),
 ('alpine_bc',13,'white',3,16,163),('alpine_bc',14,'white',4, 6,364),('alpine_bc',15,'white',3,10,129),
 ('alpine_bc',16,'white',4,12,400),('alpine_bc',17,'white',4,18,380),('alpine_bc',18,'white',5,14,524);

-- ---- verify: 18 holes, par 72, 18 distinct SI each ----
SELECT c.id, count(h.*) AS holes, sum(h.par) AS par, count(DISTINCT h.stroke_index) AS distinct_si
FROM courses c JOIN course_holes h ON h.course_id=c.id
WHERE c.id IN ('highlands_bc','highlands_ca','alpine_ab','alpine_bc')
GROUP BY c.id ORDER BY c.id;
