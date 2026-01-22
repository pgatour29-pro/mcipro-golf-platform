-- =====================================================
-- SEQUENTIAL PIN SYSTEM FOR GOLF COURSES
-- January 22, 2026
-- =====================================================
-- Treasure Hill: 000000 (existing tee sheet)
-- Other courses: 000001, 000002, etc. (sequential)
-- Users can change their PIN after initial setup
-- =====================================================

-- =====================================================
-- STEP 1: ADD TREASURE HILL (MASTER COURSE - PIN 000000)
-- =====================================================
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES
('treasure-hill-golf', 'Treasure Hill Golf & Country Club', '000000', '0000', 'Treasure Hill Admin', true)
ON CONFLICT (course_id) DO UPDATE SET
    super_admin_pin = '000000',
    staff_pin = '0000',
    updated_at = NOW();

-- =====================================================
-- STEP 2: UPDATE EXISTING COURSES WITH SEQUENTIAL PINS
-- =====================================================
-- These courses get sequential PINs starting from 000001
-- They can change their PINs later via the Course Admin Portal

UPDATE course_admins SET super_admin_pin = '000001', staff_pin = '0001', updated_at = NOW()
WHERE course_id = 'pattana-golf-resort';

UPDATE course_admins SET super_admin_pin = '000002', staff_pin = '0002', updated_at = NOW()
WHERE course_id = 'burapha';

UPDATE course_admins SET super_admin_pin = '000003', staff_pin = '0003', updated_at = NOW()
WHERE course_id = 'pattaya-golf';

UPDATE course_admins SET super_admin_pin = '000004', staff_pin = '0004', updated_at = NOW()
WHERE course_id = 'bangpakong';

UPDATE course_admins SET super_admin_pin = '000005', staff_pin = '0005', updated_at = NOW()
WHERE course_id = 'royallakeside';

UPDATE course_admins SET super_admin_pin = '000006', staff_pin = '0006', updated_at = NOW()
WHERE course_id = 'hermes-golf';

UPDATE course_admins SET super_admin_pin = '000007', staff_pin = '0007', updated_at = NOW()
WHERE course_id = 'phoenix-golf';

UPDATE course_admins SET super_admin_pin = '000008', staff_pin = '0008', updated_at = NOW()
WHERE course_id = 'greenwood-golf';

UPDATE course_admins SET super_admin_pin = '000009', staff_pin = '0009', updated_at = NOW()
WHERE course_id = 'pattavia';

-- =====================================================
-- STEP 3: CREATE FUNCTION TO GET NEXT AVAILABLE PIN
-- =====================================================
-- This function finds the next available sequential PIN
-- Used when adding new courses to the system

CREATE OR REPLACE FUNCTION get_next_course_pin()
RETURNS TEXT AS $$
DECLARE
    max_pin INTEGER;
    next_pin TEXT;
BEGIN
    -- Find the highest numeric PIN currently in use (excluding 000000 which is reserved for Treasure Hill)
    SELECT COALESCE(MAX(
        CASE
            WHEN super_admin_pin ~ '^[0-9]{6}$' AND super_admin_pin != '000000'
            THEN super_admin_pin::INTEGER
            ELSE 0
        END
    ), 0) INTO max_pin
    FROM course_admins;

    -- Increment and format as 6-digit string
    next_pin := LPAD((max_pin + 1)::TEXT, 6, '0');

    RETURN next_pin;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: CREATE FUNCTION TO AUTO-ADD NEW COURSE
-- =====================================================
-- This function adds a new course with auto-assigned sequential PIN

CREATE OR REPLACE FUNCTION add_course_with_auto_pin(
    p_course_id TEXT,
    p_course_name TEXT,
    p_contact_name TEXT DEFAULT NULL,
    p_contact_email TEXT DEFAULT NULL,
    p_contact_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
    course_id TEXT,
    course_name TEXT,
    super_admin_pin TEXT,
    staff_pin TEXT
) AS $$
DECLARE
    v_super_pin TEXT;
    v_staff_pin TEXT;
