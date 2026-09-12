-- =====================================================================================
-- CARRY THE STITCHED 18-HOLE TABLE ON THE CARD  (2026-09-12)
-- =====================================================================================
-- Greenwood incident. A phone joining or taking over a live round rebuilt the course from
-- `scorecards.course_id`, which for a COMBO is the BASE slug ('greenwood'). The holes do not
-- live there — they live in greenwood_a / greenwood_b — so the load returned nothing, the
-- joiner fell back to an empty hole table, and an empty table silently becomes par 4 with
-- SI = hole number. Alondo's hole 4 went in as par 4 / SI 4 instead of par 5 / SI 5 the
-- moment he took his own card.
--
-- Re-deriving the combo on the joiner is not safe: the nine -> course_holes id mapping differs
-- per venue (Laem Chabang maps Mountain/Lake/Valley -> a/b/c, Khao Kheow has b_with_a and
-- b_with_c variants), and laem_chabang_ab/ac/bc carry NO course_holes rows at all, so no
-- amount of resolution would find them.
--
-- So the HOST, which already holds the correct stitched + SI-interleaved 18 holes, writes that
-- table onto the card. Any device that joins reads the exact table the round is being scored
-- on. Venue-agnostic, no parsing, and it works for venues with no hole rows in the DB.
-- Affects all 15 combo venues: khao_kheow, plutaluang, burapha, greenwood, highlands_cm,
-- alpine_cm, phoenix, laem_chabang, siam_plantation, pattana, black_mountain_hh,
-- springfield_hh, majestic_hh, lakeview_hh.
-- =====================================================================================

alter table public.scorecards
  add column if not exists course_holes jsonb;

comment on column public.scorecards.course_holes is
  'The stitched 18-hole par/SI/yardage table this round is scored on, written by the device that started it. A joining device MUST prefer this over re-deriving from course_id — for a combo, course_id is the BASE slug and has no course_holes rows.';
