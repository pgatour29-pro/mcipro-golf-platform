-- =====================================================
-- RAYONG GREEN VALLEY COUNTRY CLUB - Course Data Insert
-- For MyCaddiPro Supabase Database
-- =====================================================

-- Insert Course
INSERT INTO golf_courses (
  id,
  name,
  name_th,
  slug,
  address,
  city,
  province,
  postal_code,
  country,
  phone,
  website,
  latitude,
  longitude,
  course_type,
  architect,
  year_built,
  holes,
  par,
  description,
  description_th,
  amenities,
  policies,
  green_fees,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Rayong Green Valley Country Club',
  'ระยอง กรีน วัลเลย์ คันทรี คลับ',
  'rayong-green-valley',
  '9/36 Moo7 Samnak Thon, Ban Chang',
  'Rayong',
  'Rayong',
  '21130',
  'Thailand',
  '+66 38 030 660',
  'https://greenvalleythailand.wixsite.com/standrews2000golf/rayong-green-valley',
  12.8037441697,
  101.0655543931,
  'resort',
  'Peter Thomson',
  1992,
  18,
  72,
  'Rayong Green Valley Country Club is part of the St Andrews 2000 family, designed by Peter Thomson to cater to players of all standards. Set among rolling hills near the Gulf of Thailand, this hilly course features natural rocky outcrops, boulders, and sloping fairways with strategically placed bunkers and two-tier greens.',
  'สนามกอล์ฟระยอง กรีน วัลเลย์ เป็นส่วนหนึ่งของกลุ่ม St Andrews 2000 ออกแบบโดย Peter Thomson เพื่อรองรับนักกอล์ฟทุกระดับ ตั้งอยู่ท่ามกลางเนินเขาใกล้อ่าวไทย',
  '{
    "driving_range": true,
    "putting_green": true,
    "golf_carts": true,
    "caddies": true,
    "club_rental": true,
    "shoe_rental": true,
    "pro_shop": true,
    "restaurant": true,
    "swimming_pool": true,
    "spa": false,
    "accommodation": true,
    "night_golf": false,
    "golf_lessons": true
  }'::jsonb,
  '{
    "dress_code": "standard",
    "metal_spikes_allowed": false,
    "fivesomes_allowed": true,
    "fivesomes_notes": "Except on Weekends & Holidays",
    "credit_cards_accepted": true
  }'::jsonb,
  '{
    "weekday": 1000,
    "weekend": 1200,
    "twilight": 800,
    "caddy_fee": 400,
    "cart_fee": 700,
    "currency": "THB"
  }'::jsonb,
  'active',
  NOW(),
  NOW()
)
RETURNING id;

-- Store the course_id for subsequent inserts
-- You may need to capture this ID and use it below

-- =====================================================
-- TEE BOX DATA
-- =====================================================

-- Get the course_id first, then insert tees
DO $$
DECLARE
  v_course_id UUID;
BEGIN
  SELECT id INTO v_course_id FROM golf_courses WHERE slug = 'rayong-green-valley' LIMIT 1;
  
  -- Insert Blue Tees
  INSERT INTO course_tees (id, course_id, tee_name, tee_color, gender, par, total_yards, total_meters, course_rating, slope_rating)
  VALUES (gen_random_uuid(), v_course_id, 'Blue', '#0066CC', 'M', 72, 6971, 6375, 73.1, 123);
  
  -- Insert White Tees
  INSERT INTO course_tees (id, course_id, tee_name, tee_color, gender, par, total_yards, total_meters, course_rating, slope_rating)
  VALUES (gen_random_uuid(), v_course_id, 'White', '#FFFFFF', 'M', 72, 6570, 6008, 70.7, 121);
  
  -- Insert Yellow Tees
  INSERT INTO course_tees (id, course_id, tee_name, tee_color, gender, par, total_yards, total_meters, course_rating, slope_rating)
  VALUES (gen_random_uuid(), v_course_id, 'Yellow', '#FFD700', 'M', 72, 6032, 5516, 69.2, 117);
  
  -- Insert Red Tees
  INSERT INTO course_tees (id, course_id, tee_name, tee_color, gender, par, total_yards, total_meters, course_rating, slope_rating)
  VALUES (gen_random_uuid(), v_course_id, 'Red', '#CC0000', 'F', 72, 5175, 4732, 69.2, 117);
END $$;

-- =====================================================
-- HOLE DATA
-- =====================================================

DO $$
DECLARE
  v_course_id UUID;
  v_blue_tee_id UUID;
  v_white_tee_id UUID;
  v_yellow_tee_id UUID;
  v_red_tee_id UUID;
