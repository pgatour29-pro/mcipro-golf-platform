-- Check all relevant table schemas

-- 1. society_profiles
SELECT 'society_profiles columns:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'society_profiles' ORDER BY ordinal_position;

-- 2. society_members
SELECT 'society_members columns:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'society_members' ORDER BY ordinal_position;

-- 3. user_profiles
SELECT 'user_profiles columns:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_profiles' ORDER BY ordinal_position;
