-- =====================================================
-- UPGRADE TO TWO-TIER PIN SYSTEM
-- =====================================================
-- Adds separate PINs for Super Admin and Staff access
-- Super Admin (organizer) gets full access
-- Staff get limited access with separate PIN
-- =====================================================

-- Add new columns for two-tier PIN system
ALTER TABLE society_organizer_access
ADD COLUMN IF NOT EXISTS super_admin_pin TEXT,
ADD COLUMN IF NOT EXISTS staff_pin TEXT;

-- Migrate existing access_pin to super_admin_pin
UPDATE society_organizer_access
SET super_admin_pin = access_pin
WHERE super_admin_pin IS NULL AND access_pin IS NOT NULL;

-- Drop old access_pin column (after migration)
-- ALTER TABLE society_organizer_access DROP COLUMN IF EXISTS access_pin;

-- Update verify function to support two-tier verification
-- Returns 'super_admin', 'admin', or NULL
CREATE OR REPLACE FUNCTION verify_society_organizer_pin(org_id TEXT, input_pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT := NULL;
BEGIN
    -- Check super admin PIN
    IF EXISTS (
        SELECT 1 FROM society_organizer_access
        WHERE organizer_id = org_id AND super_admin_pin = input_pin
    ) THEN
        RETURN 'super_admin';
    END IF;

    -- Check staff PIN
    IF EXISTS (
        SELECT 1 FROM society_organizer_access
        WHERE organizer_id = org_id AND staff_pin = input_pin
    ) THEN
        RETURN 'admin';
    END IF;

    -- No match
    RETURN NULL;
END;
$$;

-- Update has PIN function to check if ANY PIN is set
CREATE OR REPLACE FUNCTION organizer_has_pin(org_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM society_organizer_access
        WHERE organizer_id = org_id
          AND (super_admin_pin IS NOT NULL OR staff_pin IS NOT NULL)
    );
END;
$$;

-- Function to set Super Admin PIN
CREATE OR REPLACE FUNCTION set_super_admin_pin(org_id TEXT, new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO society_organizer_access (organizer_id, super_admin_pin)
    VALUES (org_id, new_pin)
    ON CONFLICT (organizer_id)
    DO UPDATE SET
        super_admin_pin = new_pin,
        updated_at = NOW();

    RETURN true;
END;
$$;

-- Function to set Staff PIN
CREATE OR REPLACE FUNCTION set_staff_pin(org_id TEXT, new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO society_organizer_access (organizer_id, staff_pin)
    VALUES (org_id, new_pin)
    ON CONFLICT (organizer_id)
    DO UPDATE SET
        staff_pin = new_pin,
        updated_at = NOW();

    RETURN true;
END;
$$;

-- Function to get PIN status (which PINs are set)
CREATE OR REPLACE FUNCTION get_pin_status(org_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'has_super_admin_pin', (super_admin_pin IS NOT NULL),
        'has_staff_pin', (staff_pin IS NOT NULL)
    )
    INTO result
    FROM society_organizer_access
    WHERE organizer_id = org_id;

    -- If no record exists, return default
    IF result IS NULL THEN
        result := json_build_object(
            'has_super_admin_pin', false,
            'has_staff_pin', false
        );
    END IF;

    RETURN result;
END;
$$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Test that functions work
SELECT
    organizer_id,
    (super_admin_pin IS NOT NULL) as has_super_pin,
    (staff_pin IS NOT NULL) as has_staff_pin
FROM society_organizer_access;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Set Super Admin PIN for Derek (TRGG organizer)
-- SELECT set_super_admin_pin('U2b6d976f19bca4b2f4374ae0e10ed873', '1234');

-- Set Staff PIN for Derek's staff
-- SELECT set_staff_pin('U2b6d976f19bca4b2f4374ae0e10ed873', '5678');

-- Verify PIN and get role
-- SELECT verify_society_organizer_pin('U2b6d976f19bca4b2f4374ae0e10ed873', '1234'); -- Returns 'super_admin'
-- SELECT verify_society_organizer_pin('U2b6d976f19bca4b2f4374ae0e10ed873', '5678'); -- Returns 'admin'
-- SELECT verify_society_organizer_pin('U2b6d976f19bca4b2f4374ae0e10ed873', '9999'); -- Returns NULL

-- Check PIN status
-- SELECT get_pin_status('U2b6d976f19bca4b2f4374ae0e10ed873');