BEGIN
    -- Get next available PIN
    v_super_pin := get_next_course_pin();
    v_staff_pin := LPAD((v_super_pin::INTEGER)::TEXT, 4, '0'); -- 4-digit version for staff

    -- Insert new course
    INSERT INTO course_admins (
        course_id,
        course_name,
        super_admin_pin,
        staff_pin,
        contact_name,
        contact_email,
        contact_phone,
        is_active
    )
    VALUES (
        p_course_id,
        p_course_name,
        v_super_pin,
        v_staff_pin,
        p_contact_name,
        p_contact_email,
        p_contact_phone,
        true
    )
    ON CONFLICT (course_id) DO UPDATE SET
        course_name = EXCLUDED.course_name,
        updated_at = NOW();

    -- Return the new course info
    RETURN QUERY
    SELECT
        p_course_id,
        p_course_name,
        v_super_pin,
        v_staff_pin;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: CREATE FUNCTION TO CHANGE COURSE PIN
-- =====================================================
-- Allows course admins to change their PIN after initial setup

CREATE OR REPLACE FUNCTION change_course_pin(
    p_course_id TEXT,
    p_current_pin TEXT,
    p_new_pin TEXT,
    p_pin_type TEXT DEFAULT 'super_admin' -- 'super_admin' or 'staff'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_current_super_pin TEXT;
    v_current_staff_pin TEXT;
BEGIN
    -- Get current PINs
    SELECT super_admin_pin, staff_pin
    INTO v_current_super_pin, v_current_staff_pin
    FROM course_admins
    WHERE course_id = p_course_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Course not found'::TEXT;
        RETURN;
    END IF;

    -- Verify current PIN matches
    IF p_pin_type = 'super_admin' THEN
        IF p_current_pin != v_current_super_pin THEN
            RETURN QUERY SELECT false, 'Current PIN is incorrect'::TEXT;
            RETURN;
        END IF;

        -- Validate new PIN format (6 digits)
        IF p_new_pin !~ '^[0-9]{6}$' THEN
            RETURN QUERY SELECT false, 'New PIN must be exactly 6 digits'::TEXT;
            RETURN;
        END IF;

        -- Update super admin PIN
        UPDATE course_admins
        SET super_admin_pin = p_new_pin, updated_at = NOW()
        WHERE course_id = p_course_id;

        RETURN QUERY SELECT true, 'Super Admin PIN changed successfully'::TEXT;

    ELSIF p_pin_type = 'staff' THEN
        IF p_current_pin != v_current_staff_pin THEN
            RETURN QUERY SELECT false, 'Current PIN is incorrect'::TEXT;
            RETURN;
        END IF;

        -- Validate new PIN format (4 digits)
        IF p_new_pin !~ '^[0-9]{4}$' THEN
            RETURN QUERY SELECT false, 'New Staff PIN must be exactly 4 digits'::TEXT;
            RETURN;
        END IF;

        -- Update staff PIN
        UPDATE course_admins
        SET staff_pin = p_new_pin, updated_at = NOW()
        WHERE course_id = p_course_id;

        RETURN QUERY SELECT true, 'Staff PIN changed successfully'::TEXT;

    ELSE
        RETURN QUERY SELECT false, 'Invalid PIN type. Use super_admin or staff'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFY: List all courses with their PINs
-- =====================================================
-- SELECT course_id, course_name, super_admin_pin, staff_pin, is_active
-- FROM course_admins
-- ORDER BY
--     CASE WHEN super_admin_pin = '000000' THEN 0 ELSE 1 END,
--     super_admin_pin;

-- =====================================================
-- USAGE EXAMPLES:
-- =====================================================
--
-- 1. Add a new course with auto-assigned PIN:
--    SELECT * FROM add_course_with_auto_pin('new-course-id', 'New Golf Course Name', 'Admin Name');
--
-- 2. Change Super Admin PIN:
--    SELECT * FROM change_course_pin('treasure-hill-golf', '000000', '123456', 'super_admin');
--
-- 3. Change Staff PIN:
--    SELECT * FROM change_course_pin('treasure-hill-golf', '0000', '9876', 'staff');
--
-- 4. Get next available PIN:
--    SELECT get_next_course_pin();
