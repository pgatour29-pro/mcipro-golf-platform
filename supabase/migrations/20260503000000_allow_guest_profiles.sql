-- Remove trigger that blocks guest profile creation
-- The error message was: "Guest IDs are not allowed. Users must login with LINE to create profiles."
DO $$
DECLARE
    trig RECORD;
BEGIN
    FOR trig IN
        SELECT tgname FROM pg_trigger
        WHERE tgrelid = 'public.user_profiles'::regclass
        AND tgname LIKE '%guest%' OR tgname LIKE '%validate%' OR tgname LIKE '%check_line%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.user_profiles', trig.tgname);
        RAISE NOTICE 'Dropped trigger: %', trig.tgname;
    END LOOP;
END $$;

-- Also check for any function that raises the error
DO $$
DECLARE
    func RECORD;
BEGIN
    FOR func IN
        SELECT p.proname, p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prosrc LIKE '%Guest IDs are not allowed%'
    LOOP
        RAISE NOTICE 'Found blocking function: %', func.proname;
    END LOOP;
END $$;
