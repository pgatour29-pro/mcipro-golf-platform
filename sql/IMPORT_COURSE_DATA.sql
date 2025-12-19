-- ============================================================================
-- IMPORT COURSE DATA FROM SCORECARD PROFILES
-- ============================================================================
-- Created: 2025-12-11
-- Purpose: Import all Thailand course rating/slope data
-- Source: scorecard_profiles/*.yaml
-- ============================================================================

BEGIN;

-- ============================================================================
-- BANGPAKONG RIVERSIDE COUNTRY CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'bangpakong',
  'Bangpakong Riverside Country Club',
  'Chachoengsao',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 74.5, "slope": 135, "par": 72, "yardage": 7227},
    {"name": "Men", "color": "Blue", "rating": 72.0, "slope": 130, "par": 72, "yardage": 6700},
    {"name": "Regular", "color": "White", "rating": 70.5, "slope": 125, "par": 72, "yardage": 6393},
    {"name": "Senior", "color": "Yellow", "rating": 72.0, "slope": 120, "par": 72, "yardage": 5458},
    {"name": "Ladies", "color": "Red", "rating": 71.0, "slope": 118, "par": 72, "yardage": 5458}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- BURAPHA GOLF CLUB - EAST COURSE
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'burapha_east',
  'Burapha Golf Club - East Course',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.5, "slope": 132, "par": 72, "yardage": 6800},
    {"name": "Men", "color": "Blue", "rating": 72.0, "slope": 127, "par": 72, "yardage": 6400},
    {"name": "Regular", "color": "White", "rating": 70.5, "slope": 122, "par": 72, "yardage": 6000},
    {"name": "Ladies", "color": "Red", "rating": 68.0, "slope": 115, "par": 72, "yardage": 5400}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- EASTERN STAR GOLF COURSE
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'eastern_star',
  'Eastern Star Golf Course',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 74.0, "slope": 134, "par": 72, "yardage": 6900},
    {"name": "Men", "color": "Blue", "rating": 72.5, "slope": 129, "par": 72, "yardage": 6500},
    {"name": "Regular", "color": "White", "rating": 71.0, "slope": 124, "par": 72, "yardage": 6100},
    {"name": "Ladies", "color": "Red", "rating": 68.5, "slope": 117, "par": 72, "yardage": 5500}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- GREENWOOD GOLF & RESORT
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'greenwood',
  'Greenwood Golf & Resort',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.5, "slope": 131, "par": 72, "yardage": 6850},
    {"name": "Men", "color": "Blue", "rating": 72.0, "slope": 126, "par": 72, "yardage": 6450},
    {"name": "Regular", "color": "White", "rating": 70.5, "slope": 121, "par": 72, "yardage": 6050},
    {"name": "Ladies", "color": "Red", "rating": 68.0, "slope": 114, "par": 72, "yardage": 5450}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- PHOENIX GOLF
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'phoenix',
  'Phoenix Golf',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 74.0, "slope": 133, "par": 72, "yardage": 6900},
    {"name": "Men", "color": "Blue", "rating": 72.5, "slope": 128, "par": 72, "yardage": 6500},
    {"name": "Regular", "color": "White", "rating": 71.0, "slope": 123, "par": 72, "yardage": 6100},
    {"name": "Ladies", "color": "Red", "rating": 68.5, "slope": 116, "par": 72, "yardage": 5500}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- ROYAL LAKESIDE GOLF CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'royal_lakeside',
  'Royal Lakeside Golf Club',
  'Bangkok',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 74.0, "slope": 138, "par": 72, "yardage": 7100},
    {"name": "Men", "color": "Blue", "rating": 72.5, "slope": 133, "par": 72, "yardage": 6700},
    {"name": "Regular", "color": "White", "rating": 71.0, "slope": 128, "par": 72, "yardage": 6300},
    {"name": "Ladies", "color": "Red", "rating": 68.5, "slope": 120, "par": 72, "yardage": 5700}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- SIAM PLANTATION GOLF CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'siam_plantation',
  'Siam Plantation Golf Club',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 74.0, "slope": 138, "par": 72, "yardage": 7000},
    {"name": "Men", "color": "Blue", "rating": 72.5, "slope": 133, "par": 72, "yardage": 6600},
    {"name": "Regular", "color": "White", "rating": 71.0, "slope": 128, "par": 72, "yardage": 6200},
    {"name": "Ladies", "color": "Red", "rating": 68.5, "slope": 120, "par": 72, "yardage": 5600}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- BANGPRA INTERNATIONAL GOLF CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'bangpra',
  'Bangpra International Golf Club',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.5, "slope": 130, "par": 72, "yardage": 6800},
    {"name": "Men", "color": "Blue", "rating": 72.0, "slope": 125, "par": 72, "yardage": 6400},
    {"name": "Regular", "color": "White", "rating": 70.5, "slope": 120, "par": 72, "yardage": 6000},
    {"name": "Ladies", "color": "Red", "rating": 68.0, "slope": 113, "par": 72, "yardage": 5400}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- CRYSTAL BAY GOLF CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'crystal_bay',
  'Crystal Bay Golf Club',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.5, "slope": 131, "par": 72, "yardage": 6850},
    {"name": "Men", "color": "Blue", "rating": 72.0, "slope": 126, "par": 72, "yardage": 6450},
    {"name": "Regular", "color": "White", "rating": 70.5, "slope": 121, "par": 72, "yardage": 6050},
    {"name": "Ladies", "color": "Red", "rating": 68.0, "slope": 114, "par": 72, "yardage": 5450}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- KHAO KHEOW COUNTRY CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'khao_kheow',
  'Khao Kheow Country Club',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 74.0, "slope": 133, "par": 72, "yardage": 6900},
    {"name": "Men", "color": "Blue", "rating": 72.5, "slope": 128, "par": 72, "yardage": 6500},
    {"name": "Regular", "color": "White", "rating": 71.0, "slope": 123, "par": 72, "yardage": 6100},
    {"name": "Senior", "color": "Yellow", "rating": 69.5, "slope": 118, "par": 72, "yardage": 5700},
    {"name": "Ladies", "color": "Red", "rating": 68.0, "slope": 115, "par": 72, "yardage": 5300}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- LAEM CHABANG INTERNATIONAL COUNTRY CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'laem_chabang',
  'Laem Chabang International Country Club',
  'Chonburi',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 74.5, "slope": 136, "par": 72, "yardage": 7100},
    {"name": "Men", "color": "Blue", "rating": 73.0, "slope": 131, "par": 72, "yardage": 6700},
    {"name": "Regular", "color": "White", "rating": 71.5, "slope": 126, "par": 72, "yardage": 6300},
    {"name": "Ladies", "color": "Red", "rating": 69.0, "slope": 118, "par": 72, "yardage": 5700}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- PATTANA GOLF CLUB & RESORT
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'pattana',
  'Pattana Golf Club & Resort',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.5, "slope": 130, "par": 72, "yardage": 6850},
    {"name": "Men", "color": "Blue", "rating": 72.0, "slope": 125, "par": 72, "yardage": 6450},
    {"name": "Regular", "color": "White", "rating": 70.5, "slope": 120, "par": 72, "yardage": 6050},
    {"name": "Ladies", "color": "Red", "rating": 68.0, "slope": 113, "par": 72, "yardage": 5450}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- SIAM COUNTRY CLUB - OLD COURSE
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'siam_cc_old',
  'Siam Country Club - Old Course',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 74.5, "slope": 140, "par": 72, "yardage": 7100},
    {"name": "Men", "color": "Blue", "rating": 73.0, "slope": 135, "par": 72, "yardage": 6700},
    {"name": "Regular", "color": "White", "rating": 71.5, "slope": 130, "par": 72, "yardage": 6300},
    {"name": "Ladies", "color": "Red", "rating": 69.0, "slope": 122, "par": 72, "yardage": 5700}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- HERMES GOLF CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'hermes',
  'Hermes Golf Club',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.0, "slope": 128, "par": 72, "yardage": 6800},
    {"name": "Men", "color": "Blue", "rating": 71.5, "slope": 123, "par": 72, "yardage": 6400},
    {"name": "Regular", "color": "White", "rating": 70.0, "slope": 118, "par": 72, "yardage": 6000},
    {"name": "Ladies", "color": "Red", "rating": 67.5, "slope": 111, "par": 72, "yardage": 5400}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- TREASURE HILL GOLF CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'treasure_hill',
  'Treasure Hill Golf Club',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.5, "slope": 132, "par": 72, "yardage": 6850},
    {"name": "Men", "color": "Blue", "rating": 72.0, "slope": 127, "par": 72, "yardage": 6450},
    {"name": "Regular", "color": "White", "rating": 70.5, "slope": 122, "par": 72, "yardage": 6050},
    {"name": "Ladies", "color": "Red", "rating": 68.0, "slope": 115, "par": 72, "yardage": 5450}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- PLEASANT VALLEY GOLF CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'pleasant_valley',
  'Pleasant Valley Golf Club',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.0, "slope": 129, "par": 72, "yardage": 6800},
    {"name": "Men", "color": "Blue", "rating": 71.5, "slope": 124, "par": 72, "yardage": 6400},
    {"name": "Regular", "color": "White", "rating": 70.0, "slope": 119, "par": 72, "yardage": 6000},
    {"name": "Ladies", "color": "Red", "rating": 67.5, "slope": 112, "par": 72, "yardage": 5400}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- PLUTALUANG ROYAL THAI NAVY GOLF COURSE
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'plutaluang',
  'Plutaluang Royal Thai Navy Golf Course',
  'Sattahip',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 72.5, "slope": 126, "par": 72, "yardage": 6600},
    {"name": "Men", "color": "Blue", "rating": 71.0, "slope": 121, "par": 72, "yardage": 6200},
    {"name": "Regular", "color": "White", "rating": 69.5, "slope": 116, "par": 72, "yardage": 5800},
    {"name": "Ladies", "color": "Red", "rating": 67.0, "slope": 109, "par": 72, "yardage": 5200}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- PATTAVIA CENTURY GOLF CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'pattavia',
  'Pattavia Century Golf Club',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.0, "slope": 128, "par": 72, "yardage": 6800},
    {"name": "Men", "color": "Blue", "rating": 71.5, "slope": 123, "par": 72, "yardage": 6400},
    {"name": "Regular", "color": "White", "rating": 70.0, "slope": 118, "par": 72, "yardage": 6000},
    {"name": "Ladies", "color": "Red", "rating": 67.5, "slope": 111, "par": 72, "yardage": 5400}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- GRAND PRIX GOLF CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'grand_prix',
  'Grand Prix Golf Club',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.0, "slope": 128, "par": 72, "yardage": 6800},
    {"name": "Men", "color": "Blue", "rating": 71.5, "slope": 123, "par": 72, "yardage": 6400},
    {"name": "Regular", "color": "White", "rating": 70.0, "slope": 118, "par": 72, "yardage": 6000},
    {"name": "Ladies", "color": "Red", "rating": 67.5, "slope": 111, "par": 72, "yardage": 5400}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

-- ============================================================================
-- MOUNTAIN SHADOW GOLF CLUB
-- ============================================================================
INSERT INTO courses (course_code, course_name, location, country, par, total_holes, tees)
VALUES (
  'mountain_shadow',
  'Mountain Shadow Golf Club',
  'Pattaya',
  'Thailand',
  72,
  18,
  '[
    {"name": "Championship", "color": "Black", "rating": 73.0, "slope": 129, "par": 72, "yardage": 6800},
    {"name": "Men", "color": "Blue", "rating": 71.5, "slope": 124, "par": 72, "yardage": 6400},
    {"name": "Regular", "color": "White", "rating": 70.0, "slope": 119, "par": 72, "yardage": 6000},
    {"name": "Ladies", "color": "Red", "rating": 67.5, "slope": 112, "par": 72, "yardage": 5400}
  ]'::JSONB
)
ON CONFLICT (course_code) DO UPDATE SET tees = EXCLUDED.tees, updated_at = NOW();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT
  course_code,
  course_name,
  jsonb_array_length(tees) as tee_count
FROM courses
ORDER BY course_name;
