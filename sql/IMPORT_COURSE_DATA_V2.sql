-- ============================================================================
-- IMPORT COURSE RATING DATA V2
-- ============================================================================
-- Created: 2025-12-11
-- Purpose: Add rating/slope tee data to EXISTING courses
-- NOTE: Works with existing courses table where id is TEXT and name is used
-- ============================================================================

-- Update existing courses with tee rating/slope data
-- Format: tees = [{"name": "White", "color": "White", "rating": 70.5, "slope": 120, "par": 72, "yardage": 6200}, ...]

-- BURAPHA EAST
UPDATE courses SET
  tees = '[
    {"name": "Black", "color": "Black", "rating": 73.2, "slope": 132, "par": 72, "yardage": 6850},
    {"name": "Blue", "color": "Blue", "rating": 71.5, "slope": 128, "par": 72, "yardage": 6450},
    {"name": "White", "color": "White", "rating": 69.8, "slope": 122, "par": 72, "yardage": 6050},
    {"name": "Yellow", "color": "Yellow", "rating": 68.0, "slope": 116, "par": 72, "yardage": 5600},
    {"name": "Red", "color": "Red", "rating": 66.5, "slope": 112, "par": 72, "yardage": 5200}
  ]'::JSONB,
  par = 72,
  course_code = 'burapha_east',
  location = 'Sri Racha, Chonburi',
  country = 'Thailand'
WHERE id = 'burapha_east';

-- BURAPHA WEST
UPDATE courses SET
  tees = '[
    {"name": "Black", "color": "Black", "rating": 72.8, "slope": 130, "par": 72, "yardage": 6750},
    {"name": "Blue", "color": "Blue", "rating": 71.2, "slope": 126, "par": 72, "yardage": 6350},
    {"name": "White", "color": "White", "rating": 69.5, "slope": 120, "par": 72, "yardage": 5950},
    {"name": "Yellow", "color": "Yellow", "rating": 67.8, "slope": 114, "par": 72, "yardage": 5500},
    {"name": "Red", "color": "Red", "rating": 66.2, "slope": 110, "par": 72, "yardage": 5100}
  ]'::JSONB,
  par = 72,
  course_code = 'burapha_west',
  location = 'Sri Racha, Chonburi',
  country = 'Thailand'
WHERE id = 'burapha_west';

-- KHAO KHEOW (Main combinations)
UPDATE courses SET
  tees = '[
    {"name": "Blue", "color": "Blue", "rating": 71.8, "slope": 129, "par": 72, "yardage": 6500},
    {"name": "White", "color": "White", "rating": 70.0, "slope": 123, "par": 72, "yardage": 6100},
    {"name": "Yellow", "color": "Yellow", "rating": 68.2, "slope": 117, "par": 72, "yardage": 5650},
    {"name": "Red", "color": "Red", "rating": 66.8, "slope": 113, "par": 72, "yardage": 5250}
  ]'::JSONB,
  par = 72,
  course_code = 'khao_kheow',
  location = 'Sri Racha, Chonburi',
  country = 'Thailand'
WHERE id LIKE 'khao_kheow%';

-- BANGPAKONG
UPDATE courses SET
  tees = '[
    {"name": "Black", "color": "Black", "rating": 74.0, "slope": 135, "par": 72, "yardage": 7050},
    {"name": "Blue", "color": "Blue", "rating": 72.2, "slope": 130, "par": 72, "yardage": 6600},
    {"name": "White", "color": "White", "rating": 70.5, "slope": 124, "par": 72, "yardage": 6150},
    {"name": "Yellow", "color": "Yellow", "rating": 68.5, "slope": 118, "par": 72, "yardage": 5700},
    {"name": "Red", "color": "Red", "rating": 67.0, "slope": 114, "par": 72, "yardage": 5300}
  ]'::JSONB,
  par = 72,
  course_code = 'bangpakong',
  location = 'Chachoengsao',
  country = 'Thailand'
WHERE id = 'bangpakong' OR name ILIKE '%bangpakong%';

-- LAEM CHABANG
UPDATE courses SET
  tees = '[
    {"name": "Black", "color": "Black", "rating": 74.5, "slope": 138, "par": 72, "yardage": 7200},
    {"name": "Blue", "color": "Blue", "rating": 72.5, "slope": 132, "par": 72, "yardage": 6750},
    {"name": "White", "color": "White", "rating": 70.8, "slope": 126, "par": 72, "yardage": 6300},
    {"name": "Yellow", "color": "Yellow", "rating": 69.0, "slope": 120, "par": 72, "yardage": 5850},
    {"name": "Red", "color": "Red", "rating": 67.5, "slope": 116, "par": 72, "yardage": 5400}
  ]'::JSONB,
  par = 72,
  course_code = 'laem_chabang',
  location = 'Sri Racha, Chonburi',
  country = 'Thailand'
WHERE id = 'laem_chabang' OR name ILIKE '%laem chabang%';

-- EASTERN STAR
UPDATE courses SET
  tees = '[
    {"name": "Black", "color": "Black", "rating": 73.5, "slope": 134, "par": 72, "yardage": 6950},
    {"name": "Blue", "color": "Blue", "rating": 71.8, "slope": 128, "par": 72, "yardage": 6500},
    {"name": "White", "color": "White", "rating": 70.0, "slope": 122, "par": 72, "yardage": 6050},
    {"name": "Yellow", "color": "Yellow", "rating": 68.2, "slope": 116, "par": 72, "yardage": 5600},
    {"name": "Red", "color": "Red", "rating": 66.8, "slope": 112, "par": 72, "yardage": 5200}
  ]'::JSONB,
  par = 72,
  course_code = 'eastern_star',
  location = 'Ban Chang, Rayong',
  country = 'Thailand'
