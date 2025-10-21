-- =====================================================
-- DATA QUALITY MONITORING DASHBOARD
-- Purpose: Ongoing monitoring of profile data completeness
-- =====================================================

-- Create a view for easy monitoring
CREATE OR REPLACE VIEW data_quality_dashboard AS
SELECT
    role,
    COUNT(*) as total_users,

    -- Critical fields completeness
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as has_name,
    ROUND(COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) * 100.0 / COUNT(*), 2) as pct_name,

    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as has_phone,
    ROUND(COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) * 100.0 / COUNT(*), 2) as pct_phone,

    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as has_email,
    ROUND(COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) * 100.0 / COUNT(*), 2) as pct_email,

    -- Role-specific completeness
    COUNT(CASE WHEN role = 'caddie' AND caddy_number IS NOT NULL AND caddy_number != '' THEN 1 END) as caddies_with_number,
    ROUND(COUNT(CASE WHEN role = 'caddie' AND caddy_number IS NOT NULL AND caddy_number != '' THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN role = 'caddie' THEN 1 END), 0), 2) as pct_caddies_with_number,

    COUNT(CASE WHEN role = 'golfer' AND (home_course_id IS NOT NULL OR home_course_name IS NOT NULL) THEN 1 END) as golfers_with_home,
    ROUND(COUNT(CASE WHEN role = 'golfer' AND (home_course_id IS NOT NULL OR home_course_name IS NOT NULL) THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN role = 'golfer' THEN 1 END), 0), 2) as pct_golfers_with_home,

    COUNT(CASE WHEN role = 'golfer' AND profile_data->'golfInfo'->>'handicap' IS NOT NULL THEN 1 END) as golfers_with_handicap,
    ROUND(COUNT(CASE WHEN role = 'golfer' AND profile_data->'golfInfo'->>'handicap' IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN role = 'golfer' THEN 1 END), 0), 2) as pct_golfers_with_handicap,

    -- JSONB completeness
    COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}' THEN 1 END) as has_rich_profile,
    ROUND(COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}' THEN 1 END) * 100.0 / COUNT(*), 2) as pct_rich_profile,

    COUNT(CASE WHEN profile_data->'personalInfo' IS NOT NULL AND profile_data->'personalInfo' != 'null'::jsonb THEN 1 END) as has_personalInfo,
    ROUND(COUNT(CASE WHEN profile_data->'personalInfo' IS NOT NULL AND profile_data->'personalInfo' != 'null'::jsonb THEN 1 END) * 100.0 / COUNT(*), 2) as pct_personalInfo,

    COUNT(CASE WHEN profile_data->'golfInfo' IS NOT NULL AND profile_data->'golfInfo' != 'null'::jsonb THEN 1 END) as has_golfInfo,
    ROUND(COUNT(CASE WHEN profile_data->'golfInfo' IS NOT NULL AND profile_data->'golfInfo' != 'null'::jsonb THEN 1 END) * 100.0 / COUNT(*), 2) as pct_golfInfo

FROM user_profiles
GROUP BY role

UNION ALL

SELECT
    'TOTAL' as role,
    COUNT(*),
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END),
    ROUND(COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) * 100.0 / COUNT(*), 2),
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END),
    ROUND(COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) * 100.0 / COUNT(*), 2),
    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END),
    ROUND(COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) * 100.0 / COUNT(*), 2),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}' THEN 1 END),
    ROUND(COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}' THEN 1 END) * 100.0 / COUNT(*), 2),
    COUNT(CASE WHEN profile_data->'personalInfo' IS NOT NULL AND profile_data->'personalInfo' != 'null'::jsonb THEN 1 END),
    ROUND(COUNT(CASE WHEN profile_data->'personalInfo' IS NOT NULL AND profile_data->'personalInfo' != 'null'::jsonb THEN 1 END) * 100.0 / COUNT(*), 2),
    COUNT(CASE WHEN profile_data->'golfInfo' IS NOT NULL AND profile_data->'golfInfo' != 'null'::jsonb THEN 1 END),
    ROUND(COUNT(CASE WHEN profile_data->'golfInfo' IS NOT NULL AND profile_data->'golfInfo' != 'null'::jsonb THEN 1 END) * 100.0 / COUNT(*), 2)
FROM user_profiles;

