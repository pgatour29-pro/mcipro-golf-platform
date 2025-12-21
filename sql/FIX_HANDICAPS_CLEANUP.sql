-- ============================================================================
-- CLEAN UP DUPLICATE HANDICAP RECORDS & SET CORRECT VALUES
-- ============================================================================
-- Problem: society_handicaps table has many duplicate records
-- Solution: Delete all records for these users and insert clean ones
-- ============================================================================

-- TRGG Society ID
-- 7c0e4b72-d925-44bc-afda-38259a7ba346

-- User IDs:
-- Pete Park: U2b6d976f19bca4b2f4374ae0e10ed873
-- Alan Thomas: U214f2fe47e1681fbb26f0aba95930d64
-- Tristan Gilbert: U533f2301ff76d319e0086e8340e4051c

-- ============================================================================
-- STEP 1: Delete ALL existing records for these users
-- ============================================================================

DELETE FROM society_handicaps
WHERE golfer_id IN (
    'U2b6d976f19bca4b2f4374ae0e10ed873',   -- Pete Park
    'U214f2fe47e1681fbb26f0aba95930d64',   -- Alan Thomas
    'U533f2301ff76d319e0086e8340e4051c'    -- Tristan Gilbert
);

-- ============================================================================
-- STEP 2: Insert clean records - ONE universal and ONE TRGG per user
-- ============================================================================

-- Pete Park: Universal 3.2, TRGG 2.8
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, calculation_method, last_calculated_at)
VALUES
    ('U2b6d976f19bca4b2f4374ae0e10ed873', NULL, 3.2, 'MANUAL', NOW()),
    ('U2b6d976f19bca4b2f4374ae0e10ed873', '7c0e4b72-d925-44bc-afda-38259a7ba346', 2.8, 'MANUAL', NOW());

-- Alan Thomas: Universal 12.2, TRGG 11.9
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, calculation_method, last_calculated_at)
VALUES
    ('U214f2fe47e1681fbb26f0aba95930d64', NULL, 12.2, 'MANUAL', NOW()),
    ('U214f2fe47e1681fbb26f0aba95930d64', '7c0e4b72-d925-44bc-afda-38259a7ba346', 11.9, 'MANUAL', NOW());

-- Tristan Gilbert: Universal 13.2, TRGG 11.0
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, calculation_method, last_calculated_at)
VALUES
    ('U533f2301ff76d319e0086e8340e4051c', NULL, 13.2, 'MANUAL', NOW()),
    ('U533f2301ff76d319e0086e8340e4051c', '7c0e4b72-d925-44bc-afda-38259a7ba346', 11.0, 'MANUAL', NOW());

-- ============================================================================
-- STEP 3: Verify the results
-- ============================================================================

SELECT
    up.name,
    sh.society_id,
    CASE WHEN sh.society_id IS NULL THEN 'Universal' ELSE 'TRGG' END as scope,
    sh.handicap_index
FROM society_handicaps sh
JOIN user_profiles up ON up.line_user_id = sh.golfer_id
WHERE sh.golfer_id IN (
    'U2b6d976f19bca4b2f4374ae0e10ed873',
    'U214f2fe47e1681fbb26f0aba95930d64',
    'U533f2301ff76d319e0086e8340e4051c'
)
ORDER BY up.name, sh.society_id NULLS FIRST;