BEGIN
  SELECT id INTO v_course_id FROM golf_courses WHERE slug = 'rayong-green-valley' LIMIT 1;
  SELECT id INTO v_blue_tee_id FROM course_tees WHERE course_id = v_course_id AND tee_name = 'Blue' LIMIT 1;
  SELECT id INTO v_white_tee_id FROM course_tees WHERE course_id = v_course_id AND tee_name = 'White' LIMIT 1;
  SELECT id INTO v_yellow_tee_id FROM course_tees WHERE course_id = v_course_id AND tee_name = 'Yellow' LIMIT 1;
  SELECT id INTO v_red_tee_id FROM course_tees WHERE course_id = v_course_id AND tee_name = 'Red' LIMIT 1;

  -- Hole 1
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 1, 4, 1, 'Long uphill par 4 with water carry off the tee and small green. The hardest hole on the course.',
    '{"blue": 448, "white": 428, "yellow": 373, "red": 309}'::jsonb);
  
  -- Hole 2
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 2, 4, 13, NULL,
    '{"blue": 387, "white": 378, "yellow": 360, "red": 311}'::jsonb);
  
  -- Hole 3
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 3, 4, 17, 'Right-angled dogleg left. Drive must clear water but stop short of bunker. More sand awaits those cutting the corner.',
    '{"blue": 382, "white": 355, "yellow": 322, "red": 266}'::jsonb);
  
  -- Hole 4
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 4, 5, 7, NULL,
    '{"blue": 551, "white": 526, "yellow": 489, "red": 461}'::jsonb);
  
  -- Hole 5
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 5, 3, 11, NULL,
    '{"blue": 220, "white": 192, "yellow": 159, "red": 121}'::jsonb);
  
  -- Hole 6
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 6, 4, 9, NULL,
    '{"blue": 367, "white": 350, "yellow": 328, "red": 303}'::jsonb);
  
  -- Hole 7
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 7, 5, 5, 'Monster par 5, the longest hole on the course.',
    '{"blue": 584, "white": 569, "yellow": 545, "red": 440}'::jsonb);
  
  -- Hole 8
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 8, 3, 15, NULL,
    '{"blue": 149, "white": 139, "yellow": 124, "red": 101}'::jsonb);
  
  -- Hole 9
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 9, 4, 3, NULL,
    '{"blue": 414, "white": 398, "yellow": 377, "red": 314}'::jsonb);
  
  -- Hole 10
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 10, 5, 6, NULL,
    '{"blue": 541, "white": 516, "yellow": 482, "red": 433}'::jsonb);
  
  -- Hole 11
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 11, 3, 16, NULL,
    '{"blue": 179, "white": 161, "yellow": 134, "red": 116}'::jsonb);
  
  -- Hole 12
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 12, 4, 14, NULL,
    '{"blue": 387, "white": 363, "yellow": 333, "red": 274}'::jsonb);
  
  -- Hole 13
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 13, 4, 2, 'Second hardest hole on the course. Challenging par 4.',
    '{"blue": 448, "white": 403, "yellow": 362, "red": 316}'::jsonb);
  
  -- Hole 14
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 14, 5, 8, NULL,
    '{"blue": 509, "white": 489, "yellow": 428, "red": 388}'::jsonb);
  
  -- Hole 15
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 15, 4, 4, NULL,
    '{"blue": 434, "white": 403, "yellow": 385, "red": 360}'::jsonb);
  
  -- Hole 16
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 16, 3, 18, 'Easiest hole on the course. Short par 3.',
    '{"blue": 172, "white": 144, "yellow": 125, "red": 100}'::jsonb);
  
  -- Hole 17
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 17, 4, 10, NULL,
    '{"blue": 382, "white": 366, "yellow": 344, "red": 298}'::jsonb);
  
  -- Hole 18
  INSERT INTO course_holes (course_id, hole_number, par, handicap_index, description, distances)
  VALUES (v_course_id, 18, 4, 12, 'Finishing hole with elevated green.',
    '{"blue": 417, "white": 390, "yellow": 362, "red": 264}'::jsonb);

END $$;

-- =====================================================
-- VERIFY INSERT
-- =====================================================

SELECT 
  gc.name,
  gc.par,
  gc.holes,
  (SELECT COUNT(*) FROM course_tees ct WHERE ct.course_id = gc.id) as tee_count,
  (SELECT COUNT(*) FROM course_holes ch WHERE ch.course_id = gc.id) as hole_count
FROM golf_courses gc
WHERE gc.slug = 'rayong-green-valley';