-- Grant access to view
GRANT SELECT ON data_quality_dashboard TO authenticated, anon;

-- =====================================================
-- QUERY THE DASHBOARD
-- =====================================================

SELECT
    role,
    total_users,
    pct_name || '%' as name_completeness,
    pct_phone || '%' as phone_completeness,
    pct_email || '%' as email_completeness,
    COALESCE(pct_caddies_with_number::text || '%', 'N/A') as caddies_with_number,
    COALESCE(pct_golfers_with_home::text || '%', 'N/A') as golfers_with_home,
    COALESCE(pct_golfers_with_handicap::text || '%', 'N/A') as golfers_with_handicap,
    pct_rich_profile || '%' as jsonb_completeness
FROM data_quality_dashboard
ORDER BY
    CASE
        WHEN role = 'TOTAL' THEN 1
        ELSE 2
    END,
    total_users DESC;

-- =====================================================
-- IDENTIFY PROBLEMATIC PROFILES
-- =====================================================

-- Profiles missing critical data
SELECT
    'INCOMPLETE PROFILES' as alert,
    line_user_id,
    name,
    role,
    CASE WHEN phone IS NULL OR phone = '' THEN '❌' ELSE '✅' END as phone,
    CASE WHEN email IS NULL OR email = '' THEN '❌' ELSE '✅' END as email,
    CASE WHEN role = 'caddie' AND (caddy_number IS NULL OR caddy_number = '') THEN '❌' ELSE '✅' END as caddy_num,
    CASE WHEN role = 'golfer' AND (home_course_id IS NULL OR home_course_id = '') AND (home_course_name IS NULL OR home_course_name = '') THEN '❌' ELSE '✅' END as home_course,
    CASE WHEN profile_data IS NULL OR profile_data::text = '{}' THEN '❌' ELSE '✅' END as jsonb,
    created_at,
    updated_at
FROM user_profiles
WHERE
    -- Missing any critical field
    (phone IS NULL OR phone = '')
    OR (email IS NULL OR email = '')
    OR (role = 'caddie' AND (caddy_number IS NULL OR caddy_number = ''))
    OR (role = 'golfer' AND (home_course_id IS NULL OR home_course_id = '') AND (home_course_name IS NULL OR home_course_name = ''))
    OR (profile_data IS NULL OR profile_data::text = '{}')
ORDER BY created_at DESC
LIMIT 50;

-- =====================================================
-- WEEKLY DATA QUALITY REPORT
-- =====================================================

SELECT
    '===== WEEKLY DATA QUALITY REPORT =====' as report_title,
    NOW() as generated_at;

-- Overall stats
SELECT
    'OVERALL STATS' as section,
    COUNT(*) as total_profiles,
    COUNT(DISTINCT role) as unique_roles,
    MIN(created_at) as oldest_profile,
    MAX(created_at) as newest_profile,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as created_this_week
FROM user_profiles;

-- Completeness by role
SELECT * FROM data_quality_dashboard;

-- New profiles this week
SELECT
    'NEW PROFILES THIS WEEK' as section,
    role,
    COUNT(*) as count,
    ROUND(AVG(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END) * 100, 2) as avg_has_phone,
    ROUND(AVG(CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) * 100, 2) as avg_has_email,
    ROUND(AVG(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}' THEN 1 ELSE 0 END) * 100, 2) as avg_has_jsonb
FROM user_profiles
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY role;

-- Alert: Profiles updated but still incomplete
SELECT
    'ALERT: RECENTLY UPDATED BUT STILL INCOMPLETE' as section,
    line_user_id,
    name,
    role,
    updated_at,
    CASE WHEN phone IS NULL OR phone = '' THEN 'Missing phone' ELSE NULL END as issue_1,
    CASE WHEN email IS NULL OR email = '' THEN 'Missing email' ELSE NULL END as issue_2,
    CASE WHEN profile_data IS NULL OR profile_data::text = '{}' THEN 'Empty JSONB' ELSE NULL END as issue_3
FROM user_profiles
WHERE updated_at > NOW() - INTERVAL '7 days'
  AND (
      (phone IS NULL OR phone = '')
      OR (email IS NULL OR email = '')
      OR (profile_data IS NULL OR profile_data::text = '{}')
  )
ORDER BY updated_at DESC
LIMIT 20;

SELECT '===== END OF REPORT =====' as end_marker;
