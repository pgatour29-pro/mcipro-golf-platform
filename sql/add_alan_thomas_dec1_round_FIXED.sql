-- =====================================================
-- ADD ALAN THOMAS ROUND - DECEMBER 1, 2025
-- =====================================================
-- Step 1: Check what columns actually exist in rounds table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rounds'
ORDER BY ordinal_position;

-- Step 2: Insert round with ONLY columns that definitely exist
DO $$
DECLARE
    v_golfer_id TEXT;
    v_course_id TEXT;
    v_round_id UUID;
BEGIN
    -- Find Alan Thomas
    SELECT line_user_id INTO v_golfer_id
    FROM user_profiles
    WHERE name ILIKE '%alan%thomas%'
    LIMIT 1;

    IF v_golfer_id IS NULL THEN
        RAISE EXCEPTION 'Alan Thomas not found';
    END IF;

    -- Find Greenwood course
    SELECT id INTO v_course_id
    FROM courses
    WHERE name ILIKE '%greenwood%'
    LIMIT 1;

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Greenwood course not found';
    END IF;

    -- Generate round ID
    v_round_id := gen_random_uuid();

    -- Insert with absolute minimum columns
    INSERT INTO rounds (
        id,
        golfer_id,
        course_id,
        played_at
    ) VALUES (
        v_round_id,
        v_golfer_id,
        v_course_id,
        '2025-12-01 10:00:00+00'
    );

    RAISE NOTICE 'Inserted round: %', v_round_id;

    -- Insert hole-by-hole scores for 35 stableford points
    INSERT INTO round_holes (round_id, hole_number, par, gross_score, stableford_points)
    VALUES
        -- Front 9 (18 points)
        (v_round_id, 1, 4, 5, 1),   -- Bogey
        (v_round_id, 2, 4, 4, 3),   -- Net birdie
        (v_round_id, 3, 3, 4, 1),   -- Bogey
        (v_round_id, 4, 5, 5, 3),   -- Net birdie
        (v_round_id, 5, 4, 5, 1),   -- Bogey
        (v_round_id, 6, 4, 4, 3),   -- Net birdie
        (v_round_id, 7, 3, 3, 3),   -- Net birdie
        (v_round_id, 8, 4, 5, 1),   -- Bogey
        (v_round_id, 9, 5, 6, 2),   -- Par
        -- Back 9 (17 points)
        (v_round_id, 10, 4, 4, 3),  -- Net birdie
        (v_round_id, 11, 4, 5, 1),  -- Bogey
        (v_round_id, 12, 3, 4, 1),  -- Bogey
        (v_round_id, 13, 5, 6, 2),  -- Par
        (v_round_id, 14, 4, 5, 1),  -- Bogey
        (v_round_id, 15, 4, 4, 3),  -- Net birdie
        (v_round_id, 16, 3, 3, 3),  -- Net birdie
        (v_round_id, 17, 4, 6, 0),  -- Double bogey
        (v_round_id, 18, 5, 6, 2);  -- Par

    RAISE NOTICE 'Inserted 18 holes with 35 stableford points total';

END $$;

-- Verify
SELECT
    'Alan Thomas Rounds' as info,
    r.id,
    r.course_id,
    r.played_at::date as date,
    COUNT(rh.hole_number) as holes_count,
    SUM(rh.stableford_points) as total_stableford
FROM rounds r
LEFT JOIN round_holes rh ON r.id = rh.round_id
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
GROUP BY r.id, r.course_id, r.played_at
ORDER BY r.played_at DESC;

-- Count total rounds
SELECT
    'Total Rounds' as info,
    COUNT(*) as count
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%';
