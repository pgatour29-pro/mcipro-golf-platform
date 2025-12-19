-- Check if Caddy Booking System tables exist
SELECT
    'Caddy Booking System' as system,
    table_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = t.table_name
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('caddies'),
        ('caddy_bookings')
) AS t(table_name)

UNION ALL

-- Check if Personal Caddy Organizer tables exist
SELECT
    'Personal Caddy Organizer' as system,
    table_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = t.table_name
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('caddy_profiles'),
        ('user_caddy_preferences')
) AS t(table_name)

ORDER BY system, table_name;

-- Show sample counts if tables exist
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TABLE COUNTS ===';

    -- Caddy Booking System
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'caddies') THEN
        EXECUTE 'SELECT COUNT(*) FROM caddies' INTO @count;
        RAISE NOTICE 'caddies: % rows', @count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'caddy_bookings') THEN
        EXECUTE 'SELECT COUNT(*) FROM caddy_bookings' INTO @count;
        RAISE NOTICE 'caddy_bookings: % rows', @count;
    END IF;

    -- Personal Caddy Organizer
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'caddy_profiles') THEN
        EXECUTE 'SELECT COUNT(*) FROM caddy_profiles' INTO @count;
        RAISE NOTICE 'caddy_profiles: % rows', @count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_caddy_preferences') THEN
        EXECUTE 'SELECT COUNT(*) FROM user_caddy_preferences' INTO @count;
        RAISE NOTICE 'user_caddy_preferences: % rows', @count;
    END IF;
END $$;