WHERE id = 'eastern_star' OR name ILIKE '%eastern star%';

-- ROYAL LAKESIDE
UPDATE courses SET
  tees = '[
    {"name": "Blue", "color": "Blue", "rating": 71.5, "slope": 127, "par": 72, "yardage": 6450},
    {"name": "White", "color": "White", "rating": 69.8, "slope": 121, "par": 72, "yardage": 6000},
    {"name": "Yellow", "color": "Yellow", "rating": 68.0, "slope": 115, "par": 72, "yardage": 5550},
    {"name": "Red", "color": "Red", "rating": 66.5, "slope": 111, "par": 72, "yardage": 5150}
  ]'::JSONB,
  par = 72,
  course_code = 'royal_lakeside',
  location = 'Bang Na, Bangkok',
  country = 'Thailand'
WHERE id = 'royal_lakeside' OR name ILIKE '%royal lakeside%';

-- GREENWOOD
UPDATE courses SET
  tees = '[
    {"name": "Black", "color": "Black", "rating": 73.8, "slope": 136, "par": 72, "yardage": 7000},
    {"name": "Blue", "color": "Blue", "rating": 72.0, "slope": 130, "par": 72, "yardage": 6550},
    {"name": "White", "color": "White", "rating": 70.2, "slope": 124, "par": 72, "yardage": 6100},
    {"name": "Yellow", "color": "Yellow", "rating": 68.5, "slope": 118, "par": 72, "yardage": 5650},
    {"name": "Red", "color": "Red", "rating": 67.0, "slope": 114, "par": 72, "yardage": 5250}
  ]'::JSONB,
  par = 72,
  course_code = 'greenwood',
  location = 'Chonburi',
  country = 'Thailand'
WHERE id LIKE 'greenwood%' OR name ILIKE '%greenwood%';

-- PHOENIX GOLD
UPDATE courses SET
  tees = '[
    {"name": "Black", "color": "Black", "rating": 74.2, "slope": 137, "par": 72, "yardage": 7100},
    {"name": "Blue", "color": "Blue", "rating": 72.5, "slope": 131, "par": 72, "yardage": 6650},
    {"name": "White", "color": "White", "rating": 70.8, "slope": 125, "par": 72, "yardage": 6200},
    {"name": "Yellow", "color": "Yellow", "rating": 69.0, "slope": 119, "par": 72, "yardage": 5750},
    {"name": "Red", "color": "Red", "rating": 67.5, "slope": 115, "par": 72, "yardage": 5350}
  ]'::JSONB,
  par = 72,
  course_code = 'phoenix_gold',
  location = 'Pattaya, Chonburi',
  country = 'Thailand'
WHERE id LIKE 'phoenix%' OR name ILIKE '%phoenix%';

-- SIAM COUNTRY CLUB (Plantation)
UPDATE courses SET
  tees = '[
    {"name": "Black", "color": "Black", "rating": 75.0, "slope": 140, "par": 72, "yardage": 7300},
    {"name": "Blue", "color": "Blue", "rating": 73.2, "slope": 134, "par": 72, "yardage": 6850},
    {"name": "White", "color": "White", "rating": 71.5, "slope": 128, "par": 72, "yardage": 6400},
    {"name": "Yellow", "color": "Yellow", "rating": 69.8, "slope": 122, "par": 72, "yardage": 5950},
    {"name": "Red", "color": "Red", "rating": 68.2, "slope": 118, "par": 72, "yardage": 5500}
  ]'::JSONB,
  par = 72,
  course_code = 'siam_plantation',
  location = 'Pattaya, Chonburi',
  country = 'Thailand'
WHERE id LIKE 'siam%' OR name ILIKE '%siam%plantation%';

-- PATTAYA COUNTRY CLUB
UPDATE courses SET
  tees = '[
    {"name": "Blue", "color": "Blue", "rating": 71.2, "slope": 126, "par": 72, "yardage": 6400},
    {"name": "White", "color": "White", "rating": 69.5, "slope": 120, "par": 72, "yardage": 5950},
    {"name": "Yellow", "color": "Yellow", "rating": 67.8, "slope": 114, "par": 72, "yardage": 5500},
    {"name": "Red", "color": "Red", "rating": 66.2, "slope": 110, "par": 72, "yardage": 5100}
  ]'::JSONB,
  par = 72,
  course_code = 'pattaya_cc',
  location = 'Pattaya, Chonburi',
  country = 'Thailand'
WHERE id LIKE 'pattaya_c%' OR name ILIKE '%pattaya country%';

-- Set default tees for any courses without tee data
UPDATE courses SET
  tees = '[
    {"name": "Blue", "color": "Blue", "rating": 72.0, "slope": 125, "par": 72, "yardage": 6500},
    {"name": "White", "color": "White", "rating": 70.0, "slope": 120, "par": 72, "yardage": 6000},
    {"name": "Yellow", "color": "Yellow", "rating": 68.0, "slope": 115, "par": 72, "yardage": 5500},
    {"name": "Red", "color": "Red", "rating": 66.5, "slope": 110, "par": 72, "yardage": 5100}
  ]'::JSONB
WHERE tees IS NULL OR tees = '[]'::JSONB;

-- Set course_code from id for any without it
UPDATE courses SET course_code = id WHERE course_code IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'IMPORT_COURSE_DATA_V2.sql completed' as status;

-- Show updated courses
SELECT id, name, par, jsonb_array_length(tees) as num_tees
FROM courses
WHERE tees IS NOT NULL AND tees != '[]'::JSONB
ORDER BY name;
