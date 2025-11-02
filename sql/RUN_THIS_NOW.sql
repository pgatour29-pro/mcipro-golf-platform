-- =====================================================
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- =====================================================
-- This will:
-- 1. Create user_identities mapping table
-- 2. Find Pete's UUID from user_profiles
-- 3. Create the mapping LINE user ID → UUID

-- Step 1: Create the mapping table
CREATE TABLE IF NOT EXISTS public.user_identities (
  line_user_id TEXT PRIMARY KEY,
  user_uuid UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_identities_user_uuid_idx
  ON public.user_identities(user_uuid);

ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;

-- Step 2: Insert Pete's mapping (auto-finds UUID from user_profiles)
DO $$
DECLARE
    pete_uuid UUID;
BEGIN
    -- Get Pete's UUID from user_profiles
    SELECT id INTO pete_uuid
    FROM user_profiles
    WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

    IF pete_uuid IS NULL THEN
        RAISE EXCEPTION 'ERROR: Pete profile not found in user_profiles table';
    END IF;

    -- Insert mapping
    INSERT INTO public.user_identities(line_user_id, user_uuid)
    VALUES ('U2b6d976f19bca4b2f4374ae0e10ed873', pete_uuid)
    ON CONFLICT (line_user_id) DO UPDATE SET user_uuid = EXCLUDED.user_uuid;

    RAISE NOTICE '✅ SUCCESS: Mapped LINE user to UUID %', pete_uuid;
END $$;

-- Step 3: Verify it worked
SELECT
    ui.line_user_id,
    ui.user_uuid,
    up.profile_data->'personalInfo'->>'firstName' AS first_name,
    up.profile_data->'personalInfo'->>'lastName' AS last_name
FROM public.user_identities ui
JOIN user_profiles up ON up.id = ui.user_uuid
WHERE ui.line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
