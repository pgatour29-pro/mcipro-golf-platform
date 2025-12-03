-- Check how authentication is set up and user mapping

-- 1. Check user_profiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Check rounds table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rounds'
ORDER BY ordinal_position;

-- 3. Check if there's a Supabase auth.users table and how it maps
SELECT id, email, raw_user_meta_data
FROM auth.users
LIMIT 5;

-- 4. Check existing user_profiles and how line_user_id relates to auth
SELECT
    line_user_id,
    email,
    name,
    id
FROM user_profiles
LIMIT 10;

-- 5. Check existing rounds and their golfer_id format
SELECT
    id,
    golfer_id,
    course_name,
    completed_at
FROM rounds
LIMIT 10;
