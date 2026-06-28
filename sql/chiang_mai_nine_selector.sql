-- =====================================================================
-- Chiang Mai 27-hole resorts → proper nine-SELECTOR model (like Greenwood/
-- Khao Kheow): store each nine individually (per-nine SI 1-9); the app's
-- engine interleaves them into an 18-hole SI based on the chosen front/back.
-- Replaces the earlier pre-merged combo rows.
-- =====================================================================

-- 1) remove pre-merged combos + the parent's own 18-hole holes (picker builds it)
DELETE FROM course_holes WHERE course_id IN
  ('highlands_bc','highlands_ca','alpine_ab','alpine_bc','highlands_cm','alpine_cm');
DELETE FROM courses WHERE id IN ('highlands_bc','highlands_ca','alpine_ab','alpine_bc');

-- 2) individual nines as their own course rows
INSERT INTO courses (id, name, location, country, total_holes, par) VALUES
  ('highlands_valley','Highlands — Valley nine (Chiang Mai)','Chiang Mai','Thailand',9,36),
  ('highlands_highlands','Highlands — Highlands nine (Chiang Mai)','Chiang Mai','Thailand',9,36),
  ('highlands_mountain','Highlands — Mountain nine (Chiang Mai)','Chiang Mai','Thailand',9,36),
  ('alpine_a','Alpine — Course A nine (Chiang Mai)','Chiang Mai','Thailand',9,36),
  ('alpine_b','Alpine — Course B nine (Chiang Mai)','Chiang Mai','Thailand',9,36),
  ('alpine_c','Alpine — Course C nine (Chiang Mai)','Chiang Mai','Thailand',9,36)
ON CONFLICT (id) DO NOTHING;

-- per-nine stroke index is 1-9 (engine remaps to 1-18 on combination)
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 -- Highlands: Valley (A)
 ('highlands_valley',1,'white',4,7,343),('highlands_valley',2,'white',3,6,154),('highlands_valley',3,'white',5,5,528),
 ('highlands_valley',4,'white',4,3,328),('highlands_valley',5,'white',4,1,405),('highlands_valley',6,'white',5,9,497),
 ('highlands_valley',7,'white',3,8,127),('highlands_valley',8,'white',4,2,360),('highlands_valley',9,'white',4,4,366),
 -- Highlands: Highlands (B)
 ('highlands_highlands',1,'white',4,3,367),('highlands_highlands',2,'white',4,7,315),('highlands_highlands',3,'white',4,1,418),
 ('highlands_highlands',4,'white',4,9,364),('highlands_highlands',5,'white',3,6,170),('highlands_highlands',6,'white',5,5,494),
 ('highlands_highlands',7,'white',4,2,407),('highlands_highlands',8,'white',3,8,132),('highlands_highlands',9,'white',5,4,512),
 -- Highlands: Mountain (C)
 ('highlands_mountain',1,'white',5,3,485),('highlands_mountain',2,'white',3,9,106),('highlands_mountain',3,'white',4,5,361),
 ('highlands_mountain',4,'white',4,6,337),('highlands_mountain',5,'white',4,2,407),('highlands_mountain',6,'white',4,4,308),
 ('highlands_mountain',7,'white',4,1,299),('highlands_mountain',8,'white',3,8,166),('highlands_mountain',9,'white',5,7,494),
 -- Alpine: Course A
 ('alpine_a',1,'white',4,5,410),('alpine_a',2,'white',4,8,356),('alpine_a',3,'white',3,2,165),
 ('alpine_a',4,'white',5,4,582),('alpine_a',5,'white',4,1,422),('alpine_a',6,'white',4,7,376),
 ('alpine_a',7,'white',5,9,530),('alpine_a',8,'white',3,6,135),('alpine_a',9,'white',4,3,400),
 -- Alpine: Course B
 ('alpine_b',1,'white',4,7,326),('alpine_b',2,'white',4,1,405),('alpine_b',3,'white',3,5,160),
 ('alpine_b',4,'white',4,6,360),('alpine_b',5,'white',5,9,508),('alpine_b',6,'white',4,3,369),
 ('alpine_b',7,'white',3,8,132),('alpine_b',8,'white',4,4,354),('alpine_b',9,'white',5,2,496),
 -- Alpine: Course C
 ('alpine_c',1,'white',5,2,578),('alpine_c',2,'white',4,4,336),('alpine_c',3,'white',4,1,420),
 ('alpine_c',4,'white',3,8,163),('alpine_c',5,'white',4,3,364),('alpine_c',6,'white',3,5,129),
 ('alpine_c',7,'white',4,6,400),('alpine_c',8,'white',4,9,380),('alpine_c',9,'white',5,7,524);

-- 3) revert R3/R4 event course_name to the generic parent names (trigger-safe)
BEGIN;
ALTER TABLE public.society_events DISABLE TRIGGER trigger_event_update_notification;
UPDATE public.society_events SET course_name='Highlands Golf & Spa Resort (Chiang Mai)'
  WHERE title LIKE 'TRGG - Chiang Mai Classic 2026 — R3%';
UPDATE public.society_events SET course_name='Alpine Golf Club & Resort (Chiang Mai)'
  WHERE title LIKE 'TRGG - Chiang Mai Classic 2026 — R4%';
ALTER TABLE public.society_events ENABLE TRIGGER trigger_event_update_notification;
COMMIT;

-- verify
SELECT course_id, count(*) AS holes, sum(par) AS par, count(DISTINCT stroke_index) AS si, max(stroke_index) AS si_max
FROM course_holes WHERE course_id IN
 ('highlands_valley','highlands_highlands','highlands_mountain','alpine_a','alpine_b','alpine_c')
GROUP BY course_id ORDER BY course_id;
