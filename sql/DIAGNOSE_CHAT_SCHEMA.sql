-- Diagnose current chat schema in Supabase
-- Copy results and share with me

-- 1. Check what tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('rooms', 'chat_rooms', 'room_members', 'chat_room_members', 'chat_messages', 'profiles')
ORDER BY table_name;

-- 2. Check chat_rooms/rooms schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('chat_rooms', 'rooms')
ORDER BY table_name, ordinal_position;

-- 3. Check chat_room_members/room_members schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('chat_room_members', 'room_members')
ORDER BY table_name, ordinal_position;

-- 4. Check chat_messages schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_messages'
ORDER BY ordinal_position;

-- 5. Check ensure_direct_conversation function signature
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_direct_conversation';

-- 6. Check RLS policies on chat_messages
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('chat_messages', 'chat_rooms', 'rooms', 'chat_room_members', 'room_members')
ORDER BY tablename, policyname;

-- 7. Count rows in each table
SELECT
    'chat_rooms' as table_name,
    COUNT(*) as row_count
FROM chat_rooms
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'chat_room_members', COUNT(*) FROM chat_room_members
UNION ALL
SELECT 'room_members', COUNT(*) FROM room_members
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages;
