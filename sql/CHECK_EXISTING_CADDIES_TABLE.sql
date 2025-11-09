-- Check what columns currently exist in the caddies table
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('caddies', 'caddy_bookings', 'caddy_profiles', 'user_caddy_preferences')
ORDER BY table_name, ordinal_position;

-- Check if there's any data in the tables
DO $$
DECLARE
    caddies_count INTEGER;
    bookings_count INTEGER;
BEGIN
    -- Check caddies table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'caddies') THEN
        EXECUTE 'SELECT COUNT(*) FROM caddies' INTO caddies_count;
        RAISE NOTICE 'caddies table: % rows', caddies_count;
    ELSE
        RAISE NOTICE 'caddies table: DOES NOT EXIST';
    END IF;

    -- Check caddy_bookings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'caddy_bookings') THEN
        EXECUTE 'SELECT COUNT(*) FROM caddy_bookings' INTO bookings_count;
        RAISE NOTICE 'caddy_bookings table: % rows', bookings_count;
    ELSE
        RAISE NOTICE 'caddy_bookings table: DOES NOT EXIST';
    END IF;
END $$;
