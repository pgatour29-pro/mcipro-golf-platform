-- LIVE-OPS 2026-08-18: Burapha West (C+D) card corrections, mid-round.
-- Source of truth: Pete's card photos (Telegram 7028/7029) — West Course, Crystal Spring (C) + Dunes (D).
-- Live round in progress: group_1787023325828 (Pete/Patrik/Jason/Justin), scorecards.course_id='burapha'.
--
-- 1) burapha_west yardage typos (par/SI verified correct vs card)
UPDATE course_holes SET yardage=200 WHERE course_id='burapha_west' AND tee_marker='black' AND hole_number=8;
UPDATE course_holes SET yardage=420 WHERE course_id='burapha_west' AND tee_marker='black' AND hole_number=9;
UPDATE course_holes SET yardage=413 WHERE course_id='burapha_west' AND tee_marker='blue' AND hole_number=12;
UPDATE course_holes SET yardage=206 WHERE course_id='burapha_west' AND tee_marker='blue' AND hole_number=17;

-- 2) TEMPORARY: course_holes 'burapha' := West C+D card, because the live combo round's
--    resume path (refreshCourseDataFromDB) patches from courseData.id='burapha'.
--    RESTORE AFTER THE ROUND from burapha_east (verified identical to pre-change 'burapha'
--    2026-08-18; snapshot also in scratchpad burapha_generic_snapshot_2026-08-18.json).
UPDATE course_holes b SET par=w.par, stroke_index=w.stroke_index, yardage=w.yardage
FROM course_holes w
WHERE b.course_id='burapha' AND w.course_id='burapha_west'
  AND w.hole_number=b.hole_number AND w.tee_marker=b.tee_marker;

-- 3) nine_hole C (Crystal Spring): hcp wrong on 5 holes; yardages drifted from card.
--    Card SI: 4 8 2 14 18 12 10 16 6 (evens — interleave passes through unchanged).
UPDATE nine_hole nh SET hcp=v.hcp, blue=v.blue, white=v.white, red=v.red
FROM (VALUES
  (1,4,431,406,355),(2,8,516,497,447),(3,2,438,410,365),(4,14,328,295,234),(5,18,132,129,100),
  (6,12,360,335,275),(7,10,499,478,457),(8,16,177,153,116),(9,6,373,357,307)
) AS v(hole,hcp,blue,white,red)
WHERE nh.course_nine_id = (SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='C')
  AND nh.hole = v.hole;

-- 4) nine_hole D (Dunes): par+hcp correct; yardages to card.
UPDATE nine_hole nh SET blue=v.blue, white=v.white, red=v.red
FROM (VALUES
  (1,495,472,438),(2,169,136,114),(3,413,377,346),(4,423,391,358),(5,513,495,449),
  (6,403,375,317),(7,275,252,210),(8,206,181,158),(9,490,470,445)
) AS v(hole,blue,white,red)
WHERE nh.course_nine_id = (SELECT id FROM course_nine WHERE course_name='Burapha Golf Club' AND nine_name='D')
  AND nh.hole = v.hole;

-- 5) Jason Gamble walk-on: handicap fat-fingered 137.0 (8 strokes on hole 1).
--    Correcting to 13.7 / playing 14. resume's refreshHandicapsFromDB re-pulls this row.
UPDATE scorecards SET handicap='13.7', playing_handicap=14
WHERE id='c409caa6-61d6-45e1-ac30-f24bffa86470';

-- 6) Hole-1 score rows: SI snapshot 2 -> card C1 SI 4 (par 4 was already right).
UPDATE scores SET stroke_index=4
WHERE hole_number=1 AND scorecard_id IN (
  'a763d4b5-3b6c-4b6b-87e6-eb490dfc240e','d7ed4dc0-71db-44dd-b7e8-517e45f89633',
  'c409caa6-61d6-45e1-ac30-f24bffa86470','a657bbb1-f9ab-4854-b3e3-b8964663eeae');
-- Jason with hcp 14 on SI 4: 1 stroke, gross 5 -> net 4 = par -> 2 stableford pts.
-- (Pete 1 / Justin 8 / Patrik -1: strokes unchanged by SI 2->4.)
UPDATE scores SET handicap_strokes=1, net_score=4, stableford_points=2
WHERE hole_number=1 AND scorecard_id='c409caa6-61d6-45e1-ac30-f24bffa86470';
