-- Check if course_holes table has data for pattaya_county

-- 1. Count holes for pattaya_county
SELECT
    'PATTAYA COUNTY HOLES' as info,
    COUNT(*) as total_holes,
    COUNT(DISTINCT tee_marker) as tee_markers
FROM public.course_holes
WHERE course_id = 'pattaya_county';

-- 2. Show all holes for pattaya_county with white tee
SELECT
    'WHITE TEE HOLES' as info,
    hole_number,
    par,
    stroke_index,
    yardage,
    tee_marker
FROM public.course_holes
WHERE course_id = 'pattaya_county'
  AND tee_marker = 'white'
ORDER BY hole_number;

-- 3. Show all tee markers available for pattaya_county
SELECT
    'AVAILABLE TEE MARKERS' as info,
    tee_marker,
    COUNT(*) as holes
FROM public.course_holes
WHERE course_id = 'pattaya_county'
GROUP BY tee_marker
ORDER BY tee_marker;

-- 4. Check if course_holes table exists
SELECT
    'TABLE STRUCTURE' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'course_holes'
ORDER BY ordinal_position;
