-- =====================================================
-- DISABLE RLS ON event_registrations
-- =====================================================
-- Quick fix: Disable RLS entirely so frontend can read registrations

ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'event_registrations';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS DISABLED on event_registrations';
    RAISE NOTICE 'Frontend can now read all registrations';
END $$;
