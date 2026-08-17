-- Phoenix Gold — full four-tee card load for Mountain + Lake nines (2026-08-17).
-- Source of every number: Pete's PHYSICAL CARD PHOTOS from 2026-07-02
-- (~/.claude/channels/telegram/inbox/1782970677626-*.jpg = Mountain,
--  1782970683294-*.jpg = Lake). Card = authority (Pete 2026-07-28); every tee row
-- sums exactly to the card's printed OUT total, so the transcription is self-checked:
--   Mountain OUT: blue 3507, white 3226, yellow 2882, red 2557
--   Lake     OUT: blue 3225, white 2991, yellow 2733, red 2418
-- Ocean has NO card photo yet — deliberately untouched (white-only; v926 client
-- falls back to the white card for other tees until an Ocean card photo arrives).
-- Par + stroke_index are NOT touched by the INSERT — copied from the existing
-- card-verified white rows (per-nine SI ranks, interleaved at load time).

BEGIN;

-- 1) White yardage corrections to the card (old values were January website data)
UPDATE course_holes ch SET yardage = v.y
FROM (VALUES
  ('phoenix_mountain',1,362),('phoenix_mountain',2,520),('phoenix_mountain',3,414),
  ('phoenix_mountain',4,177),('phoenix_mountain',5,331),('phoenix_mountain',6,392),
  ('phoenix_mountain',7,474),('phoenix_mountain',8,173),('phoenix_mountain',9,383),
  ('phoenix_lake',1,329),('phoenix_lake',2,155),('phoenix_lake',3,313),
  ('phoenix_lake',4,379),('phoenix_lake',5,310),('phoenix_lake',6,518),
  ('phoenix_lake',7,160),('phoenix_lake',8,348),('phoenix_lake',9,479)
) AS v(cid,h,y)
WHERE ch.course_id = v.cid AND ch.hole_number = v.h AND ch.tee_marker = 'white';

-- 2) Seed blue/yellow/red rows; par + stroke_index copied from the white rows
INSERT INTO course_holes (id, course_id, hole_number, tee_marker, par, stroke_index, yardage)
SELECT gen_random_uuid(), w.course_id, w.hole_number, v.tee, w.par, w.stroke_index, v.y
FROM course_holes w
JOIN (VALUES
  ('phoenix_mountain',1,'blue',410),('phoenix_mountain',2,'blue',562),('phoenix_mountain',3,'blue',448),
  ('phoenix_mountain',4,'blue',200),('phoenix_mountain',5,'blue',355),('phoenix_mountain',6,'blue',422),
  ('phoenix_mountain',7,'blue',508),('phoenix_mountain',8,'blue',200),('phoenix_mountain',9,'blue',402),
  ('phoenix_mountain',1,'yellow',320),('phoenix_mountain',2,'yellow',478),('phoenix_mountain',3,'yellow',351),
  ('phoenix_mountain',4,'yellow',149),('phoenix_mountain',5,'yellow',294),('phoenix_mountain',6,'yellow',372),
  ('phoenix_mountain',7,'yellow',444),('phoenix_mountain',8,'yellow',142),('phoenix_mountain',9,'yellow',332),
  ('phoenix_mountain',1,'red',287),('phoenix_mountain',2,'red',433),('phoenix_mountain',3,'red',341),
  ('phoenix_mountain',4,'red',106),('phoenix_mountain',5,'red',256),('phoenix_mountain',6,'red',321),
  ('phoenix_mountain',7,'red',423),('phoenix_mountain',8,'red',107),('phoenix_mountain',9,'red',283),
  ('phoenix_lake',1,'blue',360),('phoenix_lake',2,'blue',172),('phoenix_lake',3,'blue',358),
  ('phoenix_lake',4,'blue',413),('phoenix_lake',5,'blue',339),('phoenix_lake',6,'blue',531),
  ('phoenix_lake',7,'blue',170),('phoenix_lake',8,'blue',375),('phoenix_lake',9,'blue',507),
  ('phoenix_lake',1,'yellow',301),('phoenix_lake',2,'yellow',153),('phoenix_lake',3,'yellow',291),
  ('phoenix_lake',4,'yellow',333),('phoenix_lake',5,'yellow',288),('phoenix_lake',6,'yellow',483),
  ('phoenix_lake',7,'yellow',134),('phoenix_lake',8,'yellow',317),('phoenix_lake',9,'yellow',433),
  ('phoenix_lake',1,'red',265),('phoenix_lake',2,'red',134),('phoenix_lake',3,'red',236),
  ('phoenix_lake',4,'red',286),('phoenix_lake',5,'red',262),('phoenix_lake',6,'red',452),
  ('phoenix_lake',7,'red',104),('phoenix_lake',8,'red',286),('phoenix_lake',9,'red',393)
) AS v(cid,h,tee,y)
  ON w.course_id = v.cid AND w.hole_number = v.h AND w.tee_marker = 'white'
WHERE NOT EXISTS (
  SELECT 1 FROM course_holes x
  WHERE x.course_id = v.cid AND x.hole_number = v.h AND x.tee_marker = v.tee
);

COMMIT;
