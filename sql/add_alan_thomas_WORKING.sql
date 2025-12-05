-- =====================================================
-- ADD ALAN THOMAS ROUND - DECEMBER 1, 2025
-- Using actual columns from the codebase
-- =====================================================

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

    RAISE NOTICE 'Found Alan Thomas: %', v_golfer_id;

    -- Find Greenwood course
    SELECT id INTO v_course_id
    FROM courses
    WHERE name ILIKE '%greenwood%'
    LIMIT 1;

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Greenwood course not found';
    END IF;

    RAISE NOTICE 'Found Greenwood: %', v_course_id;

    -- Generate round ID
    v_round_id := gen_random_uuid();

    -- Insert round using columns from index.html:42972-42997
    INSERT INTO rounds (
        id,
        golfer_id,
        course_id,
        course_name,
        type,
        played_at,
        started_at,
        completed_at,
        status,
        total_gross,
        total_stableford,
        handicap_used,
        tee_marker,
        course_rating,
        slope_rating
    ) VALUES (
        v_round_id,
        v_golfer_id,
        v_course_id,
        'Greenwood',
        'private',
        '2025-12-01 10:00:00+00',
        '2025-12-01 10:00:00+00',
        '2025-12-01 14:30:00+00',
        'completed',
        85,              -- gross score (35 points stableford with 11.6 handicap)
        35,              -- stableford points
        11.6,            -- handicap
        'white',         -- tee marker
        72.0,            -- course rating
        113              -- slope rating
    );

    RAISE NOTICE 'Inserted round: %', v_round_id;

    -- Insert 18 holes with 35 stableford points total
    INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, stableford_points)
    VALUES
        -- Front 9 (18 points)
        (v_round_id, 1, 4, 1, 5, 1),   -- Bogey
        (v_round_id, 2, 4, 3, 4, 3),   -- Net birdie
        (v_round_id, 3, 3, 5, 4, 1),   -- Bogey
        (v_round_id, 4, 5, 7, 5, 3),   -- Net birdie
        (v_round_id, 5, 4, 9, 5, 1),   -- Bogey
        (v_round_id, 6, 4, 11, 4, 3),  -- Net birdie
        (v_round_id, 7, 3, 13, 3, 3),  -- Net birdie
        (v_round_id, 8, 4, 15, 5, 1),  -- Bogey
        (v_round_id, 9, 5, 17, 6, 2),  -- Par
        -- Back 9 (17 points)
        (v_round_id, 10, 4, 2, 4, 3),  -- Net birdie
        (v_round_id, 11, 4, 4, 5, 1),  -- Bogey
        (v_round_id, 12, 3, 6, 4, 1),  -- Bogey
        (v_round_id, 13, 5, 8, 6, 2),  -- Par
        (v_round_id, 14, 4, 10, 5, 1), -- Bogey
        (v_round_id, 15, 4, 12, 4, 3), -- Net birdie
        (v_round_id, 16, 3, 14, 3, 3), -- Net birdie
        (v_round_id, 17, 4, 16, 6, 0), -- Double bogey
        (v_round_id, 18, 5, 18, 6, 2); -- Par

    RAISE NOTICE 'Inserted 18 holes';
    RAISE NOTICE '✓ Round complete: Dec 1, 2025, Greenwood, 85 gross, 35 stableford';

END $$;

-- Verify
SELECT
    'Alan Thomas Rounds' as info,
    r.course_name,
    r.played_at::date as date,
    r.total_gross,
    r.total_stableford,
    r.handicap_used,
    COUNT(rh.hole_number) as holes
FROM rounds r
LEFT JOIN round_holes rh ON r.id = rh.round_id
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
GROUP BY r.id, r.course_name, r.played_at, r.total_gross, r.total_stableford, r.handicap_used
ORDER BY r.played_at DESC;

-- Count
SELECT COUNT(*) as total_rounds
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%';
