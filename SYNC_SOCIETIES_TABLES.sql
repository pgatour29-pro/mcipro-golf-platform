-- =====================================================
-- SYNC SOCIETIES TABLES - PROPER FIX
-- =====================================================
-- This ensures society_profiles IDs also exist in societies table
-- so that society_members FK constraint works
-- =====================================================

DO $$
DECLARE
    trgg_profile_id UUID := '7c0e4b72-d925-44bc-afda-38259a7ba346'; -- From society_profiles
    affected_members INT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Syncing Societies Tables';
    RAISE NOTICE '========================================';

    -- Insert Travellers Rest into societies table with the SAME ID as society_profiles
    INSERT INTO public.societies (id, name, created_at)
    VALUES (
        trgg_profile_id,
        'Travellers Rest Golf Group',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET name = 'Travellers Rest Golf Group';

    RAISE NOTICE '✓ Ensured Travellers Rest exists in societies table with ID: %', trgg_profile_id;

    -- Now add members using the society_profiles ID (which now exists in societies too)
    INSERT INTO public.society_members (society_id, golfer_id)
    SELECT trgg_profile_id, up.line_user_id
    FROM public.user_profiles up
    WHERE (
        up.profile_data->'golfInfo'->>'clubAffiliation' ILIKE '%Traveller%Rest%'
        OR up.profile_data->'organizationInfo'->>'societyName' ILIKE '%Traveller%Rest%'
        OR up.society_name ILIKE '%Traveller%Rest%'
        OR up.society_id = trgg_profile_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.society_members sm
        WHERE sm.society_id = trgg_profile_id AND sm.golfer_id = up.line_user_id
    );

    GET DIAGNOSTICS affected_members = ROW_COUNT;

    RAISE NOTICE '✓ Added % members to Travellers Rest', affected_members;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'COMPLETE!';
    RAISE NOTICE '========================================';

END $$;

-- Verify
SELECT COUNT(*) as total_members
FROM public.society_members
WHERE society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346';
