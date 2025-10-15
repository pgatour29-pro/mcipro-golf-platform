-- =====================================================================
-- STEP 4: Verify everything works
-- =====================================================================

-- Check the view resolves Pete (007) and Donald (16)
SELECT 'chat_users view' AS test, * FROM public.chat_users WHERE user_code IN ('007','16');

-- Test list all contacts (should show ONE user - the other person, not you)
SELECT 'list_chat_contacts()' AS test, * FROM public.list_chat_contacts();

-- Test search for Donald by code
SELECT 'search for 16' AS test, * FROM public.search_chat_contacts('16');

-- Test search for Donald by name
SELECT 'search for donald' AS test, * FROM public.search_chat_contacts('donald');

-- Test search for Pete by code
SELECT 'search for 007' AS test, * FROM public.search_chat_contacts('007');

-- Test search for Pete by name
SELECT 'search for pete' AS test, * FROM public.search_chat_contacts('pete');

-- =====================================================================
-- ✅ EXPECTED RESULTS:
-- =====================================================================
-- - chat_users view shows both Pete (007) and Donald (16)
-- - list_chat_contacts() returns ONE user (the other person, not you)
-- - search '16' returns Donald Lump only
-- - search 'donald' returns Donald Lump only
-- - search '007' returns Pete Park only
-- - search 'pete' returns Pete Park only
-- - You NEVER see yourself in any results
