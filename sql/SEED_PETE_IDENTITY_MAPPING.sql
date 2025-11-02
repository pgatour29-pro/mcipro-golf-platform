-- =====================================================
-- GET PETE'S UUID AND SEED IDENTITY MAPPING
-- =====================================================
-- Step 1: Find Pete's UUID from user_profiles
-- Step 2: Insert mapping from LINE user ID to UUID

-- Find Pete's UUID (LINE user: U2b6d976f19bca4b2f4374ae0e10ed873)
SELECT
    id AS user_uuid,
    line_user_id,
    profile_data->'personalInfo'->>'firstName' AS first_name,
    profile_data->'personalInfo'->>'lastName' AS last_name
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- If the above query returns Pete's UUID, use it in the INSERT below
-- Replace 'PASTE_UUID_HERE' with the actual UUID from the query above

-- Example: If UUID is '123e4567-e89b-12d3-a456-426614174000', run:
/*
INSERT INTO public.user_identities(line_user_id, user_uuid)
VALUES ('U2b6d976f19bca4b2f4374ae0e10ed873', '123e4567-e89b-12d3-a456-426614174000')
ON CONFLICT (line_user_id) DO UPDATE SET user_uuid = EXCLUDED.user_uuid;
*/

-- Or use a dynamic query to auto-populate:
DO $$
DECLARE
    pete_uuid UUID;
BEGIN
    -- Get Pete's UUID from user_profiles
    SELECT id INTO pete_uuid
    FROM user_profiles
    WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

    IF pete_uuid IS NULL THEN
        RAISE EXCEPTION 'Pete profile not found in user_profiles table';
    END IF;

    -- Insert mapping
    INSERT INTO public.user_identities(line_user_id, user_uuid)
    VALUES ('U2b6d976f19bca4b2f4374ae0e10ed873', pete_uuid)
    ON CONFLICT (line_user_id) DO UPDATE SET user_uuid = EXCLUDED.user_uuid;

    RAISE NOTICE '✅ Mapped LINE user U2b6d976f19bca4b2f4374ae0e10ed873 to UUID %', pete_uuid;
END $$;

-- Verify the mapping
SELECT * FROM public.user_identities
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
