-- =====================================================================
-- Hua Hin course stable — 8 facilities for TRGG trips (King of the Mountain
-- Sep 2026 + future). Mirrors sql/chiang_mai_classic_courses.sql +
-- sql/chiang_mai_nine_selector.sql conventions:
--   * 18-hole courses: one courses row (18,72) + 18 white-tee holes, SI 1-18
--   * multi-nine facilities: parent courses row (18,72, display name = the
--     scoring dropdown string) with NO holes of its own; each nine gets its
--     own courses row (9,36) + 9 white-tee holes with per-nine SI 1-9 —
--     the engine (interleaveStrokeIndices) builds the 1-18 on combination.
-- Source: huahingolfcourse.com scorecards (EN+JP editions), 2026-07-28.
-- Springfield nine names from the JP edition (Mountain/Lake/Valley — the
-- EN page's East/North/West labels are wrong).
-- Two source-site SI typos corrected (duplicate 4 in an even set):
--   * Springfield Valley hole 5 → SI 18 (site prints 4 twice, 18 missing)
--   * Majestic Waterfall hole 3 → SI 6 (site prints 4 twice, 6 missing)
-- Sea Pines "white" = its Exclusive tee; Lake View "white" = Regulation.
-- Idempotent: deletes-then-inserts only these ids.
-- =====================================================================

DELETE FROM course_holes WHERE course_id IN (
  'pineapple_valley_hh','palm_hills_hh','royal_huahin_hh','sea_pines_hh',
  'black_mountain_hh','black_mountain_east','black_mountain_north','black_mountain_west',
  'springfield_hh','springfield_mountain','springfield_lake','springfield_valley',
  'majestic_hh','majestic_creek','majestic_lake','majestic_waterfall',
  'lakeview_hh','lakeview_mountain','lakeview_lake','lakeview_desert','lakeview_links');
DELETE FROM courses WHERE id IN (
  'pineapple_valley_hh','palm_hills_hh','royal_huahin_hh','sea_pines_hh',
  'black_mountain_hh','black_mountain_east','black_mountain_north','black_mountain_west',
  'springfield_hh','springfield_mountain','springfield_lake','springfield_valley',
  'majestic_hh','majestic_creek','majestic_lake','majestic_waterfall',
  'lakeview_hh','lakeview_mountain','lakeview_lake','lakeview_desert','lakeview_links');

INSERT INTO courses (id, name, location, country, total_holes, par) VALUES
  -- 18-hole courses
  ('pineapple_valley_hh','Pineapple Valley Golf Club (Hua Hin)','Hua Hin','Thailand',18,72),
  ('palm_hills_hh','Palm Hills Golf Resort & Country Club (Hua Hin)','Hua Hin','Thailand',18,72),
  ('royal_huahin_hh','Royal Hua Hin Golf Course','Hua Hin','Thailand',18,72),
  ('sea_pines_hh','Sea Pines Golf Course (Hua Hin)','Hua Hin','Thailand',18,72),
  -- multi-nine parents (dropdown entries; holes come from the nine picker)
  ('black_mountain_hh','Black Mountain Golf Club (Hua Hin)','Hua Hin','Thailand',18,72),
  ('springfield_hh','Springfield Royal Country Club (Hua Hin)','Hua Hin','Thailand',18,72),
  ('majestic_hh','Majestic Creek Golf Club (Hua Hin)','Hua Hin','Thailand',18,72),
  ('lakeview_hh','Lake View Resort and Golf Club (Hua Hin)','Hua Hin','Thailand',18,72),
  -- Black Mountain nines
  ('black_mountain_east','Black Mountain — East nine (Hua Hin)','Hua Hin','Thailand',9,36),
  ('black_mountain_north','Black Mountain — North nine (Hua Hin)','Hua Hin','Thailand',9,36),
  ('black_mountain_west','Black Mountain — West nine (Hua Hin)','Hua Hin','Thailand',9,36),
  -- Springfield nines (JP-edition names: A Mountain / B Lake / C Valley)
  ('springfield_mountain','Springfield — Mountain nine (Hua Hin)','Hua Hin','Thailand',9,36),
  ('springfield_lake','Springfield — Lake nine (Hua Hin)','Hua Hin','Thailand',9,36),
  ('springfield_valley','Springfield — Valley nine (Hua Hin)','Hua Hin','Thailand',9,36),
  -- Majestic Creek nines
  ('majestic_creek','Majestic — Creek nine (Hua Hin)','Hua Hin','Thailand',9,36),
  ('majestic_lake','Majestic — Lake nine (Hua Hin)','Hua Hin','Thailand',9,36),
  ('majestic_waterfall','Majestic — Waterfall nine (Hua Hin)','Hua Hin','Thailand',9,36),
  -- Lake View nines (four!)
  ('lakeview_mountain','Lake View — Mountain nine (Hua Hin)','Hua Hin','Thailand',9,36),
  ('lakeview_lake','Lake View — Lake nine (Hua Hin)','Hua Hin','Thailand',9,36),
  ('lakeview_desert','Lake View — Desert nine (Hua Hin)','Hua Hin','Thailand',9,36),
  ('lakeview_links','Lake View — Link Style nine (Hua Hin)','Hua Hin','Thailand',9,36);

INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
 -- ---------- Pineapple Valley (white, par 72, 6,286) ----------
 ('pineapple_valley_hh',1,'white',4,5,377),('pineapple_valley_hh',2,'white',3,17,128),('pineapple_valley_hh',3,'white',5,11,479),
 ('pineapple_valley_hh',4,'white',3,13,179),('pineapple_valley_hh',5,'white',4,15,320),('pineapple_valley_hh',6,'white',4,3,342),
 ('pineapple_valley_hh',7,'white',4,1,414),('pineapple_valley_hh',8,'white',5,9,480),('pineapple_valley_hh',9,'white',4,7,394),
 ('pineapple_valley_hh',10,'white',4,2,378),('pineapple_valley_hh',11,'white',5,8,517),('pineapple_valley_hh',12,'white',5,14,555),
 ('pineapple_valley_hh',13,'white',4,12,338),('pineapple_valley_hh',14,'white',4,16,299),('pineapple_valley_hh',15,'white',3,18,136),
 ('pineapple_valley_hh',16,'white',4,6,369),('pineapple_valley_hh',17,'white',3,10,171),('pineapple_valley_hh',18,'white',4,4,410),
 -- ---------- Palm Hills (white, par 72, 6,034) ----------
 ('palm_hills_hh',1,'white',4,9,341),('palm_hills_hh',2,'white',5,13,435),('palm_hills_hh',3,'white',3,3,159),
 ('palm_hills_hh',4,'white',4,7,356),('palm_hills_hh',5,'white',4,5,316),('palm_hills_hh',6,'white',4,11,335),
 ('palm_hills_hh',7,'white',5,17,483),('palm_hills_hh',8,'white',3,15,128),('palm_hills_hh',9,'white',4,1,357),
 ('palm_hills_hh',10,'white',4,2,378),('palm_hills_hh',11,'white',3,16,139),('palm_hills_hh',12,'white',5,4,508),
 ('palm_hills_hh',13,'white',4,14,353),('palm_hills_hh',14,'white',4,10,321),('palm_hills_hh',15,'white',3,18,151),
 ('palm_hills_hh',16,'white',5,12,528),('palm_hills_hh',17,'white',4,8,371),('palm_hills_hh',18,'white',4,6,375),
 -- ---------- Royal Hua Hin (white, par 72, 6,678) ----------
 ('royal_huahin_hh',1,'white',5,6,569),('royal_huahin_hh',2,'white',4,4,384),('royal_huahin_hh',3,'white',5,2,535),
 ('royal_huahin_hh',4,'white',3,16,155),('royal_huahin_hh',5,'white',3,18,131),('royal_huahin_hh',6,'white',4,8,444),
 ('royal_huahin_hh',7,'white',4,10,385),('royal_huahin_hh',8,'white',4,14,332),('royal_huahin_hh',9,'white',4,12,397),
 ('royal_huahin_hh',10,'white',4,11,356),('royal_huahin_hh',11,'white',5,5,565),('royal_huahin_hh',12,'white',4,15,305),
 ('royal_huahin_hh',13,'white',4,7,356),('royal_huahin_hh',14,'white',3,17,149),('royal_huahin_hh',15,'white',5,9,564),
 ('royal_huahin_hh',16,'white',3,13,198),('royal_huahin_hh',17,'white',4,1,413),('royal_huahin_hh',18,'white',4,3,440),
 -- ---------- Sea Pines (white = Exclusive tee, par 72, 6,350) ----------
 ('sea_pines_hh',1,'white',4,17,306),('sea_pines_hh',2,'white',4,9,329),('sea_pines_hh',3,'white',5,1,508),
 ('sea_pines_hh',4,'white',4,7,400),('sea_pines_hh',5,'white',3,11,177),('sea_pines_hh',6,'white',4,15,321),
 ('sea_pines_hh',7,'white',5,3,540),('sea_pines_hh',8,'white',3,13,171),('sea_pines_hh',9,'white',4,5,318),
 ('sea_pines_hh',10,'white',4,16,377),('sea_pines_hh',11,'white',4,8,381),('sea_pines_hh',12,'white',5,12,536),
 ('sea_pines_hh',13,'white',3,14,195),('sea_pines_hh',14,'white',4,2,414),('sea_pines_hh',15,'white',4,4,369),
 ('sea_pines_hh',16,'white',5,10,529),('sea_pines_hh',17,'white',3,18,146),('sea_pines_hh',18,'white',4,6,333),
 -- ---------- Black Mountain: East nine (white 3,271; official SI odd set → rank 1-9) ----------
 ('black_mountain_east',1,'white',4,4,390),('black_mountain_east',2,'white',5,7,482),('black_mountain_east',3,'white',3,8,154),
 ('black_mountain_east',4,'white',4,6,346),('black_mountain_east',5,'white',4,1,361),('black_mountain_east',6,'white',5,5,566),
 ('black_mountain_east',7,'white',4,3,408),('black_mountain_east',8,'white',3,9,158),('black_mountain_east',9,'white',4,2,406),
 -- ---------- Black Mountain: North nine (white 3,059; official even set → rank 1-9) ----------
 ('black_mountain_north',1,'white',4,3,360),('black_mountain_north',2,'white',3,5,142),('black_mountain_north',3,'white',4,1,395),
 ('black_mountain_north',4,'white',5,4,522),('black_mountain_north',5,'white',3,7,159),('black_mountain_north',6,'white',4,2,328),
 ('black_mountain_north',7,'white',4,9,341),('black_mountain_north',8,'white',4,8,316),('black_mountain_north',9,'white',5,6,496),
 -- ---------- Black Mountain: West nine (white 3,169; official even set → rank 1-9) ----------
 ('black_mountain_west',1,'white',4,6,330),('black_mountain_west',2,'white',3,8,171),('black_mountain_west',3,'white',4,5,353),
 ('black_mountain_west',4,'white',4,2,399),('black_mountain_west',5,'white',3,9,135),('black_mountain_west',6,'white',5,3,494),
 ('black_mountain_west',7,'white',4,1,385),('black_mountain_west',8,'white',4,7,327),('black_mountain_west',9,'white',5,4,575),
 -- ---------- Springfield: Mountain nine (A) (white 3,121) ----------
 ('springfield_mountain',1,'white',4,8,325),('springfield_mountain',2,'white',5,2,483),('springfield_mountain',3,'white',4,1,407),
 ('springfield_mountain',4,'white',3,5,168),('springfield_mountain',5,'white',4,3,381),('springfield_mountain',6,'white',3,9,133),
 ('springfield_mountain',7,'white',5,6,481),('springfield_mountain',8,'white',4,7,347),('springfield_mountain',9,'white',4,4,396),
 -- ---------- Springfield: Lake nine (B) (white 3,164) ----------
 ('springfield_lake',1,'white',4,4,367),('springfield_lake',2,'white',4,6,354),('springfield_lake',3,'white',5,8,476),
 ('springfield_lake',4,'white',4,1,386),('springfield_lake',5,'white',3,9,150),('springfield_lake',6,'white',4,2,423),
 ('springfield_lake',7,'white',4,3,362),('springfield_lake',8,'white',3,5,173),('springfield_lake',9,'white',5,7,473),
 -- ---------- Springfield: Valley nine (C) (white 3,251; site SI typo fixed at hole 5) ----------
 ('springfield_valley',1,'white',4,2,423),('springfield_valley',2,'white',5,6,500),('springfield_valley',3,'white',4,3,385),
 ('springfield_valley',4,'white',3,8,143),('springfield_valley',5,'white',5,9,479),('springfield_valley',6,'white',4,1,421),
 ('springfield_valley',7,'white',3,5,153),('springfield_valley',8,'white',4,4,361),('springfield_valley',9,'white',4,7,386),
 -- ---------- Majestic Creek: Creek nine (A) (white 3,358) ----------
 ('majestic_creek',1,'white',4,4,399),('majestic_creek',2,'white',4,7,359),('majestic_creek',3,'white',4,6,360),
 ('majestic_creek',4,'white',3,8,172),('majestic_creek',5,'white',5,3,523),('majestic_creek',6,'white',3,9,147),
 ('majestic_creek',7,'white',4,5,372),('majestic_creek',8,'white',4,1,434),('majestic_creek',9,'white',5,2,592),
 -- ---------- Majestic Creek: Lake nine (B) (white 3,446) ----------
 ('majestic_lake',1,'white',4,8,373),('majestic_lake',2,'white',4,6,381),('majestic_lake',3,'white',3,7,207),
 ('majestic_lake',4,'white',5,4,549),('majestic_lake',5,'white',4,5,351),('majestic_lake',6,'white',4,3,430),
 ('majestic_lake',7,'white',4,2,428),('majestic_lake',8,'white',3,9,147),('majestic_lake',9,'white',5,1,580),
 -- ---------- Majestic Creek: Waterfall nine (C) (white 3,304; site SI typo fixed at hole 3) ----------
 ('majestic_waterfall',1,'white',4,2,438),('majestic_waterfall',2,'white',3,9,157),('majestic_waterfall',3,'white',5,3,519),
 ('majestic_waterfall',4,'white',4,1,426),('majestic_waterfall',5,'white',3,8,172),('majestic_waterfall',6,'white',4,5,384),
 ('majestic_waterfall',7,'white',5,7,490),('majestic_waterfall',8,'white',4,4,354),('majestic_waterfall',9,'white',4,6,364),
 -- ---------- Lake View: Mountain nine (A) (white = Regulation 3,099; Men's HCP) ----------
 ('lakeview_mountain',1,'white',4,6,368),('lakeview_mountain',2,'white',5,4,514),('lakeview_mountain',3,'white',4,1,392),
 ('lakeview_mountain',4,'white',3,7,168),('lakeview_mountain',5,'white',5,5,465),('lakeview_mountain',6,'white',4,3,355),
 ('lakeview_mountain',7,'white',4,9,300),('lakeview_mountain',8,'white',3,8,144),('lakeview_mountain',9,'white',4,2,393),
 -- ---------- Lake View: Lake nine (B) (white 3,096) ----------
 ('lakeview_lake',1,'white',4,2,381),('lakeview_lake',2,'white',4,8,355),('lakeview_lake',3,'white',5,7,420),
 ('lakeview_lake',4,'white',4,3,380),('lakeview_lake',5,'white',3,5,173),('lakeview_lake',6,'white',5,6,509),
 ('lakeview_lake',7,'white',4,4,352),('lakeview_lake',8,'white',3,9,138),('lakeview_lake',9,'white',4,1,388),
 -- ---------- Lake View: Desert nine (C) (white 3,052) ----------
 ('lakeview_desert',1,'white',4,4,365),('lakeview_desert',2,'white',5,8,448),('lakeview_desert',3,'white',3,9,135),
 ('lakeview_desert',4,'white',4,5,360),('lakeview_desert',5,'white',4,7,343),('lakeview_desert',6,'white',4,1,425),
 ('lakeview_desert',7,'white',3,6,146),('lakeview_desert',8,'white',5,3,470),('lakeview_desert',9,'white',4,2,360),
 -- ---------- Lake View: Link Style nine (D) (white 3,355) ----------
 ('lakeview_links',1,'white',4,7,314),('lakeview_links',2,'white',4,5,357),('lakeview_links',3,'white',3,8,206),
 ('lakeview_links',4,'white',4,3,418),('lakeview_links',5,'white',4,6,364),('lakeview_links',6,'white',5,2,542),
 ('lakeview_links',7,'white',3,9,166),('lakeview_links',8,'white',5,1,559),('lakeview_links',9,'white',4,4,429);

-- verify: every 18-holer sums par 72 w/ SI 1-18 distinct; every nine sums 36 w/ SI 1-9
SELECT course_id, count(*) AS holes, sum(par) AS par,
       count(DISTINCT stroke_index) AS si_distinct, min(stroke_index) AS si_min, max(stroke_index) AS si_max,
       sum(yardage) AS yards
FROM course_holes WHERE course_id LIKE '%_hh' OR course_id LIKE 'black_mountain_%'
   OR course_id LIKE 'springfield_%' OR course_id LIKE 'majestic_%' OR course_id LIKE 'lakeview_%'
GROUP BY course_id ORDER BY course_id;
