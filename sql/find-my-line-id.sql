-- =====================================================
-- Find Your LINE User ID
-- =====================================================
-- Run this query first to find your LINE user ID

-- Option 1: Search by your name
SELECT line_user_id, name, email, role, society_name
FROM user_profiles
WHERE name ILIKE '%Pete%'  -- Replace 'Pete' with your name
ORDER BY created_at DESC;

-- Option 2: Search by email
SELECT line_user_id, name, email, role, society_name
FROM user_profiles
WHERE email ILIKE '%your-email%'  -- Replace with your email
ORDER BY created_at DESC;

-- Option 3: Show all profiles (if database is small)
SELECT line_user_id, name, email, role, created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 20;
